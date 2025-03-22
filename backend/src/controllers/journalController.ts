import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { JournalEntry, IJournalEntry } from '../models/JournalEntry';
import { validateJournalData, validateUpdateJournalData, validateJournalFilters } from '../validators/journalValidator';
import { z } from 'zod';

/**
 * Create a new journal entry
 */
export const createJournalEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate input data
    const validatedData = validateJournalData(req.body);

    // Convert related trades to ObjectIds
    const relatedTrades = validatedData.relatedTrades?.map(id => new Types.ObjectId(id)) || [];

    // Create journal entry
    const journalEntry = await JournalEntry.create({
      userId: new Types.ObjectId(userId),
      ...validatedData,
      relatedTrades,
    });

    res.status(201).json({
      message: 'Journal entry created successfully',
      journalEntry,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Error creating journal entry:', error);
    res.status(500).json({ message: 'Error creating journal entry' });
  }
};

/**
 * Get all journal entries for the user with pagination and filtering
 */
export const getJournalEntries = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse query parameters
    const filters = validateJournalFilters({
      ...req.query,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });

    // Building the filter
    const filterCriteria: any = { userId: new Types.ObjectId(userId) };
    
    // Date range
    if (filters.startDate || filters.endDate) {
      filterCriteria.date = {};
      if (filters.startDate) {
        filterCriteria.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        filterCriteria.date.$lte = new Date(filters.endDate);
      }
    }
    
    // Mood, market condition, and bias
    if (filters.mood) {
      filterCriteria.mood = filters.mood;
    }
    
    if (filters.marketCondition) {
      filterCriteria.marketCondition = filters.marketCondition;
    }
    
    if (filters.marketBias) {
      filterCriteria.marketBias = filters.marketBias;
    }
    
    // Tags filter (if any tags match)
    if (filters.tags && filters.tags.length > 0) {
      filterCriteria.tags = { $in: filters.tags };
    }
    
    // Text search across multiple fields
    if (filters.search) {
      filterCriteria.$or = [
        { summary: { $regex: filters.search, $options: 'i' } },
        { notes: { $regex: filters.search, $options: 'i' } },
        { lessons: { $elemMatch: { $regex: filters.search, $options: 'i' } } },
        { mistakes: { $elemMatch: { $regex: filters.search, $options: 'i' } } },
        { improvements: { $elemMatch: { $regex: filters.search, $options: 'i' } } },
      ];
    }

    // Prepare sort options
    const sortOption = filters.sort || '-date';
    const sortField = sortOption.startsWith('-') ? sortOption.substring(1) : sortOption;
    const sortOrder = sortOption.startsWith('-') ? -1 : 1;
    const sortCriteria: any = {};
    sortCriteria[sortField] = sortOrder;

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const journalEntries = await JournalEntry.find(filterCriteria)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .populate('relatedTrades', 'symbol entryDate exitDate profitLoss');

    // Get total count for pagination
    const totalEntries = await JournalEntry.countDocuments(filterCriteria);
    const totalPages = Math.ceil(totalEntries / limit);

    res.json({
      entries: journalEntries,
      pagination: {
        page,
        limit,
        totalEntries,
        totalPages,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ message: 'Error fetching journal entries' });
  }
};

/**
 * Get a single journal entry by ID
 */
export const getJournalEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const entryId = req.params.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({ message: 'Invalid journal entry ID' });
    }

    const journalEntry = await JournalEntry.findOne({
      _id: entryId,
      userId: new Types.ObjectId(userId)
    }).populate('relatedTrades', 'symbol entryDate exitDate profitLoss');

    if (!journalEntry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    res.json(journalEntry);
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    res.status(500).json({ message: 'Error fetching journal entry' });
  }
};

/**
 * Update a journal entry
 */
export const updateJournalEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const entryId = req.params.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({ message: 'Invalid journal entry ID' });
    }

    // Validate update data
    const validatedData = validateUpdateJournalData(req.body);

    // Convert related trades to ObjectIds if present
    const updates: any = { ...validatedData };
    if (validatedData.relatedTrades) {
      updates.relatedTrades = validatedData.relatedTrades.map(id => new Types.ObjectId(id));
    }

    const journalEntry = await JournalEntry.findOneAndUpdate(
      { _id: entryId, userId: new Types.ObjectId(userId) },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('relatedTrades', 'symbol entryDate exitDate profitLoss');

    if (!journalEntry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    res.json({
      message: 'Journal entry updated successfully',
      journalEntry,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Error updating journal entry:', error);
    res.status(500).json({ message: 'Error updating journal entry' });
  }
};

/**
 * Delete a journal entry
 */
export const deleteJournalEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const entryId = req.params.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({ message: 'Invalid journal entry ID' });
    }

    const result = await JournalEntry.findOneAndDelete({
      _id: entryId,
      userId: new Types.ObjectId(userId)
    });

    if (!result) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }

    res.json({ message: 'Journal entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({ message: 'Error deleting journal entry' });
  }
};

/**
 * Get journal statistics for the user
 */
export const getJournalStatistics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse date range from query parameters
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1)); // Default to 1 year ago
    
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date(); // Default to today

    // Basic statistics
    const totalEntries = await JournalEntry.countDocuments({
      userId: new Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate }
    });

    // Mood distribution
    const moodStats = await JournalEntry.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$mood',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          mood: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Market condition distribution
    const marketConditionStats = await JournalEntry.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$marketCondition',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          condition: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Market bias distribution
    const marketBiasStats = await JournalEntry.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$marketBias',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          bias: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Top tags
    const tagStats = await JournalEntry.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate },
          tags: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          tag: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Entries per week/month
    const entriesPerPeriod = await JournalEntry.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            week: { $week: '$date' }
          },
          count: { $sum: 1 },
          avgMoodNumeric: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ['$mood', 'TERRIBLE'] }, then: 1 },
                  { case: { $eq: ['$mood', 'BAD'] }, then: 2 },
                  { case: { $eq: ['$mood', 'NEUTRAL'] }, then: 3 },
                  { case: { $eq: ['$mood', 'GOOD'] }, then: 4 },
                  { case: { $eq: ['$mood', 'GREAT'] }, then: 5 }
                ],
                default: 3
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          week: '$_id.week',
          count: 1,
          avgMood: {
            $switch: {
              branches: [
                { case: { $and: [{ $gte: ['$avgMoodNumeric', 4.5] }] }, then: 'GREAT' },
                { case: { $and: [{ $gte: ['$avgMoodNumeric', 3.5] }, { $lt: ['$avgMoodNumeric', 4.5] }] }, then: 'GOOD' },
                { case: { $and: [{ $gte: ['$avgMoodNumeric', 2.5] }, { $lt: ['$avgMoodNumeric', 3.5] }] }, then: 'NEUTRAL' },
                { case: { $and: [{ $gte: ['$avgMoodNumeric', 1.5] }, { $lt: ['$avgMoodNumeric', 2.5] }] }, then: 'BAD' },
                { case: { $lt: ['$avgMoodNumeric', 1.5] }, then: 'TERRIBLE' }
              ],
              default: 'NEUTRAL'
            }
          }
        }
      },
      { $sort: { year: 1, month: 1, week: 1 } }
    ]);

    // Normalize data for response
    const moodDistribution = {
      GREAT: 0,
      GOOD: 0,
      NEUTRAL: 0,
      BAD: 0,
      TERRIBLE: 0,
      ...Object.fromEntries(moodStats.map(stat => [stat.mood, stat.count]))
    };

    const marketConditionDistribution = {
      TRENDING: 0,
      RANGING: 0,
      CHOPPY: 0,
      VOLATILE: 0,
      ...Object.fromEntries(marketConditionStats.map(stat => [stat.condition, stat.count]))
    };

    const marketBiasDistribution = {
      BULLISH: 0,
      BEARISH: 0,
      NEUTRAL: 0,
      ...Object.fromEntries(marketBiasStats.map(stat => [stat.bias, stat.count]))
    };

    res.json({
      totalEntries,
      dateRange: {
        startDate,
        endDate
      },
      statistics: {
        moodDistribution,
        marketConditionDistribution,
        marketBiasDistribution,
        topTags: tagStats,
        entriesPerPeriod
      }
    });
  } catch (error) {
    console.error('Error fetching journal statistics:', error);
    res.status(500).json({ message: 'Error fetching journal statistics' });
  }
};

/**
 * Get common patterns from journal entries
 */
export const getJournalPatterns = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse date range from query parameters
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1)); // Default to 1 year ago
    
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date(); // Default to today

    // Common mistakes analysis
    const commonMistakes = await JournalEntry.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate },
          mistakes: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$mistakes' },
      {
        $group: {
          _id: '$mistakes',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          mistake: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Common lessons analysis
    const commonLessons = await JournalEntry.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate },
          lessons: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$lessons' },
      {
        $group: {
          _id: '$lessons',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          lesson: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Common improvements analysis
    const commonImprovements = await JournalEntry.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate },
          improvements: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$improvements' },
      {
        $group: {
          _id: '$improvements',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          improvement: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Mood correlation with market conditions
    const moodByMarketCondition = await JournalEntry.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            mood: '$mood',
            marketCondition: '$marketCondition'
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          mood: '$_id.mood',
          marketCondition: '$_id.marketCondition',
          count: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Mood correlation with market bias
    const moodByMarketBias = await JournalEntry.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            mood: '$mood',
            marketBias: '$marketBias'
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          mood: '$_id.mood',
          marketBias: '$_id.marketBias',
          count: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      dateRange: {
        startDate,
        endDate
      },
      patterns: {
        commonMistakes,
        commonLessons,
        commonImprovements,
        correlations: {
          moodByMarketCondition,
          moodByMarketBias
        }
      }
    });
  } catch (error) {
    console.error('Error analyzing journal patterns:', error);
    res.status(500).json({ message: 'Error analyzing journal patterns' });
  }
}; 