import { Request, Response } from 'express';
import { Account } from '../models/Account';
import { Transaction, ITransaction } from '../models/Transaction';
import { z } from 'zod';
import { Types, Document } from 'mongoose';
import mongoose from 'mongoose';
import { validateAccountData, validateTransferData } from '../validators/accountValidator';

interface IAccount extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  type: string;
  currency: string;
  initialBalance: number;
  currentBalance: number;
  description?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Validation schemas
const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['cash', 'margin', 'futures']),
  currency: z.string().min(1, 'Currency is required'),
  initialBalance: z.number().min(0, 'Initial balance cannot be negative'),
  description: z.string().optional(),
});

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').optional(),
  type: z.enum(['cash', 'margin', 'futures']).optional(),
  currency: z.string().min(1, 'Currency is required').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const transferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().positive(),
  description: z.string().optional()
});

// Create new account
export const createAccount = async (req: Request, res: Response) => {
  try {
    const validatedData = validateAccountData(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const account = await Account.create({
      userId: new Types.ObjectId(userId),
      name: validatedData.name,
      type: validatedData.type,
      currency: validatedData.currency,
      initialBalance: validatedData.initialBalance,
      currentBalance: validatedData.initialBalance,
    }) as IAccount;

    // Create initial deposit transaction
    await Transaction.create({
      userId: new Types.ObjectId(userId),
      accountId: account._id.toString(),
      type: 'DEPOSIT',
      amount: validatedData.initialBalance,
      description: 'Initial deposit',
      date: new Date(),
      status: 'COMPLETED',
    });

    res.status(201).json(account);
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ message: 'Error creating account' });
  }
};

// Get all accounts for the current user
export const getAccounts = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const accounts = await Account.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json(accounts);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ message: 'Error fetching accounts' });
  }
};

// Get single account
export const getAccount = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json(account);
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ message: 'Error fetching account' });
  }
};

// Update account
export const updateAccount = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const validatedData = updateAccountSchema.parse(req.body);

    // If name is being updated, check for duplicates
    if (validatedData.name) {
      const existingAccount = await Account.findOne({
        name: validatedData.name,
        userId: req.user.id,
        _id: { $ne: req.params.id },
      });

      if (existingAccount) {
        return res.status(400).json({ message: 'Account name already exists' });
      }
    }

    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: validatedData },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json(account);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Update account error:', error);
    res.status(500).json({ message: 'Error updating account' });
  }
};

// Delete account
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const account = await Account.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Delete all transactions associated with this account
    await Transaction.deleteMany({ accountId: account._id });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Error deleting account' });
  }
};

// Get account transactions
export const getAccountTransactions = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }) as IAccount | null;

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const transactions = await Transaction.find({ accountId: account._id.toString() })
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Transaction.countDocuments({ accountId: account._id.toString() });

    res.json({
      transactions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

// Get account statistics
export const getAccountStats = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }) as IAccount | null;

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const [deposits, withdrawals, lastTransaction] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            accountId: account._id.toString(),
            type: 'DEPOSIT'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Transaction.aggregate([
        {
          $match: {
            accountId: account._id.toString(),
            type: 'WITHDRAWAL'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Transaction.findOne({ accountId: account._id.toString() })
        .sort({ date: -1 })
    ]);

    const stats = {
      totalDeposits: deposits[0]?.total || 0,
      totalWithdrawals: withdrawals[0]?.total || 0,
      depositCount: deposits[0]?.count || 0,
      withdrawalCount: withdrawals[0]?.count || 0,
      balanceChange: account.currentBalance - account.initialBalance,
      lastTransaction,
      currentBalance: account.currentBalance,
      initialBalance: account.initialBalance,
    };

    res.json(stats);
  } catch (error) {
    console.error('Get account stats error:', error);
    res.status(500).json({ message: 'Error fetching account statistics' });
  }
};

// Transfer between accounts
export const transferBetweenAccounts = async (req: Request, res: Response) => {
  try {
    const validatedData = validateTransferData(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate ObjectIds
    if (!Types.ObjectId.isValid(validatedData.fromAccountId) || !Types.ObjectId.isValid(validatedData.toAccountId)) {
      return res.status(400).json({ message: 'Invalid account IDs' });
    }

    const fromAccountId = new Types.ObjectId(validatedData.fromAccountId as string);
    const toAccountId = new Types.ObjectId(validatedData.toAccountId as string);
    const userIdObj = new Types.ObjectId(userId);

    const fromAccount = await Account.findOne({
      _id: fromAccountId,
      userId: userIdObj,
    }) as IAccount | null;

    const toAccount = await Account.findOne({
      _id: toAccountId,
      userId: userIdObj,
    }) as IAccount | null;

    if (!fromAccount || !toAccount) {
      return res.status(404).json({ message: 'One or both accounts not found' });
    }

    if (fromAccount.currentBalance < validatedData.amount) {
      return res.status(400).json({ message: 'Insufficient funds' });
    }

    // Start a MongoDB transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update account balances
      await Account.findByIdAndUpdate(
        fromAccountId.toString(),
        { $inc: { currentBalance: -validatedData.amount } },
        { session }
      );

      await Account.findByIdAndUpdate(
        toAccountId.toString(),
        { $inc: { currentBalance: validatedData.amount } },
        { session }
      );

      // Create transfer transactions
      await Transaction.create([
        {
          userId: userIdObj,
          accountId: fromAccountId.toString(),
          type: 'TRANSFER',
          amount: validatedData.amount,
          description: validatedData.description,
          date: new Date(),
          status: 'COMPLETED',
          relatedAccountId: toAccountId.toString(),
        },
        {
          userId: userIdObj,
          accountId: toAccountId.toString(),
          type: 'TRANSFER',
          amount: validatedData.amount,
          description: validatedData.description,
          date: new Date(),
          status: 'COMPLETED',
          relatedAccountId: fromAccountId.toString(),
        },
      ], { session });

      await session.commitTransaction();
      res.json({ message: 'Transfer completed successfully' });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Error processing transfer' });
  }
};

// Get balance history
export const getBalanceHistory = async (req: Request, res: Response) => {
  try {
    const accountId = req.params.id;
    
    // Find the account
    const account = await Account.findById(accountId) as IAccount | null;
    
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    
    // Check if the account belongs to the authenticated user
    if (!req.user || account.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this account' });
    }
    
    // Query parameters
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 3)); // Default to 3 months ago
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(); // Default to now
    
    // Find all transactions for the account within the date range
    const transactions = await Transaction.find({
      accountId: account._id.toString(),
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    // Calculate balance history
    let balance = account.currentBalance;
    // Subtract all transactions to get to the starting balance
    for (let i = transactions.length - 1; i >= 0; i--) {
      const transaction = transactions[i];
      if (transaction.type === 'DEPOSIT') {
        balance -= transaction.amount;
      } else if (transaction.type === 'WITHDRAWAL') {
        balance += transaction.amount;
      }
    }
    
    // Now build the history from the starting balance
    const balanceHistory = [];
    let currentBalance = balance;
    for (const transaction of transactions) {
      if (transaction.type === 'DEPOSIT') {
        currentBalance += transaction.amount;
      } else if (transaction.type === 'WITHDRAWAL') {
        currentBalance -= transaction.amount;
      }
      
      balanceHistory.push({
        date: transaction.date,
        balance: currentBalance,
        transaction: {
          id: transaction._id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description
        }
      });
    }
    
    res.json({
      startDate,
      endDate,
      balanceHistory
    });
  } catch (error) {
    console.error('Error retrieving balance history:', error);
    res.status(500).json({ message: 'Error retrieving balance history' });
  }
};

// Update account balance
export const updateBalance = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { amount, type } = req.body;

    if (!amount || !type || !['add', 'subtract'].includes(type)) {
      return res.status(400).json({ message: 'Invalid request parameters' });
    }

    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Use a direct update since we don't have an updateBalance method
    if (type === 'add') {
      account.currentBalance += Number(amount);
    } else if (type === 'subtract') {
      if (account.currentBalance < Number(amount)) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      account.currentBalance -= Number(amount);
    }
    
    await account.save();
    
    res.json(account);
  } catch (error) {
    if (error instanceof Error && error.message === 'Insufficient balance') {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    console.error('Update balance error:', error);
    res.status(500).json({ message: 'Error updating balance' });
  }
};

export const getAccountById = async (req: Request, res: Response) => {
  try {
    const account = await Account.findById(req.params.id) as IAccount | null;
    
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    
    // Check if the account belongs to the authenticated user
    if (!req.user || account.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this account' });
    }
    
    res.json({
      id: account._id.toString(),
      name: account.name,
      currentBalance: account.currentBalance,
      type: account.type,
      currency: account.currency,
      description: account.description,
      createdAt: account.createdAt
    });
  } catch (error) {
    console.error('Error retrieving account:', error);
    res.status(500).json({ message: 'Error retrieving account' });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { type, amount, date, description } = req.body;
    
    // Find the account
    const account = await Account.findById(req.params.id) as IAccount | null;
    
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    
    // Check if the account belongs to the authenticated user
    if (!req.user || account.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this account' });
    }

    // Validate transaction type
    if (!['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'].includes(type)) {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }
    
    // Create the transaction
    const transaction = await Transaction.create({
      userId: account.userId,
      accountId: account._id.toString(),
      type,
      amount,
      date: date || new Date(),
      description,
      status: 'COMPLETED'
    });
    
    // Update account balance
    if (type === 'DEPOSIT') {
      account.currentBalance += amount;
    } else if (type === 'WITHDRAWAL') {
      if (account.currentBalance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      account.currentBalance -= amount;
    }
    
    await account.save();
    
    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Error creating transaction' });
  }
}; 