import React, { useState, useEffect } from 'react';
import authService, { SessionData } from '../../services/authService';
import { 
  Card, 
  Text, 
  Group, 
  Avatar, 
  Badge, 
  Button, 
  Stack, 
  Title, 
  Loader, 
  Alert, 
  Modal
} from '@mantine/core';
import { 
  RiComputerLine, 
  RiSmartphoneLine, 
  RiShieldCheckLine, 
  RiCloseLine, 
  RiInformationLine, 
  RiAlertLine,
  RiRefreshLine
} from 'react-icons/ri';
import { AxiosErrorResponse } from '../../types/axios';

export function SessionsManagement() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
  }, []);

  // Refresh sessions data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
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

  // Get device icon based on user agent
  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.toLowerCase().includes('mobile') || userAgent.toLowerCase().includes('android') || userAgent.toLowerCase().includes('iphone')) {
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
      } else {
        setError('Failed to terminate session. Please try again.');
      }
    } catch (err) {
      console.error('Error terminating session:', err);
      setError('An error occurred while terminating the session.');
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
      
      // Display alert with cookie info
      setError(null); // Clear any existing error
      alert(`Cookie Status: 
      - Refresh Token Present: ${response.hasRefreshToken ? 'Yes' : 'No'}
      - Environment: ${response.environment}
      - Server Time: ${response.serverTime}
      - Browser Cookies Enabled: ${navigator.cookieEnabled ? 'Yes' : 'No'}
      - Cookie Test: ${document.cookie.includes('cookieTest') ? 'Success' : 'Failed'}`);
      
    } catch (err: unknown) {
      console.error('Error checking cookies:', err);
      
      // Type guard for AxiosErrorResponse
      const axiosError = err as AxiosErrorResponse;
      
      // Show a specific message for rate limiting
      if (axiosError.response && axiosError.response.status === 429) {
        setError('Rate limit exceeded. Please wait a moment before trying again.');
      } else {
        setError('Failed to check cookie status: ' + (axiosError.response?.data?.message || axiosError.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3}>Active Sessions</Title>
        <Group>
          <Button 
            variant="outline" 
            leftSection={<RiShieldCheckLine />} 
            onClick={checkCookieStatus}
            loading={loading}
            color="blue"
          >
            Check Cookie Status
          </Button>
          <Button 
            variant="subtle" 
            leftSection={<RiRefreshLine />} 
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh
          </Button>
        </Group>
      </Group>
      
      <Text c="dimmed" size="sm" mb="md">
        View and manage your currently active login sessions across different devices.
      </Text>
      
      {error && (
        <Alert color="red" title="Error" mb="md" icon={<RiAlertLine />}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader size="md" />
        </div>
      ) : sessions.length === 0 ? (
        <Alert color="blue" title="No active sessions" icon={<RiInformationLine />}>
          You have no active sessions other than the current one.
        </Alert>
      ) : (
        <Stack gap="md">
          {sessions.map(session => (
            <Card key={session.id} shadow="xs" p="md" radius="sm" withBorder>
              <Group justify="space-between">
                <Group>
                  <Avatar color={isCurrentSession(session) ? "blue" : "gray"} radius="xl">
                    {getDeviceIcon(session.userAgent)}
                  </Avatar>
                  <div>
                    <Text fw={500}>
                      {session.userAgent.split('/')[0] || 'Unknown device'}
                      {isCurrentSession(session) && (
                        <Badge color="blue" ml="xs" size="sm">Current</Badge>
                      )}
                    </Text>
                    <Text size="xs" c="dimmed">
                      IP: {session.ipAddress}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Active since: {formatDate(session.createdAt)}
                    </Text>
                  </div>
                </Group>
                
                <Group>
                  {isCurrentSession(session) ? (
                    <Badge 
                      color="green" 
                      variant="outline"
                      leftSection={<RiShieldCheckLine size={14} />}
                    >
                      Current session
                    </Badge>
                  ) : (
                    <Button 
                      color="red" 
                      variant="subtle" 
                      leftSection={<RiCloseLine />}
                      onClick={() => confirmTerminateSession(session)}
                      loading={terminatingSession === session.id}
                    >
                      Terminate
                    </Button>
                  )}
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
      
      {/* Confirmation Modal */}
      <Modal
        opened={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Terminate Session"
        centered
      >
        <Text mb="md">
          Are you sure you want to terminate this session? If you're currently using this device, you'll be logged out.
        </Text>
        <Group justify="flex-end">
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
    </Card>
  );
} 