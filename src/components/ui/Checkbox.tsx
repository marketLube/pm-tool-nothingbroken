import React from 'react';

interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: () => void;
  label?: string;
  disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false
}) => {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
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