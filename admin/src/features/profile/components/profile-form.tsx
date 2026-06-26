'use client';

/**
 * Profile update form — `full_name` + `preferred_language`. Uses the shared form framework.
 * Backend validates the PATCH; the frontend only checks that the name is not empty.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/layout/card';
import type { AuthUser } from '@/types/auth';
import { useUpdateProfile } from '../hooks';
import type { UpdateProfilePayload } from '../types';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
];

export function ProfileForm({ user }: { user: AuthUser }) {
  const { mutate, isPending } = useUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<UpdateProfilePayload>({
    defaultValues: { full_name: user.full_name, preferred_language: user.preferred_language },
  });

  // Sync defaults if the parent re-fetches the user.
  useEffect(() => {
    reset({ full_name: user.full_name, preferred_language: user.preferred_language });
  }, [user.full_name, user.preferred_language, reset]);

  const onSubmit = (data: UpdateProfilePayload) => mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader title="Profile" description="Your display name and preferred interface language." />
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="profile-name" className="text-sm font-medium text-foreground">
              Full name
            </label>
            <Input
              id="profile-name"
              invalid={Boolean(errors.full_name)}
              {...register('full_name', { required: 'Full name is required.' })}
            />
            {errors.full_name ? (
              <p role="alert" className="text-xs font-medium text-danger">
                {errors.full_name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-language" className="text-sm font-medium text-foreground">
              Preferred language
            </label>
            <Select
              id="profile-language"
              options={LANGUAGE_OPTIONS}
              {...register('preferred_language')}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" variant="primary" disabled={!isDirty || isPending} isLoading={isPending}>
            Save changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
