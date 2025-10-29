import React from 'react';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  text?: string;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({ 
  size = 'md', 
  fullScreen = false, 
  text = 'Chargement...', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const LoadingSpinner = () => (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}></div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <LoadingSpinner />
        {text && <p className="mt-4 text-gray-600">{text}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <LoadingSpinner />
      {text && size !== 'sm' && <span className="ml-2 text-gray-600">{text}</span>}
    </div>
  );
};

export default Loading;