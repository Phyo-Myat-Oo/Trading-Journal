import React, { useState } from 'react';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[Date, Date]>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7); // Default to last 7 days
    return [start, end];
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleDateRangeChange = (newRange: [Date, Date]) => {
    setDateRange(newRange);
    // You might want to trigger data fetching or other actions here
    console.log('Date range changed:', newRange);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#13151A] text-white">
      <Header 
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        onMenuClick={toggleSidebar}
      />
      
      <div className="flex flex-1">
        {/* Sidebar - can be expanded based on isSidebarOpen state */}
        <aside className={`fixed left-0 top-14 md:top-[80px] z-30 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-5rem)] w-64 bg-[#1A1D23] transform transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:static md:translate-x-0 md:transition-none`}>
          <div className="p-4">
            {/* Sidebar content */}
            <h3 className="text-lg font-medium mb-4">Navigation</h3>
            <nav className="space-y-2">
              <a href="#" className="block px-3 py-2 rounded-md hover:bg-[#22242A] transition-colors">Dashboard</a>
              <a href="#" className="block px-3 py-2 rounded-md hover:bg-[#22242A] transition-colors">Trades</a>
              <a href="#" className="block px-3 py-2 rounded-md hover:bg-[#22242A] transition-colors">Analytics</a>
              <a href="#" className="block px-3 py-2 rounded-md hover:bg-[#22242A] transition-colors">Settings</a>
            </nav>
          </div>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          {/* Overlay for mobile sidebar */}
          {isSidebarOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
              onClick={toggleSidebar}
            />
          )}
          
          {/* Page content */}
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}; 