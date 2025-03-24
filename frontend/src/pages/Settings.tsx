import React, { useState, useEffect } from 'react';
import { Tabs, Title, Container, Paper } from '@mantine/core';
import { 
  RiUser3Line, 
  RiLockLine, 
  RiShieldLine, 
  RiSettings3Line 
} from 'react-icons/ri';
import { SessionsManagement } from '../components/settings/SessionsManagement';
import AccountSecurity from '../components/security/AccountSecurity';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import EmailVerificationStatus from '../components/auth/EmailVerificationStatus';

interface LocationState {
  activeTab?: string;
}

export function Settings() {
  const [activeTab, setActiveTab] = useState<string | null>('account');
  const { user } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    // Check if location state has an activeTab value
    const state = location.state as LocationState;
    if (state?.activeTab) {
      setActiveTab(state.activeTab);
    }
  }, [location]);

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="lg">Account Settings</Title>
      
      <Paper shadow="sm" p="md" withBorder>
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          variant="outline"
          radius="md"
        >
          <Tabs.List>
            <Tabs.Tab value="account" leftSection={<RiUser3Line size={16} />}>
              Profile
            </Tabs.Tab>
            <Tabs.Tab value="security" leftSection={<RiLockLine size={16} />}>
              Security
            </Tabs.Tab>
            <Tabs.Tab value="sessions" leftSection={<RiShieldLine size={16} />}>
              Sessions
            </Tabs.Tab>
            <Tabs.Tab value="preferences" leftSection={<RiSettings3Line size={16} />}>
              Preferences
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="account" pt="md">
            <Paper p="md">
              <Title order={3} mb="md">Profile Settings</Title>
              
              {/* Email verification status */}
              {user && (
                <EmailVerificationStatus 
                  email={user.email} 
                  isVerified={user.isVerified || false} 
                />
              )}
              
              {/* Profile settings form will go here */}
              <div className="text-gray-400">Profile settings functionality coming soon...</div>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="security" pt="md">
            <Paper p="md">
              <Title order={3} mb="md">Security Settings</Title>
              <AccountSecurity userId={user?.id} />
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="sessions" pt="md">
            <SessionsManagement />
          </Tabs.Panel>

          <Tabs.Panel value="preferences" pt="md">
            <Paper p="md">
              <Title order={3} mb="md">Preferences</Title>
              {/* Preferences form will go here */}
              <div className="text-gray-400">Preferences functionality coming soon...</div>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
} 