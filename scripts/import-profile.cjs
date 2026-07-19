const {createClient} = require('@supabase/supabase-js');
require('dotenv').config({path: 'apps/api/.env'});

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const associateId = '7bd72f6a-feb9-4784-b40c-df2a68b53f75';
  
  const {data: doc} = await s.from('associate_documents')
    .select('parsed_data')
    .eq('associate_id', associateId)
    .eq('type', 'cv')
    .single();
  
  if (!doc || !doc.parsed_data) {
    console.log('No parsed data found');
    return;
  }
  
  const p = doc.parsed_data;
  console.log('Importing data for:', p.fullName);
  
  const profile = {
    fullName: p.fullName,
    phone: p.phone,
    city: p.location,
    headline: p.headline,
    bio: p.bio,
    nationality: p.nationality,
    dateOfBirth: p.dateOfBirth,
    gender: p.gender,
  };
  
  const experiences = (p.experience || []).map(e => ({
    company: e.company,
    organization: e.company,
    position: e.position,
    industry: e.industry,
    description: e.description,
    startDate: e.startDate,
    endDate: e.endDate,
  }));
  
  const educations = (p.education || []).map(e => ({
    institution: e.institution,
    degree: e.degree,
    fieldOfStudy: e.fieldOfStudy,
    startYear: e.startYear,
    endYear: e.endYear,
  }));
  
  const skills = (p.skills || []).map(s => ({
    name: s.name,
    category: s.category,
    proficiency: s.proficiency,
    yearsExperience: s.yearsExperience,
  }));
  
  const languages = (p.languages || []).map(l => ({
    language: l.language,
    proficiency: l.proficiency,
  }));
  
  const certifications = (p.certifications || []).map(c => ({
    name: c.name,
    issuer: c.issuer,
    issueDate: c.issueDate,
    expiryDate: c.expiryDate,
  }));
  
  const {error} = await s.rpc('import_cv_data', {
    p_associate_id: associateId,
    p_profile: profile,
    p_experiences: experiences,
    p_educations: educations,
    p_skills: skills,
    p_languages: languages,
    p_certifications: certifications,
  });
  
  if (error) {
    console.log('RPC Error:', error.message);
  } else {
    console.log('Profile imported successfully!');
  }
})();
