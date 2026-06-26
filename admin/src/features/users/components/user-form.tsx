'use client';

/**
<<<<<<< HEAD
 * User create/edit form. Reuses the shared form framework. Create includes the initial password;
 * edit omits it (password changes go through the dedicated reset action). Roles is a multi-select of
 * the seeded system roles. Server-side 422 errors map back onto fields via the <Form> wrapper.
 */

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/form/form';
import { TextField, SelectField, MultiSelectField, SwitchField } from '@/components/form/fields';
import { FormSection, FormActions } from '@/components/form/form-section';
import { useZodForm } from '@/components/form/use-zod-form';
import { Button } from '@/components/ui/button';
import { useCrudCreate, useCrudUpdate } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { USERS_RESOURCE } from '../api';
import { ASSIGNABLE_ROLES, ROLE_LABELS, type User } from '../types';
import {
  buildCreatePayload,
  buildUpdatePayload,
  emptyUserForm,
  userToForm,
  type UserFormValues,
} from '../user-form-payload';

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] ?? r }));
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
];

function schemaFor(isEdit: boolean) {
  return z.object({
    email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
    full_name: z.string().trim().min(1, 'Full name is required.').max(255),
    password: isEdit
      ? z.string()
      : z.string().min(8, 'Password must be at least 8 characters.').regex(/[A-Za-z]/, 'Include a letter.').regex(/\d/, 'Include a number.'),
    preferred_language: z.enum(['en', 'hi']),
    roles: z.array(z.string()).min(1, 'Assign at least one role.'),
    is_active: z.boolean(),
  });
}

export function UserForm({ user }: { user?: User }) {
  const router = useRouter();
  const isEdit = Boolean(user);

  const form = useZodForm<UserFormValues>(schemaFor(isEdit) as never, {
    defaultValues: user ? userToForm(user) : emptyUserForm(),
  });

  const createMutation = useCrudCreate<ReturnType<typeof buildCreatePayload>, User>(USERS_RESOURCE);
  const updateMutation = useCrudUpdate<ReturnType<typeof buildUpdatePayload>, User>(USERS_RESOURCE);
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: UserFormValues) => {
    if (isEdit && user) {
      await updateMutation.mutateAsync({ id: user.id, body: buildUpdatePayload(values) });
      router.push(ROUTES.users);
    } else {
      await createMutation.mutateAsync(buildCreatePayload(values));
      router.push(ROUTES.users);
=======
 * User create / edit form. Role selection uses the three seeded role keys from
 * `ROLE_KEYS` as identifiers. The create payload sends `role_ids` per the API spec
 * (§6); when the backend exposes a `/admin/roles` listing endpoint the selector can
 * be populated dynamically — for now the three seeded roles are known and stable.
 *
 * Password is required for create; optional for edit (omit means "unchanged").
 * Backend validates strength. No password hash is ever returned.
 */

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/layout/card';
import { ROLE_KEYS } from '@/constants/permissions';
import { humanize } from '@/utils/format';
import type { AdminUser, CreateUserPayload, UpdateUserPayload } from '../types';

export interface UserFormValues {
  full_name: string;
  email: string;
  preferred_language: 'en' | 'hi';
  is_active: boolean;
  password: string;
  confirm_password: string;
  /** Role keys selected (mapped to role_ids on submit). */
  role_keys: string[];
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
];

const ALL_ROLES = [
  { key: ROLE_KEYS.superAdmin, label: humanize(ROLE_KEYS.superAdmin) },
  { key: ROLE_KEYS.publisher, label: humanize(ROLE_KEYS.publisher) },
  { key: ROLE_KEYS.contentEditor, label: humanize(ROLE_KEYS.contentEditor) },
];

export interface UserFormProps {
  user?: AdminUser;
  onSubmit: (data: CreateUserPayload | UpdateUserPayload) => void;
  isPending?: boolean;
}

export function UserForm({ user, onSubmit, isPending }: UserFormProps) {
  const isEdit = Boolean(user);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<UserFormValues>({
    defaultValues: {
      full_name: user?.full_name ?? '',
      email: user?.email ?? '',
      preferred_language: user?.preferred_language ?? 'en',
      is_active: user?.is_active ?? true,
      password: '',
      confirm_password: '',
      role_keys: user?.roles ?? [],
    },
  });

  const passwordValue = watch('password');
  const roleKeys = watch('role_keys');
  const isActive = watch('is_active');

  const toggleRole = (key: string) => {
    const next = roleKeys.includes(key)
      ? roleKeys.filter((r) => r !== key)
      : [...roleKeys, key];
    setValue('role_keys', next, { shouldDirty: true });
  };

  const handleFormSubmit = (data: UserFormValues) => {
    if (isEdit) {
      const payload: UpdateUserPayload = {
        full_name: data.full_name,
        preferred_language: data.preferred_language,
        is_active: data.is_active,
        // role_ids sent as role keys; backend maps to UUIDs from the seeded set
        role_ids: data.role_keys,
      };
      if (data.password) payload.password = data.password;
      onSubmit(payload);
    } else {
      const payload: CreateUserPayload = {
        full_name: data.full_name,
        email: data.email,
        preferred_language: data.preferred_language,
        password: data.password,
        role_ids: data.role_keys,
      };
      onSubmit(payload);
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
    }
  };

  return (
<<<<<<< HEAD
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <FormSection title="Identity" columns={2}>
        <TextField<UserFormValues> name="email" label="Email" type="email" required />
        <TextField<UserFormValues> name="full_name" label="Full name" required />
        {!isEdit ? (
          <TextField<UserFormValues>
            name="password"
            label="Initial password"
            type="password"
            required
            description="At least 8 characters, including a letter and a number."
          />
        ) : null}
        <SelectField<UserFormValues> name="preferred_language" label="Preferred language" options={LANGUAGE_OPTIONS} />
      </FormSection>

      <FormSection title="Access" description="Roles determine what this user can do. The backend enforces every action.">
        <MultiSelectField<UserFormValues> name="roles" label="Roles" options={ROLE_OPTIONS} />
        <SwitchField<UserFormValues> name="is_active" label="Account active" />
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isEdit ? 'Save changes' : 'Create user'}
        </Button>
      </FormActions>
    </Form>
=======
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <Card>
        <CardHeader
          title={isEdit ? 'Edit user' : 'New user'}
          description={
            isEdit
              ? 'Update account details, roles, and status. Leave password blank to keep current.'
              : 'Create a new CMS user account.'
          }
        />

        <CardContent className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="u-name" className="text-sm font-medium text-foreground">
              Full name <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <Input
              id="u-name"
              invalid={Boolean(errors.full_name)}
              {...register('full_name', { required: 'Full name is required.' })}
            />
            {errors.full_name ? (
              <p role="alert" className="text-xs font-medium text-danger">{errors.full_name.message}</p>
            ) : null}
          </div>

          {/* Email (read-only on edit) */}
          <div className="space-y-1.5">
            <label htmlFor="u-email" className="text-sm font-medium text-foreground">
              Email address <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <Input
              id="u-email"
              type="email"
              readOnly={isEdit}
              invalid={Boolean(errors.email)}
              className={isEdit ? 'bg-muted text-muted-foreground' : undefined}
              {...register('email', {
                required: !isEdit ? 'Email is required.' : false,
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email.' },
              })}
            />
            {isEdit ? (
              <p className="text-xs text-muted-foreground">Email cannot be changed after creation.</p>
            ) : null}
            {errors.email ? (
              <p role="alert" className="text-xs font-medium text-danger">{errors.email.message}</p>
            ) : null}
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <label htmlFor="u-lang" className="text-sm font-medium text-foreground">
              Preferred language
            </label>
            <Select
              id="u-lang"
              options={LANGUAGE_OPTIONS}
              {...register('preferred_language')}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="u-pw" className="text-sm font-medium text-foreground">
              Password {!isEdit && <span className="text-danger" aria-hidden="true">*</span>}
            </label>
            <Input
              id="u-pw"
              type="password"
              autoComplete="new-password"
              invalid={Boolean(errors.password)}
              placeholder={isEdit ? 'Leave blank to keep current' : undefined}
              {...register('password', {
                required: !isEdit ? 'Password is required.' : false,
                minLength: { value: 8, message: 'Password must be at least 8 characters.' },
              })}
            />
            {errors.password ? (
              <p role="alert" className="text-xs font-medium text-danger">{errors.password.message}</p>
            ) : null}
          </div>

          {/* Confirm */}
          {(watch('password') || !isEdit) ? (
            <div className="space-y-1.5">
              <label htmlFor="u-pw-confirm" className="text-sm font-medium text-foreground">
                Confirm password {!isEdit && <span className="text-danger" aria-hidden="true">*</span>}
              </label>
              <Input
                id="u-pw-confirm"
                type="password"
                autoComplete="new-password"
                invalid={Boolean(errors.confirm_password)}
                {...register('confirm_password', {
                  validate: (v) =>
                    !passwordValue || v === passwordValue || 'Passwords do not match.',
                })}
              />
              {errors.confirm_password ? (
                <p role="alert" className="text-xs font-medium text-danger">
                  {errors.confirm_password.message}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Roles */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Roles <span className="text-danger" aria-hidden="true">*</span>
            </p>
            <div className="space-y-2">
              {ALL_ROLES.map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
                  <Checkbox
                    checked={roleKeys.includes(key)}
                    onChange={() => toggleRole(key)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Active toggle (edit only) */}
          {isEdit ? (
            <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Active account</p>
                <p className="text-xs text-muted-foreground">
                  Inactive users cannot sign in. Deactivate rather than deleting.
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(v) => setValue('is_active', v, { shouldDirty: true })}
                label="Active account"
              />
            </div>
          ) : null}
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty && isEdit || isPending}
            isLoading={isPending}
          >
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </CardFooter>
      </Card>
    </form>
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
  );
}
