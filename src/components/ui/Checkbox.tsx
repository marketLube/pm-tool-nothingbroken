import React from 'react';

interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
      />
      {label && (
        <label
          htmlFor={id}
          className={`ml-2 block text-sm ${
            disabled ? 'text-gray-400' : 'text-gray-700'
          } cursor-pointer`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Checkbox; 