import React, { useState } from 'react';
import { Box, Text, Button, Group, Paper, Alert, Loader } from '@mantine/core';
import { RiMailLine, RiCheckLine, RiErrorWarningLine } from 'react-icons/ri';
import authService from '../../services/authService';

interface EmailVerificationStatusProps {
  email: string;
  isVerified: boolean;
}

const EmailVerificationStatus: React.FC<EmailVerificationStatusProps> = ({ 
  email, 
  isVerified 
}) => {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendStatus(null);
    
    try {
      const response = await authService.resendVerificationEmail(email);
      setResendStatus({
        success: true,
        message: response.message || 'Verification email has been sent!'
      });
    } catch (error) {
      console.error('Error resending verification email:', error);
      setResendStatus({
        success: false,
        message: 'Failed to send verification email. Please try again later.'
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Paper withBorder p="md" radius="md" mb="lg">
      <Group align="flex-start" justify="space-between">
        <Box>
          <Text size="lg" fw={500} mb="xs">Email Verification</Text>
          <Text size="sm" c="dimmed" mb="md">
            {isVerified 
              ? 'Your email has been verified. You have full access to all features.'
              : 'Please verify your email address to ensure full access to all features.'
            }
          </Text>
          
          {isVerified ? (
            <Alert 
              variant="light" 
              color="green"
              title="Email Verified" 
              icon={<RiCheckLine size={20} />}
            >
              Your email ({email}) has been verified.
            </Alert>
          ) : (
            <Alert 
              variant="light" 
              color="orange" 
              title="Email Not Verified" 
              icon={<RiErrorWarningLine size={20} />}
            >
              Your email ({email}) has not been verified. Please check your inbox or spam folder for the verification link.
            </Alert>
          )}
          
          {resendStatus && (
            <Alert 
              mt="md"
              variant="light"
              color={resendStatus.success ? 'green' : 'red'}
              title={resendStatus.success ? 'Email Sent' : 'Error'}
              icon={resendStatus.success ? <RiMailLine size={20} /> : <RiErrorWarningLine size={20} />}
            >
              {resendStatus.message}
            </Alert>
          )}
        </Box>
        
        {!isVerified && (
          <Button 
            leftSection={isResending ? <Loader size="xs" color="white" /> : <RiMailLine size={16} />}
            onClick={handleResendVerification}
            disabled={isResending}
          >
            {isResending ? 'Sending...' : 'Resend Verification'}
          </Button>
        )}
      </Group>
    </Paper>
  );
};

export default EmailVerificationStatus;
