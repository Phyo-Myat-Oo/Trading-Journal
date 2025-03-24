import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Modal, 
  Text, 
  Progress, 
  Group, 
  Stack
} from '@mantine/core';
import { RiTimeLine } from 'react-icons/ri';

interface SessionExpirationDialogProps {
  timeToExpiration: number; // Seconds until expiration
  onExtend: () => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
}

/**
 * Dialog shown to users when their session is about to expire
 * Provides a countdown and option to extend the session
 */
const SessionExpirationDialog: React.FC<SessionExpirationDialogProps> = ({
  timeToExpiration,
  onExtend,
  onClose,
  isOpen
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(timeToExpiration);
  const [extending, setExtending] = useState<boolean>(false);
  const [extendError, setExtendError] = useState<string | null>(null);
  
  // Format seconds into MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage (0-100)
  const calculateProgress = (): number => {
    // Start showing when we have less than 2 minutes (120 seconds)
    const totalWarningTime = 120;
    const percentage = Math.max(0, Math.min(100, (remainingTime / totalWarningTime) * 100));
    return 100 - percentage; // Invert so progress increases as time decreases
  };
  
  // Handle the extend session button click
  const handleExtend = async () => {
    setExtending(true);
    setExtendError(null);
    
    try {
      await onExtend();
      onClose();
    } catch (error) {
      setExtendError('Unable to extend session. Please try logging in again.');
      console.error('Failed to extend session:', error);
    } finally {
      setExtending(false);
    }
  };
  
  // Countdown timer effect
  useEffect(() => {
    if (!isOpen) return;
    
    setRemainingTime(timeToExpiration);
    
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isOpen, timeToExpiration]);
  
  // Close automatically when time reaches zero
  useEffect(() => {
    if (remainingTime === 0) {
      onClose();
    }
  }, [remainingTime, onClose]);
  
  return (
    <Modal 
      opened={isOpen} 
      onClose={onClose}
      title={
        <Group>
          <RiTimeLine size={20} color="orange" />
          <Text fw={600}>Your session is about to expire</Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        <Text>
          For security reasons, your session will expire in <strong>{formatTime(remainingTime)}</strong>.
        </Text>
        
        <Progress 
          value={calculateProgress()} 
          color={remainingTime < 30 ? "red" : "orange"} 
          size="md"
          radius="xl"
        />
        
        {extendError && (
          <Text c="red" size="sm">
            {extendError}
          </Text>
        )}
        
        <Text size="sm" c="dimmed">
          Would you like to extend your session?
        </Text>
        
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Log out
          </Button>
          <Button 
            onClick={handleExtend} 
            loading={extending}
            color="blue"
          >
            Extend Session
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default SessionExpirationDialog; 