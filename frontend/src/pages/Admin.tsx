import { useState, useEffect } from 'react';
import { 
  Paper, 
  Text, 
  Group, 
  Button, 
  Badge, 
  Table, 
  Title, 
  Card, 
  SimpleGrid, 
  rem, 
  Select, 
  ActionIcon, 
  Tabs, 
  Switch, 
  Modal,
  Stack,
  Pagination,
  Alert,
  Tooltip,
  TextInput,
  Loader,
  Box,
  Divider,
  Avatar,
  Skeleton,
  AppShell,
  Container,
  Flex,
  Notification
} from '@mantine/core';
import adminService, { User, SystemStats, ActivityLog } from '../services/adminService';
import { 
  RiEdit2Line, 
  RiCheckLine, 
  RiCloseLine, 
  RiLockLine, 
  RiLockUnlockLine, 
  RiHistoryLine,
  RiShieldUserLine,
  RiUserSettingsLine,
  RiBarChartBoxLine,
  RiFileListLine,
  RiSearch2Line,
  RiAdminLine,
  RiNotification2Line,
  RiArrowGoBackLine,
  RiRefreshLine
} from 'react-icons/ri';
import { format, formatDistance } from 'date-fns';

export function Admin() {
  // State variables
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTrades: 0,
    tradesThisMonth: 0,
    systemUptime: '',
    lockedAccounts: 0
  });
  const [lockedUsers, setLockedUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>('user');
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('stats');
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [resetLockoutHistory, setResetLockoutHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingState, setIsLoadingState] = useState({
    users: false,
    stats: false,
    lockedUsers: false,
    activityLogs: false
  });
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      // Set loading states
      setIsLoadingState(prev => ({ ...prev, users: true, stats: true, lockedUsers: true }));
      
      try {
        // Fetch users
        const usersData = await adminService.getUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        showNotification('Failed to fetch users', 'error');
      } finally {
        setIsLoadingState(prev => ({ ...prev, users: false }));
      }
      
      try {
        // Fetch system stats
        const statsData = await adminService.getSystemStats();
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching stats:', error);
        showNotification('Failed to fetch system statistics', 'error');
      } finally {
        setIsLoadingState(prev => ({ ...prev, stats: false }));
      }
      
      try {
        // Fetch locked users
        const lockedUsersData = await adminService.getLockedUsers();
        setLockedUsers(lockedUsersData);
      } catch (error) {
        console.error('Error fetching locked users:', error);
        showNotification('Failed to fetch locked users', 'error');
      } finally {
        setIsLoadingState(prev => ({ ...prev, lockedUsers: false }));
      }
    };

    fetchData();
  }, []);
  
  // Fetch activity logs when page changes
  useEffect(() => {
    const fetchActivityLogs = async () => {
      setIsLoadingState(prev => ({ ...prev, activityLogs: true }));
      
      try {
        const activityLogsData = await adminService.getActivityLogs(currentPage, 10);
        setActivityLogs(activityLogsData.logs);
        setTotalPages(activityLogsData.pagination.totalPages);
      } catch (error) {
        console.error('Error fetching activity logs:', error);
        showNotification('Failed to fetch activity logs', 'error');
      } finally {
        setIsLoadingState(prev => ({ ...prev, activityLogs: false }));
      }
    };
    
    if (activeTab === 'activity') {
      fetchActivityLogs();
    }
  }, [currentPage, activeTab]);

  // Show notification helper
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({
      show: true,
      message,
      type
    });
  };

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle edit role
  const handleEditRole = (user: User) => {
    setEditingUserId(user.id);
    setSelectedRole(user.role as 'user' | 'admin');
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
  };

  const handleSaveRole = async (userId: string) => {
    try {
      // Call the API to update the user role
      await adminService.updateUserRole(userId, selectedRole);
      
      // Update local state to reflect the change
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: selectedRole } : user
        )
      );
      
      showNotification('User role updated successfully', 'success');
    } catch (err) {
      console.error('Error updating role:', err);
      showNotification('Failed to update user role', 'error');
    } finally {
      setEditingUserId(null);
    }
  };

  // Handle account unlock
  const openUnlockModal = (user: User) => {
    setSelectedUser(user);
    setUnlockModalOpen(true);
    setResetLockoutHistory(false);
  };

  const handleUnlockAccount = async () => {
    if (!selectedUser) return;
    
    setUnlockLoading(true);
    
    try {
      // Call the API to unlock the user account
      const result = await adminService.unlockUserAccount(selectedUser.id, resetLockoutHistory);

      // Update UI to reflect changes
      if (result.success) {
        // Remove from locked users list
        setLockedUsers(prev => prev.filter(user => user.id !== selectedUser.id));
        
        // Update user in main list
        setUsers(prev => prev.map(user => 
          user.id === selectedUser.id 
            ? { 
                ...user, 
                accountLocked: false,
                accountLockedUntil: undefined,
                failedLoginAttempts: 0,
                ...(resetLockoutHistory ? { previousLockouts: 0 } : {})
              } 
            : user
        ));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          lockedAccounts: Math.max((prev.lockedAccounts || 0) - 1, 0)
        }));
        
        // Close the modal before showing notification for better UX
        setUnlockModalOpen(false);
        
        // Show success notification
        showNotification(result.message, 'success');
      } else {
        // Show error inside the modal
        showNotification(result.message, 'error');
      }
    } catch (error) {
      console.error('Error unlocking account:', error);
      showNotification('An unexpected error occurred while unlocking the account', 'error');
    } finally {
      setUnlockLoading(false);
      if (!unlockModalOpen) {
        setSelectedUser(null);
      }
    }
  };

  // Create stats cards
  const statsData = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <RiShieldUserLine size={24} />
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: <RiUserSettingsLine size={24} />
    },
    {
      title: 'Locked Accounts',
      value: stats.lockedAccounts || 0,
      icon: <RiLockLine size={24} />
    },
    {
      title: 'Total Trades',
      value: stats.totalTrades,
      icon: <RiBarChartBoxLine size={24} />
    },
    {
      title: 'Trades This Month',
      value: stats.tradesThisMonth,
      icon: <RiFileListLine size={24} />
    },
    {
      title: 'System Uptime',
      value: stats.systemUptime,
      icon: <RiHistoryLine size={24} />
    },
  ];

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.firstName.toLowerCase().includes(query) ||
      user.lastName.toLowerCase().includes(query) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(query)
    );
  });

  return (
    <AppShell
      header={{ height: 60 }}
    >
      <AppShell.Header>
        <Container fluid>
          <Flex justify="space-between" align="center" h={60}>
            <Group>
              <RiAdminLine size={24} />
              <Title order={2}>Admin Dashboard</Title>
            </Group>
            <Group>
              <Button 
                variant="subtle" 
                leftSection={<RiArrowGoBackLine />} 
                component="a" 
                href="/"
              >
                Back to App
              </Button>
              <Button 
                variant="light" 
                leftSection={<RiRefreshLine />}
                onClick={() => window.location.reload()}
              >
                Refresh Data
              </Button>
            </Group>
          </Flex>
        </Container>
      </AppShell.Header>

      <AppShell.Main pt={80}>
        <Container size="xl">
          {/* Notification */}
          {notification && (
            <Notification
              color={notification.type === 'success' ? 'green' : 'red'} 
              title={notification.type === 'success' ? 'Success' : 'Error'} 
              mb="lg"
              withCloseButton
              onClose={() => setNotification(null)}
              icon={notification.type === 'success' ? <RiCheckLine /> : <RiNotification2Line />}
            >
              {notification.message}
            </Notification>
          )}
          
          {/* Tabs */}
          <Tabs value={activeTab} onChange={setActiveTab} mb="xl">
            <Tabs.List>
              <Tabs.Tab value="stats" leftSection={<RiBarChartBoxLine />}>Dashboard</Tabs.Tab>
              <Tabs.Tab value="users" leftSection={<RiShieldUserLine />}>User Management</Tabs.Tab>
              <Tabs.Tab value="locked" leftSection={<RiLockLine />}>Locked Accounts</Tabs.Tab>
              <Tabs.Tab value="activity" leftSection={<RiHistoryLine />}>Activity Logs</Tabs.Tab>
            </Tabs.List>

            {/* System Statistics Tab */}
            <Tabs.Panel value="stats" pt="md">
              <Title order={2} mb="md">System Statistics</Title>
              {isLoadingState.stats ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} mb={rem(30)}>
                  {[...Array(6)].map((_, index) => (
                    <Card key={index} shadow="sm" padding="lg" radius="md" withBorder>
                      <Skeleton height={50} radius="md" />
                    </Card>
                  ))}
                </SimpleGrid>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} mb={rem(30)}>
                  {statsData.map((stat, index) => (
                    <Card key={index} shadow="sm" padding="lg" radius="md" withBorder>
                      <Group>
                        <div style={{ color: '#228be6' }}>{stat.icon}</div>
                        <div>
                          <Text fz="md" c="dimmed">{stat.title}</Text>
                          <Text fz="xl" fw={700}>{stat.value}</Text>
                        </div>
                      </Group>
                    </Card>
                  ))}
                </SimpleGrid>
              )}
            </Tabs.Panel>

            {/* User Management Tab */}
            <Tabs.Panel value="users" pt="md">
              <Paper shadow="xs" p="md" mb={rem(30)}>
                <Group justify="space-between" mb="md">
                  <Title order={2}>User Management</Title>
                  <TextInput
                    placeholder="Search users..."
                    leftSection={<RiSearch2Line />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    w={300}
                  />
                </Group>
                
                {isLoadingState.users ? (
                  <Stack>
                    {[...Array(5)].map((_, index) => (
                      <Skeleton key={index} height={50} radius="sm" />
                    ))}
                  </Stack>
                ) : filteredUsers.length === 0 ? (
                  <Box py="xl" ta="center">
                    <Stack align="center" gap="xs">
                      <RiShieldUserLine size={48} style={{ opacity: 0.3 }} />
                      <Text fz="lg" fw={500}>No users found</Text>
                      <Text c="dimmed" size="sm" ta="center">There are no users in the system or your search returned no results</Text>
                    </Stack>
                  </Box>
                ) : (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Role</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Last Login</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredUsers.map((user) => (
                        <Table.Tr key={user.id}>
                          <Table.Td>
                            <Group gap="sm">
                              <Avatar 
                                size={30} 
                                radius="xl" 
                                color={user.role === 'admin' ? 'red' : 'blue'}
                              >
                                {user.firstName.charAt(0) + user.lastName.charAt(0)}
                              </Avatar>
                              <Text>{`${user.firstName} ${user.lastName}`}</Text>
                            </Group>
                          </Table.Td>
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
                                <Tooltip label="Edit role">
                                  <ActionIcon size="sm" variant="subtle" onClick={() => handleEditRole(user)}>
                                    <RiEdit2Line />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {user.accountLocked ? (
                              <Badge color="red">Locked</Badge>
                            ) : user.isActive ? (
                              <Badge color="green">Active</Badge>
                            ) : (
                              <Badge color="gray">Inactive</Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {user.lastLogin ? format(new Date(user.lastLogin), 'MMM d, yyyy HH:mm') : 'Never'}
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              {user.accountLocked && (
                                <Tooltip label="Unlock account">
                                  <ActionIcon 
                                    color="blue" 
                                    variant="filled" 
                                    onClick={() => openUnlockModal(user)}
                                  >
                                    <RiLockUnlockLine />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Paper>
            </Tabs.Panel>

            {/* Locked Accounts Tab */}
            <Tabs.Panel value="locked" pt="md">
              <Paper shadow="xs" p="md" mb={rem(30)}>
                <Title order={2} mb="md">Locked Accounts</Title>
                
                {isLoadingState.lockedUsers ? (
                  <Stack>
                    {[...Array(3)].map((_, index) => (
                      <Skeleton key={index} height={50} radius="sm" />
                    ))}
                  </Stack>
                ) : lockedUsers.length === 0 ? (
                  <Box py="xl" ta="center">
                    <Stack align="center" gap="xs">
                      <RiLockUnlockLine size={48} style={{ opacity: 0.3 }} />
                      <Text fz="lg" fw={500}>No locked accounts</Text>
                      <Text c="dimmed" size="sm" ta="center">There are currently no locked user accounts in the system</Text>
                    </Stack>
                  </Box>
                ) : (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>User</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Locked Until</Table.Th>
                        <Table.Th>Failed Attempts</Table.Th>
                        <Table.Th>Previous Lockouts</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {lockedUsers.map((user) => (
                        <Table.Tr key={user.id}>
                          <Table.Td>
                            <Group gap="sm">
                              <Avatar 
                                size={30} 
                                radius="xl" 
                                color="red"
                              >
                                {user.firstName.charAt(0) + user.lastName.charAt(0)}
                              </Avatar>
                              <Text>{`${user.firstName} ${user.lastName}`}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>{user.email}</Table.Td>
                          <Table.Td>
                            {user.accountLockedUntil ? (
                              <>
                                {format(new Date(user.accountLockedUntil), 'MMM d, yyyy HH:mm')}
                                <Text size="xs" c="dimmed">
                                  {formatDistance(new Date(user.accountLockedUntil), new Date(), { addSuffix: true })}
                                </Text>
                              </>
                            ) : 'Unknown'}
                          </Table.Td>
                          <Table.Td>{user.failedLoginAttempts || 0}</Table.Td>
                          <Table.Td>
                            <Badge color={user.previousLockouts && user.previousLockouts > 2 ? "red" : "orange"}>
                              {user.previousLockouts || 0}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Button 
                              leftSection={<RiLockUnlockLine />}
                              size="xs" 
                              onClick={() => openUnlockModal(user)}
                            >
                              Unlock
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Paper>
            </Tabs.Panel>

            {/* Activity Logs Tab */}
            <Tabs.Panel value="activity" pt="md">
              <Paper shadow="xs" p="md">
                <Title order={2} mb="md">Admin Activity Logs</Title>
                
                {isLoadingState.activityLogs ? (
                  <Stack>
                    {[...Array(5)].map((_, index) => (
                      <Skeleton key={index} height={50} radius="sm" />
                    ))}
                  </Stack>
                ) : activityLogs.length === 0 ? (
                  <Box py="xl" ta="center">
                    <Stack align="center" gap="xs">
                      <RiHistoryLine size={48} style={{ opacity: 0.3 }} />
                      <Text fz="lg" fw={500}>No activity logs found</Text>
                      <Text c="dimmed" size="sm" ta="center">There are no admin activity logs to display</Text>
                    </Stack>
                  </Box>
                ) : (
                  <>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Admin</Table.Th>
                          <Table.Th>Action</Table.Th>
                          <Table.Th>Details</Table.Th>
                          <Table.Th>Timestamp</Table.Th>
                          <Table.Th>IP Address</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {activityLogs.map((log) => (
                          <Table.Tr key={log.id}>
                            <Table.Td>
                              <Group gap="sm">
                                <Avatar 
                                  size={24} 
                                  radius="xl" 
                                  color="blue"
                                >
                                  {log.userName.charAt(0)}
                                </Avatar>
                                {log.userName}
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Badge 
                                color={
                                  log.action.includes('UNLOCK') ? 'green' : 
                                  log.action.includes('LOCK') ? 'red' : 
                                  'blue'
                                }
                              >
                                {log.action}
                              </Badge>
                            </Table.Td>
                            <Table.Td>{log.details}</Table.Td>
                            <Table.Td>{format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}</Table.Td>
                            <Table.Td>{log.ipAddress}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                    
                    <Group justify="center" mt="md">
                      <Pagination 
                        total={totalPages} 
                        value={currentPage} 
                        onChange={setCurrentPage} 
                      />
                    </Group>
                  </>
                )}
              </Paper>
            </Tabs.Panel>
          </Tabs>

          {/* Unlock Account Modal */}
          <Modal
            opened={unlockModalOpen}
            onClose={() => !unlockLoading && setUnlockModalOpen(false)}
            title={<Title order={3}>Unlock User Account</Title>}
            centered
            radius="md"
            closeOnClickOutside={!unlockLoading}
            closeOnEscape={!unlockLoading}
          >
            {selectedUser && (
              <Stack>
                <Group>
                  <Avatar 
                    size={50} 
                    radius="xl" 
                    color="red"
                  >
                    {selectedUser.firstName.charAt(0) + selectedUser.lastName.charAt(0)}
                  </Avatar>
                  <Stack gap={0}>
                    <Text fw={500} size="lg">{selectedUser.firstName} {selectedUser.lastName}</Text>
                    <Text size="sm" c="dimmed">{selectedUser.email}</Text>
                  </Stack>
                </Group>
                
                <Alert color="orange" title="Account Status">
                  <Group>
                    <Text size="sm">
                      Account is currently locked and has been locked <b>{selectedUser.previousLockouts || 0}</b> times before.
                    </Text>
                  </Group>
                </Alert>
                
                <Box>
                  <Text fw={500} mb="xs">Lockout Details</Text>
                  <div style={{ padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                    <Group justify="space-between">
                      <Text size="sm">Failed Login Attempts:</Text>
                      <Badge>{selectedUser.failedLoginAttempts || 0}</Badge>
                    </Group>
                    <Divider my="xs" />
                    <Group justify="space-between">
                      <Text size="sm">Previous Lockouts:</Text>
                      <Badge color={selectedUser.previousLockouts && selectedUser.previousLockouts > 2 ? "red" : "orange"}>
                        {selectedUser.previousLockouts || 0}
                      </Badge>
                    </Group>
                    <Divider my="xs" />
                    <Group justify="space-between">
                      <Text size="sm">Locked Until:</Text>
                      <Text size="sm" fw={500}>
                        {selectedUser.accountLockedUntil ? 
                          format(new Date(selectedUser.accountLockedUntil), 'MMM d, yyyy HH:mm') : 'Unknown'}
                      </Text>
                    </Group>
                  </div>
                </Box>
                
                <Switch
                  label="Reset lockout history (prevents progressive lockout duration increase)"
                  description="This will reset the counter that tracks previous lockouts"
                  checked={resetLockoutHistory}
                  onChange={(event) => setResetLockoutHistory(event.currentTarget.checked)}
                  my="md"
                  disabled={unlockLoading}
                />
                
                <Group justify="flex-end" mt="md">
                  <Button 
                    variant="default" 
                    onClick={() => setUnlockModalOpen(false)}
                    disabled={unlockLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    color="blue" 
                    onClick={handleUnlockAccount} 
                    leftSection={unlockLoading ? <Loader size="xs" /> : <RiLockUnlockLine size={16} />}
                    loading={unlockLoading}
                  >
                    {unlockLoading ? 'Unlocking...' : 'Unlock Account'}
                  </Button>
                </Group>
              </Stack>
            )}
          </Modal>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}