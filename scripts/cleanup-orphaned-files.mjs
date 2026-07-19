/**
 * CLEANUP ORPHANED FILES — Script Node.js
 * 
 * Jalankan SETELAH SQL cleanup (STEP 3-4 di cleanup-orphaned-files.sql):
 *   node scripts/cleanup-orphaned-files.mjs
 * 
 * Pastikan env vars sudah di-set:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus di-set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== CLEANUP ORPHANED FILES ===\n');

  // 1. Ambil semua associates yang masih aktif
  const { data: associates, error: assocError } = await supabase
    .from('associates')
    .select('id');

  if (assocError) {
    console.error('Gagal ambil associates:', assocError.message);
    process.exit(1);
  }

  const activeIds = new Set(associates.map(a => a.id));
  console.log(`Associates aktif: ${activeIds.size}`);

  // 2. List semua file di storage bucket 'ams-files'
  //    Storage path format: associate/{owner_id}/{category}/{filename}
  const { data: folders, error: listError } = await supabase
    .storage
    .from('ams-files')
    .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

  if (listError) {
    console.error('Gagal list storage:', listError.message);
    process.exit(1);
  }

  // Karena path = associate/{owner_id}/{category}/{filename}
  // Kita perlu list per-folder (owner_id)
  const orphanedPaths = [];

  for (const folder of folders) {
    // Folder name = owner_id (UUID)
    const ownerId = folder.name;

    // Skip kalau bukan UUID-like (misal .emptyFolderPlaceholder)
    if (!ownerId || ownerId.startsWith('.')) continue;

    // Cek apakah masih punya pemilik
    if (activeIds.has(ownerId)) {
      console.log(`  ✓ ${ownerId} — masih aktif, skip`);
      continue;
    }

    console.log(`  ✗ ${ownerId} — ORPHANED, menghapus...`);

    // List sub-folders (category: cv, certificate, portfolio, dll)
    const { data: categories, error: catError } = await supabase
      .storage
      .from('ams-files')
      .list(ownerId, { limit: 1000 });

    if (catError) {
      console.error(`    Error list ${ownerId}:`, catError.message);
      continue;
    }

    // Hapus semua file di setiap category folder
    for (const cat of categories) {
      const catPath = `${ownerId}/${cat.name}`;

      const { data: files, error: filesError } = await supabase
        .storage
        .from('ams-files')
        .list(catPath, { limit: 1000 });

      if (filesError) {
        console.error(`    Error list ${catPath}:`, filesError.message);
        continue;
      }

      if (files && files.length > 0) {
        const paths = files.map(f => `${catPath}/${f.name}`);
        console.log(`    Hapus ${paths.length} file dari ${catPath}`);

        const { error: delError } = await supabase
          .storage
          .from('ams-files')
          .remove(paths);

        if (delError) {
          console.error(`    Error hapus ${catPath}:`, delError.message);
        } else {
          orphanedPaths.push(...paths);
        }
      }
    }

    // Hapus folder owner (setelah semua file di dalamnya dihapus)
    // Note: Supabase Storage otomatis remove empty folders
  }

  console.log(`\n=== HASIL ===`);
  console.log(`File dihapus dari storage: ${orphanedPaths.length}`);

  // 3. Cek apakah masih ada orphanded di database
  const { data: orphanedFiles } = await supabase
    .from('files')
    .select('id, owner_id, original_name')
    .not('owner_id', 'in', `(${Array.from(activeIds).join(',')})`)
    .is('deleted_at', null);

  if (orphanedFiles && orphanedFiles.length > 0) {
    console.log(`\nFile orphanded di DB: ${orphanedFiles.length}`);
    console.log('Jalankan SQL cleanup untuk hapus dari database.');
  } else {
    console.log('\nTidak ada file orphanded di database.');
  }
}

main().catch(console.error);
