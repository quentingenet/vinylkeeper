ALTER TABLE users
ADD CONSTRAINT unique_email UNIQUE (email),
ADD CONSTRAINT unique_username UNIQUE (username);

ALTER TABLE users
ADD CONSTRAINT unique_uuid_user UNIQUE (uuid_user);

ALTER TABLE genres
ADD CONSTRAINT unique_genre_name UNIQUE (name);

ALTER TABLE roles
ADD CONSTRAINT unique_role_name UNIQUE (name);

