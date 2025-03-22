import request from 'supertest';
import app from '../../app';
import { Trade } from '../../models/Trade';
import { Types } from 'mongoose';
import path from 'path';
import fs from 'fs';
import { createMockTrade, getTestAuthToken, cleanupTestData } from '../helpers/testUtils';
import { connectTestDB, disconnectTestDB } from '../../config/test-database';

describe('Trade Image Upload Integration Tests', () => {
  let authToken: string;
  let testTradeId: string;

  beforeAll(async () => {
    await connectTestDB();
    const trade = await createMockTrade();
    testTradeId = trade._id.toString();
    authToken = getTestAuthToken();
  }, 60000);

  afterAll(async () => {
    await cleanupTestData();
    await disconnectTestDB();
  }, 60000);

  jest.setTimeout(60000);

  describe('POST /api/trades/:id/screenshots', () => {
    it('should upload a valid image file', async () => {
      const response = await request(app)
        .post(`/api/trades/${testTradeId}/screenshots`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('screenshot', path.join(__dirname, '../fixtures/text_image.jpg.png'));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Screenshot uploaded successfully');
      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toContain('cloudinary.com');
    });

    it('should reject invalid file types', async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test-file.txt');
      fs.writeFileSync(testFilePath, 'This is a test file');

      const response = await request(app)
        .post(`/api/trades/${testTradeId}/screenshots`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('screenshot', testFilePath);

      fs.unlinkSync(testFilePath);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid file type');
    });

    it('should reject files larger than 5MB', async () => {
      const largeFilePath = path.join(__dirname, '../fixtures/large-image.jpg');

      const response = await request(app)
        .post(`/api/trades/${testTradeId}/screenshots`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('screenshot', largeFilePath);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'File too large');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .post(`/api/trades/${testTradeId}/screenshots`)
        .attach('screenshot', path.join(__dirname, '../fixtures/text_image.jpg.png'));

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'User not authenticated');
    });

    it('should return 404 for non-existent trade', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await request(app)
        .post(`/api/trades/${nonExistentId}/screenshots`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('screenshot', path.join(__dirname, '../fixtures/text_image.jpg.png'));

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Trade not found');
    });
  });

  describe('DELETE /api/trades/:id/screenshots/:url', () => {
    let screenshotUrl: string;

    beforeEach(async () => {
      const response = await request(app)
        .post(`/api/trades/${testTradeId}/screenshots`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('screenshot', path.join(__dirname, '../fixtures/text_image.jpg.png'));

      screenshotUrl = response.body.url;
    });

    it('should delete an existing screenshot', async () => {
      const response = await request(app)
        .delete(`/api/trades/${testTradeId}/screenshots/${encodeURIComponent(screenshotUrl)}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Screenshot deleted successfully');

      const trade = await Trade.findById(testTradeId);
      expect(trade?.screenshots).not.toContain(screenshotUrl);
    });

    it('should return 404 for non-existent screenshot', async () => {
      const nonExistentUrl = 'https://res.cloudinary.com/test/image/upload/v1234567890/nonexistent.jpg';
      const response = await request(app)
        .delete(`/api/trades/${testTradeId}/screenshots/${encodeURIComponent(nonExistentUrl)}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Screenshot not found');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .delete(`/api/trades/${testTradeId}/screenshots/${encodeURIComponent(screenshotUrl)}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'User not authenticated');
    });
  });
}); 