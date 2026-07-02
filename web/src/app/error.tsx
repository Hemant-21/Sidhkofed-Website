'use client';

// Root error boundary (renders for unexpected runtime/render errors — the "500"
// experience). Must be a Client Component per Next.js.
import { useEffect } from 'react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/providers/language-provider';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage();

  useEffect(() => {
    // Surface for observability; replace with a real logger in production.
    console.error(error);
  }, [error]);

  return (
    <Container className="py-16">
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <p className="text-6xl font-extrabold text-danger">500</p>
        <h1 className="mt-4 text-2xl font-bold text-foreground">{t('state.serverError.title')}</h1>
        <p className="mt-2 max-w-md text-muted-foreground">{t('state.serverError.body')}</p>
        <Button className="mt-6" onClick={reset}>
          {t('state.error.retry')}
        </Button>
      </div>
    </Container>
  );
}
