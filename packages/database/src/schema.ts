import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const associates = pgTable("associates", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  slug: text("slug").unique(),
  status: text("status").default("draft").notNull(),
  submitted_at: timestamp("submitted_at"),
  approved_at: timestamp("approved_at"),
  approved_by: uuid("approved_by"),
  is_profile_complete: boolean("is_profile_complete").default(false).notNull(),
  is_email_verified: boolean("is_email_verified").default(false).notNull(),
  is_identity_verified: boolean("is_identity_verified").default(false).notNull(),
  is_cv_verified: boolean("is_cv_verified").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const associateProfiles = pgTable("associate_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().unique().references(() => associates.id),
  full_name: text("full_name").notNull(),
  preferred_name: text("preferred_name"),
  headline: text("headline"),
  bio: text("bio"),
  phone: text("phone"),
  city: text("city"),
  timezone: text("timezone"),
  nationality: text("nationality"),
  photo_url: text("photo_url"),
  roles: jsonb("roles").$type<string[]>().default([]).notNull(),
  expertises: jsonb("expertises").$type<string[]>().default([]).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const associateExperiences = pgTable("associate_experiences", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().references(() => associates.id),
  organization: text("organization").notNull(),
  position: text("position").notNull(),
  industry: text("industry"),
  description: text("description"),
  achievement: text("achievement"),
  start_date: text("start_date").notNull(),
  end_date: text("end_date"),
  is_current: boolean("is_current").default(false).notNull(),
  order_index: integer("order_index").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const associateEducations = pgTable("associate_educations", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().references(() => associates.id),
  institution: text("institution").notNull(),
  degree: text("degree").notNull(),
  field_of_study: text("field_of_study"),
  start_year: integer("start_year"),
  end_year: integer("end_year"),
  order_index: integer("order_index").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const associateCertifications = pgTable("associate_certifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().references(() => associates.id),
  name: text("name").notNull(),
  issuer: text("issuer").notNull(),
  issue_date: text("issue_date"),
  expiry_date: text("expiry_date"),
  credential_id: text("credential_id"),
  credential_url: text("credential_url"),
  order_index: integer("order_index").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const associatePortfolios = pgTable("associate_portfolios", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().references(() => associates.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  client_name: text("client_name"),
  project_url: text("project_url"),
  start_date: text("start_date"),
  end_date: text("end_date"),
  skills_used: jsonb("skills_used").$type<string[]>().default([]).notNull(),
  order_index: integer("order_index").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const associateSkills = pgTable("associate_skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().references(() => associates.id),
  skill_name: text("skill_name").notNull(),
  category: text("category"),
  proficiency: text("proficiency"),
  years_experience: integer("years_experience"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const associateLanguages = pgTable("associate_languages", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().references(() => associates.id),
  language: text("language").notNull(),
  proficiency: text("proficiency").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const associateAvailability = pgTable("associate_availability", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().unique().references(() => associates.id),
  status: text("status").default("available").notNull(),
  max_hours_per_week: integer("max_hours_per_week"),
  work_locations: jsonb("work_locations").$type<string[]>().default([]).notNull(),
  travel_ready: boolean("travel_ready").default(false).notNull(),
  preferred_engagements: jsonb("preferred_engagements").$type<string[]>().default([]).notNull(),
  available_from: text("available_from"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const associateSocialLinks = pgTable("associate_social_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().references(() => associates.id),
  platform: text("platform").notNull(),
  url: text("url").notNull(),
  is_primary: boolean("is_primary").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const associateEmergencyContacts = pgTable("associate_emergency_contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().references(() => associates.id),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  is_primary: boolean("is_primary").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const associatePreferences = pgTable("associate_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().unique().references(() => associates.id),
  locale: text("locale").default("id").notNull(),
  email_notifications: boolean("email_notifications").default(true).notNull(),
  whatsapp_notifications: boolean("whatsapp_notifications").default(true).notNull(),
  profile_visibility: text("profile_visibility").default("private").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const associateDocuments = pgTable("associate_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().references(() => associates.id),
  type: text("type").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  parsed_data: jsonb("parsed_data").$type<Record<string, unknown>>(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const associateReviews = pgTable("associate_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().references(() => associates.id),
  reviewer_id: uuid("reviewer_id").notNull(),
  status: text("status").default("pending").notNull(),
  notes: text("notes"),
  decision_at: timestamp("decision_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const assignments = pgTable("assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  client_name: text("client_name").notNull(),
  description: text("description"),
  status: text("status").default("draft").notNull(),
  start_date: text("start_date"),
  end_date: text("end_date"),
  needed_roles: jsonb("needed_roles").$type<string[]>().default([]).notNull(),
  needed_count: integer("needed_count").default(0).notNull(),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const adminPreferences = pgTable("admin_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  admin_id: uuid("admin_id").notNull().unique(),
  email_notifications: boolean("email_notifications").default(true).notNull(),
  review_alerts: boolean("review_alerts").default(true).notNull(),
  weekly_summary: boolean("weekly_summary").default(false).notNull(),
  new_associate_alerts: boolean("new_associate_alerts").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const assignmentAssignees = pgTable("assignment_assignees", {
  id: uuid("id").defaultRandom().primaryKey(),
  assignment_id: uuid("assignment_id").notNull(),
  associate_id: uuid("associate_id").notNull(),
  status: text("status").default("invited").notNull(),
  role: text("role"),
  notes: text("notes"),
  invited_by: uuid("invited_by"),
  invited_at: timestamp("invited_at").defaultNow().notNull(),
  accepted_at: timestamp("accepted_at"),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const associateAssessments = pgTable("associate_assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().references(() => associates.id),
  skill_name: text("skill_name").notNull(),
  assessment_type: text("assessment_type").notNull(),
  score: integer("score").default(0).notNull(),
  max_score: integer("max_score").default(100).notNull(),
  status: text("status").default("pending").notNull(),
  assessor: text("assessor"),
  feedback: text("feedback"),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const associateTasks = pgTable("associate_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().references(() => associates.id),
  title: text("title").notNull(),
  completed: boolean("completed").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const associateDevelopmentPlans = pgTable("associate_development_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  associate_id: uuid("associate_id").notNull().unique().references(() => associates.id),
  current_score: integer("current_score").default(0).notNull(),
  target_score: integer("target_score").default(80).notNull(),
  recommended_actions: jsonb("recommended_actions").$type<Array<{
    id: string;
    type: 'course' | 'certification' | 'project' | 'skill';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    status: 'not_started' | 'in_progress' | 'completed';
  }>>().default([]).notNull(),
  learning_paths: jsonb("learning_paths").$type<Array<{
    id: string;
    skill_name: string;
    current_level: number;
    target_level: number;
    steps: Array<{
      id: string;
      title: string;
      type: 'course' | 'article' | 'practice' | 'assessment';
      completed: boolean;
    }>;
  }>>().default([]).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
