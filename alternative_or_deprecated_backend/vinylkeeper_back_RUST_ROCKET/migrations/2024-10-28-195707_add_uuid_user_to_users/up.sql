ALTER TABLE users ADD COLUMN uuid_user UUID DEFAULT gen_random_uuid() NOT NULL;
