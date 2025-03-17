import { NavLink } from 'react-router-dom';
import { IconType } from 'react-icons';

interface NavItemProps {
  to: string;
  icon: IconType;
  label: string;
  isMobile: boolean;
}

export function NavItem({ to, icon: Icon, label, isMobile }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }) => `
        flex items-center px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E2024]
        ${isActive ? 'bg-[#1E2024] !text-white' : ''}
      `}
    >
      <Icon size={20} className="shrink-0" />
      <span className="ml-3">{label}</span>
    </NavLink>
  );
} 