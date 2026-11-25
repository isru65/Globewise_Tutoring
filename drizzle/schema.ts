//schema.ts

import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey();
const uuidCol = (name: string) => text(name).notNull().default(crypto.randomUUID());
const tsz = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });
const createdAt = () => tsz("created_at").notNull().defaultNow();

export const appUsers = pgTable("app_users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  role: text("role").notNull().default("parent"),
  status: text("status").notNull().default("active"),
  createdAt: createdAt(),
});

export const roles = pgTable("roles", {
  id: id(),
  slug: text("slug").notNull().unique(), // 'student' | 'tutor' | 'parent' | 'admin'
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: createdAt(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    roleSlug: text("role_slug")
      .notNull()
      .references(() => roles.slug, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    assignedByEmail: text("assigned_by_email"),
    createdAt: createdAt(),
  },
  (t) => [unique("user_roles_user_role_unique").on(t.userId, t.roleSlug)],
);

export const parentProfiles = pgTable("parent_profiles", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  phone: text("phone").notNull().default(""),
  timezone: text("timezone").notNull().default("America/New_York"),
  consentAcceptedAt: tsz("consent_accepted_at"),
  createdAt: createdAt(),
  updatedAt: tsz("updated_at").notNull().defaultNow(),
});

export const tutorProfiles = pgTable("tutor_profiles", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  bio: text("bio").notNull().default(""),
  subjects: jsonb("subjects").$type<string[]>().notNull().default([]),
  gradeLevels: jsonb("grade_levels").$type<number[]>().notNull().default([]),
  timezone: text("timezone").notNull().default("America/New_York"),
  approvedAt: tsz("approved_at"),
  approvedByEmail: text("approved_by_email"),
  createdAt: createdAt(),
  updatedAt: tsz("updated_at").notNull().defaultNow(),
});

export const students = pgTable("students", {
  id: id(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  gradeLevel: integer("grade_level").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  parentEmail: text("parent_email").notNull(),
  tutorEmail: text("tutor_email"),
  studentEmail: text("student_email"),
  createdAt: createdAt(),
});

export const studentProfiles = pgTable("student_profiles", {
  id: id(),
  studentId: text("student_id")
    .notNull()
    .unique()
    .references(() => students.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => appUsers.id, { onDelete: "set null" }),
  schoolName: text("school_name").notNull().default(""),
  stateCode: text("state_code").notNull().default(""),
  currentLevel: integer("current_level").notNull().default(1),
  totalPoints: integer("total_points").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: tsz("updated_at").notNull().defaultNow(),
});

export const parentStudentRelationships = pgTable(
  "parent_student_relationships",
  {
    id: id(),
    parentUserId: text("parent_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    parentEmail: text("parent_email").notNull(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    relationshipType: text("relationship_type").notNull().default("guardian"),
    verified: boolean("verified").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    unique("parent_student_unique").on(t.parentUserId, t.studentId),
  ],
);

export const curriculumTopics = pgTable("curriculum_topics", {
  id: id(),
  program: text("program").notNull(),
  gradeLevel: integer("grade_level").notNull(),
  subject: text("subject").notNull(),
  unit: text("unit").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  objectives: text("objectives").notNull().default(""),
  standards: text("standards").notNull().default(""),
  prerequisiteIds: jsonb("prerequisite_ids").$type<string[]>().notNull().default([]),
  durationMinutes: integer("duration_minutes").notNull().default(45),
  difficulty: text("difficulty").notNull().default("Core"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const topicProgress = pgTable(
  "topic_progress",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    topicId: text("topic_id")
      .notNull()
      .references(() => curriculumTopics.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    updatedAt: tsz("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("topic_progress_student_topic").on(t.studentId, t.topicId)],
);

export const syllabusUploads = pgTable("syllabus_uploads", {
  id: id(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  weekStart: date("week_start", { mode: "string" }).notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  status: text("status").notNull().default("uploaded"),
  uploadedByEmail: text("uploaded_by_email").notNull(),
  reviewedByEmail: text("reviewed_by_email"),
  reviewNote: text("review_note").notNull().default(""),
  createdAt: createdAt(),
});

export const syllabusTopics = pgTable("syllabus_topics", {
  id: id(),
  uploadId: text("upload_id")
    .notNull()
    .references(() => syllabusUploads.id, { onDelete: "cascade" }),
  schoolSubject: text("school_subject").notNull(),
  schoolTopic: text("school_topic").notNull(),
  schoolDate: text("school_date").notNull().default(""),
  objective: text("objective").notNull().default(""),
  suggestedTopicId: text("suggested_topic_id").references(
    () => curriculumTopics.id,
    { onDelete: "set null" },
  ),
  curriculumTopicId: text("curriculum_topic_id").references(
    () => curriculumTopics.id,
    { onDelete: "set null" },
  ),
  mappingConfirmed: boolean("mapping_confirmed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const learningPlans = pgTable("learning_plans", {
  id: id(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  weekStart: date("week_start", { mode: "string" }).notNull(),
  status: text("status").notNull().default("draft"),
  tutorNotes: text("tutor_notes").notNull().default(""),
  createdByEmail: text("created_by_email").notNull(),
  publishedAt: tsz("published_at"),
  createdAt: createdAt(),
});

export const learningPlanItems = pgTable("learning_plan_items", {
  id: id(),
  planId: text("plan_id")
    .notNull()
    .references(() => learningPlans.id, { onDelete: "cascade" }),
  topicId: text("topic_id").references(() => curriculumTopics.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  activityType: text("activity_type").notNull().default("Lesson"),
  estimatedMinutes: integer("estimated_minutes").notNull().default(30),
  completed: boolean("completed").notNull().default(false),
  completedAt: tsz("completed_at"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const aiOutputs = pgTable("ai_outputs", {
  id: id(),
  jobType: text("job_type").notNull(),
  gradeLevel: integer("grade_level").notNull(),
  subject: text("subject").notNull(),
  topic: text("topic").notNull().default(""),
  criteria: text("criteria").notNull().default(""),
  title: text("title").notNull(),
  body: text("body").notNull(),
  reviewStatus: text("review_status").notNull().default("draft"),
  requestedByEmail: text("requested_by_email").notNull(),
  reviewedByEmail: text("reviewed_by_email"),
  createdAt: createdAt(),
});

export const assessments = pgTable("assessments", {
  id: id(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  gradeLevel: integer("grade_level").notNull(),
  timeLimitMinutes: integer("time_limit_minutes"),
  attemptLimit: integer("attempt_limit").notNull().default(2),
  passingScore: integer("passing_score").notNull().default(70),
  status: text("status").notNull().default("draft"),
  createdByEmail: text("created_by_email").notNull(),
  createdAt: createdAt(),
});

export const assessmentQuestions = pgTable("assessment_questions", {
  id: id(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  topicId: text("topic_id").references(() => curriculumTopics.id, {
    onDelete: "set null",
  }),
  questionType: text("question_type").notNull(),
  prompt: text("prompt").notNull(),
  options: jsonb("options").$type<string[]>(),
  correctAnswer: jsonb("correct_answer").$type<unknown>().notNull(),
  points: integer("points").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: id(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull(),
  status: text("status").notNull().default("in_progress"),
  answers: jsonb("answers").$type<Record<string, unknown>>().notNull().default({}),
  score: integer("score").notNull().default(0),
  maxScore: integer("max_score").notNull().default(0),
  percent: integer("percent").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  startedAt: tsz("started_at").notNull().defaultNow(),
  submittedAt: tsz("submitted_at"),
});

export const tutoringSessions = pgTable("tutoring_sessions", {
  id: id(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  tutorEmail: text("tutor_email").notNull(),
  subject: text("subject").notNull(),
  topic: text("topic").notNull().default(""),
  startsAt: tsz("starts_at").notNull(),
  endsAt: tsz("ends_at").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  meetingUrl: text("meeting_url").notNull(),
  status: text("status").notNull().default("scheduled"),
  attendance: text("attendance"),
  sessionPrepared: boolean("session_prepared").notNull().default(false),
  tutorReady: boolean("tutor_ready").notNull().default(false),
  tutorJoined: boolean("tutor_joined").notNull().default(false),
  studentJoined: boolean("student_joined").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: tsz("updated_at").notNull().defaultNow(),
});

export const sessionNotes = pgTable("session_notes", {
  id: id(),
  sessionId: text("session_id")
    .notNull()
    .references(() => tutoringSessions.id, { onDelete: "cascade" }),
  authorEmail: text("author_email").notNull(),
  body: text("body").notNull(),
  parentVisible: boolean("parent_visible").notNull().default(false),
  createdAt: createdAt(),
});

export const pointsLedger = pgTable("points_ledger", {
  id: id(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  pointsDelta: integer("points_delta").notNull(),
  reason: text("reason").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: createdAt(),
});

export const badges = pgTable("badges", {
  id: id(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  pointsRequired: integer("points_required").notNull(),
});

export const studentStreaks = pgTable("student_streaks", {
  id: id(),
  studentId: text("student_id")
    .notNull()
    .unique()
    .references(() => students.id, { onDelete: "cascade" }),
  currentStreakDays: integer("current_streak_days").notNull().default(0),
  longestStreakDays: integer("longest_streak_days").notNull().default(0),
  lastActiveDate: date("last_active_date", { mode: "string" }),
  updatedAt: tsz("updated_at").notNull().defaultNow(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: id(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull(),
  billingInterval: text("billing_interval").notNull().default("month"),
  studentLimit: integer("student_limit").notNull(),
  sessionAllowance: integer("session_allowance").notNull(),
  trialDays: integer("trial_days").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const subscriptions = pgTable("subscriptions", {
  id: id(),
  parentEmail: text("parent_email").notNull(),
  planId: text("plan_id")
    .notNull()
    .references(() => subscriptionPlans.id),
  status: text("status").notNull().default("trialing"),
  currentPeriodEnd: tsz("current_period_end"),
  createdAt: createdAt(),
});

export const payments = pgTable("payments", {
  id: id(),
  subscriptionId: text("subscription_id").references(() => subscriptions.id, {
    onDelete: "set null",
  }),
  parentEmail: text("parent_email").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("pending"),
  provider: text("provider").notNull().default("stripe"),
  providerRef: text("provider_ref").notNull().default(""),
  createdAt: createdAt(),
});

export const notifications = pgTable("app_notifications", {
  id: id(),
  recipientEmail: text("recipient_email").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  read: boolean("read").notNull().default(false),
  createdAt: createdAt(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  before: jsonb("before").$type<Record<string, unknown> | null>(),
  after: jsonb("after").$type<Record<string, unknown> | null>(),
  createdAt: createdAt(),
});

export { uuidCol };