import { IconType } from 'react-icons';

interface ActionButtonProps {
  icon: IconType;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
}

export function ActionButton({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = 'primary' 
}: ActionButtonProps) {
  const variantClasses = {
    primary: 'bg-[#1A1F2C] hover:bg-[#1E242F] text-[#2196F3] border border-[#2196F3]/20',
    secondary: 'bg-[#1A1F2C] hover:bg-[#1E242F] text-[#9C27B0] border border-[#9C27B0]/20',
    tertiary: 'bg-[#1A1F2C] hover:bg-[#1E242F] text-[#FF9800] border border-[#FF9800]/20'
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center px-4 py-2.5 rounded-lg text-[14px] font-medium
        transition-all duration-200 ease-in-out
        ${variantClasses[variant]}
      `}
    >
      <Icon size={18} className="shrink-0" />
      <span className="ml-3">{label}</span>
    </button>
  );
} 