'use client';

/**
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
    }
  };

  return (
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
  );
}
