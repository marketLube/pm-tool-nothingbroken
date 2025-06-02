import React, { useState } from 'react';
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
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const getInitials = (name: string) => {
    if (!name || name.trim() === '') return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    if (parts.length === 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    // For more than 2 names, use first and last
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const sizeStyles = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl'
  };

  // Enhanced color palette with better contrast and modern colors
  const bgColors = [
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-amber-500 to-amber-600',
    'bg-gradient-to-br from-rose-500 to-rose-600',
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
    'bg-gradient-to-br from-pink-500 to-pink-600',
    'bg-gradient-to-br from-teal-500 to-teal-600',
    'bg-gradient-to-br from-cyan-500 to-cyan-600',
    'bg-gradient-to-br from-orange-500 to-orange-600',
    'bg-gradient-to-br from-violet-500 to-violet-600',
    'bg-gradient-to-br from-slate-500 to-slate-600'
  ];

  // Enhanced deterministic color selection
  const getBackgroundColor = (name?: string) => {
    if (!name) return bgColors[0];
    
    // Better hash function for more even distribution
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return bgColors[Math.abs(hash) % bgColors.length];
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Reset error state when src changes
  React.useEffect(() => {
    if (src) {
      setImageError(false);
      setImageLoaded(false);
    }
  }, [src]);

  const shouldShowImage = src && !imageError;

  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center rounded-full overflow-hidden border-2 border-white shadow-lg',
        sizeStyles[size],
        className
      )}
    >
      {shouldShowImage ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      ) : (
        <div
          className={clsx(
            'flex items-center justify-center h-full w-full text-white font-bold tracking-wide',
            getBackgroundColor(name)
          )}
        >
          {name && getInitials(name) ? getInitials(name) : (
            <svg 
              className="w-3/5 h-3/5 text-white/90" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
};

export default Avatar;