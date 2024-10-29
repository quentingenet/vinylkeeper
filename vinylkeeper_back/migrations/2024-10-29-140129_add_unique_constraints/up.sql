-- Your SQL goes here

ALTER TABLE albums
ADD CONSTRAINT unique_album_title_per_artist UNIQUE (title, artist_id);

ALTER TABLE artists
ADD CONSTRAINT unique_artist_name UNIQUE (name);