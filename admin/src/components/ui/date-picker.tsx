'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { Input } from './input';

export interface DatePickerProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  invalid?: boolean;
}

/**
 * Thin wrapper over the native date input. The backend transports `YYYY-MM-DD`
 * (API spec §0), which is exactly the native input value format — so no parsing
 * library is needed. A richer calendar can later swap in behind this same API.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(props, ref) {
  return <Input ref={ref} type="date" {...props} />;
});
