import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface MultiSelectProps {
  label?: string;
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selectedOptions, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  const toggleOption = (option: string) => {
    const newSelected = selectedOptions.includes(option)
      ? selectedOptions.filter(item => item !== option)
      : [...selectedOptions, option];
    onChange(newSelected);
  };

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase()) && !selectedOptions.includes(option)
  );

  return (
    <div className="relative" ref={wrapperRef}>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <div className="flex flex-col items-center relative">
        <div className="w-full">
          <div className={`p-1 flex flex-wrap gap-1 border border-gray-300 dark:border-gray-600 rounded-md ${disabled ? 'bg-gray-100 dark:bg-gray-900 cursor-not-allowed' : 'bg-white dark:bg-gray-800'}`}>
             {selectedOptions.map(option => (
              <div key={option} className="flex justify-center items-center m-1 font-medium py-1 px-2 bg-lime-green-300 rounded-full text-lime-green-700 bg-opacity-80 border border-lime-green-400">
                <div className="text-xs font-normal leading-none max-w-full flex-initial">{option}</div>
                <div className="flex flex-auto flex-row-reverse">
                  <div onClick={() => !disabled && toggleOption(option)}>
                    <X className={`h-4 w-4 ml-2 ${disabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:text-lime-green-800'}`} />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex-1">
              <input
                placeholder={selectedOptions.length > 0 ? "" : "Select options..."}
                className="bg-transparent p-1 px-2 appearance-none outline-none h-full w-full text-gray-800 dark:text-gray-100 disabled:cursor-not-allowed"
                onFocus={() => !disabled && setIsOpen(true)}
                value={searchTerm}
                onChange={(e) => {
                    if (disabled) return;
                    setSearchTerm(e.target.value);
                    if (!isOpen) setIsOpen(true);
                }}
                disabled={disabled}
              />
            </div>
            <div className="text-gray-300 w-8 py-1 pl-2 pr-1 border-l flex items-center border-gray-200 dark:border-gray-600">
              <button type="button" onClick={() => !disabled && setIsOpen(!isOpen)} disabled={disabled} className={`w-6 h-6 text-gray-600 dark:text-gray-400 outline-none focus:outline-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <ChevronDown className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        {isOpen && (
          <div className="absolute shadow top-full bg-white dark:bg-gray-700 z-40 w-full lef-0 rounded max-h-60 overflow-y-auto mt-1 border border-gray-200 dark:border-gray-600">
            <div className="flex flex-col w-full">
              {filteredOptions.length > 0 ? filteredOptions.map(option => (
                <div key={option}
                  className="cursor-pointer w-full border-gray-100 dark:border-gray-600 rounded-t border-b hover:bg-lime-green-100/50 dark:hover:bg-lime-green-900/50"
                  onClick={() => {
                    toggleOption(option);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}>
                  <div className="flex w-full items-center p-2 pl-2 border-transparent border-l-2 relative hover:border-lime-green-500">
                    <div className="w-full items-center flex">
                      <div className="mx-2 leading-6 text-gray-800 dark:text-gray-200">{option}</div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-2 text-center text-gray-500 dark:text-gray-400">No options found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelect;