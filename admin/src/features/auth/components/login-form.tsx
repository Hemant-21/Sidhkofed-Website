'use client';

/**
 * Login form — the one concrete feature in the foundation, included to exercise
 * the whole stack end-to-end (Form + Zod + auth service + redirect). Future
 * modules follow this same shape under src/features/<module>/.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { LogIn } from 'lucide-react';
import { useZodForm, Form, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { ROUTES } from '@/constants/routes';
import { emailSchema } from '@/lib/validation';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  const form = useZodForm(loginSchema, { defaultValues: { email: '', password: '' } });
  const {
    formState: { isSubmitting },
  } = form;

  const handleSubmit = async (values: LoginValues) => {
    // Throws ApiError on failure → mapped onto fields / banner by <Form>.
    await login(values);
    const next = params.get('next');
    router.replace(next ? decodeURIComponent(next) : ROUTES.dashboard);
  };

  return (
    <Form form={form} onSubmit={handleSubmit} className="space-y-4">
      <TextField<LoginValues>
        name="email"
        label="Email"
        type="email"
        required
        placeholder="you@example.com"
        autoComplete="username"
      />
      <TextField<LoginValues>
        name="password"
        label="Password"
        type="password"
        required
        placeholder="••••••••"
        autoComplete="current-password"
      />
      <Button
        type="submit"
        className="w-full"
        isLoading={isSubmitting}
        leftIcon={<LogIn className="h-4 w-4" />}
      >
        Sign in
      </Button>
    </Form>
  );
}
