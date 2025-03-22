import { Request, Response } from 'express';
import { Trade } from '../../models/Trade';
import { uploadScreenshot, deleteScreenshot } from '../../controllers/tradeController';
import cloudinary from '../../config/cloudinary';
import { Types } from 'mongoose';

// Mock Cloudinary
jest.mock('../../config/cloudinary', () => ({
  uploader: {
    upload: jest.fn(),
    destroy: jest.fn(),
  },
}));

// Mock Trade model
jest.mock('../../models/Trade');

describe('Trade Controller - Image Upload', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    mockRes = {
      json: mockJson,
      status: mockStatus,
    };

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('uploadScreenshot', () => {
    const mockTradeId = new Types.ObjectId().toString();
    const mockUserId = new Types.ObjectId().toString();
    const mockCloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/v1234567890/test.jpg';

    beforeEach(() => {
      mockReq = {
        user: { id: mockUserId },
        params: { id: mockTradeId },
        file: {
          fieldname: 'screenshot',
          originalname: 'test-image.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test-image'),
          size: 1024,
        } as Express.Multer.File,
      };
    });

    it('should successfully upload a screenshot', async () => {
      // Mock Trade.findOne
      (Trade.findOne as jest.Mock).mockResolvedValueOnce({
        _id: mockTradeId,
        userId: mockUserId,
        screenshots: [],
        save: jest.fn().mockResolvedValueOnce({}),
      });

      // Mock Cloudinary upload
      (cloudinary.uploader.upload as jest.Mock).mockResolvedValueOnce({
        secure_url: mockCloudinaryUrl,
      });

      await uploadScreenshot(mockReq as Request, mockRes as Response);

      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
        expect.stringContaining('data:image/jpeg;base64'),
        expect.objectContaining({
          folder: 'trading-journal/trades',
          resource_type: 'auto',
          transformation: expect.any(Array),
        })
      );

      expect(mockStatus).not.toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Screenshot uploaded successfully',
        url: mockCloudinaryUrl,
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = undefined;

      await uploadScreenshot(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'User not authenticated',
      });
    });

    it('should return 400 if no file is uploaded', async () => {
      mockReq.file = undefined;

      await uploadScreenshot(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'No file uploaded',
      });
    });

    it('should return 404 if trade is not found', async () => {
      (Trade.findOne as jest.Mock).mockResolvedValueOnce(null);

      await uploadScreenshot(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Trade not found',
      });
    });

    it('should handle Cloudinary upload errors', async () => {
      (Trade.findOne as jest.Mock).mockResolvedValueOnce({
        _id: mockTradeId,
        userId: mockUserId,
        screenshots: [],
        save: jest.fn().mockResolvedValueOnce({}),
      });

      (cloudinary.uploader.upload as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'));

      await uploadScreenshot(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Error uploading screenshot',
      });
    });
  });

  describe('deleteScreenshot', () => {
    const mockTradeId = new Types.ObjectId().toString();
    const mockUserId = new Types.ObjectId().toString();
    const mockScreenshotUrl = 'https://res.cloudinary.com/test/image/upload/v1234567890/test.jpg';

    beforeEach(() => {
      mockReq = {
        user: { id: mockUserId },
        params: {
          id: mockTradeId,
          url: mockScreenshotUrl,
        },
      };
    });

    it('should successfully delete a screenshot', async () => {
      // Mock Trade.findOne
      (Trade.findOne as jest.Mock).mockResolvedValueOnce({
        _id: mockTradeId,
        userId: mockUserId,
        screenshots: [mockScreenshotUrl],
        save: jest.fn().mockResolvedValueOnce({}),
      });

      // Mock Cloudinary destroy
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValueOnce({});

      await deleteScreenshot(mockReq as Request, mockRes as Response);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        expect.stringContaining('trading-journal/trades')
      );

      expect(mockStatus).not.toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Screenshot deleted successfully',
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = undefined;

      await deleteScreenshot(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'User not authenticated',
      });
    });

    it('should return 404 if screenshot is not found', async () => {
      const mockTrade = {
        _id: 'test-trade-id',
        userId: 'test-user-id',
        screenshots: []
      };

      (Trade.findOne as jest.Mock).mockResolvedValueOnce(mockTrade);

      await deleteScreenshot(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Screenshot not found',
      });
    });

    it('should handle Cloudinary delete errors', async () => {
      (Trade.findOne as jest.Mock).mockResolvedValueOnce({
        _id: mockTradeId,
        userId: mockUserId,
        screenshots: [mockScreenshotUrl],
        save: jest.fn().mockResolvedValueOnce({}),
      });

      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValueOnce(new Error('Delete failed'));

      await deleteScreenshot(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Error deleting screenshot',
      });
    });
  });
}); 