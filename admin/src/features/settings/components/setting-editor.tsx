'use client';

/**
 * `<SettingEditor>` — renders the appropriate input affordance for a single setting based on
 * the inferred `SettingKind`. The editor is UNCONTROLLED to the feature (it holds its own draft
 * state) but reports save/reset events to the parent. The backend is the authority; inference
 * is UX-only and a wrong guess just produces a less convenient input — the backend still
 * validates on PUT.
 *
 * Dirty tracking: the editor compares the current draft to the original persisted value so the
 * Save button only appears when something has actually changed.
 */

import { useCallback, useEffect, useId, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/utils/cn';
import { inferSettingKind, settingLabel, type SettingItem, type SettingKind } from '../types';

export interface SettingEditorProps {
  setting: SettingItem;
  onSave: (key: string, value: unknown) => void;
  disabled?: boolean;
}

/** Serialize any value to a display/edit string. */
function toEditString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

/** Parse an edit string back to a typed value for the given kind. */
function fromEditString(raw: string, kind: SettingKind): unknown {
  if (kind === 'boolean') return raw === 'true';
  if (kind === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  if (kind === 'stringArray') {
    try { return JSON.parse(raw); } catch { return raw.split(',').map((s) => s.trim()).filter(Boolean); }
  }
  if (kind === 'json') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

export function SettingEditor({ setting, onSave, disabled }: SettingEditorProps) {
  const kind = inferSettingKind(setting.key, setting.value);
  const labelText = settingLabel(setting.key);
  const controlId = useId();

  const [draft, setDraft] = useState<unknown>(setting.value);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(setting.value);

  // Sync draft when persisted value changes from outside (e.g. cache invalidation).
  useEffect(() => { setDraft(setting.value); }, [setting.value]);

  const reset = useCallback(() => setDraft(setting.value), [setting.value]);
  const save = useCallback(() => onSave(setting.key, draft), [onSave, setting.key, draft]);

  // ── Boolean (toggle) ──────────────────────────────────────────────────────────────
  if (kind === 'boolean') {
    return (
      <div className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-foreground">{labelText}</p>
          {setting.description ? (
            <p className="text-xs text-muted-foreground">{setting.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            id={controlId}
            checked={Boolean(draft)}
            onCheckedChange={(v) => {
              setDraft(v);
              onSave(setting.key, v);
            }}
            disabled={disabled}
            label={labelText}
          />
        </div>
      </div>
    );
  }

  // ── Shared inline save/reset actions ─────────────────────────────────────────────
  const actions = isDirty ? (
    <div className="mt-2 flex items-center gap-2">
      <Button
        size="sm"
        variant="primary"
        onClick={save}
        disabled={disabled}
        aria-label={`Save ${labelText}`}
      >
        <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        Save
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={reset}
        disabled={disabled}
        aria-label={`Reset ${labelText}`}
      >
        <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        Reset
      </Button>
    </div>
  ) : null;

  // ── Number ────────────────────────────────────────────────────────────────────────
  if (kind === 'number') {
    return (
      <FieldWrapper labelText={labelText} description={setting.description} id={controlId}>
        <Input
          id={controlId}
          type="number"
          value={String(draft ?? '')}
          onChange={(e) => setDraft(e.target.value === '' ? null : Number(e.target.value))}
          disabled={disabled}
          className="max-w-xs"
        />
        {actions}
      </FieldWrapper>
    );
  }

  // ── Long-form text (address, description, copyright…) ────────────────────────────
  if (kind === 'text') {
    return (
      <FieldWrapper labelText={labelText} description={setting.description} id={controlId}>
        <Textarea
          id={controlId}
          value={toEditString(draft)}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled}
          rows={3}
        />
        {actions}
      </FieldWrapper>
    );
  }

  // ── JSON / array (raw editor) ─────────────────────────────────────────────────────
  if (kind === 'json' || kind === 'stringArray') {
    return (
      <FieldWrapper labelText={labelText} description={setting.description} id={controlId}>
        <Textarea
          id={controlId}
          value={toEditString(draft)}
          onChange={(e) => setDraft(fromEditString(e.target.value, kind))}
          disabled={disabled}
          rows={5}
          className="font-mono text-xs"
          aria-label={`${labelText} (JSON)`}
        />
        {actions}
      </FieldWrapper>
    );
  }

  // ── Default: single-line text (url, language, string) ────────────────────────────
  return (
    <FieldWrapper labelText={labelText} description={setting.description} id={controlId}>
      <Input
        id={controlId}
        type={kind === 'url' ? 'url' : 'text'}
        value={toEditString(draft)}
        onChange={(e) => setDraft(e.target.value)}
        disabled={disabled}
        className={cn(kind === 'url' && 'font-mono text-sm')}
        placeholder={kind === 'url' ? 'https://' : undefined}
      />
      {actions}
    </FieldWrapper>
  );
}

function FieldWrapper({
  labelText,
  description,
  id,
  children,
}: {
  labelText: string;
  description: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 py-3">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {labelText}
      </label>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {children}
    </div>
  );
}
