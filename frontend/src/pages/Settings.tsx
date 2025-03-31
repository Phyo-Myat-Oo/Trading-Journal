import React, { useState, useEffect } from 'react';
import { 
  Box,
  Text, 
  Stack,
  TextInput,
  Button,
  rem,
  Paper,
  Transition,
  Divider
} from '@mantine/core';
import { 
  RiGiftLine,
  RiSettings4Line,
  RiPriceTag3Line,
  RiShieldLine, 
  RiAlertLine,
  RiCheckLine,
} from 'react-icons/ri';
import { useAuth, User } from '../contexts/AuthContext';
import { ProfilePicture } from '../components/settings/ProfilePicture';
import { notifications } from '@mantine/notifications';
import { AxiosError } from 'axios';
import api from '../utils/api';
import { TokenManager } from '../services/TokenManager';
import { useNotification } from '../contexts/NotificationContext';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg text-left transition-all duration-200 transform ${
        active 
          ? 'bg-blue-500/15 text-blue-400 scale-102 shadow-sm' 
          : 'text-gray-400 hover:bg-blue-500/5 hover:text-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`text-xl flex-shrink-0 transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
          {icon}
        </span>
        <Text size="sm" fw={600} className="tracking-wide truncate">
          {label}
        </Text>
      </div>
    </button>
  );
}

export function Settings() {
  const [activeSection, setActiveSection] = useState('personal');
  const { user, updateUserProfile, logout } = useAuth();
  const { showNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pendingProfilePicture, setPendingProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    timezone: user?.timezone || 'UTC',
    currency: user?.currency || 'USD',
    language: user?.language || 'en',
    notifications: user?.notifications || {
      email: true,
      push: true,
      sms: false
    },
    profilePicture: user?.profilePicture || ''
  });

  // Initialize token when component mounts
  useEffect(() => {
    const tokenManager = TokenManager.getInstance();
    const token = localStorage.getItem('token');
    
    if (token && !tokenManager.isTokenValid()) {
      console.log('Token found but invalid, attempting refresh');
      tokenManager.refreshToken('high').catch(error => {
        console.error('Failed to refresh token:', error);
        notifications.show({
          title: 'Session Error',
          message: 'Your session has expired. Please log in again.',
          color: 'red',
          withBorder: true
        });
      });
    }
  }, []);

  // Initialize form data when user data changes or is initialized
  useEffect(() => {
    const handleUserDataInitialized = (event: CustomEvent<User>) => {
      const userData = event.detail;
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        timezone: userData.timezone || 'UTC',
        currency: userData.currency || 'USD',
        language: userData.language || 'en',
        notifications: userData.notifications || {
          email: true,
          push: true,
          sms: false
        },
        profilePicture: userData.profilePicture || ''
      });
    };

    // Listen for user data initialization
    window.addEventListener('userDataInitialized', handleUserDataInitialized as EventListener);

    // Initialize form data from user object
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        timezone: user.timezone || 'UTC',
        currency: user.currency || 'USD',
        language: user.language || 'en',
        notifications: user.notifications || {
          email: true,
          push: true,
          sms: false
        },
        profilePicture: user.profilePicture || ''
      });
    }

    return () => {
      window.removeEventListener('userDataInitialized', handleUserDataInitialized as EventListener);
    };
  }, [user]);

  const navItems = [
    { id: 'personal', label: 'Personal Info', icon: <RiGiftLine size={22} /> },
    { id: 'account', label: 'Account Settings', icon: <RiSettings4Line size={22} /> },
    { id: 'tags', label: 'Tag Management', icon: <RiPriceTag3Line size={22} /> },
    { id: 'security', label: 'Password & Security', icon: <RiShieldLine size={22} /> },
    { id: 'danger', label: 'Danger Zone', icon: <RiAlertLine size={22} color="#ff4d4f" /> },
  ];

  const handleImageChange = (file: File) => {
    setPendingProfilePicture(file);
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setSaveSuccess(false);
      let profilePictureUrl = user?.profilePicture;
      console.log('Initial profilePictureUrl:', profilePictureUrl);

      // Upload profile picture if one is pending
      if (pendingProfilePicture) {
        const formData = new FormData();
        formData.append('avatar', pendingProfilePicture);
        const response = await api.post('/api/users/profile/picture', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        console.log('Profile picture upload response:', response.data);
        profilePictureUrl = response.data.data.profilePicture;
        console.log('Updated profilePictureUrl:', profilePictureUrl);
        
        // Immediately update user state with new profile picture
        if (user) {
          const updatedUser = { ...user, profilePicture: profilePictureUrl };
          await updateUserProfile(updatedUser);
        }
        
        // Clear the pending profile picture and preview URL
        setPendingProfilePicture(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      }

      // Update profile with new profile picture URL if uploaded
      const updateData = {
        ...formData,
        profilePicture: profilePictureUrl
      };
      console.log('Sending update data:', updateData);

      const response = await api.put('/api/users/profile', updateData);
      console.log('Profile update response:', response.data);
      
      // Update user state with the response data
      if (response.data.success && response.data.data) {
        await updateUserProfile(response.data.data);
        // Also update form data
        setFormData(prev => ({
          ...prev,
          ...response.data.data
        }));
      }
      
      setSaveSuccess(true);
      showNotification('Profile updated successfully', 'success');

      // Only handle logout if email was changed
      if (formData.email !== user?.email && response.data.requiresLogout) {
        showNotification(response.data.message || 'Please verify your new email address. You will be logged out.', 'info');
        // Wait a moment to show the notification before logging out
        setTimeout(() => {
          logout();
        }, 2000);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const message = error instanceof AxiosError 
        ? error.response?.data?.message || 'Failed to update profile'
        : 'Failed to update profile';
      
      if (error instanceof AxiosError && error.response?.data?.message === 'Email is already in use') {
        showNotification('This email is already in use', 'error');
      } else {
        showNotification(message, 'error');
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#13151A]">
      {/* Left Sidebar */}
      <Paper 
        className="w-[280px] bg-[#1A1B1E] p-6 border-r border-[#2C2E33]"
        shadow="md"
      >
        <Text size="lg" fw={700} c="blue" mb={rem(24)} className="tracking-wide">
          Settings
              </Text>
        <Stack gap="md">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeSection === item.id}
              onClick={() => setActiveSection(item.id)}
            />
          ))}
        </Stack>
      </Paper>

      {/* Main Content */}
      <div className="flex-1 p-10">
        <Transition
          mounted={activeSection === 'personal'}
          transition="fade"
          duration={200}
        >
          {(styles) => (
            <Box style={styles}>
              {activeSection === 'personal' && (
                <Paper className="bg-[#1A1B1E] p-8 rounded-xl shadow-lg border border-[#2C2E33]">
                  <Text size="xl" fw={700} mb={rem(4)} className="text-gray-100">
                    Edit Profile
                  </Text>
                  <Text size="sm" c="dimmed" mb={rem(32)}>
                    Update your personal information and profile picture
                        </Text>
                  
                  {/* Profile Picture */}
                  <Box mb={rem(40)}>
                    <ProfilePicture
                      onImageChange={handleImageChange}
                      previewUrl={previewUrl}
                      profilePicture={user?.profilePicture}
                    />
                  </Box>
                  
                  <Divider my={rem(32)} color="#2C2E33" />

                  {/* Form */}
                  <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="max-w-[400px]">
                    <Stack gap="lg">
                      <TextInput
                        label="First Name"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        classNames={{
                          root: 'transition-all duration-200',
                          label: 'text-gray-200 font-medium mb-1.5 text-sm',
                          input: `
                            h-[42px] px-4 text-[15px]
                            bg-[#25262B] 
                            border border-[#2C2E33] 
                            text-gray-100
                            rounded-lg
                            transition-all duration-200
                            focus:border-blue-500 focus:outline-none
                            hover:border-[#40424A]
                            placeholder:text-gray-500
                          `,
                          wrapper: 'focus-within:translate-y-[-2px] transition-transform duration-200'
                        }}
                        placeholder="Enter your first name"
                      />
                      <TextInput
                        label="Last Name"
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        classNames={{
                          root: 'transition-all duration-200',
                          label: 'text-gray-200 font-medium mb-1.5 text-sm',
                          input: `
                            h-[42px] px-4 text-[15px]
                            bg-[#25262B] 
                            border border-[#2C2E33] 
                            text-gray-100
                            rounded-lg
                            transition-all duration-200
                            focus:border-blue-500 focus:outline-none
                            hover:border-[#40424A]
                            placeholder:text-gray-500
                          `,
                          wrapper: 'focus-within:translate-y-[-2px] transition-transform duration-200'
                        }}
                        placeholder="Enter your last name"
                      />
                      <TextInput
                        label="Email Address"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        classNames={{
                          root: 'transition-all duration-200',
                          label: 'text-gray-200 font-medium mb-1.5 text-sm',
                          input: `
                            h-[42px] px-4 text-[15px]
                            bg-[#25262B] 
                            border border-[#2C2E33] 
                            text-gray-100
                            rounded-lg
                            transition-all duration-200
                            focus:border-blue-500 focus:outline-none
                            hover:border-[#40424A]
                            placeholder:text-gray-500
                          `,
                          wrapper: 'focus-within:translate-y-[-2px] transition-transform duration-200'
                        }}
                        placeholder="Enter your email address"
                      />
                      <Button
                        type="submit"
                        color={saveSuccess ? 'green' : 'blue'}
                        loading={isLoading}
                        leftSection={saveSuccess ? <RiCheckLine size={20} /> : null}
                        className={`
                          w-full mt-6 h-[42px]
                          font-medium
                          transition-all duration-200
                          bg-blue-500 hover:bg-blue-600
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${saveSuccess ? '!bg-green-500 hover:!bg-green-600' : ''}
                        `}
                        disabled={isLoading || !formData.firstName || !formData.lastName || !formData.email}
                      >
                        {isLoading ? 'Saving...' : saveSuccess ? 'Saved Successfully' : 'Save Changes'}
                      </Button>
                    </Stack>
                  </form>
                </Paper>
              )}
            </Box>
          )}
        </Transition>
        
        {/* Other sections */}
        {activeSection !== 'personal' && (
          <Paper className="bg-[#1A1B1E] p-8 rounded-xl shadow-lg border border-[#2C2E33]">
            <Text size="xl" fw={700} mb={rem(4)} className="text-gray-100">
              {navItems.find(item => item.id === activeSection)?.label}
            </Text>
            <Text size="sm" c="dimmed">
              This section is coming soon...
            </Text>
            </Paper>
        )}
      </div>
    </div>
  );
} 