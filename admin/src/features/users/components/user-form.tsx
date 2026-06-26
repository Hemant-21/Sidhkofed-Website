'use client';

/**
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
    }
  };

  return (
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
  );
}
