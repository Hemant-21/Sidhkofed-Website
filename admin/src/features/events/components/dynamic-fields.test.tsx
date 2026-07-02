import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import type { ReactNode } from 'react';
import { DynamicFields } from './dynamic-fields';
import type { EventFieldDefinition } from '../types';

/** Minimal RHF harness so FormField's useFormContext works in isolation. */
function Harness({ children }: { children: ReactNode }) {
  const form = useForm({ defaultValues: { dynamic_values: {} } });
  return <FormProvider {...form}>{children}</FormProvider>;
}

const defs: EventFieldDefinition[] = [
  { id: 'd1', event_type_id: 't', field_key: 'participant_count', label_en: 'Participants', label_hi: null, data_type: 'number', is_required: true, options: null, display_order: 0, is_active: true },
  { id: 'd2', event_type_id: 't', field_key: 'mode', label_en: 'Delivery mode', label_hi: null, data_type: 'select', is_required: false, options: ['Online', 'Offline'], display_order: 1, is_active: true },
];

describe('<DynamicFields>', () => {
  it('prompts to choose a type when none is selected', () => {
    render(
      <Harness>
        <DynamicFields definitions={undefined} isLoading={false} awaitingType />
      </Harness>,
    );
    expect(screen.getByText(/select an event type/i)).toBeInTheDocument();
  });

  it('renders a field per active definition using the declared type', () => {
    render(
      <Harness>
        <DynamicFields definitions={defs} isLoading={false} awaitingType={false} />
      </Harness>,
    );
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Delivery mode')).toBeInTheDocument();
    // select options come straight from the backend definition
    expect(screen.getByRole('option', { name: 'Online' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Offline' })).toBeInTheDocument();
  });

  it('renders nothing when an event type has no controlled fields', () => {
    const { container } = render(
      <Harness>
        <DynamicFields definitions={[]} isLoading={false} awaitingType={false} />
      </Harness>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
