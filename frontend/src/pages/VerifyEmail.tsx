import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Box, Card, Container, Text, Title, Group, Button, Loader, ThemeIcon, Stack } from '@mantine/core';
import { RiCheckLine, RiErrorWarningLine, RiMailLine, RiArrowRightLine } from 'react-icons/ri';

const VerifyEmail = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<{
    success: boolean;
    message: string;
  }>({
    success: false,
    message: 'Verifying your email...',
  });
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setVerificationStatus({
          success: false,
          message: 'No verification token provided. Please check your email for the verification link.'
        });
        setIsVerifying(false);
        return;
      }
      
      setIsVerifying(true);
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setVerificationStatus({
            success: true,
            message: data.message || 'Your email has been verified successfully!'
          });
          
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
        } else {
          setVerificationStatus({
            success: false,
            message: data.message || 'Email verification failed. The link may be invalid or expired.'
          });
        }
      } catch (error) {
        console.error('Error during email verification:', error);
        setVerificationStatus({
          success: false,
          message: 'An error occurred during verification. Please try again later.'
        });
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyEmail();
  }, [token, navigate]);

  // Animation class for successful verification
  const successAnimation = verificationStatus.success ? 'animate-bounce' : '';

  return (
    <Container size="sm" py="xl">
      <Card p="xl" radius="md" withBorder shadow="sm">
        <Stack align="center" gap="lg">
          <Title order={2} ta="center" mb="md">
            Email Verification
          </Title>
          
          {isVerifying ? (
            <Stack align="center" gap="md">
              <Loader size="lg" color="blue" />
              <Text size="lg" fw={500}>
                Verifying your email address...
              </Text>
              <Text size="sm" c="dimmed">
                This will only take a moment
              </Text>
            </Stack>
          ) : (
            <Stack align="center" gap="lg">
              {/* Status Icon */}
              <div className={successAnimation}>
                <ThemeIcon 
                  size={80} 
                  radius={40} 
                  color={verificationStatus.success ? 'green' : 'red'}
                >
                  {verificationStatus.success ? (
                    <RiCheckLine size={50} />
                  ) : (
                    <RiErrorWarningLine size={50} />
                  )}
                </ThemeIcon>
              </div>
              
              {/* Status Message */}
              <Text size="lg" fw={500} ta="center">
                {verificationStatus.message}
              </Text>
              
              {/* Next Steps for Success */}
              {verificationStatus.success && (
                <Box mt="md">
                  <Text c="dimmed" size="sm" mb="sm" ta="center">
                    You will be redirected to the login page in {countdown} seconds...
                  </Text>
                  
                  <Stack mt="md" gap="sm">
                    <Text fw={500}>What's next?</Text>
                    <Group gap="xs" align="center">
                      <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                        <RiArrowRightLine size={12} />
                      </ThemeIcon>
                      <Text size="sm">Log in to your account</Text>
                    </Group>
                    <Group gap="xs" align="center">
                      <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                        <RiArrowRightLine size={12} />
                      </ThemeIcon>
                      <Text size="sm">Set up your trading profile</Text>
                    </Group>
                    <Group gap="xs" align="center">
                      <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                        <RiArrowRightLine size={12} />
                      </ThemeIcon>
                      <Text size="sm">Start tracking your trades</Text>
                    </Group>
                  </Stack>
                </Box>
              )}
              
              {/* Error Guidance */}
              {!verificationStatus.success && (
                <Box>
                  <Text c="dimmed" size="sm" mb="md" ta="center">
                    If you're having trouble with the verification link:
                  </Text>
                  <Stack gap="sm">
                    <Group gap="xs" align="center">
                      <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                        <RiArrowRightLine size={12} />
                      </ThemeIcon>
                      <Text size="sm">Check if you're using the latest verification link</Text>
                    </Group>
                    <Group gap="xs" align="center">
                      <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                        <RiArrowRightLine size={12} />
                      </ThemeIcon>
                      <Text size="sm">Try requesting a new verification email</Text>
                    </Group>
                    <Group gap="xs" align="center">
                      <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                        <RiArrowRightLine size={12} />
                      </ThemeIcon>
                      <Text size="sm">Contact support if the problem persists</Text>
                    </Group>
                  </Stack>
                </Box>
              )}
              
              {/* Actions */}
              <Group mt="lg" justify="center">
                <Button component={Link} to="/login" leftSection={<RiMailLine size={16} />}>
                  {verificationStatus.success ? "Go to Login" : "Back to Login"}
                </Button>
                
                {!verificationStatus.success && (
                  <Button component={Link} to="/register" variant="outline">
                    Register Again
                  </Button>
                )}
              </Group>
            </Stack>
          )}
        </Stack>
      </Card>
    </Container>
  );
};

export default VerifyEmail; 