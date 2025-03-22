import request from 'supertest';
import app from '../../app';
import { User } from '../../models/User';
import { createTestUser } from '../helpers/testUtils';
import { HttpStatus } from '../../utils/errorResponse';

describe('Auth Routes', () => {
  const validUser = {
    email: 'newuser@example.com',
    password: 'Test123!@#',
    firstName: 'New',
    lastName: 'User'
  };

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(validUser.email);
    });

    it('should not register user with existing email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUser);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should not login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body.success).toBe(false);
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: validUser.password
        });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should send reset password email for valid user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('sent');
    });

    it('should handle non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(HttpStatus.OK); // For security, don't reveal if email exists
      expect(response.body.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should limit repeated failed login attempts', async () => {
      const attempts = Array(6).fill(null).map(() => 
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(attempts);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(lastResponse.body.message).toContain('Too many');
    });
  });

  describe('Account Lockout', () => {
    it('should lock account after multiple failed login attempts', async () => {
      // Create a test user that we can try to lock
      const testUser = await User.create({
        email: 'lockout-test@example.com',
        password: 'secure-password-123',
        firstName: 'Lockout',
        lastName: 'Test',
        isVerified: true
      });

      // Try incorrect password 5 times
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'lockout-test@example.com',
            password: 'wrong-password'
          })
          .expect(HttpStatus.UNAUTHORIZED)
          .expect((res) => {
            expect(res.body.message).toBe('Invalid credentials');
          });
      }

      // The 6th attempt should result in account lockout
      const lockoutResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'lockout-test@example.com',
          password: 'wrong-password'
        })
        .expect(HttpStatus.UNAUTHORIZED);
      
      expect(lockoutResponse.body.isLocked).toBe(true);
      expect(lockoutResponse.body.message).toContain('Account locked');

      // Verify the user is actually locked in the database
      const lockedUser = await User.findById(testUser._id);
      expect(lockedUser).not.toBeNull();
      expect(lockedUser!.accountLocked).toBe(true);
      expect(lockedUser!.failedLoginAttempts).toBe(5);
      expect(lockedUser!.accountLockedUntil).toBeDefined();

      // Cleanup - remove test user
      await User.findByIdAndDelete(testUser._id);
    });

    it('should reject login attempts during lockout period', async () => {
      // Create a test user with an active lockout
      const lockoutDate = new Date();
      lockoutDate.setMinutes(lockoutDate.getMinutes() + 15); // 15 minutes lockout
      
      const testUser = await User.create({
        email: 'already-locked@example.com',
        password: 'secure-password-123',
        firstName: 'Already',
        lastName: 'Locked',
        isVerified: true,
        failedLoginAttempts: 5,
        accountLocked: true,
        accountLockedUntil: lockoutDate
      });

      // Try to login with correct password while locked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'already-locked@example.com',
          password: 'secure-password-123'
        })
        .expect(HttpStatus.UNAUTHORIZED);
      
      expect(response.body.isLocked).toBe(true);
      expect(response.body.message).toContain('Account is locked');

      // Cleanup - remove test user
      await User.findByIdAndDelete(testUser._id);
    });

    it('should reset failed attempts counter after successful login', async () => {
      // Create a test user with some failed attempts but not locked
      const testUser = await User.create({
        email: 'almost-locked@example.com',
        password: 'secure-password-123',
        firstName: 'Almost',
        lastName: 'Locked',
        isVerified: true,
        failedLoginAttempts: 3 // Just below threshold
      });

      // Login successfully
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'almost-locked@example.com',
          password: 'secure-password-123'
        })
        .expect(HttpStatus.OK);

      // Verify failed attempts counter is reset
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.failedLoginAttempts).toBe(0);

      // Cleanup - remove test user
      await User.findByIdAndDelete(testUser._id);
    });
  });
}); 