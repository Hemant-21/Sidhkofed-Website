'use client';

/**
 * Institutional Membership create/edit form. Reuses the shared form framework (<Form>, Field
 * components, BilingualTabs, FormSection), the master-option hooks (district), the Reporting Period
 * picker, and the server-side Institution / District Union relation pickers. It NEVER sets
 * publication state (that is the lifecycle actions). Server-side 422 errors map back onto fields via
 * the <Form> wrapper. The slug is shown read-only after creation (immutable; codex §11).
 *
 * `district_union_id` is required only when `membership_level=district_union` — mirrored client-side
 * (the backend enforces the same rule).
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/form/form';
import { TextField, TextareaField, SelectField, SwitchField, DateField } from '@/components/form/fields';
import { FormField } from '@/components/form/form-field';
import { FormSection, FormActions } from '@/components/form/form-section';
import { BilingualTabs } from '@/components/form/bilingual-tabs';
import { useZodForm } from '@/components/form/use-zod-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useMasterOptions,
  useReportingPeriodOptions,
  RelationPicker,
  toRelationValue,
  type RelationOption,
} from '@/components/relationships';
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
  MEMBERSHIP_STATUS_LABEL,
  type MembershipDetail,
} from '../types';
import {
  buildMembershipPayload,
  emptyMembershipForm,
  membershipToForm,
  type MembershipFormValues,
} from '../membership-form-payload';

const schema = z
  .object({
    institution_id: z.string().min(1, 'Institution is required.'),
    membership_level: z.enum(MEMBERSHIP_LEVELS, {
      errorMap: () => ({ message: 'Membership level is required.' }),
    }),
    membership_type: z.enum(MEMBERSHIP_TYPES, {
      errorMap: () => ({ message: 'Membership type is required.' }),
    }),
    membership_number: z.string().max(120),
    district_id: z.string(),
    district_union_id: z.string(),
    reporting_period_id: z.string(),
    status: z.enum(MEMBERSHIP_STATUSES),
    join_date: z.string(),
    notes_en: z.string(),
    notes_hi: z.string(),
    public_visibility: z.boolean(),
    show_on_homepage: z.boolean(),
    highlight_type: z.string(),
    highlight_start_at: z.string(),
    highlight_end_at: z.string(),
    display_order: z.string(),
    publish_start_at: z.string(),
  })
  .superRefine((v, ctx) => {
    // Mirror backend: a District Union membership must name the District Union institution.
    if (v.membership_level === 'district_union' && v.district_union_id.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['district_union_id'],
        message: 'Required when the membership level is District Union.',
      });
    }
  });

const LEVEL_OPTIONS = [
  { value: '', label: 'Select level…' },
  ...MEMBERSHIP_LEVELS.map((v) => ({ value: v, label: MEMBERSHIP_LEVEL_LABEL[v] })),
];
const TYPE_OPTIONS = [
  { value: '', label: 'Select type…' },
  ...MEMBERSHIP_TYPES.map((v) => ({ value: v, label: MEMBERSHIP_TYPE_LABEL[v] })),
];
const STATUS_OPTIONS = MEMBERSHIP_STATUSES.map((v) => ({
  value: v,
  label: MEMBERSHIP_STATUS_LABEL[v],
}));

const HIGHLIGHT_OPTIONS = [
  { value: '', label: 'No highlight' },
  ...(Object.keys(HIGHLIGHT_LABEL) as Array<keyof typeof HIGHLIGHT_LABEL>).map((k) => ({
    value: k,
    label: HIGHLIGHT_LABEL[k],
  })),
];

export interface MembershipFormProps {
  membership?: MembershipDetail;
}

export function MembershipForm({ membership }: MembershipFormProps) {
  const router = useRouter();
  const isEdit = Boolean(membership);

  const form = useZodForm<MembershipFormValues>(schema as never, {
    defaultValues: membership ? membershipToForm(membership) : emptyMembershipForm(),
  });

  const level = form.watch('membership_level');
  const highlightType = form.watch('highlight_type');

  const districts = useMasterOptions('districts');
  const reportingPeriods = useReportingPeriodOptions();

  const institutionInitial = useMemo<RelationOption[]>(
    () =>
      membership?.institution
        ? [{ value: membership.institution.id, label: membership.institution.name_en }]
        : [],
    [membership],
  );
  const districtUnionInitial = useMemo<RelationOption[]>(
    () =>
      membership?.district_union
        ? [{ value: membership.district_union.id, label: membership.district_union.name_en }]
        : [],
    [membership],
  );

  const createMutation = useCrudCreate<ReturnType<typeof buildMembershipPayload>, MembershipDetail>(
    MEMBERSHIPS_RESOURCE,
  );
  const updateMutation = useCrudUpdate<ReturnType<typeof buildMembershipPayload>, MembershipDetail>(
    MEMBERSHIPS_RESOURCE,
  );
  const saving = createMutation.isPending || updateMutation.isPending;

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
      <FormSection title="Member institution" description="The institution this membership belongs to.">
        <FormField<MembershipFormValues>
          name="institution_id"
          label="Institution"
          required
          render={({ field, invalid }) => (
            <RelationPicker
              resource="institutions"
              multiple={false}
              value={toRelationValue(field.value)}
              onChange={(v) => field.onChange(v[0] ?? '')}
              initialOptions={institutionInitial}
              placeholder="Search institutions…"
              searchPlaceholder="Search institutions…"
              publicationState="all"
              invalid={invalid}
            />
          )}
        />
      </FormSection>

      <FormSection title="Classification" columns={2}>
        <SelectField<MembershipFormValues>
          name="membership_level"
          label="Membership level"
          required
          options={LEVEL_OPTIONS}
        />
        <SelectField<MembershipFormValues>
          name="membership_type"
          label="Membership type"
          required
          options={TYPE_OPTIONS}
        />
        <TextField<MembershipFormValues>
          name="membership_number"
          label="Membership number"
          placeholder="e.g. SKF/DU/2026/014"
        />
        <SelectField<MembershipFormValues> name="status" label="Status" options={STATUS_OPTIONS} />
        {level === 'district_union' ? (
          <FormField<MembershipFormValues>
            name="district_union_id"
            label="District Union"
            required
            description="The District Union institution this membership belongs to."
            className="sm:col-span-2"
            render={({ field, invalid }) => (
              <RelationPicker
                resource="institutions"
                multiple={false}
                value={toRelationValue(field.value)}
                onChange={(v) => field.onChange(v[0] ?? '')}
                initialOptions={districtUnionInitial}
                placeholder="Search district unions…"
                searchPlaceholder="Search institutions…"
                publicationState="all"
                invalid={invalid}
              />
            )}
          />
        ) : null}
      </FormSection>

      <FormSection title="Geography & reporting" columns={2}>
        <SelectField<MembershipFormValues>
          name="district_id"
          label="District"
          placeholder="None"
          options={[{ value: '', label: 'None' }, ...districts.options]}
        />
        <SelectField<MembershipFormValues>
          name="reporting_period_id"
          label="Reporting period"
          placeholder="None"
          options={[{ value: '', label: 'None' }, ...reportingPeriods.options]}
        />
        <DateField<MembershipFormValues> name="join_date" label="Join date" />
      </FormSection>

      <FormSection title="Notes" description="Internal notes — never shown publicly (codex §10).">
        <BilingualTabs
          english={
            <TextareaField<MembershipFormValues> name="notes_en" label="Notes (English)" rows={3} />
          }
          hindi={
            <TextareaField<MembershipFormValues> name="notes_hi" label="टिप्पणी (Hindi)" rows={3} />
          }
        />
      </FormSection>

      <FormSection title="Visibility & scheduling" columns={2}>
        <SwitchField<MembershipFormValues> name="public_visibility" label="Publicly visible (directory)" />
        <SwitchField<MembershipFormValues> name="show_on_homepage" label="Show on homepage" />
        <DateField<MembershipFormValues> name="publish_start_at" label="Scheduled publish date" />
        <TextField<MembershipFormValues> name="display_order" label="Display order" type="number" />
        <SelectField<MembershipFormValues>
          name="highlight_type"
          label="Highlight"
          options={HIGHLIGHT_OPTIONS}
        />
        {highlightType ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            <DateField<MembershipFormValues> name="highlight_start_at" label="Highlight from" />
            <DateField<MembershipFormValues> name="highlight_end_at" label="Highlight until" />
          </div>
        ) : null}
      </FormSection>

      {isEdit && membership ? (
        <FormSection title="Identifier">
          <div>
            <Label htmlFor="membership-slug">Slug (read-only)</Label>
            <Input id="membership-slug" value={membership.slug} readOnly disabled />
            <p className="mt-1 text-xs text-muted-foreground">
              The public URL is permanent and cannot be changed after creation.
            </p>
          </div>
        </FormSection>
      ) : null}

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
