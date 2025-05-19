import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  className?: string;
  selectClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    options, 
    label, 
    helperText, 
    error, 
    fullWidth = false, 
    className, 
    selectClassName,
    id,
    ...props 
  }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={clsx(fullWidth && 'w-full', className)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              'block w-full pl-3 pr-10 py-2.5 text-base rounded-md border appearance-none transition-all duration-200 bg-white',
              'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:shadow-sm',
              error
                ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-400'
                : 'border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-200',
              selectClassName
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-description` : undefined}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-gray-500" id={`${selectId}-description`}>
            {helperText}
          </p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-red-600" id={`${selectId}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;