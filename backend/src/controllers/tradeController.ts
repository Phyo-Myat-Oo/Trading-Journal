import { Request, Response } from 'express';
import { Trade } from '../models/Trade';
import { z } from 'zod';
import { Types } from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cloudinary from '../config/cloudinary';

// Validation schemas
const createTradeSchema = z.object({
  accountId: z.string(),
  symbol: z.string().min(1, 'Symbol is required'),
  type: z.enum(['LONG', 'SHORT']),
  entryPrice: z.number().positive(),
  quantity: z.number().positive(),
  entryDate: z.string().datetime(),
  fees: z.number().min(0).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateTradeSchema = z.object({
  exitPrice: z.number().positive().optional(),
  exitDate: z.string().datetime().optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  fees: z.number().min(0).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage for Cloudinary
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
});

// Create new trade
export const createTrade = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const validatedData = createTradeSchema.parse(req.body);
    
    const trade = await Trade.create({
      ...validatedData,
      userId: new Types.ObjectId(req.user.id),
      accountId: new Types.ObjectId(validatedData.accountId),
      entryDate: new Date(validatedData.entryDate),
    });

    res.status(201).json(trade);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Create trade error:', error);
    res.status(500).json({ message: 'Error creating trade' });
  }
};

// Get all trades with filtering, sorting, and pagination
export const getTrades = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const {
      page = 1,
      limit = 10,
      sortBy = 'entryDate',
      sortOrder = 'desc',
      status,
      symbol,
      accountId,
      startDate,
      endDate,
      type,
    } = req.query;

    const query: any = { userId: req.user.id };

    // Apply filters
    if (status) query.status = status;
    if (symbol) query.symbol = symbol;
    if (accountId) query.accountId = accountId;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = new Date(startDate as string);
      if (endDate) query.entryDate.$lte = new Date(endDate as string);
    }

    // Apply sorting
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Apply pagination
    const skip = (Number(page) - 1) * Number(limit);

    const [trades, total] = await Promise.all([
      Trade.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .populate('accountId', 'name'),
      Trade.countDocuments(query)
    ]);

    res.json({
      trades,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ message: 'Error fetching trades' });
  }
};

// Get single trade
export const getTrade = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const trade = await Trade.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).populate('accountId', 'name');

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json(trade);
  } catch (error) {
    console.error('Get trade error:', error);
    res.status(500).json({ message: 'Error fetching trade' });
  }
};

// Update trade
export const updateTrade = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const validatedData = updateTradeSchema.parse(req.body);

    const trade = await Trade.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        $set: {
          ...validatedData,
          ...(validatedData.exitDate && { exitDate: new Date(validatedData.exitDate) }),
        },
      },
      { new: true }
    ).populate('accountId', 'name');

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json(trade);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Update trade error:', error);
    res.status(500).json({ message: 'Error updating trade' });
  }
};

// Delete trade
export const deleteTrade = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const trade = await Trade.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Delete associated screenshots
    if (trade.screenshots?.length) {
      trade.screenshots.forEach(screenshot => {
        const filePath = path.join('uploads/trades', screenshot);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.json({ message: 'Trade deleted successfully' });
  } catch (error) {
    console.error('Delete trade error:', error);
    res.status(500).json({ message: 'Error deleting trade' });
  }
};

// Upload trade screenshot
export const uploadScreenshot = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const trade = await Trade.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      {
        folder: 'trading-journal/trades',
        resource_type: 'auto',
        transformation: [
          { width: 1920, height: 1080, crop: 'limit' },
          { quality: 'auto' }
        ]
      }
    );

    // Add new screenshot to trade
    trade.screenshots = trade.screenshots || [];
    trade.screenshots.push(result.secure_url);
    await trade.save();

    res.json({
      message: 'Screenshot uploaded successfully',
      url: result.secure_url,
    });
  } catch (error) {
    console.error('Upload screenshot error:', error);
    res.status(500).json({ message: 'Error uploading screenshot' });
  }
};

// Delete trade screenshot
export const deleteScreenshot = async (req: Request, res: Response) => {
  try {
    const { id, url } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const trade = await Trade.findOne({ _id: id, userId });
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Initialize screenshots array if undefined
    if (!trade.screenshots) {
      trade.screenshots = [];
    }

    // Check if screenshot exists
    if (!trade.screenshots.includes(url)) {
      return res.status(404).json({ message: 'Screenshot not found' });
    }

    // Remove the screenshot from the array
    trade.screenshots = trade.screenshots.filter(s => s !== url);
    await trade.save();

    // Delete from Cloudinary
    const publicId = url.split('/').pop()?.split('.')[0];
    if (publicId) {
      await cloudinary.uploader.destroy(`trading-journal/trades/${publicId}`);
    }

    res.json({ message: 'Screenshot deleted successfully' });
  } catch (error) {
    console.error('Error deleting screenshot:', error);
    res.status(500).json({ message: 'Error deleting screenshot' });
  }
}; 