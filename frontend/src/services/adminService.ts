import api from '../utils/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTrades: number;
  tradesThisMonth: number;
  systemUptime: string;
}

// Get all users (admin only)
const getUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get('/api/users', { withCredentials: true });
    return response.data.users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// Get system statistics (admin only)
const getSystemStats = async (): Promise<SystemStats> => {
  try {
    const response = await api.get('/api/admin/stats', { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching system stats:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalTrades: 0,
      tradesThisMonth: 0,
      systemUptime: '0h 0m'
    };
  }
};

// Mock data for demonstration (remove in production)
const getMockUsers = (): User[] => {
  return [
    {
      id: '1',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      createdAt: '2023-01-15T12:00:00Z'
    },
    {
      id: '2',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
      createdAt: '2023-01-20T14:30:00Z'
    },
    {
      id: '3',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'user',
      createdAt: '2023-02-05T09:15:00Z'
    },
    {
      id: '4',
      email: 'mike@example.com',
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'user',
      createdAt: '2023-02-10T16:45:00Z'
    },
    {
      id: '5',
      email: 'sarah@example.com',
      firstName: 'Sarah',
      lastName: 'Williams',
      role: 'user',
      createdAt: '2023-03-01T11:20:00Z'
    }
  ];
};

// Mock system stats for demonstration (remove in production)
const getMockSystemStats = (): SystemStats => {
  return {
    totalUsers: 5,
    activeUsers: 3,
    totalTrades: 125,
    tradesThisMonth: 42,
    systemUptime: '15d 7h 23m'
  };
};

// Update user role (admin only)
const updateUserRole = async (userId: string, role: 'user' | 'admin'): Promise<User> => {
  try {
    const response = await api.put(`/api/users/${userId}/role`, { role }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data.user;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

const adminService = {
  getUsers,
  getSystemStats,
  // Use mock data for demonstration
  getMockUsers,
  getMockSystemStats,
  updateUserRole
};

export default adminService; 