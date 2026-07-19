ALTER TABLE "user_settings" ALTER COLUMN "music_track" SET DEFAULT 'ambient';--> statement-breakpoint
UPDATE "user_settings" SET "music_track" = 'ambient' WHERE "music_track" IS NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "music_track" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "voice_id" SET DEFAULT 'Xb7hH8MSUJpSbSDYk0k2';--> statement-breakpoint
UPDATE "user_settings" SET "voice_id" = 'Xb7hH8MSUJpSbSDYk0k2' WHERE "voice_id" IS NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "voice_id" SET NOT NULL;
