const {createClient} = require('@supabase/supabase-js');
const OpenAI = require('openai');
const pdf = require('pdf-parse');
require('dotenv').config({path: 'apps/api/.env'});

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const o = new OpenAI({apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_API_BASE});
const MODEL = process.env.OPENAI_MODEL;

const PROMPT = `You are an expert CV parser. Return ONLY valid JSON, no markdown, no explanation, no extra text.

{
  "fullName": "string", "preferredName": "string", "phone": "string", "location": "string",
  "nationality": "string", "dateOfBirth": "string", "gender": "string",
  "headline": "string", "bio": "2-3 sentences",
  "skills": [{"name":"string","category":"technical","proficiency":"intermediate","yearsExperience":null}],
  "experience": [{"company":"string","position":"string","industry":"string","description":"string","startDate":"string","endDate":"string"}],
  "education": [{"institution":"string","degree":"string","fieldOfStudy":"string","startYear":0,"endYear":0}],
  "certifications": [{"name":"string","issuer":"string","issueDate":"string","expiryDate":"string"}],
  "languages": [{"language":"string","proficiency":"basic"}]
}
Use null for missing fields. Categories: technical, soft_skill, facilitation, training, coaching, industry, other.`;

function cleanJson(text) {
  text = text.trim();
  if (text.startsWith('```')) text = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return text;
  return text.substring(start, end + 1);
}

(async () => {
  const associateId = '7bd72f6a-feb9-4784-b40c-df2a68b53f75';
  
  const {data: doc} = await s.from('associate_documents')
    .select('id, url, name')
    .eq('associate_id', associateId)
    .eq('type', 'cv')
    .single();
  
  console.log('CV:', doc.name);
  console.log('Path:', doc.url);
  
  const {data: file} = await s.storage.from('ams-files').download(doc.url);
  const buf = Buffer.from(await file.arrayBuffer());
  const d = await pdf(buf);
  console.log('Text length:', d.text.length);
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log('\nAttempt ' + attempt + '...');
    try {
      const res = await o.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 4096,
        response_format: {type: 'json_object'},
        messages: [
          {role: 'system', content: PROMPT},
          {role: 'user', content: d.text}
        ]
      });
      
      const raw = res.choices[0]?.message?.content;
      if (!raw) throw new Error('Empty response');
      
      console.log('Raw (first 300):', raw.substring(0, 300));
      
      const parsed = JSON.parse(cleanJson(raw));
      console.log('\nParsed OK!');
      console.log('  Name:', parsed.fullName);
      console.log('  Skills:', parsed.skills ? parsed.skills.length : 0);
      console.log('  Experience:', parsed.experience ? parsed.experience.length : 0);
      console.log('  Education:', parsed.education ? parsed.education.length : 0);
      console.log('  Certifications:', parsed.certifications ? parsed.certifications.length : 0);
      console.log('  Languages:', parsed.languages ? parsed.languages.length : 0);
      
      const {error} = await s.from('associate_documents').update({parsed_data: parsed}).eq('id', doc.id);
      if (error) throw new Error('Update failed: ' + error.message);
      
      console.log('\nSaved to database!');
      break;
    } catch (e) {
      console.log('  Failed:', e.message);
      if (attempt === 3) console.log('\nAll attempts failed.');
    }
  }
})();
