import { apiPost, apiPut } from './api';

type OnboardingPayload = {
  personal: {
    full_name: string;
    phone: string;
    location: string;
    nationality: string;
  };
  professional: {
    headline: string;
    bio: string;
    linkedin_url: string;
    github_url: string;
    website_url: string;
  };
  experiences: Array<{
    company: string;
    position: string;
    start_date: string;
    end_date: string;
    description: string;
    skills: string[];
  }>;
  educations: Array<{
    institution: string;
    degree: string;
    field_of_study: string;
    start_date: string;
    end_date: string;
  }>;
  skills: Array<{
    skill_name: string;
    category: string;
    level: number;
  }>;
};

export async function submitOnboarding(data: OnboardingPayload) {
  const results: string[] = [];

  // 1. Create/update profile
  try {
    await apiPut('/api/associate/profile', {
      full_name: data.personal.full_name,
      headline: data.professional.headline,
      bio: data.professional.bio,
      phone: data.personal.phone,
      location: data.personal.location,
      nationality: data.personal.nationality,
    });
    results.push('profile');
  } catch (e) {
    // Try creating associate if update fails
    try {
      await apiPost('/api/associate/', {
        full_name: data.personal.full_name,
        headline: data.professional.headline,
        bio: data.professional.bio,
        phone: data.personal.phone,
        location: data.personal.location,
        nationality: data.personal.nationality,
      });
      results.push('profile');
    } catch {
      console.error('Failed to save profile');
    }
  }

  // 2. Add social links
  if (data.professional.linkedin_url || data.professional.github_url || data.professional.website_url) {
    try {
      if (data.professional.linkedin_url) {
        await apiPost('/api/associate/social-links', {
          platform: 'linkedin',
          url: data.professional.linkedin_url,
        });
      }
      if (data.professional.github_url) {
        await apiPost('/api/associate/social-links', {
          platform: 'github',
          url: data.professional.github_url,
        });
      }
      if (data.professional.website_url) {
        await apiPost('/api/associate/social-links', {
          platform: 'website',
          url: data.professional.website_url,
        });
      }
      results.push('social_links');
    } catch {
      console.error('Failed to save social links');
    }
  }

  // 3. Add experiences
  for (const exp of data.experiences) {
    try {
      await apiPost('/api/associate/experiences', {
        company: exp.company,
        position: exp.position,
        start_date: exp.start_date,
        end_date: exp.end_date || null,
        description: exp.description,
        skills: exp.skills,
      });
    } catch {
      console.error('Failed to save experience:', exp.company);
    }
  }
  if (data.experiences.length > 0) results.push('experiences');

  // 4. Add educations
  for (const edu of data.educations) {
    try {
      await apiPost('/api/associate/educations', {
        institution: edu.institution,
        degree: edu.degree,
        field_of_study: edu.field_of_study,
        start_date: edu.start_date || null,
        end_date: edu.end_date || null,
      });
    } catch {
      console.error('Failed to save education:', edu.institution);
    }
  }
  if (data.educations.length > 0) results.push('educations');

  // 5. Add skills
  for (const skill of data.skills) {
    try {
      await apiPost('/api/associate/skills', {
        skill_name: skill.skill_name,
        category: skill.category,
        level: skill.level,
      });
    } catch {
      console.error('Failed to save skill:', skill.skill_name);
    }
  }
  if (data.skills.length > 0) results.push('skills');

  return { success: true, saved: results };
}

export async function checkOnboardingStatus(): Promise<boolean> {
  try {
    const data = await apiGet<{ profile: unknown; skills: unknown[] }>('/api/associate/me');
    // Check if profile has essential data
    return !!(data as Record<string, unknown>)?.profile;
  } catch {
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiGet<T = any>(path: string): Promise<T> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${API_URL}${path}`, { headers });
  if (!resp.ok) throw new Error('Request failed');
  return resp.json();
}
