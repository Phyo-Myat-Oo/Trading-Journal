import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const tradeEntrySchema = z.object({
  action: z.enum(['BUY', 'SELL']),
  datetime: z.string().datetime(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  fee: z.number().min(0),
});

const tradeSchema = z.object({
  market: z.enum(['STOCK', 'OPTION', 'CRYPTO', 'FOREX']),
  symbol: z.string().min(1),
  side: z.enum(['LONG', 'SHORT']),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  entries: z.array(tradeEntrySchema).min(1),
  target: z.number().positive(),
  stopLoss: z.number().positive(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(100).optional(),
});

export const validateTrade = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = tradeSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    next(error);
  }
}; 