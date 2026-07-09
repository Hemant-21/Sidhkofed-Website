'use client';

/**
 * Public enquiry submission form (procurement buyer/seller enquiry — API spec §6 Enquiries).
 * Posts directly to the existing `POST /public/enquiries` backend endpoint; no new backend
 * surface. Enquiry types are fetched server-side (SSR) and passed in as a prop so this island
 * never needs an extra client-side master-data round trip.
 *
 * CAPTCHA: the backend only requires a `captcha_token` when `CAPTCHA_PROVIDER` is not `none`
 * (see src/services/captcha.ts). No CAPTCHA provider/site-key has been selected for the web
 * portal yet, so this form does not render a widget or send a token — submission works as long
 * as the backend keeps its default `CAPTCHA_PROVIDER=none`. If that is ever changed in production
 * without a corresponding widget here, every submission will fail with a `captcha_token`
 * validation error; see the summary in this task's handoff notes.
 *
 * The honeypot field (`website`) is a real input kept off-screen — bots that fill every field
 * blindly get caught server-side (enquiries.validators.ts rejects a non-empty value).
 */

import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { postOne, ClientApiError } from '@/lib/api/client';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { MasterRef } from '@/lib/types/api';
import type { EnquirySubmitInput, EnquirySubmitResult } from '@/lib/types/enquiry';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

type FieldName =
  | 'name'
  | 'mobile'
  | 'email'
  | 'organization'
  | 'enquiry_type_id'
  | 'commodity_id'
  | 'subject'
  | 'message';

const EMPTY_FORM = {
  name: '',
  mobile: '',
  email: '',
  organization: '',
  enquiry_type_id: '',
  commodity_id: '',
  subject: '',
  message: '',
  website: '', // honeypot
};

export function EnquiryForm({
  enquiryTypes,
  commodities,
}: {
  enquiryTypes: MasterRef[];
  /** Optional Commodity field (Enquiry.commodity_id) — pass in only where relevant, e.g.
   *  the procurement buyer/seller enquiry page. Omitted (or empty) → no Commodity field. */
  commodities?: MasterRef[];
}) {
  const { t, language } = useLanguage();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (status === 'success') {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 shadow-sm">
        <Alert tone="success" title={t('form.enquiry.success.title')}>
          {t('form.enquiry.success.body')}
        </Alert>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => {
            setForm(EMPTY_FORM);
            setFieldErrors({});
            setFormError(null);
            setStatus('idle');
          }}
        >
          {t('form.enquiry.another')}
        </Button>
      </div>
    );
  }

  if (enquiryTypes.length === 0) {
    return (
      <Alert tone="warning">{t('form.enquiry.error.typesUnavailable')}</Alert>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website.trim() !== '') return; // honeypot tripped — silently drop, no bot feedback

    setFormError(null);
    setFieldErrors({});

    // The enquiry-type <select> can't carry a native `required` attribute (the shared <Select>
    // doesn't forward one), so it needs one explicit client-side guard; every other field relies
    // on native HTML5 validation (required/type/minLength/maxLength) before this handler even runs.
    if (!form.enquiry_type_id) {
      setFieldErrors({ enquiry_type_id: t('form.enquiry.error.typeRequired') });
      setFormError(t('form.enquiry.error.validation'));
      return;
    }

    setStatus('submitting');

    const payload: EnquirySubmitInput = {
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      enquiry_type_id: form.enquiry_type_id,
      subject: form.subject.trim(),
      message: form.message.trim(),
      organization: form.organization.trim() || undefined,
      commodity_id: form.commodity_id || undefined,
    };

    try {
      await postOne<EnquirySubmitResult>(PUBLIC_ENDPOINTS.enquiries, payload);
      setStatus('success');
    } catch (err) {
      setStatus('idle');
      if (err instanceof ClientApiError) {
        if (err.code === 'rate_limited') {
          setFormError(t('form.enquiry.error.rateLimited'));
        } else if (err.code === 'validation_error') {
          setFormError(t('form.enquiry.error.validation'));
          if (err.fields) {
            const next: Partial<Record<FieldName, string>> = {};
            for (const [key, messages] of Object.entries(err.fields)) {
              if (messages[0]) next[key as FieldName] = messages[0];
            }
            setFieldErrors(next);
          }
        } else {
          setFormError(t('form.enquiry.error.generic'));
        }
      } else {
        setFormError(t('form.enquiry.error.generic'));
      }
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      {/* Honeypot — visually hidden, never reached by keyboard/AT users. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
        <label htmlFor="enquiry-website">Website</label>
        <input
          id="enquiry-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => set('website')(e.target.value)}
        />
      </div>

      <Field label={t('form.enquiry.name')} htmlFor="enquiry-name" error={fieldErrors.name}>
        <Input
          id="enquiry-name"
          name="name"
          required
          maxLength={150}
          value={form.name}
          onChange={(e) => set('name')(e.target.value)}
          invalid={Boolean(fieldErrors.name)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t('form.enquiry.mobile')} htmlFor="enquiry-mobile" error={fieldErrors.mobile}>
          <Input
            id="enquiry-mobile"
            name="mobile"
            type="tel"
            required
            minLength={7}
            maxLength={20}
            value={form.mobile}
            onChange={(e) => set('mobile')(e.target.value)}
            invalid={Boolean(fieldErrors.mobile)}
          />
        </Field>
        <Field label={t('form.enquiry.email')} htmlFor="enquiry-email" error={fieldErrors.email}>
          <Input
            id="enquiry-email"
            name="email"
            type="email"
            required
            maxLength={255}
            value={form.email}
            onChange={(e) => set('email')(e.target.value)}
            invalid={Boolean(fieldErrors.email)}
          />
        </Field>
      </div>

      <Field label={t('form.enquiry.organization')} htmlFor="enquiry-organization" error={fieldErrors.organization}>
        <Input
          id="enquiry-organization"
          name="organization"
          maxLength={255}
          value={form.organization}
          onChange={(e) => set('organization')(e.target.value)}
          invalid={Boolean(fieldErrors.organization)}
        />
      </Field>

      <div>
        <Select
          id="enquiry-type"
          label={t('form.enquiry.type')}
          value={form.enquiry_type_id}
          onChange={set('enquiry_type_id')}
          placeholder={t('form.enquiry.typePlaceholder')}
          options={enquiryTypes.map((et) => ({
            value: et.id,
            label: pickText(et.name_en, et.name_hi, language),
          }))}
        />
        {fieldErrors.enquiry_type_id ? (
          <p className="mt-1.5 text-xs text-danger" role="alert">
            {fieldErrors.enquiry_type_id}
          </p>
        ) : null}
      </div>

      {commodities && commodities.length > 0 ? (
        <div>
          <Select
            id="enquiry-commodity"
            label={t('form.enquiry.commodity')}
            value={form.commodity_id}
            onChange={set('commodity_id')}
            placeholder={t('form.enquiry.commodityPlaceholder')}
            options={commodities.map((c) => ({
              value: c.id,
              label: pickText(c.name_en, c.name_hi, language),
            }))}
          />
          {fieldErrors.commodity_id ? (
            <p className="mt-1.5 text-xs text-danger" role="alert">
              {fieldErrors.commodity_id}
            </p>
          ) : null}
        </div>
      ) : null}

      <Field label={t('form.enquiry.subject')} htmlFor="enquiry-subject" error={fieldErrors.subject}>
        <Input
          id="enquiry-subject"
          name="subject"
          required
          maxLength={255}
          value={form.subject}
          onChange={(e) => set('subject')(e.target.value)}
          invalid={Boolean(fieldErrors.subject)}
        />
      </Field>

      <Field
        label={t('form.enquiry.message')}
        htmlFor="enquiry-message"
        error={fieldErrors.message}
        hint={t(commodities && commodities.length > 0 ? 'form.enquiry.messageHintWithCommodity' : 'form.enquiry.messageHint')}
      >
        <Textarea
          id="enquiry-message"
          name="message"
          required
          maxLength={5000}
          rows={5}
          value={form.message}
          onChange={(e) => set('message')(e.target.value)}
          invalid={Boolean(fieldErrors.message)}
        />
      </Field>

      <Button type="submit" disabled={status === 'submitting'} className="w-full sm:w-auto">
        {status === 'submitting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('form.enquiry.submitting')}
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t('form.enquiry.submit')}
          </>
        )}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
