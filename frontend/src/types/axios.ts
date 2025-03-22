import { AxiosResponse } from 'axios';

/**
 * Interface for Axios error responses
 */
export interface AxiosErrorResponse {
  response?: {
    data?: any;
    status: number;
    headers?: any;
  };
  request?: any;
  message?: string;
  config?: any;
  isAxiosError?: boolean;
} 