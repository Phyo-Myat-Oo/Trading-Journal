import { useState, useEffect } from 'react';
import { Paper, Text, Group, Button, Badge, Table, Title, Card, SimpleGrid, rem, Select, ActionIcon } from '@mantine/core';
import adminService, { User, SystemStats } from '../services/adminService';
import { RiEdit2Line, RiCheckLine, RiCloseLine } from 'react-icons/ri';

export function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTrades: 0,
    tradesThisMonth: 0,
    systemUptime: ''
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>('user');
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // For demonstration, using mock data:
        const usersData = adminService.getMockUsers();
        const statsData = adminService.getMockSystemStats();
        
        setUsers(usersData);
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      }
    };

    fetchData();
  }, []);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleEditRole = (user: User) => {
    setEditingUserId(user.id);
    setSelectedRole(user.role as 'user' | 'admin');
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
  };

  const handleSaveRole = async (userId: string) => {
    try {
      await adminService.updateUserRole(userId, selectedRole);
      
      // Update local state to reflect the change
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: selectedRole } : user
        )
      );
      
      setNotification({
        show: true,
        message: 'User role updated successfully',
        type: 'success'
      });
    } catch (err) {
      console.error('Error updating role:', err);
      setNotification({
        show: true,
        message: 'Failed to update user role',
        type: 'error'
      });
    } finally {
      setEditingUserId(null);
    }
  };

  const statsData = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
    },
    {
      title: 'Total Trades',
      value: stats.totalTrades,
    },
    {
      title: 'Trades This Month',
      value: stats.tradesThisMonth,
    },
    {
      title: 'System Uptime',
      value: stats.systemUptime,
    },
  ];

  return (
    <div>
      <Title order={1} mb={rem(20)}>Admin Dashboard</Title>
      
      {/* Notification */}
      {notification && (
        <div className={`p-3 mb-4 rounded-md ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {notification.message}
        </div>
      )}
      
      {/* System Statistics */}
      <SimpleGrid cols={3} mb={rem(30)}>
        {statsData.map((stat, index) => (
          <Card key={index} shadow="sm" padding="lg" radius="md" withBorder>
            <Text fz="lg" fw={500}>{stat.title}</Text>
            <Text fz="xl" fw={700} mt="md">{stat.value}</Text>
          </Card>
        ))}
      </SimpleGrid>
      
      {/* User Management */}
      <Paper shadow="xs" p="md" mb={rem(30)}>
        <Group justify="space-between" mb="md">
          <Title order={2}>User Management</Title>
          <Button variant="filled" color="blue">Add New User</Button>
        </Group>
        
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>{user.id}</Table.Td>
                <Table.Td>{`${user.firstName} ${user.lastName}`}</Table.Td>
                <Table.Td>{user.email}</Table.Td>
                <Table.Td>
                  {editingUserId === user.id ? (
                    <Group gap="xs">
                      <Select
                        value={selectedRole}
                        onChange={(value) => setSelectedRole(value as 'user' | 'admin')}
                        data={[
                          { value: 'user', label: 'User' },
                          { value: 'admin', label: 'Admin' }
                        ]}
                        size="xs"
                      />
                      <ActionIcon color="green" variant="subtle" onClick={() => handleSaveRole(user.id)}>
                        <RiCheckLine />
                      </ActionIcon>
                      <ActionIcon color="red" variant="subtle" onClick={handleCancelEdit}>
                        <RiCloseLine />
                      </ActionIcon>
                    </Group>
                  ) : (
                    <Group gap="xs" justify="space-between">
                      <Badge color={user.role === 'admin' ? 'red' : 'blue'}>
                        {user.role}
                      </Badge>
                      <ActionIcon size="sm" variant="subtle" onClick={() => handleEditRole(user)}>
                        <RiEdit2Line />
                      </ActionIcon>
                    </Group>
                  )}
                </Table.Td>
                <Table.Td>{new Date(user.createdAt).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button variant="outline" size="xs">Edit</Button>
                    <Button variant="filled" color="red" size="xs">Delete</Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
      
      {/* Activity Logs (placeholder) */}
      <Paper shadow="xs" p="md">
        <Title order={2} mb="md">Recent System Activity</Title>
        <Text c="dimmed">No recent activity to display.</Text>
      </Paper>
    </div>
  );
} 