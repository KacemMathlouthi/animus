CREATE TABLE "provider_key" (
	"user_id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"key_encrypted" text NOT NULL,
	"key_last4" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"video_theme" text DEFAULT 'dark' NOT NULL,
	"background_music" boolean DEFAULT true NOT NULL,
	"music_track" text,
	"voice_id" text,
	"font" text DEFAULT 'geist' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_key" ADD CONSTRAINT "provider_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;