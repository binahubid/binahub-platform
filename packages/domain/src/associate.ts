export function canSubmit(profile: { full_name?: string; email?: string }): boolean {
  return !!(profile.full_name && profile.email);
}

export function canEdit(profile: { user_id: string }, userId: string): boolean {
  return profile.user_id === userId;
}

export function isProfileComplete(associate: {
  profile?: { full_name?: string | null; phone?: string | null } | null;
  experiences?: unknown[];
  educations?: unknown[];
  skills?: unknown[];
}): boolean {
  if (!associate.profile?.full_name) return false;
  return true;
}

export function calculateCompletion(associate: {
  profile?: Record<string, unknown> | null;
  experiences?: unknown[];
  educations?: unknown[];
  certifications?: unknown[];
  portfolios?: unknown[];
  skills?: unknown[];
  languages?: unknown[];
  availability?: unknown;
  social_links?: unknown[];
  emergency_contact?: unknown;
  preferences?: unknown;
}): number {
  const sections = [
    associate.profile && Object.keys(associate.profile).length > 1,
    (associate.experiences?.length ?? 0) > 0,
    (associate.educations?.length ?? 0) > 0,
    (associate.certifications?.length ?? 0) > 0,
    (associate.portfolios?.length ?? 0) > 0,
    (associate.skills?.length ?? 0) > 0,
    (associate.languages?.length ?? 0) > 0,
    !!associate.availability,
    (associate.social_links?.length ?? 0) > 0,
    !!associate.preferences,
  ];
  const filled = sections.filter(Boolean).length;
  return Math.round((filled / sections.length) * 100);
}
