import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomDropdown({ 
  value, 
  onChange, 
  options, 
  className = '', 
  placeholder = 'Select an option',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          glass-input w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-2 text-base 
          touch-manipulation text-white border border-white/20 backdrop-blur-md 
          bg-white/10 hover:bg-white/15 focus:bg-white/15 transition-colors 
          cursor-pointer flex items-center justify-between
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span className="text-white">{selectedOption?.label || placeholder}</span>
        <ChevronDown 
          className={`w-4 h-4 text-white/80 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 rounded-2xl overflow-hidden shadow-2xl border border-white/20 backdrop-blur-xl bg-white/10 animate-slideDown">
          <div className="max-h-60 overflow-y-auto custom-dropdown-scroll rounded-2xl">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                className={`
                  w-full text-left px-4 py-3 text-white transition-all duration-200
                  ${value === option.value 
                    ? 'bg-purple-500/60 backdrop-blur-md font-semibold' 
                    : 'bg-transparent hover:bg-purple-500/30 hover:backdrop-blur-md'
                  }
                  ${index === 0 && options.length > 1 ? 'rounded-t-2xl' : ''}
                  ${index === options.length - 1 && options.length > 1 ? 'rounded-b-2xl' : ''}
                  ${options.length === 1 ? 'rounded-2xl' : ''}
                  ${index !== options.length - 1 ? 'border-b border-white/10' : ''}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

