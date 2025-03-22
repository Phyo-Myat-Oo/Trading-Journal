import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AnalysisService } from '../services/AnalysisService';
import { IAnalysis, AnalysisType, AnalysisPeriod, Analysis } from '../models/Analysis';
import { validateCustomDate } from '../validators/dateValidator';
import { logger } from '../utils/logger';
import { AnalysisRepository } from '../repositories/AnalysisRepository';
import { StatisticsService } from '../services/StatisticsService';

/**
 * Get the latest analysis by type and period
 */
export async function getAnalysis(req: Request, res: Response): Promise<Response> {
  try {
    const { type, period } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate type
    if (!['PERFORMANCE', 'PATTERN', 'FORECAST'].includes(type)) {
      return res.status(400).json({ message: 'Invalid analysis type' });
    }

    // Validate period
    if (!['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'].includes(period)) {
      return res.status(400).json({ message: 'Invalid period' });
    }

    // For custom period, validate date range
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (period === 'CUSTOM') {
      const { start, end } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({ message: 'Start and end dates are required for custom period' });
      }

      // Validate dates
      const dateValidation = validateCustomDate(start.toString(), end.toString());
      if (!dateValidation.success) {
        return res.status(400).json({ message: dateValidation.error });
      }

      startDate = new Date(start.toString());
      endDate = new Date(end.toString());
    }

    // Get analysis from service
    const analysis = await AnalysisService.getAnalysis(
      userId,
      type as AnalysisType,
      { start: startDate || new Date(), end: endDate || new Date() },
      startDate,
      endDate
    );

    if (!analysis) {
      // If no analysis exists, generate one on demand
      if (startDate && endDate) {
        if (type === 'PERFORMANCE') {
          const newAnalysis = await AnalysisService.generatePerformanceAnalysis(
            userId,
            { start: startDate, end: endDate },
            startDate,
            endDate
          );
          return res.json(newAnalysis);
        } else if (type === 'PATTERN') {
          const newAnalysis = await AnalysisService.generatePatternAnalysis(
            userId,
            { start: startDate, end: endDate },
            startDate,
            endDate
          );
          return res.json(newAnalysis);
        }
      }
      
      return res.status(404).json({ message: 'No analysis found for the specified parameters' });
    }

    return res.json(analysis);
  } catch (error) {
    logger.error('Error in getAnalysis:', error);
    return res.status(500).json({ message: 'Error retrieving analysis' });
  }
}

/**
 * Generate a new analysis for the specified type and period
 */
export async function generateAnalysis(req: Request, res: Response): Promise<Response> {
  try {
    const { type, period } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate type
    if (!type || !['PERFORMANCE', 'PATTERN', 'FORECAST'].includes(type)) {
      return res.status(400).json({ message: 'Invalid analysis type' });
    }

    // Validate period
    if (!period || !['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'].includes(period)) {
      return res.status(400).json({ message: 'Invalid period' });
    }

    // For custom period, validate date range
    let startDate: Date;
    let endDate: Date;

    if (period === 'CUSTOM') {
      const { start, end } = req.body;
      
      if (!start || !end) {
        return res.status(400).json({ message: 'Start and end dates are required for custom period' });
      }

      // Validate dates
      const dateValidation = validateCustomDate(start, end);
      if (!dateValidation.success) {
        return res.status(400).json({ message: dateValidation.error });
      }

      startDate = new Date(start);
      endDate = new Date(end);
    } else {
      // Calculate date range based on period
      endDate = new Date();
      startDate = new Date();
      
      switch (period) {
        case 'DAILY':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case 'WEEKLY':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'MONTHLY':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'QUARTERLY':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'YEARLY':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(endDate.getMonth() - 1);
      }
    }

    // Generate the requested analysis
    let analysis;

    if (type === 'PERFORMANCE') {
      analysis = await AnalysisService.generatePerformanceAnalysis(
        userId,
        { start: startDate, end: endDate },
        startDate,
        endDate
      );
    } else if (type === 'PATTERN') {
      analysis = await AnalysisService.generatePatternAnalysis(
        userId,
        { start: startDate, end: endDate },
        startDate,
        endDate
      );
    } else {
      return res.status(400).json({ message: 'Unsupported analysis type' });
    }

    return res.status(201).json(analysis);
  } catch (error) {
    logger.error('Error in generateAnalysis:', error);
    return res.status(500).json({ message: 'Error generating analysis' });
  }
}

/**
 * Get summary of all available analyses for a user
 */
export async function getAnalysisSummary(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Query for active analyses
    const analyses = await Analysis.find(
      { userId: new Types.ObjectId(userId), isActive: true },
      { 
        type: 1, 
        period: 1, 
        startDate: 1, 
        endDate: 1, 
        createdAt: 1,
        metadata: 1
      }
    ).sort({ createdAt: -1 });

    // Summarize by analysis type
    const summary = analyses.reduce((acc: Record<string, any[]>, analysis) => {
      const key = analysis.type as string;
      if (!acc[key as string]) {
        acc[key as string] = [];
      }
      acc[key as string].push({
        id: analysis._id,
        period: analysis.period,
        startDate: (analysis as any).startDate,
        endDate: (analysis as any).endDate,
        createdAt: analysis.createdAt,
        metadata: (analysis as any).metadata
      });
      return acc;
    }, {});

    return res.json(summary);
  } catch (error) {
    logger.error('Error in getAnalysisSummary:', error);
    return res.status(500).json({ message: 'Error retrieving analysis summary' });
  }
}

/**
 * Queue a background analysis job for the user
 */
export async function queueAnalysisJob(req: Request, res: Response): Promise<Response> {
  try {
    const { types, period } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate types
    const validTypes = ['PERFORMANCE', 'PATTERN', 'FORECAST'];
    const analysisTypes = Array.isArray(types) 
      ? types.filter(type => validTypes.includes(type)) 
      : ['PERFORMANCE', 'PATTERN'];

    if (analysisTypes.length === 0) {
      return res.status(400).json({ message: 'No valid analysis types specified' });
    }

    // Validate period
    const validPeriods = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
    if (period && !validPeriods.includes(period)) {
      return res.status(400).json({ message: 'Invalid period' });
    }

    // Queue the job using the service
    await AnalysisService.scheduleAnalysis(
      userId,
      types as unknown as AnalysisType[],
      { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }
    );

    return res.status(202).json({ 
      message: 'Analysis job queued successfully',
      status: 'PENDING',
      types: analysisTypes,
      period: period || 'MONTHLY'
    });
  } catch (error) {
    logger.error('Error in queueAnalysisJob:', error);
    return res.status(500).json({ message: 'Error queueing analysis job' });
  }
}

/**
 * List all analyses for current user
 */
export const listAnalyses = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get analyses for the user (excluding data to reduce payload size)
    const analyses = await Analysis.find({ 
      userId: new Types.ObjectId(userId),
      isActive: true 
    })
    .select('-data')
    .sort({ createdAt: -1 })
    .lean();

    return res.json({ analyses });
  } catch (error) {
    console.error('Error listing analyses:', error);
    res.status(500).json({ message: 'Error listing analyses' });
  }
};

/**
 * Trigger analysis generation manually
 */
export const triggerAnalysis = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse request
    const { types, period } = z.object({
      types: z.array(z.enum(['PERFORMANCE', 'PATTERN', 'FORECAST'])).optional(),
      period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional()
    }).parse(req.body);

    // Create period object based on period string
    const now = new Date();
    const start = new Date();
    
    if (period) {
      switch (period) {
        case 'DAILY':
          start.setDate(now.getDate() - 1);
          break;
        case 'WEEKLY':
          start.setDate(now.getDate() - 7);
          break;
        case 'MONTHLY':
          start.setMonth(now.getMonth() - 1);
          break;
        case 'QUARTERLY':
          start.setMonth(now.getMonth() - 3);
          break;
        case 'YEARLY':
          start.setFullYear(now.getFullYear() - 1);
          break;
        default:
          start.setMonth(now.getMonth() - 1);
      }
    } else {
      // Default to monthly
      start.setMonth(now.getMonth() - 1);
    }
    
    const periodObject = { start, end: now };

    // Schedule analysis job
    await AnalysisService.scheduleAnalysis(
      userId,
      types as unknown as AnalysisType[],
      periodObject
    );

    return res.json({
      message: 'Analysis generation scheduled successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Error triggering analysis:', error);
    return res.status(500).json({ message: 'Error triggering analysis' });
  }
};

/**
 * Run specific analysis for a user account or trade
 */
export async function runSpecificAnalysis(req: Request, res: Response): Promise<Response> {
  try {
    const { type, period, accountId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate type
    if (!type || !['PERFORMANCE', 'PATTERN', 'FORECAST'].includes(type)) {
      return res.status(400).json({ message: 'Invalid analysis type' });
    }

    // Validate period
    if (!period || !['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'].includes(period)) {
      return res.status(400).json({ message: 'Invalid period' });
    }

    // Calculate date range based on period
    const endDate = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'DAILY':
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'WEEKLY':
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'MONTHLY':
        startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'QUARTERLY':
        startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'YEARLY':
        startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'CUSTOM':
        if (!req.body.startDate || !req.body.endDate) {
          return res.status(400).json({ message: 'Custom period requires startDate and endDate' });
        }
        startDate = new Date(req.body.startDate);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 1);
    }

    // If custom end date is provided, use it
    if (period === 'CUSTOM' && req.body.endDate) {
      endDate.setTime(new Date(req.body.endDate).getTime());
    }

    // Generate analysis based on type
    let analysis;
    
    if (type === 'PERFORMANCE') {
      // Optional filtering by account
      const queryOptions = accountId ? { accountId } : {};
      
      analysis = await AnalysisService.generatePerformanceAnalysis(
        userId,
        { start: startDate, end: endDate },
        startDate,
        endDate,
        queryOptions
      );
    } else if (type === 'PATTERN') {
      // Optional filtering by account
      const queryOptions = accountId ? { accountId } : {};
      
      analysis = await AnalysisService.generatePatternAnalysis(
        userId,
        { start: startDate, end: endDate },
        startDate,
        endDate,
        queryOptions
      );
    } else {
      return res.status(400).json({ message: 'Unsupported analysis type' });
    }

    return res.status(201).json({
      message: `${type} analysis completed successfully`,
      analysisId: analysis._id,
      metadata: analysis.metadata
    });
  } catch (error) {
    logger.error('Error in runSpecificAnalysis:', error);
    return res.status(500).json({ message: 'Error running analysis' });
  }
}

/**
 * Get list of analyses for a user
 */
export async function getUserAnalyses(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Parse query parameters
    const { 
      type, 
      period, 
      startDate, 
      endDate, 
      status, 
      accountId,
      limit = '20',
      offset = '0'
    } = req.query;

    // Build options for repository query
    const options: any = {
      limit: parseInt(limit.toString()),
      offset: parseInt(offset.toString())
    };

    if (type) options.type = type;
    if (period) options.period = period;
    if (status) options.status = status;
    if (accountId) options.accountId = accountId;
    
    if (startDate) options.startDate = new Date(startDate.toString());
    if (endDate) options.endDate = new Date(endDate.toString());

    // Get analyses
    const analyses = await AnalysisRepository.findByUser(userId, options);

    return res.json({
      total: analyses.length,
      analyses: analyses.map(analysis => ({
        id: analysis._id,
        type: analysis.type,
        period: analysis.period,
        startDate: analysis.startDate,
        endDate: analysis.endDate,
        status: analysis.status,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt,
        expiresAt: analysis.expiresAt,
        metadata: analysis.metadata
      }))
    });
  } catch (error) {
    logger.error('Error getting user analyses:', error);
    return res.status(500).json({ message: 'Error retrieving analyses' });
  }
}

/**
 * Get a specific analysis by ID
 */
export async function getAnalysisById(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get analysis and verify ownership
    const analysis = await AnalysisRepository.findById(id);

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    if ((analysis as any).userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to this analysis' });
    }

    return res.json(analysis);
  } catch (error) {
    logger.error(`Error getting analysis by ID:`, error);
    return res.status(500).json({ message: 'Error retrieving analysis' });
  }
}

/**
 * Trigger a new analysis
 */
export const scheduleAnalysis = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate request body
    const { type, period, startDate, endDate, accountId } = req.body;

    if (!type || !period || !startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Missing required fields: type, period, startDate, and endDate are required' 
      });
    }

    // Validate type and period
    if (!Object.values(AnalysisType).includes(type)) {
      return res.status(400).json({ 
        message: `Invalid analysis type. Must be one of: ${Object.values(AnalysisType).join(', ')}` 
      });
    }

    if (!Object.values(AnalysisPeriod).includes(period)) {
      return res.status(400).json({ 
        message: `Invalid analysis period. Must be one of: ${Object.values(AnalysisPeriod).join(', ')}` 
      });
    }

    // Parse dates
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    // Validate date range
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (parsedStartDate > parsedEndDate) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }

    // Initialize a pending analysis record
    const pendingAnalysis = await AnalysisRepository.initializePending(
      userId,
      type as AnalysisType,
      period as AnalysisPeriod,
      parsedStartDate,
      parsedEndDate,
      accountId
    );

    // Generate analysis based on type
    try {
      let data;
      const startTime = Date.now();

      if (type === AnalysisType.PERFORMANCE) {
        data = await StatisticsService.calculateTradeStats(
          userId, 
          parsedStartDate, 
          parsedEndDate, 
          accountId
        );
      } else if (type === AnalysisType.SYMBOL) {
        data = await StatisticsService.analyzeSymbolPerformance(
          userId, 
          parsedStartDate, 
          parsedEndDate, 
          accountId
        );
      } else if (type === AnalysisType.TIME_OF_DAY) {
        data = await StatisticsService.analyzeTimeOfDay(
          userId, 
          parsedStartDate, 
          parsedEndDate, 
          accountId
        );
      } else if (type === AnalysisType.DAY_OF_WEEK) {
        data = await StatisticsService.analyzeDayOfWeek(
          userId, 
          parsedStartDate, 
          parsedEndDate, 
          accountId
        );
      } else if (type === AnalysisType.RISK) {
        data = await StatisticsService.calculateRiskMetrics(
          userId, 
          parsedStartDate, 
          parsedEndDate, 
          accountId
        );
      } else if (type === AnalysisType.JOURNAL_CORRELATION) {
        data = await StatisticsService.analyzeJournalCorrelation(
          userId, 
          parsedStartDate, 
          parsedEndDate
        );
      } else if (type === AnalysisType.DASHBOARD) {
        // For dashboard, get all stats and combine them
        const [
          basicStats,
          symbolStats,
          timeOfDayStats,
          dayOfWeekStats,
          riskStats,
          journalStats
        ] = await Promise.all([
          StatisticsService.calculateTradeStats(userId, parsedStartDate, parsedEndDate, accountId),
          StatisticsService.analyzeSymbolPerformance(userId, parsedStartDate, parsedEndDate, accountId),
          StatisticsService.analyzeTimeOfDay(userId, parsedStartDate, parsedEndDate, accountId),
          StatisticsService.analyzeDayOfWeek(userId, parsedStartDate, parsedEndDate, accountId),
          StatisticsService.calculateRiskMetrics(userId, parsedStartDate, parsedEndDate, accountId),
          StatisticsService.analyzeJournalCorrelation(userId, parsedStartDate, parsedEndDate)
        ]);

        data = {
          basicStats,
          symbolStats,
          timeOfDayStats,
          dayOfWeekStats,
          riskStats,
          journalStats
        };
      }

      const calculationTime = Date.now() - startTime;

      // Mark analysis as completed
      await AnalysisRepository.markCompleted(
        (pendingAnalysis as any)._id.toString(),
        data,
        { calculationTime }
      );

      // Return the completed analysis
      return res.status(201).json({
        message: 'Analysis completed successfully',
        analysisId: pendingAnalysis._id,
        data,
        metadata: {
          calculationTime,
          type: type as AnalysisType,
          period: period as AnalysisPeriod,
          startDate: parsedStartDate,
          endDate: parsedEndDate
        }
      });
    } catch (error) {
      // Mark analysis as failed
      await AnalysisRepository.markFailed(
        (pendingAnalysis as any)._id.toString(),
        error instanceof Error ? error.message : 'Unknown error'
      );

      logger.error('Error generating analysis:', error);
      return res.status(500).json({ message: 'Error generating analysis' });
    }
  } catch (error) {
    logger.error(`Error scheduling analysis: ${error}`);
    return res.status(500).json({ message: 'Error scheduling analysis' });
  }
};

/**
 * Delete an analysis
 */
export async function deleteAnalysis(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get analysis and verify ownership
    const analysis = await AnalysisRepository.findById(id);

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    if ((analysis as any).userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to this analysis' });
    }

    // Delete the analysis
    await AnalysisRepository.delete(id);

    return res.status(200).json({ 
      message: 'Analysis deleted successfully',
      id
    });
  } catch (error) {
    logger.error(`Error deleting analysis:`, error);
    return res.status(500).json({ message: 'Error deleting analysis' });
  }
}

/**
 * Get analytics data over time
 */
export const getAnalyticsOverTime = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { type, period, metric, startDate, endDate, accountId } = req.query;

    if (!metric || !type) {
      return res.status(400).json({ message: 'Metric and analysis type are required' });
    }

    // Convert string type to enum
    let analysisType: AnalysisType;
    if (Object.values(AnalysisType).includes(type as AnalysisType)) {
      analysisType = type as AnalysisType;
    } else {
      return res.status(400).json({ message: 'Invalid analysis type' });
    }
    
    // Convert string period to enum if provided
    let analysisPeriod: AnalysisPeriod | undefined;
    if (period && Object.values(AnalysisPeriod).includes(period as AnalysisPeriod)) {
      analysisPeriod = period as AnalysisPeriod;
    }

    // Use the static method to find analyses by user with the correct parameters
    const analyses = await AnalysisRepository.findByUser(
      userId,
      { 
        type: analysisType,
        period: analysisPeriod,
        status: 'COMPLETED',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        accountId: accountId as string | undefined
      }
    );

    if (!analyses || analyses.length === 0) {
      return res.status(404).json({ message: 'No analyses found' });
    }

    // Sort analyses by createdAt
    const sortedAnalyses = [...analyses].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Extract the requested metric from each analysis
    const timeSeriesData = sortedAnalyses.map((analysis: IAnalysis) => {
      const metricValue = extractMetricFromAnalysis(analysis.data, metric as string);
      return {
        date: analysis.createdAt,
        value: metricValue,
        analysisId: analysis._id
      };
    }).filter((item: { value: any }) => item.value !== undefined);

    return res.status(200).json({
      metric: metric,
      data: timeSeriesData
    });
  } catch (error) {
    logger.error(`Error getting analytics over time: ${error}`);
    return res.status(500).json({ message: 'Error retrieving analytics over time' });
  }
};

/**
 * Compare two analyses
 */
export const compareAnalyses = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { baseAnalysisId, comparisonAnalysisId } = req.params;

    if (!baseAnalysisId || !comparisonAnalysisId) {
      return res.status(400).json({ message: 'Two analysis IDs are required for comparison' });
    }
    
    // Get both analyses using the static method
    const baseAnalysis = await AnalysisRepository.findById(baseAnalysisId);
    const comparisonAnalysis = await AnalysisRepository.findById(comparisonAnalysisId);

    // Verify both analyses exist and belong to the user
    if (!baseAnalysis || !comparisonAnalysis) {
      return res.status(404).json({ message: 'One or both analyses not found' });
    }

    if ((baseAnalysis as any).userId.toString() !== userId || (comparisonAnalysis as any).userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to access these analyses' });
    }

    // Extract key metrics from both analyses
    const baseMetrics = extractMetricsFromAnalysis(baseAnalysis.data);
    const comparisonMetrics = extractMetricsFromAnalysis(comparisonAnalysis.data);

    // Calculate differences
    const differences = calculateDifferences(baseMetrics, comparisonMetrics);

    return res.status(200).json({
      baseAnalysis: {
        id: baseAnalysis._id,
        type: baseAnalysis.type,
        period: baseAnalysis.period,
        createdAt: baseAnalysis.createdAt,
        metrics: baseMetrics
      },
      comparisonAnalysis: {
        id: comparisonAnalysis._id,
        type: comparisonAnalysis.type,
        period: comparisonAnalysis.period,
        createdAt: comparisonAnalysis.createdAt,
        metrics: comparisonMetrics
      },
      differences
    });
  } catch (error) {
    logger.error(`Error comparing analyses: ${error}`);
    return res.status(500).json({ message: 'Error comparing analyses' });
  }
};

/**
 * Helper function to extract a metric from analysis data
 */
function extractMetricFromAnalysis(data: any, metricPath: string): number | undefined {
  if (!data) return undefined;
  
  const parts = metricPath.split('.');
  let value = data;
  
  for (const part of parts) {
    if (value === undefined || value === null) return undefined;
    value = value[part];
  }
  
  return typeof value === 'number' ? value : undefined;
}

/**
 * Helper function to extract common metrics from analysis data
 */
function extractMetricsFromAnalysis(data: any): Record<string, number> {
  const metrics: Record<string, number> = {};
  
  if (!data) return metrics;
  
  // Extract common statistics based on analysis type
  if (data.tradeStats) {
    metrics.totalTrades = data.tradeStats.totalTrades || 0;
    metrics.winRate = data.tradeStats.winRate || 0;
    metrics.profitFactor = data.tradeStats.profitFactor || 0;
    metrics.averageReturn = data.tradeStats.averageReturn || 0;
    metrics.netProfit = data.tradeStats.netProfit || 0;
  }
  
  if (data.riskMetrics) {
    metrics.maxDrawdown = data.riskMetrics.maxDrawdown || 0;
    metrics.sharpeRatio = data.riskMetrics.sharpeRatio || 0;
    metrics.volatility = data.riskMetrics.volatility || 0;
  }
  
  return metrics;
}

/**
 * Helper function to calculate differences between metrics
 */
function calculateDifferences(base: Record<string, number>, comparison: Record<string, number>): Record<string, { absolute: number; percentage: number }> {
  const differences: Record<string, { absolute: number; percentage: number }> = {};
  
  for (const metric in base) {
    if (Object.prototype.hasOwnProperty.call(comparison, metric)) {
      const baseValue = base[metric];
      const comparisonValue = comparison[metric];
      const absoluteDifference = comparisonValue - baseValue;
      
      // Avoid division by zero
      const percentageDifference = baseValue !== 0 
        ? (absoluteDifference / Math.abs(baseValue)) * 100 
        : comparisonValue !== 0 ? 100 : 0;
      
      differences[metric] = {
        absolute: absoluteDifference,
        percentage: percentageDifference
      };
    }
  }
  
  return differences;
}

/**
 * Get the latest analysis by type regardless of period
 */
export async function getLatestAnalysisByType(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    const { type } = req.params;
    const { accountId } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate type
    if (!Object.values(AnalysisType).includes(type as AnalysisType)) {
      return res.status(400).json({ 
        message: `Invalid analysis type. Must be one of: ${Object.values(AnalysisType).join(', ')}` 
      });
    }

    // Find the latest analysis of this type for the user
    const options: Record<string, any> = {
      type: type as AnalysisType,
      status: 'COMPLETED',
      limit: 1,
      sort: { createdAt: -1 }
    };

    if (accountId) {
      options.accountId = accountId as string;
    }

    const analyses = await AnalysisRepository.findByUser(userId, options);

    if (!analyses || analyses.length === 0) {
      return res.status(404).json({ message: 'No analysis found for the specified type' });
    }

    return res.status(200).json(analyses[0]);
  } catch (error) {
    logger.error(`Error getting latest analysis by type: ${error}`);
    return res.status(500).json({ message: 'Error retrieving analysis' });
  }
}

/**
 * Get analysis history by type
 */
export async function getAnalysisHistoryByType(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    const { type } = req.params;
    const { limit = '10', offset = '0', accountId } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate type
    if (!Object.values(AnalysisType).includes(type as AnalysisType)) {
      return res.status(400).json({ 
        message: `Invalid analysis type. Must be one of: ${Object.values(AnalysisType).join(', ')}` 
      });
    }

    // Find all analyses of this type for the user
    const options: Record<string, any> = {
      type: type as AnalysisType,
      status: 'COMPLETED',
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sort: { createdAt: -1 }
    };

    if (accountId) {
      options.accountId = accountId as string;
    }

    const analyses = await AnalysisRepository.findByUser(userId, options);

    // Format the response to include less data
    const formattedAnalyses = analyses.map(analysis => ({
      id: analysis._id,
      type: analysis.type,
      period: analysis.period,
      startDate: analysis.startDate,
      endDate: analysis.endDate,
      createdAt: analysis.createdAt,
      metadata: analysis.metadata
    }));

    return res.status(200).json({
      total: analyses.length,
      analyses: formattedAnalyses
    });
  } catch (error) {
    logger.error(`Error getting analysis history: ${error}`);
    return res.status(500).json({ message: 'Error retrieving analysis history' });
  }
}

/**
 * Get analysis by custom date range
 */
export async function getAnalysisByDateRange(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    const { type } = req.params;
    const { startDate, endDate, accountId, refresh } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate required params
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Validate type
    if (!Object.values(AnalysisType).includes(type as AnalysisType)) {
      return res.status(400).json({ 
        message: `Invalid analysis type. Must be one of: ${Object.values(AnalysisType).join(', ')}` 
      });
    }

    // Parse dates
    const parsedStartDate = new Date(startDate as string);
    const parsedEndDate = new Date(endDate as string);

    // Validate date format
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Validate date range
    if (parsedStartDate > parsedEndDate) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }

    const shouldRefresh = refresh === 'true';

    // If not refreshing, try to find an existing analysis first
    if (!shouldRefresh) {
      const options: Record<string, any> = {
        type: type as AnalysisType,
        period: 'CUSTOM' as unknown as AnalysisPeriod,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        status: 'COMPLETED'
      };

      if (accountId) {
        options.accountId = accountId as string;
      }

      const analyses = await AnalysisRepository.findByUser(userId, options);

      if (analyses && analyses.length > 0) {
        return res.status(200).json(analyses[0]);
      }
    }

    // No existing analysis found or refresh requested, generate a new one
    // Initialize a pending analysis record
    const pendingAnalysis = await AnalysisRepository.initializePending(
      userId,
      type as AnalysisType,
      'CUSTOM' as unknown as AnalysisPeriod,
      parsedStartDate,
      parsedEndDate,
      accountId as string | undefined
    );

    try {
      // Generate the analysis based on type
      let data;
      const startTime = Date.now();

      if (type === AnalysisType.PERFORMANCE) {
        data = await StatisticsService.calculateTradeStats(
          userId, 
          parsedStartDate, 
          parsedEndDate, 
          accountId as string | undefined
        );
      } else if (type === AnalysisType.SYMBOL) {
        data = await StatisticsService.analyzeSymbolPerformance(
          userId, 
          parsedStartDate, 
          parsedEndDate, 
          accountId as string | undefined
        );
      } else if (type === AnalysisType.TIME_OF_DAY) {
        data = await StatisticsService.analyzeTimeOfDay(
          userId, 
          parsedStartDate, 
          parsedEndDate, 
          accountId as string | undefined
        );
      } else if (type === AnalysisType.DAY_OF_WEEK) {
        data = await StatisticsService.analyzeDayOfWeek(
          userId, 
          parsedStartDate, 
          parsedEndDate, 
          accountId as string | undefined
        );
      } else if (type === AnalysisType.RISK) {
        data = await StatisticsService.calculateRiskMetrics(
          userId, 
          parsedStartDate, 
          parsedEndDate, 
          accountId as string | undefined
        );
      } else if (type === AnalysisType.JOURNAL_CORRELATION) {
        data = await StatisticsService.analyzeJournalCorrelation(
          userId, 
          parsedStartDate, 
          parsedEndDate
        );
      }

      const calculationTime = Date.now() - startTime;

      // Mark analysis as completed
      const completedAnalysis = await AnalysisRepository.markCompleted(
        (pendingAnalysis as any)._id.toString(),
        data,
        { calculationTime }
      );

      return res.status(201).json(completedAnalysis);
    } catch (error) {
      // Mark analysis as failed
      await AnalysisRepository.markFailed(
        (pendingAnalysis as any)._id.toString(),
        error instanceof Error ? error.message : 'Unknown error'
      );

      logger.error(`Error generating date range analysis: ${error}`);
      return res.status(500).json({ message: 'Error generating analysis' });
    }
  } catch (error) {
    logger.error(`Error in getAnalysisByDateRange: ${error}`);
    return res.status(500).json({ message: 'Error retrieving analysis' });
  }
}

/**
 * Get dashboard analytics (combined analysis data)
 */
export async function getDashboardAnalytics(req: Request, res: Response): Promise<Response> {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, accountId, refresh } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // If dates are not provided, use last 30 days
    const parsedEndDate = endDate ? new Date(endDate as string) : new Date();
    const parsedStartDate = startDate 
      ? new Date(startDate as string) 
      : new Date(parsedEndDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days back

    // Validate date format
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const shouldRefresh = refresh === 'true';

    // If not refreshing, try to find an existing dashboard analysis first
    if (!shouldRefresh) {
      const options: Record<string, any> = {
        type: AnalysisType.DASHBOARD,
        period: 'CUSTOM' as unknown as AnalysisPeriod,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        status: 'COMPLETED'
      };

      if (accountId) {
        options.accountId = accountId as string;
      }

      const analyses = await AnalysisRepository.findByUser(userId, options);

      if (analyses && analyses.length > 0) {
        return res.status(200).json(analyses[0]);
      }
    }

    // No existing analysis found or refresh requested, generate a new one
    // Initialize a pending analysis record
    const pendingAnalysis = await AnalysisRepository.initializePending(
      userId,
      AnalysisType.DASHBOARD,
      'CUSTOM' as unknown as AnalysisPeriod,
      parsedStartDate,
      parsedEndDate,
      accountId as string | undefined
    );

    try {
      // For dashboard, get all stats and combine them
      const startTime = Date.now();
      
      const [
        basicStats,
        symbolStats,
        timeOfDayStats,
        dayOfWeekStats,
        riskStats,
        journalStats
      ] = await Promise.all([
        StatisticsService.calculateTradeStats(userId, parsedStartDate, parsedEndDate, accountId as string | undefined),
        StatisticsService.analyzeSymbolPerformance(userId, parsedStartDate, parsedEndDate, accountId as string | undefined),
        StatisticsService.analyzeTimeOfDay(userId, parsedStartDate, parsedEndDate, accountId as string | undefined),
        StatisticsService.analyzeDayOfWeek(userId, parsedStartDate, parsedEndDate, accountId as string | undefined),
        StatisticsService.calculateRiskMetrics(userId, parsedStartDate, parsedEndDate, accountId as string | undefined),
        StatisticsService.analyzeJournalCorrelation(userId, parsedStartDate, parsedEndDate)
      ]);

      const data = {
        basicStats,
        symbolStats,
        timeOfDayStats,
        dayOfWeekStats,
        riskStats,
        journalStats
      };

      const calculationTime = Date.now() - startTime;

      // Mark analysis as completed
      const completedAnalysis = await AnalysisRepository.markCompleted(
        (pendingAnalysis as any)._id.toString(),
        data,
        { 
          calculationTime,
          totalTrades: basicStats?.totalTrades || 0,
          dateRange: {
            start: parsedStartDate,
            end: parsedEndDate
          }
        }
      );

      return res.status(201).json(completedAnalysis);
    } catch (error) {
      // Mark analysis as failed
      await AnalysisRepository.markFailed(
        (pendingAnalysis as any)._id.toString(),
        error instanceof Error ? error.message : 'Unknown error'
      );

      logger.error(`Error generating dashboard analytics: ${error}`);
      return res.status(500).json({ message: 'Error generating dashboard analytics' });
    }
  } catch (error) {
    logger.error(`Error in getDashboardAnalytics: ${error}`);
    return res.status(500).json({ message: 'Error retrieving dashboard analytics' });
  }
} 