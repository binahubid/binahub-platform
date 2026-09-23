-- =========================================================================
-- BinaHub AMS — Migration 010
-- Align associate_documents with the runtime soft-delete contract.
-- =========================================================================

ALTER TABLE public.associate_documents
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_associate_documents_active_by_associate
  ON public.associate_documents (associate_id, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.associate_documents.deleted_at IS
  'Soft-delete timestamp. NULL means the document is active.';
