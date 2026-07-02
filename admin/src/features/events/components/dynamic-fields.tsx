'use client';

/**
 * Dynamic (controlled) event fields. Renders the ACTIVE `event_field_definitions` for the chosen
 * event type into RHF fields keyed `dynamic_values.{field_key}`. This is NOT a form builder — the
 * field set is defined server-side and validated server-side (events.dynamic-fields.ts); the
 * frontend only renders the declared types and surfaces backend validation. Supported data types
 * are exactly the backend's six: text, textarea, number, date, boolean, select.
 */

import type { FieldValues } from 'react-hook-form';
import {
  TextField,
  TextareaField,
  SelectField,
  SwitchField,
  DateField,
} from '@/components/form/fields';
import { FormSection } from '@/components/form/form-section';
import { Skeleton } from '@/components/feedback/skeleton';
import type { EventFieldDefinition } from '../types';

export interface DynamicFieldsProps {
  definitions: EventFieldDefinition[] | undefined;
  isLoading: boolean;
  /** No event type chosen yet. */
  awaitingType: boolean;
}

/** Render a single definition as the matching reusable field. `name` is the RHF path. */
function DynamicField<T extends FieldValues>({ def }: { def: EventFieldDefinition }) {
  const name = `dynamic_values.${def.field_key}` as never;
  const label = def.label_en;
  const required = def.is_required;

  switch (def.data_type) {
    case 'textarea':
      return <TextareaField<T> name={name} label={label} required={required} rows={3} />;
    case 'number':
      return <TextField<T> name={name} label={label} required={required} type="number" />;
    case 'date':
      return <DateField<T> name={name} label={label} required={required} />;
    case 'boolean':
      return <SwitchField<T> name={name} label={label} />;
    case 'select':
      return (
        <SelectField<T>
          name={name}
          label={label}
          required={required}
          placeholder="Select…"
          options={(def.options ?? []).map((o) => ({ value: o, label: o }))}
        />
      );
    case 'text':
    default:
      return <TextField<T> name={name} label={label} required={required} />;
  }
}

export function DynamicFields({ definitions, isLoading, awaitingType }: DynamicFieldsProps) {
  if (awaitingType) {
    return (
      <FormSection title="Type-specific fields">
        <p className="text-sm text-muted-foreground">
          Select an event type to load its additional fields.
        </p>
      </FormSection>
    );
  }
  if (isLoading) {
    return (
      <FormSection title="Type-specific fields" columns={2}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </FormSection>
    );
  }
  if (!definitions || definitions.length === 0) return null;

  return (
    <FormSection
      title="Type-specific fields"
      description="Configured for this event type by an administrator."
      columns={2}
    >
      {definitions.map((def) => (
        <DynamicField key={def.id} def={def} />
      ))}
    </FormSection>
  );
}
