import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Card, 
  Container, 
  Text, 
  Title, 
  Group, 
  Loader, 
  ThemeIcon, 
  Stack,
  rem,
} from '@mantine/core';
import { RiCheckLine, RiErrorWarningLine, RiArrowRightLine } from 'react-icons/ri';
import api from '../utils/api';
import { AxiosError } from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface VerificationStatus {
  success: boolean;
  message: string;
  isEmailChange?: boolean;
}

const VerifyEmailChange = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    success: false,
    message: 'Verifying your email...',
    isEmailChange: false
  });
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setVerificationStatus({
          success: false,
          message: 'No verification token provided. Please check your email for the verification link.',
          isEmailChange: false
        });
        setIsVerifying(false);
        return;
      }
      
      setIsVerifying(true);
      
      try {
        const { data } = await api.post('/api/auth/verify-email', { token });
        
        // Check if this is an email change verification
        const isEmailChange = data.requiresLogin || false;
        const newEmail = data.newEmail || data.email;
        
        setVerificationStatus({
          success: true,
          message: data.message || (isEmailChange ? 
            `Email changed successfully! Please log in with your new email address: ${newEmail}` :
            'Your email has been verified successfully!'),
          isEmailChange
        });

        if (isEmailChange) {
          // For email change, logout the user
          await logout();
        }
        
        // Start countdown for automatic redirect
        const countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              navigate('/login');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Clean up interval on unmount
        return () => clearInterval(countdownInterval);
      } catch (error) {
        console.error('Error during email verification:', error);
        let errorMessage = 'Email verification failed. The link may be invalid or expired.';
        
        if (error instanceof AxiosError && error.response?.data) {
          errorMessage = error.response.data.message || errorMessage;
        }
        
        setVerificationStatus({
          success: false,
          message: errorMessage,
          isEmailChange: false
        });
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyEmail();
  }, [token, navigate, logout]);

  return (
    <Box 
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--mantine-color-gray-0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${rem(48)} 0`,
      }}
    >
      <Container size="sm" style={{ width: '100%' }}>
        <Card 
          p="xl" 
          radius="md" 
          withBorder 
          shadow="md"
          style={{
            backgroundColor: 'var(--mantine-color-white)',
            maxWidth: rem(600),
            margin: '0 auto',
          }}
        >
          <Stack align="center" gap="xl">
            <Title 
              order={1} 
              ta="center"
              style={{
                fontSize: rem(32),
                fontWeight: 900,
                letterSpacing: '-0.5px',
              }}
            >
              {verificationStatus.isEmailChange ? 'Email Change Verification' : 'Email Verification'}
            </Title>
            
            {isVerifying ? (
              <Stack align="center" gap="md" py="xl">
                <Loader size="xl" variant="dots" />
                <Text size="lg" fw={500} ta="center">
                  Verifying your email address...
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  This will only take a moment
                </Text>
              </Stack>
            ) : (
              <Stack align="center" gap="xl" py="xl">
                {/* Status Icon */}
                <Box
                  style={{
                    animation: verificationStatus.success ? 'bounce 1s ease' : 'none',
                  }}
                >
                  <ThemeIcon 
                    size={120} 
                    radius={60} 
                    color={verificationStatus.success ? 'teal' : 'red'}
                    variant="light"
                  >
                    {verificationStatus.success ? (
                      <RiCheckLine size={80} />
                    ) : (
                      <RiErrorWarningLine size={80} />
                    )}
                  </ThemeIcon>
                </Box>
                
                {/* Status Message */}
                <Text 
                  size="xl" 
                  fw={600} 
                  ta="center"
                  style={{
                    color: verificationStatus.success ? 
                      'var(--mantine-color-teal-7)' : 
                      'var(--mantine-color-red-7)',
                    maxWidth: rem(500),
                    lineHeight: 1.4,
                  }}
                >
                  {verificationStatus.message}
                </Text>
                
                {/* Next Steps for Success */}
                {verificationStatus.success && (
                  <Box mt="md">
                    <Text c="dimmed" size="sm" mb="lg" ta="center">
                      You will be redirected to the login page in {countdown} seconds...
                    </Text>
                    
                    <Stack gap="md">
                      <Text fw={700} size="lg">What's next?</Text>
                      <Group gap="xs" align="center">
                        <ThemeIcon size="md" radius="xl" color="blue" variant="light">
                          <RiArrowRightLine size={14} />
                        </ThemeIcon>
                        <Text size="md">
                          {verificationStatus.isEmailChange ? 
                            'Log in with your new email address' : 
                            'Log in to your account'}
                        </Text>
                      </Group>
                      {!verificationStatus.isEmailChange && (
                        <>
                          <Group gap="xs" align="center">
                            <ThemeIcon size="md" radius="xl" color="blue" variant="light">
                              <RiArrowRightLine size={14} />
                            </ThemeIcon>
                            <Text size="md">Set up your trading profile</Text>
                          </Group>
                          <Group gap="xs" align="center">
                            <ThemeIcon size="md" radius="xl" color="blue" variant="light">
                              <RiArrowRightLine size={14} />
                            </ThemeIcon>
                            <Text size="md">Start tracking your trades</Text>
                          </Group>
                        </>
                      )}
                    </Stack>
                  </Box>
                )}
                
                {/* Error Guidance */}
                {!verificationStatus.success && (
                  <Box mt="md">
                    <Text c="dimmed" size="sm" mb="lg" ta="center">
                      If you're having trouble with the verification link:
                    </Text>
                    <Stack gap="md">
                      <Group gap="xs" align="center">
                        <ThemeIcon size="md" radius="xl" color="blue" variant="light">
                          <RiArrowRightLine size={14} />
                        </ThemeIcon>
                        <Text size="md">Check if you're using the latest verification link</Text>
                      </Group>
                      <Group gap="xs" align="center">
                        <ThemeIcon size="md" radius="xl" color="blue" variant="light">
                          <RiArrowRightLine size={14} />
                        </ThemeIcon>
                        <Text size="md">Try requesting a new verification email</Text>
                      </Group>
                      <Group gap="xs" align="center">
                        <ThemeIcon size="md" radius="xl" color="blue" variant="light">
                          <RiArrowRightLine size={14} />
                        </ThemeIcon>
                        <Text size="md">Contact support if the problem persists</Text>
                      </Group>
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}
          </Stack>
        </Card>
      </Container>
      <style>
        {`
          @keyframes bounce {
            from, 20%, 53%, 80%, to {
              transform: translate3d(0, 0, 0);
            }
            40%, 43% {
              transform: translate3d(0, -30px, 0);
            }
            70% {
              transform: translate3d(0, -15px, 0);
            }
            90% {
              transform: translate3d(0, -4px, 0);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default VerifyEmailChange; 