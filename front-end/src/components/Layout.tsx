import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState, useEffect } from 'react';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024);
      setSidebarCollapsed(width < 1024);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check initial size
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#13151A]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed top-0 left-0 h-full">
        <Sidebar isMobile={false} />
      </div>

      {/* Mobile/Tablet Sidebar */}
      {isMobile && !sidebarCollapsed && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarCollapsed(true)} />
          <div className="absolute top-0 left-0 h-full">
            <Sidebar isMobile={true} />
          </div>
        </div>
      )}
      
      {/* Header and Main Content */}
      <div className={`${!isMobile ? 'lg:pl-64' : ''}`}>
        <Header 
          onMenuClick={isMobile ? () => setSidebarCollapsed(!sidebarCollapsed) : undefined}
          isMobile={isMobile}
        />
        <main className="p-3 sm:p-4 lg:p-6">
          <div className="max-w-[1920px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}