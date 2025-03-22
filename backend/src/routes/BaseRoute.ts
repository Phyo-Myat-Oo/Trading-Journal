import { Router } from 'express';
import { Document } from 'mongoose';
import { BaseController } from '../controllers/BaseController';
import { asyncHandler } from '../utils/errorResponse';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/authMiddleware';
import { authorize } from '../middleware/authorizationMiddleware';

export class BaseRoute<T extends Document> {
  public router: Router;
  protected basePath: string;

  constructor(
    protected controller: BaseController<T>,
    protected createSchema?: any,
    protected updateSchema?: any
  ) {
    this.router = Router();
    this.basePath = '/';
    this.initializeRoutes();
  }

  protected initializeRoutes(): void {
    // GET all resources with pagination
    this.router.get(
      this.basePath,
      authenticate,
      asyncHandler(this.controller.getAll)
    );

    // GET resource by ID
    this.router.get(
      `${this.basePath}:id`,
      authenticate,
      asyncHandler(this.controller.getById)
    );

    // POST new resource
    this.router.post(
      this.basePath,
      authenticate,
      this.createSchema ? validateRequest(this.createSchema) : [],
      asyncHandler(this.controller.create)
    );

    // PUT update resource
    this.router.put(
      `${this.basePath}:id`,
      authenticate,
      this.updateSchema ? validateRequest(this.updateSchema) : [],
      asyncHandler(this.controller.update)
    );

    // DELETE resource
    this.router.delete(
      `${this.basePath}:id`,
      authenticate,
      asyncHandler(this.controller.delete)
    );
  }

  protected addRoute(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    path: string,
    handler: any,
    middlewares: any[] = [],
    schema?: any
  ): void {
    const routeMiddlewares = [
      authenticate,
      ...middlewares,
      schema ? validateRequest(schema) : [],
      asyncHandler(handler)
    ].flat();

    this.router[method](
      this.basePath + path,
      routeMiddlewares
    );
  }

  protected addProtectedRoute(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    path: string,
    handler: any,
    roles: string[],
    middlewares: any[] = [],
    schema?: any
  ): void {
    const routeMiddlewares = [
      authenticate,
      authorize(roles),
      ...middlewares,
      schema ? validateRequest(schema) : [],
      asyncHandler(handler)
    ].flat();

    this.router[method](
      this.basePath + path,
      routeMiddlewares
    );
  }

  protected addPublicRoute(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    path: string,
    handler: any,
    middlewares: any[] = [],
    schema?: any
  ): void {
    const routeMiddlewares = [
      ...middlewares,
      schema ? validateRequest(schema) : [],
      asyncHandler(handler)
    ].flat();

    this.router[method](
      this.basePath + path,
      routeMiddlewares
    );
  }
} 