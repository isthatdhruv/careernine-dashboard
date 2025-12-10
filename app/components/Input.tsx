import React from 'react';

type BaseInputProps = {
  as?: 'input' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  className?: string;
  placeholder?: string;
};

type InputProps = BaseInputProps & (
  | (React.InputHTMLAttributes<HTMLInputElement> & { as?: 'input' })
  | (React.SelectHTMLAttributes<HTMLSelectElement> & { as: 'select' })
  | (React.TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' })
);

const Input = ({ as = 'input', options, className = '', placeholder, ...props }: InputProps) => {
  const baseClasses = 'w-full p-2 border rounded focus:ring-2 focus:ring-indigo-200 focus:outline-none';
  const finalClasses = `${baseClasses} ${className}`;

  if (as === 'select') {
    return (
      <select className={finalClasses} {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}>
        <option value="" disabled>
          {placeholder || 'Select an option'}
        </option>
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (as === 'textarea') {
    return <textarea className={finalClasses} placeholder={placeholder} {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />;
  }

  return <input className={finalClasses} placeholder={placeholder} {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />;
};

export default Input;
