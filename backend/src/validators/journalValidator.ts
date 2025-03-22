import { z } from 'zod';
import { Types } from 'mongoose';

// Journal entry validation schema
export const journalEntrySchema = z.object({
  date: z.string().or(z.date()).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  mood: z.enum(['GREAT', 'GOOD', 'NEUTRAL', 'BAD', 'TERRIBLE']),
  marketCondition: z.enum(['TRENDING', 'RANGING', 'CHOPPY', 'VOLATILE']),
  marketBias: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']),
  summary: z.string().min(1, 'Summary is required'),
  lessons: z.array(z.string()).optional().default([]),
  mistakes: z.array(z.string()).optional().default([]),
  improvements: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  relatedTrades: z.array(
    z.string().refine(
      val => Types.ObjectId.isValid(val),
      { message: 'Invalid trade ID format' }
    )
  ).optional().default([]),
});

// Use for partial updates
export const updateJournalEntrySchema = journalEntrySchema.partial();

// Validation function
export const validateJournalData = (data: unknown) => {
  return journalEntrySchema.parse(data);
};

// Validation function for updates
export const validateUpdateJournalData = (data: unknown) => {
  return updateJournalEntrySchema.parse(data);
};

// Schema for filtering journal entries
export const journalFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  mood: z.enum(['GREAT', 'GOOD', 'NEUTRAL', 'BAD', 'TERRIBLE']).optional(),
  marketCondition: z.enum(['TRENDING', 'RANGING', 'CHOPPY', 'VOLATILE']).optional(),
  marketBias: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
  sort: z.enum(['date', '-date', 'createdAt', '-createdAt', 'mood', '-mood']).optional().default('-date'),
});

// Validation function for filters
export const validateJournalFilters = (query: unknown) => {
  return journalFilterSchema.parse(query);
}; 