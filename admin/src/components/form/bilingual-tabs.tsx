'use client';

/**
 * Bilingual field tabs (English / Hindi). The CMS stores `*_en` (primary) and
 * optional `*_hi` (codex §10). This wraps the two field groups in accessible tabs
 * so editors switch language without leaving the form. Generic — the caller passes
 * the en/hi field nodes for whatever fields the module needs.
 */

import type { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function BilingualTabs({
  english,
  hindi,
  defaultLanguage = 'en',
}: {
  english: ReactNode;
  hindi: ReactNode;
  defaultLanguage?: 'en' | 'hi';
}) {
  return (
    <Tabs defaultValue={defaultLanguage}>
      <TabsList>
        <TabsTrigger value="en">English</TabsTrigger>
        <TabsTrigger value="hi">हिन्दी (optional)</TabsTrigger>
      </TabsList>
      <TabsContent value="en">
        <div className="space-y-4">{english}</div>
      </TabsContent>
      <TabsContent value="hi">
        <div className="space-y-4">{hindi}</div>
      </TabsContent>
    </Tabs>
  );
}
