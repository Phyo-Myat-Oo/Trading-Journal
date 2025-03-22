import { z } from 'zod';

export const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  currency: z.string().min(1, 'Currency is required'),
  initialBalance: z.number().min(0, 'Initial balance must be non-negative'),
});

export const transferSchema = z.object({
  fromAccountId: z.string().min(1, 'From account is required'),
  toAccountId: z.string().min(1, 'To account is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional(),
});

export const validateAccountData = (data: unknown) => {
  return accountSchema.parse(data);
};

export const validateTransferData = (data: unknown) => {
  return transferSchema.parse(data);
}; 