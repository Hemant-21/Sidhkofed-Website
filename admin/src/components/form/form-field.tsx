'use client';

/**
 * `<FormField>` — connects an RHF field to a labelled, accessible control row:
 * Label (with required marker), the control (render prop), an optional helper
 * description, and an inline error linked via aria-describedby + aria-invalid.
 * This is the accessibility contract every form input flows through.
 */

import { useId, type ReactNode } from 'react';
import {
  Controller,
  useFormContext,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { cn } from '@/utils/cn';
import { Label } from '@/components/ui/label';

export interface FieldRenderProps<TValues extends FieldValues> {
  field: ControllerRenderProps<TValues, Path<TValues>>;
  /** Wire onto the control: `aria-invalid` + `aria-describedby`. */
  controlProps: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string };
  invalid: boolean;
}

export interface FormFieldProps<TValues extends FieldValues> {
  name: Path<TValues>;
  label?: ReactNode;
  description?: ReactNode;
  required?: boolean;
  className?: string;
  render: (props: FieldRenderProps<TValues>) => ReactNode;
}

export function FormField<TValues extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  render,
}: FormFieldProps<TValues>) {
  const { control } = useFormContext<TValues>();
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const descId = `${baseId}-desc`;
  const errorId = `${baseId}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const invalid = Boolean(fieldState.error);
        const describedBy = [description ? descId : null, invalid ? errorId : null]
          .filter(Boolean)
          .join(' ');
        return (
          <div className={cn('space-y-1.5', className)}>
            {label ? (
              <Label htmlFor={inputId} required={required}>
                {label}
              </Label>
            ) : null}
            {render({
              field,
              invalid,
              controlProps: {
                id: inputId,
                'aria-invalid': invalid || undefined,
                'aria-describedby': describedBy || undefined,
              },
            })}
            {description ? (
              <p id={descId} className="text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
            {invalid ? (
              <p id={errorId} role="alert" className="text-xs font-medium text-danger">
                {fieldState.error?.message}
              </p>
            ) : null}
          </div>
        );
      }}
    />
  );
}
