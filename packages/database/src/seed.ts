import { db } from "./db";
import {
  associates,
  associateProfiles,
  associateExperiences,
  associateEducations,
  associateCertifications,
  associateSkills,
  associateLanguages,
  associatePreferences,
} from "./schema";

async function seed() {
  console.log("Seeding database...");

  const testUserId = "00000000-0000-0000-0000-000000000001";

  await db.insert(associates).values({
    id: testUserId,
    email: "associate@binahub.id",
    slug: "john-doe",
    status: "draft",
  });

  await db.insert(associateProfiles).values({
    associate_id: testUserId,
    full_name: "John Doe",
    headline: "Senior Trainer & Facilitator",
    bio: "Experienced professional with 10+ years in training and facilitation.",
    phone: "+6281234567890",
    nationality: "Indonesia",
  });

  await db.insert(associateExperiences).values([
    { associate_id: testUserId, organization: "BinaHub", position: "Senior Trainer", start_date: "2020-01", is_current: true, order_index: 0 },
    { associate_id: testUserId, organization: "PT Edukasi Maju", position: "Facilitator", start_date: "2015-03", end_date: "2019-12", is_current: false, order_index: 1 },
  ]);

  await db.insert(associateEducations).values([
    { associate_id: testUserId, institution: "Universitas Indonesia", degree: "S1", field_of_study: "Manajemen", start_year: 2010, end_year: 2014 },
  ]);

  await db.insert(associateCertifications).values([
    { associate_id: testUserId, name: "Certified Trainer", issuer: "BNSP", issue_date: "2020-06" },
  ]);

  await db.insert(associateSkills).values([
    { associate_id: testUserId, skill_name: "Public Speaking", category: "soft_skill", proficiency: "expert" },
    { associate_id: testUserId, skill_name: "Curriculum Design", category: "technical", proficiency: "advanced" },
  ]);

  await db.insert(associateLanguages).values([
    { associate_id: testUserId, language: "Indonesia", proficiency: "native" },
    { associate_id: testUserId, language: "English", proficiency: "fluent" },
  ]);

  await db.insert(associatePreferences).values({
    associate_id: testUserId,
  });

  console.log("Seed complete");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
