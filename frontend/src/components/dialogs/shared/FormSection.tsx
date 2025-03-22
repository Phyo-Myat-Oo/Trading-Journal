import React, { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Component for organizing form content into logical sections
 * Includes optional title and description
 */
export function FormSection({ 
  title, 
  description, 
  children, 
  className = '' 
}: FormSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-1">
        <h3 className="text-gray-300 font-medium text-[15px]">{title}</h3>
        {description && (
          <p className="text-gray-400 text-[13px]">{description}</p>
        )}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

/**
 * Horizontal form section with columns
 */
export function FormGrid({ 
  children, 
  cols = 2, 
  className = '' 
}: { 
  children: ReactNode; 
  cols?: 1 | 2 | 3 | 4; 
  className?: string 
}) {
  // Get the appropriate grid columns class based on the cols prop
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  }[cols];
  
  return (
    <div className={`grid ${gridCols} gap-3 ${className}`}>
      {children}
    </div>
  );
} 