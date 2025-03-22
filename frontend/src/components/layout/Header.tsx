import React, { useState, useRef, useEffect } from 'react';
import { RiNotification3Line, RiUserLine, RiMenuLine, RiLogoutBoxLine } from 'react-icons/ri';
import { DateFilterContainer } from '../DateRangePicker';
import { useAuth } from '../../contexts/AuthContext';

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
  const { logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    setDesktopMenuOpen(false);
    window.location.href = '/login';
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
        
        <div className="flex-1 flex justify-center">
          <DateFilterContainer 
            dateRange={externalDateRange}
            onDateRangeChange={onDateRangeChange}
            compact={true}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button className="text-gray-400 hover:text-gray-200 transition-colors p-1.5">
            <RiNotification3Line size={20} />
          </button>
          <div className="relative" ref={mobileMenuRef}>
            <button 
              className="text-gray-400 hover:text-gray-200 transition-colors p-1.5"
              onClick={toggleMobileMenu}
            >
              <RiUserLine size={20} />
            </button>
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
                >
                  <RiLogoutBoxLine className="mr-2" />
                  Logout
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
              <button 
                className="text-gray-400 hover:text-gray-200 transition-colors p-1.5"
                onClick={toggleDesktopMenu}
              >
                <RiUserLine size={22} />
              </button>
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
                  >
                    <RiLogoutBoxLine className="mr-2" />
                    Logout
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