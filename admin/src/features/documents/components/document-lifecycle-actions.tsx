'use client';

/**
 * Document lifecycle + version actions. Reuses the shared publishing hooks (useLifecycleActions)
 * and the confirmation dialogs; gating is permission aware via <Can> (backend still enforces).
 * Lifecycle: publish/unpublish/archive/restore. Version management: replace-file swaps the
 * underlying asset while preserving the document id/slug (codex §4.5) — the new file is uploaded
 * through the shared media pipeline, then `useReplaceDocumentFile` points the document at it.
 */

import { useState } from 'react';
import { Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FileUpload } from '@/components/ui/file-upload';
import { Progress } from '@/components/feedback/progress';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/api/server-errors';
import { useLifecycleActions } from '@/hooks/crud';
import { uploadMedia } from '@/components/relationships';
import { ROUTES } from '@/constants/routes';
import { DOCUMENTS_RESOURCE, useReplaceDocumentFile, CONTENT_PERMS } from '../api';
import type { DocumentDetail } from '../types';

const DOC_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf';

export function DocumentLifecycleActions({ document }: { document: DocumentDetail }) {
  const toast = useToast();
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } = useLifecycleActions<DocumentDetail>(DOCUMENTS_RESOURCE);
  const replace = useReplaceDocumentFile();

  const [replaceOpen, setReplaceOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const state = document.publication_state;
  const subject = 'this document';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  const onReplace = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const media = await uploadMedia(file, { title: file.name }, (pct) => setProgress(pct));
      await replace.mutateAsync({ id: document.id, fileAssetId: media.id });
      setReplaceOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Can permission={CONTENT_PERMS.update}>
          <Button asChild variant="outline" size="sm">
            <a href={`${ROUTES.documents}/${document.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
            </a>
          </Button>
        </Can>

        {/* Replace-file is Super Admin + Publisher on the backend; gate on the unpublish key
            (Publisher-level) as the closest content affordance. The backend still enforces. */}
        <Can permission={CONTENT_PERMS.publish}>
          <Button variant="outline" size="sm" onClick={() => setReplaceOpen(true)}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Replace file
          </Button>
        </Can>

        {state !== 'published' ? (
          <Can permission={CONTENT_PERMS.publish}>
            <Button
              size="sm"
              isLoading={publish.isPending}
              disabled={busy}
              onClick={async () => {
                if (await confirm.confirmPublish(subject)) publish.mutate(document.id);
              }}
            >
              Publish
            </Button>
          </Can>
        ) : (
          <Can permission={CONTENT_PERMS.unpublish}>
            <Button
              variant="outline"
              size="sm"
              isLoading={unpublish.isPending}
              disabled={busy}
              onClick={async () => {
                if (await confirm.confirmUnpublish(subject)) unpublish.mutate(document.id);
              }}
            >
              Unpublish
            </Button>
          </Can>
        )}

        {state !== 'archived' ? (
          <Can permission={CONTENT_PERMS.archive}>
            <Button
              variant="outline"
              size="sm"
              isLoading={archive.isPending}
              disabled={busy}
              onClick={async () => {
                if (await confirm.confirmArchive(subject)) archive.mutate(document.id);
              }}
            >
              Archive
            </Button>
          </Can>
        ) : (
          <Can permission={CONTENT_PERMS.restore}>
            <Button
              variant="outline"
              size="sm"
              isLoading={restore.isPending}
              disabled={busy}
              onClick={async () => {
                if (await confirm.confirmRestore(subject)) restore.mutate(document.id);
              }}
            >
              Restore
            </Button>
          </Can>
        )}
      </div>

      <Dialog
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        title="Replace document file"
        description="Upload a new file. The document keeps its URL and history; only the attached file changes."
        dismissible={!uploading && !replace.isPending}
      >
        <div className="space-y-3">
          <FileUpload onFiles={(files) => void onReplace(files)} accept={DOC_ACCEPT} maxSizeMb={20} disabled={uploading || replace.isPending} label="Upload replacement file" hint="PDF, Word, Excel, PowerPoint or CSV" />
          {uploading ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
              <Progress value={progress} label="Uploading replacement" />
            </div>
          ) : null}
          {replace.isPending ? <p className="text-sm text-muted-foreground">Linking new file…</p> : null}
        </div>
      </Dialog>
    </>
  );
}
