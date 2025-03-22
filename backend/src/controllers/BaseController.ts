import { Request, Response, NextFunction } from 'express';
import { Document } from 'mongoose';
import { BaseService } from '../services/BaseService';
import { AppError } from '../middleware/errorHandler';
import { HttpStatus } from '../utils/errorResponse';

export class BaseController<T extends Document> {
  constructor(protected service: BaseService<T>) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const document = await this.service.create(req.body);
      res.status(HttpStatus.CREATED).json({
        success: true,
        data: document
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const document = await this.service.findById(req.params.id);
      res.status(HttpStatus.OK).json({
        success: true,
        data: document
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, sort, ...filter } = req.query;
      
      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 10;
      const sortString = (sort as string) || '-createdAt';

      const result = await this.service.findWithPagination(
        filter,
        pageNumber,
        limitNumber,
        undefined,
        sortString
      );

      res.status(HttpStatus.OK).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const document = await this.service.update(req.params.id, req.body);
      res.status(HttpStatus.OK).json({
        success: true,
        data: document
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.delete(req.params.id);
      res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };

  protected sendResponse = (
    res: Response,
    statusCode: number,
    success: boolean,
    data?: any,
    message?: string
  ): void => {
    const response: any = {
      success
    };

    if (message) response.message = message;
    if (data) response.data = data;

    res.status(statusCode).json(response);
  };

  protected handleError = (error: any, next: NextFunction): void => {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR));
    }
  };
} 