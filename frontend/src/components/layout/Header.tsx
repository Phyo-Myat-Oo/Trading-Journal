import React, { useState, useRef, useEffect } from 'react';
import { RiNotification3Line, RiMenuLine, RiLogoutBoxLine } from 'react-icons/ri';
import { DateFilterContainer } from '../DateRangePicker';
import { useAuth, User } from '../../contexts/AuthContext';

// Create a reusable ProfileAvatar component for the header
function HeaderProfileAvatar({ 
  profilePicture, 
  initial, 
  onClick 
}: { 
  profilePicture: string | null | undefined;
  initial?: string;
  onClick: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  if (profilePicture && !imageError) {
    return (
      <button 
        onClick={onClick}
        className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-700 hover:border-gray-500 transition-colors focus:outline-none"
      >
        <img 
          src={profilePicture} 
          alt="Profile" 
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </button>
    );
  }

  // Use initial when no profile picture is available or image failed to load
  return (
    <button 
      className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium border border-gray-700 hover:border-gray-500 transition-colors focus:outline-none"
      onClick={onClick}
    >
      {initial || 'U'}
    </button>
  );
}

interface HeaderProps {
  dateRange?: [Date, Date];
  onDateRangeChange?: (range: [Date, Date]) => void;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dateRange: externalDateRange,
  onDateRangeChange,
  onMenuClick,
}) => {
  const { user, logout, setUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const [profileKey, setProfileKey] = useState(0); // Add a key to force re-render

  // Get the initial for the avatar
  const userInitial = user?.firstName ? user.firstName[0] : 'U';

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent<User> | StorageEvent) => {
      let updatedUser: User | null = null;
      
      if (event instanceof CustomEvent) {
        updatedUser = event.detail;
      } else if (event instanceof StorageEvent && event.key === 'user' && event.newValue) {
        try {
          updatedUser = JSON.parse(event.newValue);
        } catch (error) {
          console.error('Error parsing user data from storage event:', error);
          return;
        }
      }
      
      if (updatedUser) {
        // Force a re-render of the HeaderProfileAvatar by updating its key
        setProfileKey(prev => prev + 1);
        // Update the user data in the AuthContext
        setUser(updatedUser);
      }
    };

    // Listen for both custom and storage events
    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    window.addEventListener('storage', handleProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
      window.removeEventListener('storage', handleProfileUpdate as EventListener);
    };
  }, [setUser]);

  const handleLogout = async () => {
    // Prevent multiple clicks
    if (isLoggingOut) {
      console.log('Logout already in progress');
      return;
    }
    
    try {
      setIsLoggingOut(true);
      console.log('Header: Starting logout process');
      await logout();
      setMobileMenuOpen(false);
      setDesktopMenuOpen(false);
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setDesktopMenuOpen(false); // Close desktop menu if open
  };

  const toggleDesktopMenu = () => {
    setDesktopMenuOpen(!desktopMenuOpen);
    setMobileMenuOpen(false); // Close mobile menu if open
  };

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If click is outside mobile menu ref, close mobile menu
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
      
      // If click is outside desktop menu ref, close desktop menu
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(event.target as Node)) {
        setDesktopMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#13151A] border-b border-[#1E2024]">
      {/* Mobile View */}
      <div className="md:hidden flex items-center justify-between px-3 h-14">
        <div className="flex items-center">
          {onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="text-gray-400 hover:text-gray-200 transition-colors p-1.5"
            >
              <RiMenuLine size={22} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-gray-200 transition-colors p-1.5">
            <RiNotification3Line size={22} />
          </button>
          
          <div className="relative" ref={mobileMenuRef}>
            <HeaderProfileAvatar 
              key={profileKey}
              profilePicture={user?.profilePicture}
              initial={userInitial}
              onClick={toggleMobileMenu}
            />
            
            {mobileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1E2024] rounded-md shadow-lg py-1 z-50">
                {user && (
                  <div className="px-4 py-2 text-sm text-gray-300 border-b border-[#13151A]">
                    {user.firstName} {user.lastName}
                  </div>
                )}
                <button 
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-[#13151A] hover:text-white"
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <>
                      <span className="mr-2 w-4 h-4 rounded-full border-2 border-t-transparent border-gray-300 animate-spin"></span>
                      Logging out...
                    </>
                  ) : (
                    <>
                      <RiLogoutBoxLine className="mr-2" />
                      Logout
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex items-center h-[80px] px-4 lg:px-6 gap-4 lg:gap-6">
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="text-gray-400 hover:text-gray-200 transition-colors p-1"
            >
              <RiMenuLine size={20} />
            </button>
          )}
        </div>
        
        <div className="flex-1">
          {/* Main content area */}
        </div>
        
        <div className="flex items-center gap-5">
          <DateFilterContainer 
            dateRange={externalDateRange}
            onDateRangeChange={onDateRangeChange}
          />
          
          <div className="flex items-center gap-4 border-l border-[#1E2024] pl-5">
            <button className="text-gray-400 hover:text-gray-200 transition-colors p-1.5">
              <RiNotification3Line size={22} />
            </button>
            <div className="relative" ref={desktopMenuRef}>
              <HeaderProfileAvatar 
                key={profileKey}
                profilePicture={user?.profilePicture}
                initial={userInitial}
                onClick={toggleDesktopMenu}
              />
              
              {desktopMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1E2024] rounded-md shadow-lg py-1 z-50">
                  {user && (
                    <div className="px-4 py-2 text-sm text-gray-300 border-b border-[#13151A]">
                      {user.firstName} {user.lastName}
                    </div>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-[#13151A] hover:text-white"
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <>
                        <span className="mr-2 w-4 h-4 rounded-full border-2 border-t-transparent border-gray-300 animate-spin"></span>
                        Logging out...
                      </>
                    ) : (
                      <>
                        <RiLogoutBoxLine className="mr-2" />
                        Logout
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};