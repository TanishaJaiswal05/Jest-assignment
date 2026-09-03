import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import User from '../models/User';
import Salon from '../models/Salon';
import Service from '../models/Service';
import Booking from '../models/Booking';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/salon-db';

const seedDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Salon.deleteMany({});
    await Service.deleteMany({});
    await Booking.deleteMany({});

    // Create Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      name: 'Admin User',
      email: 'admin@salon.com',
      password: adminPassword,
      role: 'admin'
    });
    await admin.save();

    // Create Stylists
    const stylistPassword = await bcrypt.hash('stylist123', 10);
    const stylist1 = new User({
      name: 'John Doe',
      email: 'john@salon.com',
      password: stylistPassword,
      role: 'stylist'
    });
    const stylist2 = new User({
      name: 'Jane Smith',
      email: 'jane@salon.com',
      password: stylistPassword,
      role: 'stylist'
    });
    await stylist1.save();
    await stylist2.save();

    // Create Salon
    const salon = new Salon({
      name: 'Elegant Beauty Salon',
      location: '123 Main Street',
      openTime: '09:00',
      closeTime: '18:00'
    });
    await salon.save();

    // Create Services
    const service1 = new Service({
      name: 'Men Haircut',
      duration: 30, // 30 minutes
      price: 25,
      salonId: salon._id
    });
    const service2 = new Service({
      name: 'Women Hair Coloring',
      duration: 60, // 60 minutes
      price: 80,
      salonId: salon._id
    });
    await service1.save();
    await service2.save();

    console.log('Database seeded successfully!');
    console.log('--- Seed Info ---');
    console.log('Admin Email:', admin.email);
    console.log('Stylist 1 Email:', stylist1.email, 'ID:', stylist1._id.toString());
    console.log('Stylist 2 Email:', stylist2.email, 'ID:', stylist2._id.toString());
    console.log('Salon ID:', salon._id.toString());
    console.log(`Service '${service1.name}' ID:`, service1._id.toString());
    console.log(`Service '${service2.name}' ID:`, service2._id.toString());
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding DB:', error);
    process.exit(1);
  }
};

seedDB();
