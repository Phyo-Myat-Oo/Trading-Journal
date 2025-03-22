import { Model, Document, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { AppError } from '../middleware/errorHandler';
import { HttpStatus } from '../utils/errorResponse';

export class BaseRepository<T extends Document> {
  constructor(protected model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    try {
      const document = new this.model(data);
      return await document.save();
    } catch (error: any) {
      throw new AppError('Error creating document', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findById(id: string, projection?: string): Promise<T | null> {
    try {
      return await this.model.findById(id, projection);
    } catch (error: any) {
      throw new AppError('Error finding document by ID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findOne(filter: FilterQuery<T>, projection?: string): Promise<T | null> {
    try {
      return await this.model.findOne(filter, projection);
    } catch (error: any) {
      throw new AppError('Error finding document', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async find(
    filter: FilterQuery<T>,
    projection?: string,
    options?: QueryOptions
  ): Promise<T[]> {
    try {
      return await this.model.find(filter, projection, options);
    } catch (error: any) {
      throw new AppError('Error finding documents', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findWithPagination(
    filter: FilterQuery<T>,
    page: number = 1,
    limit: number = 10,
    projection?: string,
    sort: string = '-createdAt'
  ): Promise<{ data: T[]; total: number; page: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.model
          .find(filter, projection)
          .sort(sort)
          .skip(skip)
          .limit(limit),
        this.model.countDocuments(filter)
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error: any) {
      throw new AppError('Error finding documents with pagination', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateById(id: string, update: UpdateQuery<T>): Promise<T | null> {
    try {
      return await this.model.findByIdAndUpdate(
        id,
        update,
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new AppError('Error updating document', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>
  ): Promise<T | null> {
    try {
      return await this.model.findOneAndUpdate(
        filter,
        update,
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new AppError('Error updating document', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>
  ): Promise<{ modifiedCount: number }> {
    try {
      const result = await this.model.updateMany(filter, update, { runValidators: true });
      return { modifiedCount: result.modifiedCount };
    } catch (error: any) {
      throw new AppError('Error updating documents', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteById(id: string): Promise<T | null> {
    try {
      return await this.model.findByIdAndDelete(id);
    } catch (error: any) {
      throw new AppError('Error deleting document', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteOne(filter: FilterQuery<T>): Promise<T | null> {
    try {
      return await this.model.findOneAndDelete(filter);
    } catch (error: any) {
      throw new AppError('Error deleting document', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteMany(filter: FilterQuery<T>): Promise<{ deletedCount: number }> {
    try {
      const result = await this.model.deleteMany(filter);
      return { deletedCount: result.deletedCount };
    } catch (error: any) {
      throw new AppError('Error deleting documents', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    try {
      return await this.model.exists(filter) !== null;
    } catch (error: any) {
      throw new AppError('Error checking document existence', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async count(filter: FilterQuery<T>): Promise<number> {
    try {
      return await this.model.countDocuments(filter);
    } catch (error: any) {
      throw new AppError('Error counting documents', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 