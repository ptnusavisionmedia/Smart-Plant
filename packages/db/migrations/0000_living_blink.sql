CREATE TABLE `auth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_refresh_token_hash_unique` ON `sessions` (`refresh_token_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`email_verified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `plant_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`owner_user_id` text,
	`thresholds` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `device_configs` (
	`device_id` text PRIMARY KEY NOT NULL,
	`thresholds` text NOT NULL,
	`target_moisture` real NOT NULL,
	`max_pump_seconds` integer NOT NULL,
	`cooldown_seconds` integer NOT NULL,
	`telemetry_interval_seconds` integer NOT NULL,
	`water_level_source` text NOT NULL,
	`tank_height_cm` real NOT NULL,
	`tank_max_level_cm` real NOT NULL,
	`config_version` integer DEFAULT 1 NOT NULL,
	`accepted_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`location` text,
	`device_uid` text NOT NULL,
	`claim_code_hash` text,
	`claim_code_expires_at` integer,
	`mqtt_secret_hash` text NOT NULL,
	`plant_profile_id` text,
	`firmware_version` text,
	`last_seen_at` integer,
	`is_online` integer DEFAULT false NOT NULL,
	`auto_mode` integer DEFAULT false NOT NULL,
	`emergency_latched` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`plant_profile_id`) REFERENCES `plant_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_device_uid_unique` ON `devices` (`device_uid`);--> statement-breakpoint
CREATE INDEX `idx_devices_user_id` ON `devices` (`user_id`);--> statement-breakpoint
CREATE TABLE `readings_daily` (
	`device_id` text NOT NULL,
	`day` text NOT NULL,
	`soil_avg` real,
	`soil_min` real,
	`soil_max` real,
	`temp_avg` real,
	`humidity_avg` real,
	`water_avg` real,
	PRIMARY KEY(`device_id`, `day`),
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sensor_readings` (
	`device_id` text NOT NULL,
	`time` integer NOT NULL,
	`soil_moisture` real,
	`temperature` real,
	`humidity` real,
	`water_level` real,
	`water_level_cm` real,
	`water_level_source` text DEFAULT 'ultrasonic' NOT NULL,
	`pump_on` integer DEFAULT false NOT NULL,
	`status` text NOT NULL,
	`raw` text,
	PRIMARY KEY(`device_id`, `time`),
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_readings_time` ON `sensor_readings` (`time`);--> statement-breakpoint
CREATE TABLE `status_events` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`status` text NOT NULL,
	`reasons` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_status_events_device_created` ON `status_events` (`device_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `watering_events` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`trigger` text NOT NULL,
	`command_id` text,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration_seconds` integer,
	`status` text NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_watering_events_device_started` ON `watering_events` (`device_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`in_app` integer DEFAULT true NOT NULL,
	`push` integer DEFAULT true NOT NULL,
	`telegram` integer DEFAULT false NOT NULL,
	`telegram_chat_id` text,
	`telegram_link_code_hash` text,
	`telegram_link_code_expires_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`reasons` text,
	`sent_channels` text,
	`delivery_attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_created` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_unread` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `push_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`fcm_token` text NOT NULL,
	`platform` text NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_tokens_fcm_token_unique` ON `push_tokens` (`fcm_token`);--> statement-breakpoint
CREATE INDEX `idx_push_tokens_user` ON `push_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`device_id` text,
	`action` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created` ON `audit_logs` (`created_at`);