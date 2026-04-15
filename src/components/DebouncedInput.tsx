import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DebouncedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onDebouncedChange: (value: string) => void;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({ 
  value: initialValue, 
  onDebouncedChange, 
  ...props 
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setValue(newVal);
    onDebouncedChange(newVal);
  };

  return (
    <Input
      {...props}
      value={value}
      onChange={handleChange}
      className={cn("no-drag", props.className)}
    />
  );
};
