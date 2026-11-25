CREATE TABLE "parent_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"consent_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parent_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "parent_student_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_user_id" text NOT NULL,
	"parent_email" text NOT NULL,
	"student_id" text NOT NULL,
	"relationship_type" text DEFAULT 'guardian' NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parent_student_unique" UNIQUE("parent_user_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text,
	"parent_email" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"provider_ref" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"user_id" text,
	"school_name" text DEFAULT '' NOT NULL,
	"state_code" text DEFAULT '' NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "student_streaks" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"current_streak_days" integer DEFAULT 0 NOT NULL,
	"longest_streak_days" integer DEFAULT 0 NOT NULL,
	"last_active_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_streaks_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "tutor_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"subjects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"grade_levels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_slug" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"assigned_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_role_unique" UNIQUE("user_id","role_slug")
);
--> statement-breakpoint
ALTER TABLE "parent_profiles" ADD CONSTRAINT "parent_profiles_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_student_relationships" ADD CONSTRAINT "parent_student_relationships_parent_user_id_app_users_id_fk" FOREIGN KEY ("parent_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_student_relationships" ADD CONSTRAINT "parent_student_relationships_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_streaks" ADD CONSTRAINT "student_streaks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_profiles" ADD CONSTRAINT "tutor_profiles_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_slug_roles_slug_fk" FOREIGN KEY ("role_slug") REFERENCES "public"."roles"("slug") ON DELETE cascade ON UPDATE no action;