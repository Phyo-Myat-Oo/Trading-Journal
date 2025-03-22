import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
};

// Main function to clear all users
const clearAllUsers = async () => {
  try {
    console.log('Connecting to database...');
    const conn = await connectDB();
    
    console.log('Removing all users from the database...');
    const result = await User.deleteMany({});
    
    console.log(`Successfully removed ${result.deletedCount} users from the database.`);
    
    // Create an admin user
    const adminUser = new User({
      email: 'admin@example.com',
      password: 'AdminPass123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      isVerified: true
    });
    
    await adminUser.save();
    console.log('Created new admin user: admin@example.com / AdminPass123');
    
    // Close the database connection
    await conn.disconnect();
    console.log('Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
};

// Run the script
clearAllUsers(); 