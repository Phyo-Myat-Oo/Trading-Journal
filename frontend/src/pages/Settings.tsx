import React, { useState, useEffect } from 'react';
import { 
  Tabs, 
  Title, 
  Container, 
  Paper, 
  Group, 
  Text, 
  Divider, 
  Box, 
  Breadcrumbs, 
  Anchor,
  rem,
  Transition
} from '@mantine/core';
import { 
  RiUser3Line, 
  RiLockLine, 
  RiShieldLine, 
  RiSettings3Line,
  RiHome2Line,
  RiUserSettingsLine
} from 'react-icons/ri';
import { SessionsManagement } from '../components/settings/SessionsManagement';
import AccountSecurity from '../components/security/AccountSecurity';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import EmailVerificationStatus from '../components/auth/EmailVerificationStatus';

interface LocationState {
  activeTab?: string;
}

export function Settings() {
  const [activeTab, setActiveTab] = useState<string | null>('account');
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    // Check if location state has an activeTab value
    const state = location.state as LocationState;
    if (state?.activeTab) {
      setActiveTab(state.activeTab);
    }
    
    // Set mounted for animations
    setMounted(true);
    return () => setMounted(false);
  }, [location]);

  const items = [
    { title: 'Home', href: '/', icon: <RiHome2Line size={14} /> },
    { title: 'Settings', href: '#', icon: <RiUserSettingsLine size={14} /> },
  ].map((item, index) => (
    <Anchor component={Link} to={item.href} key={index} fw={500} size="sm">
      <Group gap={6}>
        {item.icon}
        {item.title}
      </Group>
    </Anchor>
  ));

  return (
    <Container size="xl" py="xl">
      <Transition mounted={mounted} transition="fade" duration={400} timingFunction="ease">
        {(styles) => (
          <div style={styles}>
            <Box mb="lg">
              <Breadcrumbs separator="→" mt="xs" mb="lg">
                {items}
              </Breadcrumbs>
              
              <Group mb="sm">
                <Title order={2}>Account Settings</Title>
              </Group>
              
              <Text c="dimmed" size="sm" mb="lg">
                Manage your account settings, security, and sessions
              </Text>
            </Box>
            
            <Paper shadow="sm" p="md" withBorder>
              <Tabs
                value={activeTab}
                onChange={setActiveTab}
                radius="md"
                variant="pills"
                placement="left"
                defaultValue="account"
              >
                <Tabs.List style={{ minWidth: rem(200) }}>
                  <Box mb="md" p="md">
                    <Group gap="xs">
                      {user && (
                        <Text fw={700} size="lg">
                          {user.firstName} {user.lastName}
                        </Text>
                      )}
                    </Group>
                    {user && <Text size="xs" c="dimmed">{user.email}</Text>}
                  </Box>
                  
                  <Divider mb="md" />
                  
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

                <Divider orientation="vertical" mx="md" />

                <Tabs.Panel value="account" pt="md" px="md">
                  <Title order={3} mb="md">Profile Settings</Title>
                  
                  {/* Email verification status */}
                  {user && (
                    <EmailVerificationStatus 
                      email={user.email} 
                      isVerified={user.isVerified || false} 
                    />
                  )}
                  
                  {/* Profile settings form will go here */}
                  <Text c="dimmed" mt="lg">Profile settings functionality coming soon...</Text>
                </Tabs.Panel>

                <Tabs.Panel value="security" pt="md" px="md">
                  <Title order={3} mb="md">Security Settings</Title>
                  <AccountSecurity userId={user?.id} />
                </Tabs.Panel>

                <Tabs.Panel value="sessions" pt="md" px="md">
                  <SessionsManagement />
                </Tabs.Panel>

                <Tabs.Panel value="preferences" pt="md" px="md">
                  <Title order={3} mb="md">Preferences</Title>
                  {/* Preferences form will go here */}
                  <Text c="dimmed">Preferences functionality coming soon...</Text>
                </Tabs.Panel>
              </Tabs>
            </Paper>
          </div>
        )}
      </Transition>
    </Container>
  );
} 