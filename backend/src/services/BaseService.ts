import { Document } from 'mongoose';
import { BaseRepository } from '../repositories/BaseRepository';
import { AppError } from '../middleware/errorHandler';
import { HttpStatus } from '../utils/errorResponse';

export class BaseService<T extends Document> {
  constructor(protected repository: BaseRepository<T>) {}

  async create(data: Partial<T>): Promise<T> {
    try {
      return await this.repository.create(data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error creating resource', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findById(id: string, projection?: string): Promise<T> {
    const document = await this.repository.findById(id, projection);
    if (!document) {
      throw new AppError('Resource not found', HttpStatus.NOT_FOUND);
    }
    return document;
  }

  async findOne(filter: any, projection?: string): Promise<T | null> {
    return await this.repository.findOne(filter, projection);
  }

  async find(filter: any, projection?: string): Promise<T[]> {
    return await this.repository.find(filter, projection);
  }

  async findWithPagination(
    filter: any,
    page: number = 1,
    limit: number = 10,
    projection?: string,
    sort: string = '-createdAt'
  ): Promise<{ data: T[]; total: number; page: number; totalPages: number }> {
    return await this.repository.findWithPagination(filter, page, limit, projection, sort);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const document = await this.repository.updateById(id, data);
    if (!document) {
      throw new AppError('Resource not found', HttpStatus.NOT_FOUND);
    }
    return document;
  }

  async delete(id: string): Promise<void> {
    const document = await this.repository.deleteById(id);
    if (!document) {
      throw new AppError('Resource not found', HttpStatus.NOT_FOUND);
    }
  }

  async exists(filter: any): Promise<boolean> {
    return await this.repository.exists(filter);
  }

  async count(filter: any): Promise<number> {
    return await this.repository.count(filter);
  }

  async updateMany(filter: any, update: any): Promise<{ modifiedCount: number }> {
    return await this.repository.updateMany(filter, update);
  }

  async deleteMany(filter: any): Promise<{ deletedCount: number }> {
    return await this.repository.deleteMany(filter);
  }
} 