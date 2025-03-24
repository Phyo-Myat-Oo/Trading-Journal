import React, { useState } from 'react';
import { Box, Button, Group, Paper, Text, Alert } from '@mantine/core';
import { RiMailLine, RiCheckLine, RiErrorWarningLine } from 'react-icons/ri';

interface EmailVerificationBannerProps {
  email: string;
  onResend: () => Promise<void>;
  showBanner?: boolean;
}

/**
 * Banner component that displays when a user's email is not verified
 * Provides information about the verification process and allows resending the verification email
 */
const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  email,
  onResend,
  showBanner = true
}) => {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  // Don't show if banner is disabled
  if (!showBanner) return null;

  const handleResend = async () => {
    if (isResending) return;

    setIsResending(true);
    setResendSuccess(false);
    setResendError(null);

    try {
      await onResend();
      setResendSuccess(true);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      setResendError('Failed to resend verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Paper
      p="md"
      radius="md"
      mb="lg"
      withBorder
      bg="blue.0"
      style={{
        borderColor: 'var(--mantine-color-blue-5)'
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group align="flex-start" wrap="nowrap">
          <RiMailLine size={24} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <Text fw={600} size="sm">
              Please verify your email address
            </Text>
            <Text size="sm" c="dimmed" mt={4}>
              A verification email was sent to <strong>{email}</strong>. 
              Please check your inbox and click the verification link.
            </Text>
            
            {resendSuccess && (
              <Alert 
                icon={<RiCheckLine />} 
                color="green" 
                mt="sm" 
                withCloseButton={false}
                radius="sm"
              >
                Verification email sent! Please check your inbox.
              </Alert>
            )}
            
            {resendError && (
              <Alert 
                icon={<RiErrorWarningLine />} 
                color="red" 
                mt="sm"
                withCloseButton
                onClose={() => setResendError(null)}
                radius="sm"
              >
                {resendError}
              </Alert>
            )}
          </div>
        </Group>
        
        <Button 
          variant="light" 
          onClick={handleResend} 
          loading={isResending} 
          disabled={resendSuccess}
          size="sm"
          style={{ flexShrink: 0 }}
        >
          Resend Email
        </Button>
      </Group>
      
      <Box mt="md" style={{ fontSize: '0.875rem' }}>
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            Can't find the email?
          </Text>
          <Text size="sm">
            Check your spam folder or click Resend Email to get a new verification link.
          </Text>
        </Group>
      </Box>
    </Paper>
  );
};

export default EmailVerificationBanner; 