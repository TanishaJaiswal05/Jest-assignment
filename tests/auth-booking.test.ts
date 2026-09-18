import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import app from '../app';
import User from '../models/User';
import Salon from '../models/Salon';
import Service from '../models/Service';
import Booking from '../models/Booking';

// Mock the Mongoose models so the API tests do not hit a live database.
jest.mock('../models/User');
jest.mock('../models/Salon');
jest.mock('../models/Service');
jest.mock('../models/Booking');

const mockedUser = User as unknown as {
  findOne: jest.Mock;
  findById: jest.Mock;
  find: jest.Mock;
};

const mockedSalon = Salon as unknown as {
  findById: jest.Mock;
};

const mockedService = Service as unknown as {
  findById: jest.Mock;
};

const mockedBooking = Booking as unknown as {
  find: jest.Mock;
  findById: jest.Mock;
};

const mockedBookingConstructor = Booking as unknown as jest.Mock;

const customerId = '507f1f77bcf86cd799439011';
const salonId = '507f1f77bcf86cd799439012';
const serviceId = '507f1f77bcf86cd799439013';
const stylistId = '507f1f77bcf86cd799439014';
const bookingId = '507f1f77bcf86cd799439015';
const password = 'Password123!';

const customer = {
  _id: customerId,
  name: 'Test Customer',
  email: 'customer@example.com',
  password: '$2b$10$abcdefghijklmnopqrstuu',
  role: 'customer'
};

const token = jwt.sign(
  { userId: customerId, role: 'customer' },
  process.env.JWT_SECRET || 'supersecretjwtkey_12345'
);

describe('Authentication and booking APIs', () => {
  beforeEach(() => {
    // Reset the mocked model methods before each test.
    mockedUser.findOne = jest.fn();
    mockedUser.findById = jest.fn();
    mockedUser.find = jest.fn();
    mockedSalon.findById = jest.fn();
    mockedService.findById = jest.fn();
    mockedBooking.find = jest.fn();
    mockedBooking.findById = jest.fn();
    mockedBookingConstructor.mockReset();
    jest.clearAllMocks();
  });

  it('1. registers a customer', async () => {
    // Registration should succeed when the email is not already taken.
    mockedUser.findOne.mockResolvedValue(null);
    mockedUser.findOne.mockResolvedValue(null);
    mockedUser.findOne.mockResolvedValue(null);
    (User as unknown as jest.Mock).mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(true)
    }));

    const response = await request(app).post('/api/register').send({
      name: 'Test Customer',
      email: `new-${Date.now()}@example.com`,
      password
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'User registered successfully' });
  });

  it('rejects registration when the email is already in use', async () => {
    // Duplicate registration should be rejected before a new user is saved.
    mockedUser.findOne.mockResolvedValue(customer);

    const response = await request(app).post('/api/register').send({
      name: 'Another Customer',
      email: customer.email,
      password
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email already in use' });
    expect(mockedBookingConstructor).not.toHaveBeenCalled();
  });

  it('2. logs in and returns a JWT', async () => {
    // Login returns a token after checking stored password hash.
    mockedUser.findOne.mockResolvedValue(customer);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const response = await request(app).post('/api/login').send({
      email: customer.email,
      password
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        role: 'customer',
        token: expect.any(String),
        userId: customerId
      })
    );
  });

  it('3. returns available salon slots', async () => {
    // The slot endpoint should return times for an available stylist on a given date.
    mockedSalon.findById.mockResolvedValue({
      _id: salonId,
      openTime: '09:00',
      closeTime: '17:00'
    });

    mockedService.findById.mockResolvedValue({
      _id: serviceId,
      name: 'Haircut',
      duration: 60
    });

    mockedUser.find.mockResolvedValue([{ _id: stylistId, name: 'Alex' }]);
    mockedBooking.find.mockResolvedValue([]);

    const response = await request(app)
      .get(`/api/salons/${salonId}/available-slots`)
      .query({ date: '2026-10-01', serviceId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        date: '2026-10-01',
        service: 'Haircut',
        duration: 60
      })
    );
    expect(response.body.availableSlots.length).toBeGreaterThan(0);
  });

  it('4. creates an authenticated booking', async () => {
    // Authenticated users should be able to book a free time slot.
    mockedUser.findById.mockResolvedValue(customer);
    mockedService.findById.mockResolvedValue({
      _id: serviceId,
      duration: 60
    });
    mockedBooking.find.mockResolvedValue([]);

    mockedBookingConstructor.mockImplementation(() => ({
      _id: bookingId,
      save: jest.fn().mockResolvedValue(true),
      startTime: '10:00',
      endTime: '11:00'
    }));

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        salonId,
        stylistId,
        serviceId,
        slotTime: '10:00',
        date: '2026-10-01'
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Booking created successfully');
    expect(response.body.booking).toEqual(
      expect.objectContaining({ startTime: '10:00' })
    );
  });

  it('rejects a booking request with an invalid token', async () => {
    // Invalid tokens must be rejected by auth middleware before booking logic runs.
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer definitely-not-a-valid-token')
      .send({ salonId, stylistId, serviceId, slotTime: '10:00', date: '2026-10-01' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid token' });
    expect(mockedUser.findById).not.toHaveBeenCalled();
    expect(mockedService.findById).not.toHaveBeenCalled();
  });

  it('rejects a booking when the requested time overlaps an existing booking', async () => {
    // The booking API must prevent overlapping bookings for the same salon and stylist.
    mockedUser.findById.mockResolvedValue(customer);
    mockedService.findById.mockResolvedValue({ _id: serviceId, duration: 60 });
    mockedBooking.find.mockResolvedValue([
      { startTime: '09:30', endTime: '10:30', status: 'booked' }
    ]);

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        salonId,
        stylistId,
        serviceId,
        slotTime: '10:00',
        date: '2026-10-01'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Time slot is no longer available' });
    expect(mockedBookingConstructor).not.toHaveBeenCalled();
  });

  it('5. cancels an authenticated booking', async () => {
    // The customer should be able to cancel their own booking.
    mockedUser.findById.mockResolvedValue(customer);
    const booking = {
      customerId,
      status: 'booked',
      save: jest.fn().mockResolvedValue(true)
    };

    mockedBooking.findById.mockResolvedValue(booking);

    const response = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Booking cancelled successfully' });
    expect(booking.status).toBe('cancelled');
  });
});
