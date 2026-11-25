ALTER TABLE "assessment_questions" ADD COLUMN "topic_id" text;--> statement-breakpoint
ALTER TABLE "tutoring_sessions" ADD COLUMN "session_prepared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tutoring_sessions" ADD COLUMN "tutor_ready" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tutoring_sessions" ADD COLUMN "tutor_joined" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tutoring_sessions" ADD COLUMN "student_joined" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tutoring_sessions" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tutoring_sessions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_topic_id_curriculum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."curriculum_topics"("id") ON DELETE set null ON UPDATE no action;