import React from 'react';

interface CheckboxGroupProps {
  label: string;
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ label, options, selectedOptions, onChange, disabled }) => {
  const handleCheckboxChange = (option: string) => {
    const newSelected = selectedOptions.includes(option)
      ? selectedOptions.filter((item) => item !== option)
      : [...selectedOptions, option];
    onChange(newSelected);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {options.map((option) => (
          <label key={option} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-lime-green-500 focus:ring-lime-green-500 disabled:cursor-not-allowed"
              checked={selectedOptions.includes(option)}
              onChange={() => handleCheckboxChange(option)}
              disabled={disabled}
            />
            <span className="text-gray-700 dark:text-gray-200">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default CheckboxGroup;