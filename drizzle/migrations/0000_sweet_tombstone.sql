CREATE TABLE "ai_outputs" (
	"id" text PRIMARY KEY NOT NULL,
	"job_type" text NOT NULL,
	"grade_level" integer NOT NULL,
	"subject" text NOT NULL,
	"topic" text DEFAULT '' NOT NULL,
	"criteria" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"review_status" text DEFAULT 'draft' NOT NULL,
	"requested_by_email" text NOT NULL,
	"reviewed_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'parent' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"assessment_id" text NOT NULL,
	"student_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"max_score" integer DEFAULT 0 NOT NULL,
	"percent" integer DEFAULT 0 NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"assessment_id" text NOT NULL,
	"question_type" text NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb,
	"correct_answer" jsonb NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subject" text NOT NULL,
	"grade_level" integer NOT NULL,
	"time_limit_minutes" integer,
	"attempt_limit" integer DEFAULT 2 NOT NULL,
	"passing_score" integer DEFAULT 70 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_email" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"points_required" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"program" text NOT NULL,
	"grade_level" integer NOT NULL,
	"subject" text NOT NULL,
	"unit" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"objectives" text DEFAULT '' NOT NULL,
	"standards" text DEFAULT '' NOT NULL,
	"prerequisite_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duration_minutes" integer DEFAULT 45 NOT NULL,
	"difficulty" text DEFAULT 'Core' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_plan_items" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"topic_id" text,
	"title" text NOT NULL,
	"activity_type" text DEFAULT 'Lesson' NOT NULL,
	"estimated_minutes" integer DEFAULT 30 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"week_start" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"tutor_notes" text DEFAULT '' NOT NULL,
	"created_by_email" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_email" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"points_delta" integer NOT NULL,
	"reason" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "points_ledger_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "session_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"author_email" text NOT NULL,
	"body" text NOT NULL,
	"parent_visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"grade_level" integer NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"parent_email" text NOT NULL,
	"tutor_email" text,
	"student_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"billing_interval" text DEFAULT 'month' NOT NULL,
	"student_limit" integer NOT NULL,
	"session_allowance" integer NOT NULL,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_email" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'trialing' NOT NULL,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "syllabus_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"upload_id" text NOT NULL,
	"school_subject" text NOT NULL,
	"school_topic" text NOT NULL,
	"school_date" text DEFAULT '' NOT NULL,
	"objective" text DEFAULT '' NOT NULL,
	"suggested_topic_id" text,
	"curriculum_topic_id" text,
	"mapping_confirmed" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "syllabus_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"week_start" date NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"uploaded_by_email" text NOT NULL,
	"reviewed_by_email" text,
	"review_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_progress_student_topic" UNIQUE("student_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "tutoring_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"tutor_email" text NOT NULL,
	"subject" text NOT NULL,
	"topic" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"meeting_url" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"attendance" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plan_items" ADD CONSTRAINT "learning_plan_items_plan_id_learning_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plan_items" ADD CONSTRAINT "learning_plan_items_topic_id_curriculum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."curriculum_topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_session_id_tutoring_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tutoring_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabus_topics" ADD CONSTRAINT "syllabus_topics_upload_id_syllabus_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."syllabus_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabus_topics" ADD CONSTRAINT "syllabus_topics_suggested_topic_id_curriculum_topics_id_fk" FOREIGN KEY ("suggested_topic_id") REFERENCES "public"."curriculum_topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabus_topics" ADD CONSTRAINT "syllabus_topics_curriculum_topic_id_curriculum_topics_id_fk" FOREIGN KEY ("curriculum_topic_id") REFERENCES "public"."curriculum_topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabus_uploads" ADD CONSTRAINT "syllabus_uploads_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_topic_id_curriculum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."curriculum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutoring_sessions" ADD CONSTRAINT "tutoring_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "app_users" ("id","email","name","role","status") VALUES
('u-maya','maya.tutor@example.com','Maya Ortiz','tutor','active'),
('u-lee','lee.tutor@example.com','Lee Carter','tutor','pending');
--> statement-breakpoint
INSERT INTO "students" ("id","first_name","last_name","grade_level","timezone","parent_email","tutor_email","student_email") VALUES
('s-ava','Ava','Johnson',3,'America/Chicago','parent.demo@example.com','maya.tutor@example.com',NULL),
('s-noah','Noah','Patel',6,'America/New_York','parent.demo@example.com','maya.tutor@example.com',NULL),
('s-lily','Lily','Chen',0,'America/Los_Angeles','parent.demo@example.com',NULL,NULL);
--> statement-breakpoint
INSERT INTO "curriculum_topics" ("id","program","grade_level","subject","unit","title","description","objectives","standards","prerequisite_ids","duration_minutes","difficulty","sort_order") VALUES
('t-m3-1','academic',3,'Mathematics','Fractions','Understanding fractions','Parts of a whole and unit fractions','Identify numerators and denominators','3.NF.A.1','[]',45,'Intro',1),
('t-m3-2','academic',3,'Mathematics','Fractions','Equivalent fractions','Find fractions that name the same amount','Generate equivalent fractions with visual models','3.NF.A.3','["t-m3-1"]',45,'Core',2),
('t-m3-3','academic',3,'Mathematics','Fractions','Adding fractions with like denominators','Add fractions that share a denominator','Add and subtract fractions with like denominators','3.NF.A.2','["t-m3-2"]',40,'Core',3),
('t-ela3-1','academic',3,'English Language Arts','Reading','Main idea and details','Identify the central idea of a passage','Determine main idea and supporting details','RL.3.2','[]',30,'Intro',4),
('t-ela3-2','academic',3,'English Language Arts','Writing','Opinion paragraphs','Write an opinion with reasons','Write opinion pieces with supporting reasons','W.3.1','["t-ela3-1"]',40,'Core',5),
('t-sci3-1','academic',3,'Science','Physical Science','Forces and motion','Push, pull, and how objects move','Describe forces that change motion','3-PS2-1','[]',35,'Intro',6),
('t-code3-1','coding',3,'Scratch','Sequences','Scratch: sequences and loops','Build programs with ordered blocks and repeats','Create sequences and repeat blocks','CSTA 1A-AP-08','[]',40,'Intro',7),
('t-code3-2','coding',3,'Scratch','Events','Scratch: events and variables','React to clicks and track a score','Use event blocks and variables','CSTA 1A-AP-13','["t-code3-1"]',45,'Core',8),
('t-m6-1','academic',6,'Mathematics','Ratios','Ratios and rates','Compare quantities using ratios','Understand ratio concepts and unit rates','6.RP.A.1','[]',50,'Core',1),
('t-py6-1','coding',6,'Python','Basics','Python: variables and print','Store values and display output','Write programs with variables and print','CSTA 2-AP-10','[]',45,'Intro',2),
('t-web6-1','coding',6,'Web Development','HTML','HTML: page structure','Build a simple page with headings and links','Create semantic HTML documents','CSTA 2-AP-11','[]',45,'Intro',3);
--> statement-breakpoint
INSERT INTO "topic_progress" ("id","student_id","topic_id","status") VALUES
('tp-1','s-ava','t-m3-1','completed'),
('tp-2','s-ava','t-m3-2','active'),
('tp-3','s-ava','t-ela3-1','completed'),
('tp-4','s-noah','t-m6-1','active');
--> statement-breakpoint
INSERT INTO "syllabus_uploads" ("id","student_id","week_start","file_name","file_type","status","uploaded_by_email") VALUES
('su-1','s-ava','2026-11-09','ava-week-nov9-schedule.pdf','pdf','pending_review','parent.demo@example.com');
--> statement-breakpoint
INSERT INTO "syllabus_topics" ("id","upload_id","school_subject","school_topic","school_date","objective","suggested_topic_id","curriculum_topic_id","mapping_confirmed","sort_order") VALUES
('st-1','su-1','Mathematics','Fractions: equivalent fractions','Mon 11/9','Find equivalent fractions with models','t-m3-2',NULL,false,1),
('st-2','su-1','English Language Arts','Reading: main idea','Wed 11/11','Identify the main idea','t-ela3-1',NULL,false,2),
('st-3','su-1','Science','Forces and motion','Fri 11/13','Describe pushes and pulls','t-sci3-1',NULL,false,3);
--> statement-breakpoint
INSERT INTO "learning_plans" ("id","student_id","week_start","status","tutor_notes","created_by_email","published_at") VALUES
('lp-1','s-ava','2026-11-09','published','Great start on fractions. Focus on visual models.','maya.tutor@example.com','2026-11-09T12:00:00Z');
--> statement-breakpoint
INSERT INTO "learning_plan_items" ("id","plan_id","topic_id","title","activity_type","estimated_minutes","completed","completed_at","sort_order") VALUES
('lpi-1','lp-1','t-m3-2','Equivalent fractions practice','Practice',30,true,'2026-11-10T14:00:00Z',1),
('lpi-2','lp-1','t-ela3-1','Main idea reading','Lesson',25,false,NULL,2),
('lpi-3','lp-1','t-sci3-1','Forces lab video','Video',20,false,NULL,3);
--> statement-breakpoint
INSERT INTO "ai_outputs" ("id","job_type","grade_level","subject","topic","criteria","title","body","review_status","requested_by_email","reviewed_by_email") VALUES
('ai-1','lesson',3,'Mathematics','Equivalent fractions','Visual models, two worked examples, three checks','Equivalent fractions with visual models','Warm-up: show two fraction strips of equal length. Ask which fractions cover the same amount. Work two examples with strips, then three checks.','approved','maya.tutor@example.com','maya.tutor@example.com'),
('ai-2','practice',3,'Mathematics','Equivalent fractions','Five practice questions for grade 3','Equivalent fractions practice set','1. Shade 2/4 of a bar, then name an equal fraction with denominator 2. 2. Is 3/6 equal to 1/2? 3. Write two fractions equal to 2/3. 4. Compare 1/2 and 2/4. 5. Explain your reasoning.','approved','maya.tutor@example.com','maya.tutor@example.com'),
('ai-3','coding',3,'Scratch','Loops','Repeat block exercise for a square','Scratch loop challenge','Build a sprite that draws a square using a repeat block. Extension: change the size with a variable.','draft','maya.tutor@example.com',NULL);
--> statement-breakpoint
INSERT INTO "assessments" ("id","title","subject","grade_level","time_limit_minutes","attempt_limit","passing_score","status","created_by_email") VALUES
('as-1','Fractions Check-in','Mathematics',3,15,2,70,'published','maya.tutor@example.com');
--> statement-breakpoint
INSERT INTO "assessment_questions" ("id","assessment_id","question_type","prompt","options","correct_answer","points","sort_order") VALUES
('aq-1','as-1','multiple_choice','Which fraction is equivalent to 1/2?','["2/4","2/3","1/3","3/4"]','"2/4"',1,1),
('aq-2','as-1','true_false','3/6 is equivalent to 1/2.',NULL,'true',1,2),
('aq-3','as-1','numeric','What is 1/4 + 1/4 as a decimal?',NULL,'0.5',1,3);
--> statement-breakpoint
INSERT INTO "assessment_attempts" ("id","assessment_id","student_id","attempt_number","status","answers","score","max_score","percent","passed","started_at","submitted_at") VALUES
('aa-1','as-1','s-ava',1,'graded','{"aq-1":"2/4","aq-2":false,"aq-3":0.5}',2,3,67,false,'2026-11-10T15:00:00Z','2026-11-10T15:09:00Z');
--> statement-breakpoint
INSERT INTO "tutoring_sessions" ("id","student_id","tutor_email","subject","topic","starts_at","ends_at","timezone","meeting_url","status","attendance") VALUES
('ts-1','s-ava','maya.tutor@example.com','Mathematics','Equivalent fractions','2026-11-12T15:00:00Z','2026-11-12T15:45:00Z','America/Chicago','https://zoom.us/j/5550001111','scheduled',NULL),
('ts-2','s-noah','maya.tutor@example.com','Mathematics','Ratios and rates','2026-11-10T16:00:00Z','2026-11-10T16:50:00Z','America/New_York','https://meet.google.com/abc-defg-hij','completed','present');
--> statement-breakpoint
INSERT INTO "session_notes" ("id","session_id","author_email","body","parent_visible") VALUES
('sn-1','ts-2','maya.tutor@example.com','Noah solved unit rate problems quickly. Practice rate tables next.',true),
('sn-2','ts-2','maya.tutor@example.com','Private: review ratio word problems before the next session.',false);
--> statement-breakpoint
INSERT INTO "points_ledger" ("id","student_id","points_delta","reason","idempotency_key") VALUES
('pl-1','s-ava',10,'Weekly plan started','plan-start:lp-1'),
('pl-2','s-ava',20,'Completed: Equivalent fractions practice','plan-item:lpi-1'),
('pl-3','s-ava',30,'Assessment completed: Fractions Check-in','attempt:aa-1');
--> statement-breakpoint
INSERT INTO "badges" ("id","name","description","points_required") VALUES
('b-first','First Steps','Earn your first 10 points',10),
('b-solver','Problem Solver','Reach 50 points',50),
('b-streak','Streak Star','Reach 100 points',100),
('b-scholar','Scholar','Reach 250 points',250);
--> statement-breakpoint
INSERT INTO "subscription_plans" ("id","name","description","price_cents","billing_interval","student_limit","session_allowance","trial_days","active") VALUES
('plan-starter','Starter','One child with weekly plans and two sessions a month',2900,'month',1,2,7,true),
('plan-family','Family','Up to three children with full tutoring access',4900,'month',3,8,14,true),
('plan-premium','Premium','Up to five children and priority scheduling',8900,'month',5,12,14,true);
--> statement-breakpoint
INSERT INTO "app_notifications" ("id","recipient_email","title","body","read") VALUES
('n-1','parent.demo@example.com','Weekly plan published','Ava plan for the week of Nov 9 is ready.',false),
('n-2','parent.demo@example.com','Session scheduled','Ava has a tutoring session on Nov 12.',false);
