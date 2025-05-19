import React from 'react';
import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

interface ButtonGroupProps {
  options: {
    value: string;
    label: string;
    icon?: LucideIcon;
  }[];
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  className?: string;
  customStyles?: Record<string, string>;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({
  options,
  value,
  onChange,
  fullWidth = false,
  className,
  customStyles
}) => {
  return (
    <div 
      className={clsx(
        'inline-flex rounded-md shadow-sm h-full overflow-hidden', 
        fullWidth && 'w-full',
        className
      )}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            'px-2 md:px-4 py-2.5 text-xs md:text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis',
            fullWidth && 'flex-1',
            'flex items-center justify-center gap-1.5',
            value === option.value
              ? customStyles?.[option.value] || 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300',
            index === 0 && 'rounded-l-md',
            index === options.length - 1 && 'rounded-r-md',
            index !== 0 && '-ml-px'
          )}
          title={option.label}
        >
          {option.icon && <option.icon className="h-3.5 w-3.5" />}
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default ButtonGroup;