'use client';

/**
 * Form/filter bindings for the shared {@link RelationPicker} (Phase 15.3 remediation).
 *
 * - `RelationMultiSelectField` binds the picker (multi) to a React Hook Form array field, with
 *   full label/description/error wiring via the shared `<FormField>` — drop-in for the old
 *   `<MultiSelectField>` that loaded every option up front.
 * - `RelationSelect` is the controlled single-select used by list filter bars (which are not
 *   RHF-driven): it adapts the picker's array contract to a single id string.
 *
 * Both reuse the one picker — no duplicate select logic.
 */

import type { FieldValues, Path } from 'react-hook-form';
import type { ReactNode } from 'react';
import { FormField } from '@/components/form/form-field';
import type { PublicationState } from '@/types/common';
import { RelationPicker } from './relation-picker';
import type { RelationOption } from './relation-search';

interface RelationFieldProps<T extends FieldValues> {
  name: Path<T>;
  resource: string;
  label?: ReactNode;
  description?: ReactNode;
  required?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  /** Labelled refs for already-selected ids (from the detail payload). */
  initialOptions?: RelationOption[];
  publicationState?: PublicationState | 'all';
}

/** RHF-bound multi-select relationship picker (server-side searchable). */
export function RelationMultiSelectField<T extends FieldValues>(props: RelationFieldProps<T>) {
  const { resource, placeholder, searchPlaceholder, disabled, initialOptions, publicationState, ...rest } = props;
  return (
    <FormField<T>
      {...rest}
      render={({ field, invalid }) => (
        <RelationPicker
          resource={resource}
          multiple
          value={field.value ?? []}
          onChange={field.onChange}
          initialOptions={initialOptions}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          disabled={disabled}
          invalid={invalid}
          publicationState={publicationState}
        />
      )}
    />
  );
}

export interface RelationSelectProps {
  resource: string;
  value: string;
  onChange: (value: string | undefined) => void;
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  initialOptions?: RelationOption[];
  publicationState?: PublicationState | 'all';
}

/** Controlled single-select relationship picker for (non-RHF) list filter bars. */
export function RelationSelect({ value, onChange, ...rest }: RelationSelectProps) {
  return (
    <RelationPicker
      {...rest}
      multiple={false}
      value={value ? [value] : []}
      onChange={(v) => onChange(v[0])}
    />
  );
}
