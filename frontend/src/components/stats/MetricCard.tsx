  import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  color: 'green' | 'red';
  progressPercentage?: number;
  showProgressBar?: boolean;
}

export function MetricCard({ 
  title, 
  value, 
  color, 
  progressPercentage = 70, 
  showProgressBar = true 
}: MetricCardProps) {
  const colorClass = color === 'green' ? 'text-green-400' : 'text-red-400';
  const barColorClass = color === 'green' ? 'bg-green-400' : 'bg-red-400';
  
  return (
    <div className="bg-[#1A1B23] rounded-lg p-4 shadow-lg">
      <div className="flex items-start space-x-3">
        <div className="w-1 h-12 bg-blue-500 rounded-full"></div>
        <div className="w-full">
          <h3 className="text-gray-400 text-xs font-medium">{title}</h3>
          {showProgressBar ? (
            <div className="mt-3 flex items-center">
              <div className="w-12 md:w-16 h-2 bg-[#2C2D38] rounded-full mr-3">
                <div 
                  className={`h-full ${barColorClass} rounded-full`} 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <p className={`text-lg md:text-xl font-semibold ${colorClass} whitespace-nowrap`}>
                {value}
              </p>
            </div>
          ) : (
            <p className={`text-xl font-semibold ${colorClass} mt-1`}>
              {value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 