export const CV_PARSING_PROMPT = `You are an expert at parsing CVs/resumes. Extract structured information from the provided CV text.

Return a JSON object with the following structure:
{
  "fullName": "Full name of the person",
  "phone": "Phone number or null",
  "location": "City or location or null",
  "headline": "Professional headline or title",
  "bio": "Brief professional summary",
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
      "company": "Company name",
      "position": "Job title",
      "description": "Job description and achievements",
      "startDate": "YYYY-MM-DD or YYYY-MM",
      "endDate": "YYYY-MM-DD or YYYY-MM or null if current"
    }
  ],
  "education": [
    {
      "institution": "School/University name",
      "degree": "Degree type (Bachelor, Master, etc.)",
      "fieldOfStudy": "Field of study",
      "startYear": 2015,
      "endYear": 2019
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing organization",
      "issueDate": "YYYY-MM-DD or YYYY-MM or null",
      "expiryDate": "YYYY-MM-DD or YYYY-MM or null"
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
2. If information is not available, use null
3. For skills, categorize them appropriately
4. For proficiency levels, infer from context (years of experience, description)
5. Keep dates in YYYY-MM-DD format when possible, otherwise YYYY-MM
6. Do not add information not present in the CV
7. Return only valid JSON, no additional text`;

