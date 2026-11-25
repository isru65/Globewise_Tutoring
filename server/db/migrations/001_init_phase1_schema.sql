-- ============================================================================
-- Globewise Tutoring - Phase 1 Core PostgreSQL Schema (SRS v3.0 Baseline)
-- Conventions: UUID PKs, UTC TIMESTAMPTZ, IANA timezones, strict FKs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. IDENTITY & RBAC
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE, -- Nullable for K-8 child sub-accounts managed by parent
  username VARCHAR(100) UNIQUE,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending_verification'
    CHECK (status IN ('pending_verification', 'active', 'suspended', 'deactivated')),
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
  email_verified_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(32) NOT NULL UNIQUE
    CHECK (name IN ('student', 'tutor', 'parent', 'admin')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed core 4 roles
INSERT INTO roles (name, description) VALUES
  ('student', 'K-8 learner accessing assigned plans, lessons, assessments, and sessions'),
  ('tutor', 'Educator managing assigned students, syllabus mapping, AI review, and sessions'),
  ('parent', 'Guardian managing linked children, syllabus uploads, progress, and billing'),
  ('admin', 'Platform administrator overseeing users, curriculum, AI settings, and audits');

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE parent_student_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_type VARCHAR(32) NOT NULL DEFAULT 'parent'
    CHECK (relationship_type IN ('parent', 'legal_guardian')),
  consent_verified BOOLEAN NOT NULL DEFAULT FALSE,
  consent_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, student_id),
  CHECK (parent_id <> student_id)
);

-- Tutor-to-Student explicit assignment (enforces Section 4 RBAC restriction)
CREATE TABLE tutor_student_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tutor_id, student_id),
  CHECK (tutor_id <> student_id)
);

-- ============================================================================
-- 2. PROFILES & FILES
-- ============================================================================

CREATE TABLE student_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  dob DATE NOT NULL,
  grade_level VARCHAR(16) NOT NULL
    CHECK (grade_level IN ('K', '1', '2', '3', '4', '5', '6', '7', '8')),
  school_name VARCHAR(255),
  state_code VARCHAR(16),
  country_code VARCHAR(8) NOT NULL DEFAULT 'US',
  learning_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE parent_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(32),
  billing_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_preferences JSONB NOT NULL DEFAULT '{"email": true, "in_app": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tutor_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  qualifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  grade_levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  storage_key TEXT NOT NULL UNIQUE,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  purpose VARCHAR(48) NOT NULL
    CHECK (purpose IN ('syllabus_upload', 'lesson_attachment', 'avatar', 'report_export')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. CURRICULUM HIERARCHY
-- ============================================================================

CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  code VARCHAR(16) NOT NULL,
  name VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (program_id, code)
);

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (grade_id, code)
);

CREATE TABLE standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework VARCHAR(64) NOT NULL, -- e.g., CCSS, NGSS, CSTA, TEKS
  code VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  grade_code VARCHAR(16),
  subject_name VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (framework, code)
);

CREATE TABLE curriculum_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  code VARCHAR(32),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE curriculum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE CASCADE, -- Supports Main Topic -> Subtopic
  code VARCHAR(32),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of prerequisite curriculum_topic UUIDs
  standard_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_duration_mins INT NOT NULL DEFAULT 30,
  difficulty VARCHAR(24) NOT NULL DEFAULT 'standard'
    CHECK (difficulty IN ('foundational', 'standard', 'enrichment')),
  status VARCHAR(24) NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. SYLLABI & WEEKLY LEARNING PLANS
-- ============================================================================

CREATE TABLE syllabus_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  week_start DATE,
  school_subject VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'extracting', 'extracted', 'in_review', 'approved', 'rejected', 'failed')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE syllabus_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_upload_id UUID NOT NULL REFERENCES syllabus_uploads(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  extracted_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  edited_content JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (syllabus_upload_id, version_number)
);

CREATE TABLE syllabus_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_upload_id UUID NOT NULL REFERENCES syllabus_uploads(id) ON DELETE CASCADE,
  subject_name VARCHAR(128),
  topic_title VARCHAR(255) NOT NULL,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_date DATE,
  review_status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE syllabus_topic_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_topic_id UUID NOT NULL REFERENCES syllabus_topics(id) ON DELETE CASCADE,
  curriculum_topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  suggested_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (syllabus_topic_id, curriculum_topic_id)
);

CREATE TABLE weekly_learning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  tutor_notes TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'in_progress', 'completed', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (week_end >= week_start)
);

CREATE TABLE learning_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES weekly_learning_plans(id) ON DELETE CASCADE,
  curriculum_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL,
  item_type VARCHAR(24) NOT NULL
    CHECK (item_type IN ('lesson', 'practice', 'coding', 'assessment', 'session')),
  reference_id UUID, -- Points to lesson_id, assessment_id, or tutoring_session_id
  title VARCHAR(255) NOT NULL,
  estimated_duration_mins INT NOT NULL DEFAULT 20,
  sort_order INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  status VARCHAR(24) NOT NULL DEFAULT 'locked'
    CHECK (status IN ('locked', 'active', 'attempted', 'mastered', 'validated_ahead', 'focus_area')),
  mastery_score NUMERIC(5,2) DEFAULT 0.00,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, topic_id)
);

-- ============================================================================
-- 5. LESSONS & AI GENERATION JOBS
-- ============================================================================

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  material_type VARCHAR(32) NOT NULL DEFAULT 'lesson'
    CHECK (material_type IN ('lesson', 'reading', 'video', 'worksheet', 'practice', 'coding_activity', 'external_resource')),
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'published', 'archived')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lesson_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, version_number)
);

CREATE TABLE ai_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  student_id UUID REFERENCES users(id) ON DELETE SET NULL,
  job_type VARCHAR(48) NOT NULL
    CHECK (job_type IN ('syllabus_extract', 'lesson_draft', 'practice_questions', 'coding_exercise', 'assessment_items', 'progress_summary')),
  provider VARCHAR(64),
  model VARCHAR(64),
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- Must be PII-minimized before persistence
  status VARCHAR(24) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_generation_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES ai_generation_jobs(id) ON DELETE CASCADE,
  output_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_status VARCHAR(24) NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review', 'approved', 'rejected', 'edited')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. ASSESSMENTS
-- ============================================================================

CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  assessment_type VARCHAR(32) NOT NULL
    CHECK (assessment_type IN ('diagnostic', 'prerequisite', 'mastery', 'practice_quiz', 'coding_challenge')),
  time_limit_mins INT,
  max_attempts INT NOT NULL DEFAULT 3,
  passing_score NUMERIC(5,2) NOT NULL DEFAULT 70.00,
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_type VARCHAR(32) NOT NULL
    CHECK (question_type IN ('multiple_choice', 'multiple_select', 'true_false', 'short_answer', 'numeric', 'matching', 'coding')),
  prompt JSONB NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer JSONB NOT NULL, -- Strip in API serializer during active student attempts
  hint TEXT,
  hint_point_penalty INT NOT NULL DEFAULT 0,
  points NUMERIC(6,2) NOT NULL DEFAULT 1.00,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL DEFAULT 1,
  status VARCHAR(24) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'graded')),
  score NUMERIC(5,2),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  UNIQUE (assessment_id, student_id, attempt_number)
);

CREATE TABLE assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  student_answer JSONB NOT NULL,
  hint_used BOOLEAN NOT NULL DEFAULT FALSE,
  is_correct BOOLEAN,
  points_awarded NUMERIC(6,2) DEFAULT 0.00,
  tutor_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, question_id)
);

-- ============================================================================
-- 7. TUTORING SESSIONS
-- ============================================================================

CREATE TABLE tutoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  curriculum_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  meeting_url TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  readiness_flags JSONB NOT NULL DEFAULT '{"session_prepared": false, "reminder_sent": false, "tutor_ready": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
  tutor_joined_at TIMESTAMPTZ,
  student_joined_at TIMESTAMPTZ,
  attendance_status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (attendance_status IN ('pending', 'present', 'late', 'student_no_show', 'tutor_no_show')),
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  is_parent_visible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. GAMIFICATION
-- ============================================================================

CREATE TABLE reward_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(64) NOT NULL UNIQUE, -- e.g., lesson_completed, assessment_passed, daily_streak
  points_amount INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points_delta INT NOT NULL,
  reason VARCHAR(128) NOT NULL,
  reference_type VARCHAR(48),
  reference_id UUID,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description TEXT NOT NULL,
  icon_key VARCHAR(128) NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_badges (
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, badge_id)
);

CREATE TABLE student_streaks (
  student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak_days INT NOT NULL DEFAULT 0,
  longest_streak_days INT NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. BILLING, NOTIFICATIONS & AUDIT LOGS
-- ============================================================================

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  billing_interval VARCHAR(16) NOT NULL CHECK (billing_interval IN ('month', 'year')),
  max_students INT NOT NULL DEFAULT 1,
  monthly_sessions_included INT NOT NULL DEFAULT 0,
  trial_days INT NOT NULL DEFAULT 0,
  provider_price_id VARCHAR(128),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  provider VARCHAR(32) NOT NULL DEFAULT 'stripe',
  provider_subscription_id VARCHAR(128) UNIQUE,
  status VARCHAR(24) NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider_payment_id VARCHAR(128) UNIQUE,
  amount_cents INT NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  status VARCHAR(24) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  invoice_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(32) NOT NULL,
  provider_event_id VARCHAR(128) NOT NULL UNIQUE,
  event_type VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id UUID,
  before_state JSONB,
  after_state JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES & UPDATED_AT TRIGGERS
-- ============================================================================

CREATE INDEX idx_parent_student_parent ON parent_student_relationships(parent_id);
CREATE INDEX idx_parent_student_student ON parent_student_relationships(student_id);
CREATE INDEX idx_tutor_student_tutor ON tutor_student_assignments(tutor_id);
CREATE INDEX idx_tutor_student_student ON tutor_student_assignments(student_id);
CREATE INDEX idx_curriculum_topics_unit ON curriculum_topics(unit_id);
CREATE INDEX idx_syllabus_uploads_student ON syllabus_uploads(student_id);
CREATE INDEX idx_weekly_plans_student_week ON weekly_learning_plans(student_id, week_start);
CREATE INDEX idx_sessions_student_starts ON tutoring_sessions(student_id, starts_at);
CREATE INDEX idx_sessions_tutor_starts ON tutoring_sessions(tutor_id, starts_at);
CREATE INDEX idx_points_ledger_student ON points_ledger(student_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tutor_assignments_updated_at BEFORE UPDATE ON tutor_student_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_parent_profiles_updated_at BEFORE UPDATE ON parent_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tutor_profiles_updated_at BEFORE UPDATE ON tutor_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_curriculum_units_updated_at BEFORE UPDATE ON curriculum_units FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_curriculum_topics_updated_at BEFORE UPDATE ON curriculum_topics FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_syllabus_uploads_updated_at BEFORE UPDATE ON syllabus_uploads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_syllabus_topics_updated_at BEFORE UPDATE ON syllabus_topics FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_weekly_plans_updated_at BEFORE UPDATE ON weekly_learning_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_student_progress_updated_at BEFORE UPDATE ON student_topic_progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assessments_updated_at BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assessment_responses_updated_at BEFORE UPDATE ON assessment_responses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tutoring_sessions_updated_at BEFORE UPDATE ON tutoring_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_session_attendance_updated_at BEFORE UPDATE ON session_attendance FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_session_notes_updated_at BEFORE UPDATE ON session_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();