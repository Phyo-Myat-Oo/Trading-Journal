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
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-[#1E2024] hover:bg-[#282C34] text-white',
    tertiary: 'bg-[#1E2024] hover:bg-[#282C34] text-amber-500'
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center px-4 py-2 rounded-lg
        ${variantClasses[variant]}
      `}
    >
      <Icon size={20} className="shrink-0" />
      <span className="ml-3">{label}</span>
    </button>
  );
} 