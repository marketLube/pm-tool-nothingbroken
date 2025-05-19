import React from 'react';
import clsx from 'clsx';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  name,
  size = 'md',
  className,
}) => {
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const sizeStyles = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl'
  };

  const bgColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-teal-500'
  ];

  // Deterministically pick a color based on the name if provided
  const getBackgroundColor = (name?: string) => {
    if (!name) return bgColors[0];
    
    // Simple hash function to pick a color
    const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return bgColors[charSum % bgColors.length];
  };

  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center rounded-full overflow-hidden',
        sizeStyles[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={clsx(
            'flex items-center justify-center h-full w-full text-white font-medium',
            getBackgroundColor(name)
          )}
        >
          {name ? getInitials(name) : '?'}
        </div>
      )}
    </div>
  );
};

export default Avatar;