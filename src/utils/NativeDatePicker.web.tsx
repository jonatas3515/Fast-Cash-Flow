import React from 'react';
import { View } from 'react-native';

type Props = {
  value: string;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  onConfirm: (date: string) => void;
  onCancel: () => void;
};

export default function NativeDatePicker({ value, mode = 'date', minimumDate, onConfirm, onCancel }: Props) {
  React.useEffect(() => {
    // Criar input HTML5 date picker
    const input = document.createElement('input');
    input.type = mode;
    input.style.position = 'fixed';
    input.style.top = '-9999px';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    
    if (minimumDate) {
      input.min = minimumDate.toISOString().split('T')[0];
    }
    
    if (value) {
      input.value = value;
    }
    
    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.value) {
        onConfirm(target.value);
      } else {
        onCancel();
      }
      document.body.removeChild(input);
    };
    
    input.addEventListener('change', handleChange);
    input.addEventListener('cancel', onCancel);
    
    document.body.appendChild(input);
    
    // Abrir o seletor
    setTimeout(() => {
      if (input.showPicker) {
        input.showPicker();
      } else {
        input.focus();
      }
    }, 100);
    
    return () => {
      try {
        input.removeEventListener('change', handleChange);
        input.removeEventListener('cancel', onCancel);
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      } catch {}
    };
  }, [value, mode, minimumDate, onConfirm, onCancel]);
  
  return <View />;
}
