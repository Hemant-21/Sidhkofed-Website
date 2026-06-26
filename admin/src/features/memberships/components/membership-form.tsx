'use client';

/**
 * Membership create/edit form. Reuses the shared form framework, the master-option hook (district /
 * reporting period), and the server-side searchable RelationPicker for institution + district-union
 * links. Never sets publication state (lifecycle actions handle that). Server-side 422 errors map
 * back onto fields via the <Form> wrapper.
 */

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import type { FieldValues, Path } from 'react-hook-form';
import { Form } from '@/components/form/form';
import { TextField, TextareaField, SelectField, SwitchField, DateField } from '@/components/form/fields';
import { FormField } from '@/components/form/form-field';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { Button } from '@/components/ui/button';
import { useMasterOptions, RelationPicker, toRelationValue } from '@/components/relationships';
import type { RelationOption } from '@/components/relationships';
import { HIGHLIGHT_LABEL } from '@/constants/status';
import { ROUTES } from '@/constants/routes';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { MEMBERSHIPS_RESOURCE } from '../api';
import {
  MEMBERSHIP_LEVELS,
  MEMBERSHIP_TYPES,
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_LEVEL_LABEL,
  MEMBERSHIP_TYPE_LABEL,
  type MembershipDetail,
} from '../types';
import {
  buildMembershipPayload,
  emptyMembershipForm,
  membershipToForm,
  type MembershipFormValues,
} from '../membership-form-payload';

const schema = z.object({
  institution_id: z.string().trim().min(1, 'An institution is required.'),
  membership_level: z.enum(MEMBERSHIP_LEVELS),
  membership_type: z.enum(MEMBERSHIP_TYPES),
  membership_number: z.string().max(120),
  district_id: z.string(),
  district_union_id: z.string(),
  reporting_period_id: z.string(),
  status: z.enum(MEMBERSHIP_STATUSES),
  join_date: z.string(),
  notes_en: z.string().max(20000),
  notes_hi: z.string().max(20000),
  public_visibility: z.boolean(),
  show_on_homepage: z.boolean(),
  highlight_type: z.string(),
  highlight_start_at: z.string(),
  highlight_end_at: z.string(),
  display_order: z.string(),
  publish_start_at: z.string(),
});

const HIGHLIGHT_OPTIONS = [
  { value: '', label: 'No highlight' },
  ...(Object.keys(HIGHLIGHT_LABEL) as Array<keyof typeof HIGHLIGHT_LABEL>).map((k) => ({ value: k, label: HIGHLIGHT_LABEL[k] })),
];
const LEVEL_OPTIONS = MEMBERSHIP_LEVELS.map((l) => ({ value: l, label: MEMBERSHIP_LEVEL_LABEL[l] }));
const TYPE_OPTIONS = MEMBERSHIP_TYPES.map((t) => ({ value: t, label: MEMBERSHIP_TYPE_LABEL[t] }));
const STATUS_OPTIONS = MEMBERSHIP_STATUSES.map((s) => ({ value: s, label: s }));

/** RHF-bound single-select relationship picker (institution / district union). */
function RelationSingleField<T extends FieldValues>({
  name,
  label,
  required,
  initialOptions,
}: {
  name: Path<T>;
  label: string;
  required?: boolean;
  initialOptions?: RelationOption[];
}) {
  return (
    <FormField<T>
      name={name}
      label={label}
      required={required}
      render={({ field, invalid }) => (
        <RelationPicker
          resource="institutions"
          multiple={false}
          value={toRelationValue(field.value)}
          onChange={(v) => field.onChange(v[0] ?? '')}
          initialOptions={initialOptions}
          invalid={invalid}
          publicationState="all"
        />
      )}
    />
  );
}

export function MembershipForm({ membership }: { membership?: MembershipDetail }) {
  const router = useRouter();
  const isEdit = Boolean(membership);

  const form = useZodForm<MembershipFormValues>(schema as never, {
    defaultValues: membership ? membershipToForm(membership) : emptyMembershipForm(),
  });

  const highlightType = form.watch('highlight_type');
  const districts = useMasterOptions('districts');
  const reportingPeriods = useMasterOptions('reporting-periods');

  const createMutation = useCrudCreate<ReturnType<typeof buildMembershipPayload>, MembershipDetail>(MEMBERSHIPS_RESOURCE);
  const updateMutation = useCrudUpdate<ReturnType<typeof buildMembershipPayload>, MembershipDetail>(MEMBERSHIPS_RESOURCE);
  const saving = createMutation.isPending || updateMutation.isPending;

  const institutionInitial: RelationOption[] = membership?.institution
    ? [{ value: membership.institution.id, label: membership.institution.name_en }]
    : [];
  const duInitial: RelationOption[] = membership?.district_union
    ? [{ value: membership.district_union.id, label: membership.district_union.name_en }]
    : [];

  const onSubmit = async (values: MembershipFormValues) => {
    const payload = buildMembershipPayload(values);
    if (isEdit && membership) {
      const updated = await updateMutation.mutateAsync({ id: membership.id, body: payload });
      router.push(`${ROUTES.memberships}/${updated.id}`);
    } else {
      const created = await createMutation.mutateAsync(payload);
      router.push(`${ROUTES.memberships}/${created.id}`);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Member" description="The member institution and its classification.">
        <RelationSingleField<MembershipFormValues> name="institution_id" label="Institution" required initialOptions={institutionInitial} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField<MembershipFormValues> name="membership_level" label="Level" options={LEVEL_OPTIONS} />
          <SelectField<MembershipFormValues> name="membership_type" label="Type" options={TYPE_OPTIONS} />
          <SelectField<MembershipFormValues> name="status" label="Member status" options={STATUS_OPTIONS} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField<MembershipFormValues> name="membership_number" label="Membership number" />
          <DateField<MembershipFormValues> name="join_date" label="Join date" />
        </div>
      </FormSection>

      <FormSection title="Linkage" columns={2}>
        <SelectField<MembershipFormValues> name="district_id" label="District" options={[{ value: '', label: 'None' }, ...districts.options]} />
        <SelectField<MembershipFormValues> name="reporting_period_id" label="Reporting period" options={[{ value: '', label: 'None' }, ...reportingPeriods.options]} />
        <div className="sm:col-span-2">
          <RelationSingleField<MembershipFormValues> name="district_union_id" label="District union (institution)" initialOptions={duInitial} />
        </div>
      </FormSection>

      <FormSection title="Notes">
        <BilingualTabs
          english={<TextareaField<MembershipFormValues> name="notes_en" label="Notes (English)" rows={5} />}
          hindi={<TextareaField<MembershipFormValues> name="notes_hi" label="टिप्पणी (Hindi)" rows={5} />}
        />
      </FormSection>

      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<MembershipFormValues> name="public_visibility" label="Publicly visible" />
        <SwitchField<MembershipFormValues> name="show_on_homepage" label="Show on homepage" />
        <DateField<MembershipFormValues> name="publish_start_at" label="Scheduled publish date" />
        <SelectField<MembershipFormValues> name="highlight_type" label="Highlight" options={HIGHLIGHT_OPTIONS} />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<MembershipFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<MembershipFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
        <TextField<MembershipFormValues> name="display_order" label="Display order" type="number" />
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create membership'}
        </Button>
      </FormActions>
    </Form>
  );
}
