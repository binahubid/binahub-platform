export const CV_PARSING_PROMPT = `You are an expert at parsing CVs/resumes for a Human Development & Transformation company. Extract ALL structured information from the provided CV text.

Return a JSON object with the following structure:
{
  "fullName": "Full name of the person",
  "preferredName": "Preferred or nickname if mentioned, otherwise null",
  "email": "Email address exactly as stated, otherwise null",
  "phone": "Phone number or null",
  "location": "City or location or null",
  "nationality": "Nationality exactly as stated, otherwise null.",
  "dateOfBirth": "YYYY-MM-DD format when explicitly stated, otherwise null. Convert Indonesian month names (Januari-Desember) to standard numbers.",
  "gender": "male|female|other only when explicitly stated, otherwise null.",
  "headline": "Professional headline — summarize their main professional role (e.g. 'Senior Trainer & Facilitator')",
  "bio": "A compelling 2-3 sentence professional summary about their expertise and value",
  "linkedIn": "Complete LinkedIn URL beginning with https:// or null",
  "website": "Complete personal website or portfolio URL beginning with https:// or null",
  "skills": [
    {
      "name": "Skill name",
      "category": "technical|soft_skill|industry|other",
      "proficiency": "beginner|intermediate|advanced|expert",
      "yearsExperience": 5
    }
  ],
  "experience": [
    {
      "company": "Organization/Company name",
      "position": "Job title or role",
      "industry": "Industry sector (e.g. Training & Development, Consulting, Banking, etc.)",
      "description": "Job description and responsibilities",
      "achievement": "Distinct achievements or measurable results, otherwise null",
      "startDate": "YYYY-MM or YYYY",
      "endDate": "YYYY-MM or YYYY or null if current"
    }
  ],
  "education": [
    {
      "institution": "School/University name",
      "degree": "Degree type (Bachelor, Master, Doctor, Certificate, etc.)",
      "fieldOfStudy": "Field of study or major",
      "startYear": 2015,
      "endYear": 2019
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing organization",
      "issueDate": "YYYY-MM-DD or YYYY-MM or null",
      "expiryDate": "YYYY-MM-DD or YYYY-MM or null",
      "credentialId": "Credential ID exactly as stated, otherwise null",
      "credentialUrl": "Complete credential URL beginning with https:// or null"
    }
  ],
  "languages": [
    {
      "language": "Language name",
      "proficiency": "basic|conversational|fluent|native"
    }
  ]
}

Rules:
1. Extract information exactly as written in the CV
2. If information is not available, return null. Never infer sensitive personal attributes such as gender, nationality, or date of birth.
3. For skills, categorize them appropriately — especially identify facilitation, training, coaching, and soft skills
4. For proficiency levels, infer from context (years of experience, description, certifications)
5. Keep dates in YYYY-MM format, or YYYY-MM-DD when full date is available
6. For headline: create a professional, concise title that reflects their primary expertise
7. For bio: write a compelling summary that highlights their unique value
8. Do not add information not present in the CV
9. Return only valid JSON, no additional text`;
