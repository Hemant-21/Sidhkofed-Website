'use client';

/**
 * Password change form. Collects a new password + confirmation; confirms locally
 * before sending. The backend validates strength (API spec §6). The form resets on
 * success so the fields clear, signalling completion to the user.
 */

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/layout/card';
import { useChangePassword } from '../hooks';

interface FormValues {
  password: string;
  confirm: string;
}

export function PasswordForm() {
  const { mutate, isPending } = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty, errors },
  } = useForm<FormValues>({ defaultValues: { password: '', confirm: '' } });

  const passwordValue = watch('password');

  const onSubmit = ({ password }: FormValues) => {
    mutate({ password }, { onSuccess: () => reset() });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader
          title="Change password"
          description="Choose a new password. The backend enforces minimum strength requirements."
        />
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="pw-new" className="text-sm font-medium text-foreground">
              New password
            </label>
            <Input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              invalid={Boolean(errors.password)}
              {...register('password', {
                required: 'New password is required.',
                minLength: { value: 8, message: 'Password must be at least 8 characters.' },
              })}
            />
            {errors.password ? (
              <p role="alert" className="text-xs font-medium text-danger">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pw-confirm" className="text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              invalid={Boolean(errors.confirm)}
              {...register('confirm', {
                required: 'Please confirm your new password.',
                validate: (v) => v === passwordValue || 'Passwords do not match.',
              })}
            />
            {errors.confirm ? (
              <p role="alert" className="text-xs font-medium text-danger">
                {errors.confirm.message}
              </p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" variant="primary" disabled={!isDirty || isPending} isLoading={isPending}>
            Change password
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
