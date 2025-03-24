const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string - use environment variable or default
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-journal';

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Simple User schema for this script
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: String
});

const User = mongoose.model('User', UserSchema);

// Function to verify a user by email
async function verifyUserByEmail(email) {
  try {
    console.log(`Looking for user with email: ${email}`);
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error('User not found');
      return false;
    }
    
    console.log('User found:', user.email);
    
    // Update user to verified
    user.isVerified = true;
    await user.save();
    
    console.log('User verified successfully');
    return true;
  } catch (error) {
    console.error('Error verifying user:', error);
    return false;
  } finally {
    // Close MongoDB connection
    mongoose.connection.close();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address as an argument');
  console.log('Usage: node verify-user.js user@example.com');
  process.exit(1);
}

// Run the verification
verifyUserByEmail(email)
  .then(success => {
    if (success) {
      console.log('User verification complete');
    } else {
      console.error('User verification failed');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  }); 