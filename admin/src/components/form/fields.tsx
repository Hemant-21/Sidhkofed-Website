'use client';

/**
 * Convenience field components built on <FormField>. Each binds a UI control to an
 * RHF field with full a11y wiring, so a module form is just a list of these. They
 * are generic inputs — no business fields. Add module fields by composing these.
 */

import type { ReactNode } from 'react';
import type { FieldValues, Path } from 'react-hook-form';
import { FormField } from './form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, type SelectOption } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';

interface BaseFieldProps<T extends FieldValues> {
  name: Path<T>;
  label?: ReactNode;
  description?: ReactNode;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TextField<T extends FieldValues>(props: BaseFieldProps<T> & { type?: string }) {
  const { type = 'text', placeholder, disabled, ...rest } = props;
  return (
    <FormField<T>
      {...rest}
      render={({ field, controlProps, invalid }) => (
        <Input
          {...controlProps}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          invalid={invalid}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      )}
    />
  );
}

export function TextareaField<T extends FieldValues>(props: BaseFieldProps<T> & { rows?: number }) {
  const { rows, placeholder, disabled, ...rest } = props;
  return (
    <FormField<T>
      {...rest}
      render={({ field, controlProps, invalid }) => (
        <Textarea
          {...controlProps}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          invalid={invalid}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      )}
    />
  );
}

export function SelectField<T extends FieldValues>(
  props: BaseFieldProps<T> & { options: SelectOption[] },
) {
  const { options, placeholder, disabled, ...rest } = props;
  return (
    <FormField<T>
      {...rest}
      render={({ field, controlProps, invalid }) => (
        <Select
          {...controlProps}
          options={options}
          placeholder={placeholder}
          disabled={disabled}
          invalid={invalid}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      )}
    />
  );
}

export function MultiSelectField<T extends FieldValues>(
  props: BaseFieldProps<T> & { options: SelectOption[] },
) {
  const { options, placeholder, disabled, ...rest } = props;
  return (
    <FormField<T>
      {...rest}
      render={({ field, invalid }) => (
        <MultiSelect
          options={options}
          placeholder={placeholder}
          disabled={disabled}
          invalid={invalid}
          value={field.value ?? []}
          onChange={field.onChange}
        />
      )}
    />
  );
}

export function CheckboxField<T extends FieldValues>(props: BaseFieldProps<T>) {
  const { label, description, disabled, name, required, className } = props;
  return (
    <FormField<T>
      name={name}
      description={description}
      className={className}
      render={({ field, controlProps }) => (
        <label className="flex items-start gap-2.5">
          <Checkbox
            {...controlProps}
            disabled={disabled}
            checked={Boolean(field.value)}
            onChange={(e) => field.onChange(e.target.checked)}
            onBlur={field.onBlur}
            name={field.name}
            ref={field.ref}
          />
          {label ? (
            <span className="text-sm text-foreground">
              {label}
              {required ? <span className="ml-0.5 text-danger">*</span> : null}
            </span>
          ) : null}
        </label>
      )}
    />
  );
}

export function SwitchField<T extends FieldValues>(props: BaseFieldProps<T>) {
  const { label, description, disabled, name, className } = props;
  return (
    <FormField<T>
      name={name}
      description={description}
      className={className}
      render={({ field }) => (
        <div className="flex items-center gap-3">
          <Switch
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
            disabled={disabled}
            label={typeof label === 'string' ? label : undefined}
          />
          {label ? <span className="text-sm text-foreground">{label}</span> : null}
        </div>
      )}
    />
  );
}

export function DateField<T extends FieldValues>(props: BaseFieldProps<T>) {
  const { disabled, ...rest } = props;
  return (
    <FormField<T>
      {...rest}
      render={({ field, controlProps, invalid }) => (
        <DatePicker
          {...controlProps}
          disabled={disabled}
          invalid={invalid}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      )}
    />
  );
}
