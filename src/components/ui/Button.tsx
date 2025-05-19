import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'link';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: typeof LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  isLoading = false,
  className,
  disabled,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed btn-text transform hover:-translate-y-px active:translate-y-0 active:scale-98';
  
  const sizeStyles = {
    xs: 'h-7 px-2.5 text-xs rounded',
    sm: 'h-8 px-3 py-1 text-sm rounded-md',
    md: 'h-10 px-4 py-2 text-sm rounded-md',
    lg: 'h-12 px-6 py-3 text-base rounded-md'
  };
  
  const variantStyles = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-sm hover:shadow focus:ring-primary-500',
    secondary: 'bg-white hover:bg-gray-50 text-secondary-700 font-semibold border border-gray-300 shadow-sm hover:border-gray-400 hover:shadow focus:ring-secondary-500',
    danger: 'bg-danger-600 hover:bg-danger-700 text-white font-semibold shadow-sm hover:shadow focus:ring-danger-500',
    success: 'bg-success-600 hover:bg-success-700 text-white font-semibold shadow-sm hover:shadow focus:ring-success-500',
    warning: 'bg-warning-500 hover:bg-warning-600 text-white font-semibold shadow-sm hover:shadow focus:ring-warning-500',
    ghost: 'hover:bg-gray-100 text-secondary-700 font-semibold focus:ring-secondary-500 hover:text-secondary-900',
    link: 'text-primary-600 hover:text-primary-700 underline font-semibold p-0 h-auto focus:ring-primary-500'
  };

  return (
    <button
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {Icon && iconPosition === 'left' && !isLoading && (
        <Icon className={clsx('h-4 w-4 flex-shrink-0', children && 'mr-2')} />
      )}
      
      <span className="whitespace-nowrap">{children}</span>
      
      {Icon && iconPosition === 'right' && (
        <Icon className={clsx('h-4 w-4 flex-shrink-0', children && 'ml-2')} />
      )}
    </button>
  );
};

export default Button;