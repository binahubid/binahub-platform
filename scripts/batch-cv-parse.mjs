/**
 * BATCH CV PARSING — Isi semua profile associate berdasarkan CV
 * 
 * Jalankan:
 *   node scripts/batch-cv-parse.mjs
 * 
 * Env vars yang dibutuhkan:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 *   OPENAI_API_BASE (optional, default: https://openrouter.ai/api/v1)
 *   OPENAI_MODEL (optional, default: aihubmix/xiaomi-mimo-v2.5-free)
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pdf from 'pdf-parse/lib/pdf-parse.js';

// ============ CONFIG ============
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const openaiBase = process.env.OPENAI_API_BASE || 'https://openrouter.ai/api/v1';
const openaiModel = process.env.OPENAI_MODEL || 'aihubmix/xiaomi-mimo-v2.5-free';
const BUCKET = 'ams-files';

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('Error: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan OPENAI_API_KEY harus di-set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey, baseURL: openaiBase });

// ============ CV PARSING PROMPT ============
const CV_PARSING_PROMPT = `You are an expert CV/resume parser. Extract structured information from the following CV text.

Return a JSON object with EXACTLY this structure:
{
  "fullName": "string or null",
  "preferredName": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "nationality": "string or null",
  "dateOfBirth": "string (YYYY-MM-DD) or null",
  "gender": "string or null",
  "headline": "professional title (e.g. Senior Software Engineer)",
  "bio": "2-3 sentence professional summary",
  "linkedIn": "string or null",
  "website": "string or null",
  "skills": [{ "name": "string", "category": "technical|soft_skill|facilitation|training|coaching|industry|other", "proficiency": "beginner|intermediate|advanced|expert", "yearsExperience": number or null }],
  "experience": [{ "company": "string", "position": "string", "industry": "string or null", "description": "string or null", "startDate": "YYYY-MM-DD or YYYY-MM", "endDate": "YYYY-MM-DD or YYYY-MM or Present" }],
  "education": [{ "institution": "string", "degree": "string", "fieldOfStudy": "string or null", "startYear": number, "endYear": number or null }],
  "certifications": [{ "name": "string", "issuer": "string or null", "issueDate": "string or null", "expiryDate": "string or null" }],
  "languages": [{ "language": "string", "proficiency": "basic|conversational|fluent|native" }]
}

Rules:
- Return ONLY valid JSON, no markdown, no explanation
- Use null for missing fields
- For skills category: technical, soft_skill, facilitation, training, coaching, industry, other
- For proficiency: beginner, intermediate, advanced, expert
- For language proficiency: basic, conversational, fluent, native
- Dates should be in YYYY-MM-DD or YYYY-MM format when possible
- If only year is available, use YYYY-01-01`;

// ============ HELPER FUNCTIONS ============

async function extractTextFromPDF(buffer) {
  const data = await pdf(buffer);
  return data.text;
}

async function downloadFile(path) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(path);

  if (error) throw new Error(`Download gagal: ${error.message}`);
  return data;
}

async function extractText(file, mime) {
  if (mime === 'application/pdf') {
    const buffer = Buffer.from(await file.arrayBuffer());
    return await extractTextFromPDF(buffer);
  }
  // Plain text files
  return await file.text();
}

async function parseCVWithAI(text) {
  const response = await openai.chat.completions.create({
    model: openaiModel,
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: CV_PARSING_PROMPT },
      { role: 'user', content: text }
    ]
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('AI tidak mengembalikan hasil');

  return JSON.parse(content);
}

// ============ MAIN ============

async function main() {
  console.log('=== BATCH CV PARSING ===\n');

  // 1. Cari associate yang punya CV tapi belum di-parse
  const { data: unparsedDocs, error: queryError } = await supabase
    .from('associate_documents')
    .select(`
      id,
      associate_id,
      type,
      name,
      url,
      parsed_data,
      created_at
    `)
    .eq('type', 'cv')
    .is('parsed_data', null)
    .order('created_at', { ascending: true });

  if (queryError) {
    console.error('Query gagal:', queryError.message);
    process.exit(1);
  }

  if (!unparsedDocs || unparsedDocs.length === 0) {
    console.log('Tidak ada CV yang perlu di-parse.');
    return;
  }

  console.log(`Ditemukan ${unparsedDocs.length} CV belum di-parse:\n`);
  unparsedDocs.forEach((doc, i) => {
    console.log(`  ${i + 1}. ${doc.name} (associate: ${doc.associate_id})`);
  });

  // 2. Process setiap CV
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < unparsedDocs.length; i++) {
    const doc = unparsedDocs[i];
    console.log(`\n--- [${i + 1}/${unparsedDocs.length}] ${doc.name} ---`);

    try {
      // Download file
      console.log('  Download file...');
      const file = await downloadFile(doc.url);

      // Extract text
      console.log('  Extract text...');
      const text = await extractText(file, file.type);

      if (!text || text.trim().length < 50) {
        throw new Error('Teks CV terlalu pendek atau kosong');
      }

      // Parse with AI
      console.log('  Parse dengan AI...');
      const parsed = await parseCVWithAI(text);
      console.log(`  → Nama: ${parsed.fullName || '(kosong)'}`);
      console.log(`  → Skills: ${parsed.skills?.length || 0}`);
      console.log(`  → Experience: ${parsed.experience?.length || 0}`);
      console.log(`  → Education: ${parsed.education?.length || 0}`);

      // 3. Simpan parsed_data ke associate_documents
      console.log('  Simpan parsed_data...');
      const { error: updateError } = await supabase
        .from('associate_documents')
        .update({ parsed_data: parsed })
        .eq('id', doc.id);

      if (updateError) {
        throw new Error(`Gagal update parsed_data: ${updateError.message}`);
      }

      // 4. Isi profile via import_cv_data RPC
      console.log('  Isi profile...');
      const profile = {
        fullName: parsed.fullName,
        phone: parsed.phone,
        city: parsed.location,
        headline: parsed.headline,
        bio: parsed.bio,
        nationality: parsed.nationality,
        dateOfBirth: parsed.dateOfBirth,
        gender: parsed.gender,
      };

      const experiences = (parsed.experience || []).map(exp => ({
        company: exp.company,
        organization: exp.company, // Map ke column name
        position: exp.position,
        industry: exp.industry,
        description: exp.description,
        startDate: exp.startDate,
        endDate: exp.endDate,
      }));

      const educations = (parsed.education || []).map(edu => ({
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.fieldOfStudy,
        startYear: edu.startYear,
        endYear: edu.endYear,
      }));

      const skills = (parsed.skills || []).map(skill => ({
        name: skill.name,
        category: skill.category,
        proficiency: skill.proficiency,
        yearsExperience: skill.yearsExperience,
      }));

      const languages = (parsed.languages || []).map(lang => ({
        language: lang.language,
        proficiency: lang.proficiency,
      }));

      const certifications = (parsed.certifications || []).map(cert => ({
        name: cert.name,
        issuer: cert.issuer,
        issueDate: cert.issueDate,
        expiryDate: cert.expiryDate,
      }));

      const { error: rpcError } = await supabase.rpc('import_cv_data', {
        p_associate_id: doc.associate_id,
        p_profile: profile,
        p_experiences: experiences,
        p_educations: educations,
        p_skills: skills,
        p_languages: languages,
        p_certifications: certifications,
      });

      if (rpcError) {
        throw new Error(`RPC gagal: ${rpcError.message}`);
      }

      console.log(`  ✓ Berhasil!`);
      successCount++;

    } catch (err) {
      console.error(`  ✗ Gagal: ${err.message}`);
      failCount++;
    }
  }

  // 5. Ringkasan
  console.log(`\n=== HASIL ===`);
  console.log(`Berhasil: ${successCount}`);
  console.log(`Gagal: ${failCount}`);
  console.log(`Total: ${unparsedDocs.length}`);
}

main().catch(console.error);
