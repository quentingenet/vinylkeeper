-- This file should undo anything in `up.sql`
alter table albums
drop constraint unique_album_title_per_artist;

alter table artists
drop constraint unique_artist_name;