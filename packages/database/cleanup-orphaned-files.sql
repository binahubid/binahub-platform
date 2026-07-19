-- ============================================
-- CLEANUP ORPHANED FILES
-- File yang owner_id-nya tidak ada di associates
-- ============================================

-- STEP 1: PREVIEW — Jalankan dulu untuk cek
SELECT 
    f.id,
    f.owner_id,
    f.owner_type,
    f.category,
    f.original_name,
    f.size,
    f.created_at
FROM files f
LEFT JOIN associates a ON a.id = f.owner_id
WHERE a.id IS NULL
  AND f.deleted_at IS NULL
ORDER BY f.created_at DESC;

-- STEP 2: PREVIEW associate_documents
SELECT 
    ad.id,
    ad.associate_id,
    ad.type,
    ad.name,
    ad.url,
    ad.created_at
FROM associate_documents ad
LEFT JOIN associates a ON a.id = ad.associate_id
WHERE a.id IS NULL;

-- STEP 3: HAPUS dari associate_documents
DELETE FROM associate_documents
WHERE associate_id NOT IN (SELECT id FROM associates);

-- STEP 4: HAPUS dari files
DELETE FROM files
WHERE owner_id NOT IN (SELECT id FROM associates)
  AND deleted_at IS NULL;

-- STEP 5: Storage — jalankan script JS:
--   node scripts/cleanup-orphaned-files.mjs

-- STEP 6: VERIFIKASI
SELECT COUNT(*) as orphaned_count
FROM files f
LEFT JOIN associates a ON a.id = f.owner_id
WHERE a.id IS NULL
  AND f.deleted_at IS NULL;
-- Hasil harus 0
