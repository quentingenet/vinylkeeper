ALTER TABLE users
DROP CONSTRAINT unique_email,
DROP CONSTRAINT unique_username;

ALTER TABLE users
DROP CONSTRAINT unique_uuid_user;

ALTER TABLE genres
DROP CONSTRAINT unique_genre_name;

ALTER TABLE roles
DROP CONSTRAINT unique_role_name;

