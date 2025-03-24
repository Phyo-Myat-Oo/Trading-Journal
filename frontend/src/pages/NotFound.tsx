import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container, Text, Title } from '@mantine/core';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container size="md" className="flex flex-col items-center justify-center min-h-screen">
      <Title order={1} className="text-4xl font-bold mb-4">404 - Page Not Found</Title>
      <Text size="lg" className="mb-8 text-center">
        The page you're looking for doesn't exist or has been moved.
      </Text>
      <Button onClick={() => navigate('/')} size="lg">
        Return to Dashboard
      </Button>
    </Container>
  );
};

export default NotFound; 