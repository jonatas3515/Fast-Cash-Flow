import React from 'react';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = {
  value: Date;
  mode?: 'date' | 'time';
  display?: 'default' | 'inline' | 'spinner' | 'clock' | 'calendar';
  onChange: (date: Date) => void;
};

export default function NativeDatePicker({ value, mode = 'date', display, onChange }: Props) {
  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display={display ?? (Platform.OS === 'ios' ? 'inline' : 'default')}
      onChange={(e, d) => { if (d) onChange(d); }}
    />
  );
}
