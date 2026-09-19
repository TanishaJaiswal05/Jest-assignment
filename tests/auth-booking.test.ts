import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import app from '../app';
import User from '../models/User';
import Salon from '../models/Salon';
import Service from '../models/Service';
import Booking from '../models/Booking';

// Mock database models so the suite remains fast, deterministic, and independent of MongoDB.
jest.mock('../models/User');
jest.mock('../models/Salon');
jest.mock('../models/Service');
jest.mock('../models/Booking');

// Mock password hashing because password persistence is not the subject of these API tests.
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn().mockResolvedValue('hashed-password'),
    compare: jest.fn().mockResolvedValue(true)
  }
}));

const mockedUser = User as unknown as {
  findOne: jest.Mock;
  findById: jest.Mock;
  find: jest.Mock;
};
const mockedSalon = Salon as unknown as { findById: jest.Mock };
const mockedService = Service as unknown as { findById: jest.Mock };
const mockedBooking = Booking as unknown as {
  find: jest.Mock;
  findById: jest.Mock;
};
const mockedUserConstructor = User as unknown as jest.Mock;
const mockedBookingConstructor = Booking as unknown as jest.Mock;

const customerId = '507f1f77bcf86cd799439011';
const otherCustomerId = '507f1f77bcf86cd799439016';
const salonId = '507f1f77bcf86cd799439012';
const serviceId = '507f1f77bcf86cd799439013';
const stylistId = '507f1f77bcf86cd799439014';
const bookingId = '507f1f77bcf86cd799439015';
const password = 'Password123!';
const jwtSecret = process.env.JWT_SECRET || 'supersecretjwtkey_12345';

const customer = {
  _id: customerId,
  name: 'Test Customer',
  email: 'customer@example.com',
  password: 'hashed-password',
  role: 'customer'
};

const createToken = (userId: string, role = 'customer') =>
  jwt.sign({ userId, role }, jwtSecret);

const customerToken = createToken(customerId);

describe('Authentication and booking API automation', () => {
  beforeEach(() => {
    // Reset each mocked database operation so tests cannot leak state into one another.
    jest.clearAllMocks();
    mockedUser.findOne = jest.fn();
    mockedUser.findById = jest.fn();
    mockedUser.find = jest.fn();
    mockedSalon.findById = jest.fn();
    mockedService.findById = jest.fn();
    mockedBooking.find = jest.fn();
    mockedBooking.findById = jest.fn();
    mockedUserConstructor.mockReset();
    mockedBookingConstructor.mockReset();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  describe('complete E2E workflow: Register -> Login -> Booking -> Cancel', () => {
    it('completes the full customer journey using data returned by each previous step', async () => {
      // Keep a small in-memory store to model records created during this workflow.
      const users = new Map<string, any>();
      const bookings = new Map<string, any>();

      // Register: no user exists initially, then persist the user created by the controller.
      mockedUser.findOne.mockImplementation(({ email }: { email: string }) =>
        Promise.resolve([...users.values()].find((user) => user.email === email) || null)
      );
      mockedUserConstructor.mockImplementation((data: any) => {
        const registeredUser = { ...data, _id: customerId };
        users.set(registeredUser._id, registeredUser);
        return { ...registeredUser, save: jest.fn().mockResolvedValue(true) };
      });

      const registerResponse = await request(app).post('/api/register').send({
        name: 'Test Customer',
        email: 'workflow@example.com',
        password
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toEqual({ message: 'User registered successfully' });
      expect(users.get(customerId)).toEqual(expect.objectContaining({
        email: 'workflow@example.com',
        role: 'customer'
      }));

      // Login: look up the user created above and obtain the real response token.
      mockedUser.findOne.mockResolvedValue(users.get(customerId));

      const loginResponse = await request(app).post('/api/login').send({
        email: 'workflow@example.com',
        password
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toEqual(expect.objectContaining({
        token: expect.any(String),
        userId: customerId,
        role: 'customer'
      }));
      const workflowToken = loginResponse.body.token;

      // Booking: the authentication middleware resolves the same registered user.
      mockedUser.findById.mockImplementation((id: string) => Promise.resolve(users.get(id) || null));
      mockedService.findById.mockResolvedValue({ _id: serviceId, name: 'Haircut', duration: 60 });
      mockedBooking.find.mockImplementation(() => Promise.resolve([...bookings.values()]));
      mockedBookingConstructor.mockImplementation((data: any) => {
        const booking = { ...data, _id: bookingId, status: 'booked' };
        bookings.set(bookingId, booking);
        return { ...booking, save: jest.fn().mockResolvedValue(true) };
      });

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${workflowToken}`)
        .send({ salonId, stylistId, serviceId, slotTime: '10:00', date: '2026-10-01' });

      expect(bookingResponse.status).toBe(201);
      expect(bookingResponse.body).toEqual(expect.objectContaining({
        message: 'Booking created successfully',
        booking: expect.objectContaining({
          _id: bookingId,
          customerId,
          startTime: '10:00',
          endTime: '11:00',
          status: 'booked'
        })
      }));

      // Cancel: retrieve the booking created above and verify its business state changes.
      const savedBooking = bookings.get(bookingId);
      mockedBooking.findById.mockResolvedValue(savedBooking);

      const cancelResponse = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${workflowToken}`);

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body).toEqual({ message: 'Booking cancelled successfully' });
      expect(savedBooking.status).toBe('cancelled');
    });
  });

  describe('positive API scenarios', () => {
    it('returns available salon slots', async () => {
      // A valid salon, service, and stylist should produce available slots.
      mockedSalon.findById.mockResolvedValue({ openTime: '09:00', closeTime: '17:00' });
      mockedService.findById.mockResolvedValue({ name: 'Haircut', duration: 60 });
      mockedUser.find.mockResolvedValue([{ _id: stylistId, name: 'Alex' }]);
      mockedBooking.find.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/salons/${salonId}/available-slots`)
        .query({ date: '2026-10-01', serviceId });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        date: '2026-10-01', service: 'Haircut', duration: 60
      }));
      expect(response.body.availableSlots.length).toBeGreaterThan(0);
    });
  });

  describe('negative and authorization scenarios', () => {
    it('rejects duplicate email registration', async () => {
      // Existing email addresses must not create a second account.
      mockedUser.findOne.mockResolvedValue(customer);

      const response = await request(app).post('/api/register').send({
        name: 'Another Customer', email: customer.email, password
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Email already in use' });
      expect(mockedUserConstructor).not.toHaveBeenCalled();
    });

    it('rejects login with invalid credentials', async () => {
      // A missing user must receive the controller's invalid-credentials response.
      mockedUser.findOne.mockResolvedValue(null);

      const response = await request(app).post('/api/login').send({
        email: 'unknown@example.com', password
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('rejects booking requests with an invalid token', async () => {
      // Invalid tokens are rejected before protected booking logic runs.
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', 'Bearer invalid-token')
        .send({ salonId, stylistId, serviceId, slotTime: '10:00', date: '2026-10-01' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid token' });
      expect(mockedService.findById).not.toHaveBeenCalled();
    });

    it('rejects an overlapping booking', async () => {
      // An overlapping active booking violates the slot-availability business rule.
      mockedUser.findById.mockResolvedValue(customer);
      mockedService.findById.mockResolvedValue({ duration: 60 });
      mockedBooking.find.mockResolvedValue([
        { startTime: '09:30', endTime: '10:30', status: 'booked' }
      ]);

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ salonId, stylistId, serviceId, slotTime: '10:00', date: '2026-10-01' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Time slot is no longer available' });
      expect(mockedBookingConstructor).not.toHaveBeenCalled();
    });

    it('prevents one customer from cancelling another customer\'s booking', async () => {
      // Authorization is based on booking ownership, not merely valid authentication.
      const otherCustomer = { ...customer, _id: otherCustomerId, email: 'other@example.com' };
      const booking = {
        _id: bookingId,
        customerId,
        status: 'booked',
        save: jest.fn().mockResolvedValue(true)
      };

      mockedUser.findById.mockResolvedValue(otherCustomer);
      mockedBooking.findById.mockResolvedValue(booking);

      const response = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${createToken(otherCustomerId)}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Not authorized to cancel this booking' });
      expect(booking.status).toBe('booked');
      expect(booking.save).not.toHaveBeenCalled();
    });

    it('allows an admin to cancel another customer\'s booking', async () => {
      // Admin authorization is explicitly allowed by the booking controller.
      const admin = { ...customer, _id: otherCustomerId, role: 'admin' };
      const booking = {
        _id: bookingId,
        customerId,
        status: 'booked',
        save: jest.fn().mockResolvedValue(true)
      };

      mockedUser.findById.mockResolvedValue(admin);
      mockedBooking.findById.mockResolvedValue(booking);

      const response = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${createToken(otherCustomerId, 'admin')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Booking cancelled successfully' });
      expect(booking.status).toBe('cancelled');
      expect(booking.save).toHaveBeenCalledTimes(1);
    });
  });
});
