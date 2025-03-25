import React, { useState, useEffect } from 'react';
import authService, { SessionData } from '../../services/authService';
import { 
  Card, 
  Text, 
  Group, 
  Badge, 
  Button, 
  Stack, 
  Title, 
  Loader, 
  Modal,
  Container,
  Tooltip,
  Paper,
  Divider,
  Box,
  Transition,
  Center,
  Timeline,
  Notification,
  Tabs,
  rem
} from '@mantine/core';
import { useMantineTheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { 
  RiComputerLine, 
  RiSmartphoneLine, 
  RiShieldCheckLine, 
  RiCloseLine, 
  RiInformationLine, 
  RiAlertLine,
  RiRefreshLine,
  RiUserSettingsLine,
  RiMapPinLine,
  RiTimeLine,
  RiShieldUserLine,
  RiLoginCircleLine
} from 'react-icons/ri';
import { AxiosErrorResponse } from '../../types/axios';
import { useMediaQuery } from '@mantine/hooks';

export function SessionsManagement() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('active');
  
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  // Fetch the user's active sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionData = await authService.getUserSessions();
      setSessions(sessionData);
    } catch (err) {
      setError('Failed to load active sessions. Please try again.');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSessions();
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Refresh sessions data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchSessions();
      notifications.show({
        title: 'Sessions refreshed',
        message: 'Your active session list has been updated',
        color: 'blue',
        icon: <RiRefreshLine />,
      });
    } catch (err) {
      notifications.show({
        title: 'Refresh failed',
        message: 'Could not refresh sessions. Please try again.',
        color: 'red',
        icon: <RiAlertLine />,
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Format session creation date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get relative time (e.g., "2 hours ago")
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) {
      return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
    } else if (diffHour > 0) {
      return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffMin > 0) {
      return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      return 'Just now';
    }
  };

  // Get device type and name from user agent
  const getDeviceInfo = (userAgent: string) => {
    let deviceType = 'desktop';
    let deviceName = 'Computer';
    
    if (userAgent.toLowerCase().includes('mobile') || 
        userAgent.toLowerCase().includes('android') || 
        userAgent.toLowerCase().includes('iphone')) {
      deviceType = 'mobile';
      deviceName = 'Mobile Device';
      
      if (userAgent.toLowerCase().includes('iphone')) {
        deviceName = 'iPhone';
      } else if (userAgent.toLowerCase().includes('android')) {
        deviceName = 'Android Device';
      }
    } else if (userAgent.toLowerCase().includes('tablet') || 
              userAgent.toLowerCase().includes('ipad')) {
      deviceType = 'tablet';
      deviceName = 'Tablet';
      
      if (userAgent.toLowerCase().includes('ipad')) {
        deviceName = 'iPad';
      }
    }
    
    // Get browser info
    let browserName = 'Unknown Browser';
    
    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
    } else if (userAgent.includes('Safari')) {
      browserName = 'Safari';
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge';
    } else if (userAgent.includes('Opera')) {
      browserName = 'Opera';
    }
    
    return {
      type: deviceType,
      name: deviceName,
      browser: browserName
    };
  };

  // Get device icon based on user agent
  const getDeviceIcon = (userAgent: string) => {
    const { type } = getDeviceInfo(userAgent);
    
    if (type === 'mobile') {
      return <RiSmartphoneLine size={24} />;
    }
    return <RiComputerLine size={24} />;
  };

  // Determine if this is the current session
  const isCurrentSession = (session: SessionData) => {
    // A better approach is to check if this is the current browser session
    // by comparing the JWT token's jti with session.jti
    try {
      // Get the current access token
      const token = authService.getToken();
      if (token) {
        // Try to decode it to get the jti
        const decoded = JSON.parse(atob(token.split('.')[1]));
        if (decoded && decoded.jti) {
          return decoded.jti === session.jti;
        }
      }
    } catch (error) {
      console.error('Error comparing session tokens:', error);
    }
    
    // Fallback to simple check - most recent is probably current
    return sessions.indexOf(session) === 0;
  };

  // Open confirmation modal for session termination
  const confirmTerminateSession = (session: SessionData) => {
    setSelectedSession(session);
    setConfirmModalOpen(true);
  };

  // Terminate a session
  const terminateSession = async () => {
    if (!selectedSession) return;
    
    try {
      setTerminatingSession(selectedSession.id);
      const success = await authService.terminateSession(selectedSession.jti);
      
      if (success) {
        // Remove terminated session from the list
        setSessions(prev => prev.filter(s => s.id !== selectedSession.id));
        notifications.show({
          title: 'Session terminated',
          message: 'The selected session has been successfully terminated.',
          color: 'green',
          icon: <RiShieldCheckLine />,
        });
      } else {
        setError('Failed to terminate session. Please try again.');
        notifications.show({
          title: 'Termination failed',
          message: 'Failed to terminate session. Please try again.',
          color: 'red',
          icon: <RiAlertLine />,
        });
      }
    } catch (err) {
      console.error('Error terminating session:', err);
      setError('An error occurred while terminating the session.');
      notifications.show({
        title: 'Session termination error',
        message: 'An error occurred while terminating the session.',
        color: 'red',
        icon: <RiAlertLine />,
      });
    } finally {
      setTerminatingSession(null);
      setConfirmModalOpen(false);
      setSelectedSession(null);
    }
  };

  // Add cookie diagnostics helper
  const checkCookieStatus = async () => {
    try {
      setLoading(true);
      const response = await authService.checkCookies();
      console.log('Cookie status:', response);
      
      // Display notification with cookie info
      setError(null); // Clear any existing error
      notifications.show({
        title: 'Cookie Status',
        message: `Refresh Token: ${response.hasRefreshToken ? 'Present' : 'Missing'} | Environment: ${response.environment}`,
        color: response.hasRefreshToken ? 'green' : 'yellow',
        icon: <RiShieldCheckLine />,
        autoClose: 5000,
      });
      
    } catch (err: unknown) {
      console.error('Error checking cookies:', err);
      
      // Type guard for AxiosErrorResponse
      const axiosError = err as AxiosErrorResponse;
      
      // Show a specific message for rate limiting
      if (axiosError.response && axiosError.response.status === 429) {
        setError('Rate limit exceeded. Please wait a moment before trying again.');
        notifications.show({
          title: 'Rate limit exceeded',
          message: 'Please wait a moment before trying again.',
          color: 'yellow',
          icon: <RiAlertLine />,
        });
      } else {
        const errorMessage = axiosError.response?.data?.message || axiosError.message || 'Unknown error';
        setError('Failed to check cookie status: ' + errorMessage);
        notifications.show({
          title: 'Cookie check failed',
          message: errorMessage,
          color: 'red',
          icon: <RiAlertLine />,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="lg" p={0}>
      <Transition mounted={mounted} transition="fade" duration={400} timingFunction="ease">
        {(styles) => (
          <Paper shadow="xs" p="xl" radius="md" withBorder style={styles}>
            <Tabs value={activeTab} onChange={setActiveTab} mb="xl">
              <Tabs.List>
                <Tabs.Tab value="active" leftSection={<RiUserSettingsLine size={16} />}>
                  Active Sessions
                </Tabs.Tab>
                <Tabs.Tab value="security" leftSection={<RiShieldUserLine size={16} />}>
                  Security Tools
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="active" pt="md">
                <Box mb="lg">
                  <Group justify="space-between" align="center" mb="md">
                    <Title order={3}>Active Sessions</Title>
                    <Button 
                      variant="subtle" 
                      leftSection={<RiRefreshLine size={16} />} 
                      onClick={handleRefresh}
                      loading={refreshing}
                      size="sm"
                    >
                      Refresh
                    </Button>
                  </Group>
                  
                  <Text c="dimmed" size="sm" mb="md">
                    View and manage your currently active login sessions across different devices.
                  </Text>
                  
                  {error && (
                    <Notification 
                      color="red" 
                      title="Error" 
                      withCloseButton={false}
                      mb="md" 
                      icon={<RiAlertLine size={20} />}
                    >
                      {error}
                    </Notification>
                  )}
                </Box>
                
                {loading ? (
                  <Center style={{ padding: rem(40) }}>
                    <Loader size="lg" variant="dots" />
                  </Center>
                ) : sessions.length === 0 ? (
                  <Notification 
                    color="blue" 
                    title="No active sessions" 
                    withCloseButton={false}
                    icon={<RiInformationLine size={20} />}
                  >
                    You have no active sessions other than the current one.
                  </Notification>
                ) : (
                  <Timeline active={sessions.length - 1} bulletSize={24} lineWidth={2}>
                    {sessions.map((session, index) => {
                      const deviceInfo = getDeviceInfo(session.userAgent);
                      const isCurrent = isCurrentSession(session);
                      const isLoading = terminatingSession === session.id;
                      
                      return (
                        <Timeline.Item
                          key={session.id}
                          bullet={getDeviceIcon(session.userAgent)}
                          title={
                            <Group gap="xs">
                              <Text fw={600}>
                                {deviceInfo.name} · {deviceInfo.browser}
                              </Text>
                              {isCurrent && (
                                <Badge color="blue" size="sm" variant="filled">Current</Badge>
                              )}
                            </Group>
                          }
                        >
                          <Transition 
                            mounted={true} 
                            transition="slide-right" 
                            duration={300} 
                            timingFunction="ease"
                            delay={index * 50}
                          >
                            {(styles) => (
                              <Paper 
                                p="md" 
                                withBorder 
                                shadow="sm" 
                                radius="md" 
                                style={{...styles, marginBottom: index < sessions.length - 1 ? rem(20) : 0}}
                              >
                                <Group justify="space-between" align="flex-start">
                                  <Box>
                                    <Group mb={5} gap="xs">
                                      <RiMapPinLine size={16} style={{ opacity: 0.7 }} />
                                      <Text size="sm">IP: {session.ipAddress}</Text>
                                    </Group>
                                    
                                    <Group mb={5} gap="xs">
                                      <RiLoginCircleLine size={16} style={{ opacity: 0.7 }} />
                                      <Text size="sm">
                                        Started {getRelativeTime(session.createdAt)}
                                      </Text>
                                      <Tooltip label={formatDate(session.createdAt)}>
                                        <Box style={{ cursor: 'help' }}>
                                          <RiInformationLine size={16} style={{ opacity: 0.5 }} />
                                        </Box>
                                      </Tooltip>
                                    </Group>
                                    
                                    <Group gap="xs">
                                      <RiTimeLine size={16} style={{ opacity: 0.7 }} />
                                      <Text size="sm">
                                        Expires on {formatDate(session.expiresAt)}
                                      </Text>
                                    </Group>
                                  </Box>
                                  
                                  {isCurrent ? (
                                    <Badge 
                                      size="lg"
                                      pl={3}
                                      color="green" 
                                      variant="outline"
                                      leftSection={<RiShieldCheckLine size={14} />}
                                    >
                                      Current session
                                    </Badge>
                                  ) : (
                                    <Button 
                                      color="red" 
                                      variant="outline" 
                                      leftSection={<RiCloseLine size={14} />}
                                      onClick={() => confirmTerminateSession(session)}
                                      loading={isLoading}
                                      size={isMobile ? "xs" : "sm"}
                                    >
                                      Terminate
                                    </Button>
                                  )}
                                </Group>
                              </Paper>
                            )}
                          </Transition>
                        </Timeline.Item>
                      );
                    })}
                  </Timeline>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="security" pt="md">
                <Stack gap="md">
                  <Title order={3}>Security Tools</Title>
                  <Text c="dimmed" size="sm">
                    Tools to help diagnose and manage your session security.
                  </Text>
                  
                  <Card shadow="sm" p="md" radius="md" withBorder>
                    <Stack>
                      <Group>
                        <RiShieldCheckLine size={24} color={theme.colors.blue[6]} />
                        <Box>
                          <Text fw={600}>Check Cookie Status</Text>
                          <Text size="sm" c="dimmed">
                            Verify that your browser cookies are working correctly for authentication.
                          </Text>
                        </Box>
                      </Group>
                      <Button 
                        fullWidth
                        variant="light" 
                        leftSection={<RiShieldCheckLine size={14} />} 
                        onClick={checkCookieStatus}
                        loading={loading}
                        color="blue"
                      >
                        Check Cookie Status
                      </Button>
                    </Stack>
                  </Card>
                  
                  <Card shadow="sm" p="md" radius="md" withBorder>
                    <Stack>
                      <Group>
                        <RiShieldUserLine size={24} color={theme.colors.indigo[6]} />
                        <Box>
                          <Text fw={600}>Terminate All Other Sessions</Text>
                          <Text size="sm" c="dimmed">
                            Log out from all devices except this one.
                          </Text>
                        </Box>
                      </Group>
                      <Button 
                        fullWidth
                        variant="light" 
                        leftSection={<RiCloseLine size={14} />} 
                        onClick={() => {/* TODO: Implement this */}}
                        color="red"
                        disabled
                      >
                        Terminate All Other Sessions
                      </Button>
                    </Stack>
                  </Card>
                </Stack>
              </Tabs.Panel>
            </Tabs>
            
            {/* Confirmation Modal */}
            <Modal
              opened={confirmModalOpen}
              onClose={() => setConfirmModalOpen(false)}
              title={
                <Group>
                  <RiAlertLine color={theme.colors.red[6]} />
                  <Text fw={600}>Terminate Session</Text>
                </Group>
              }
              centered
              overlayProps={{
                blur: 3,
                backgroundOpacity: 0.55,
              }}
            >
              <Text mb="md">
                Are you sure you want to terminate this session? If someone is currently using this device, they'll be logged out immediately.
              </Text>
              <Divider my="md" />
              <Group justify="flex-end" gap="md">
                <Button variant="subtle" onClick={() => setConfirmModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  color="red" 
                  onClick={terminateSession}
                  loading={!!terminatingSession}
                >
                  Terminate Session
                </Button>
              </Group>
            </Modal>
          </Paper>
        )}
      </Transition>
    </Container>
  );
} 