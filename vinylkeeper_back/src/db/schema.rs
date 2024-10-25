// @generated automatically by Diesel CLI.

diesel::table! {
    albums (id) {
        id -> Int4,
        #[max_length = 255]
        title -> Varchar,
        artist_id -> Int4,
        genre_id -> Int4,
        collection_id -> Int4,
        release_year -> Nullable<Int4>,
        description -> Nullable<Text>,
        cover_condition -> Nullable<Text>,
        record_condition -> Nullable<Text>,
        mood -> Nullable<Text>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    artists (id) {
        id -> Int4,
        #[max_length = 255]
        name -> Varchar,
        #[max_length = 100]
        country -> Nullable<Varchar>,
        biography -> Nullable<Text>,
    }
}

diesel::table! {
    collections (id) {
        id -> Int4,
        #[max_length = 255]
        name -> Varchar,
        user_id -> Int4,
        registered_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    genres (id) {
        id -> Int4,
        #[max_length = 255]
        name -> Varchar,
    }
}

diesel::table! {
    loans (id) {
        id -> Int4,
        user_id -> Int4,
        album_id -> Int4,
        loan_date -> Nullable<Timestamptz>,
        return_date -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    ratings (id) {
        id -> Int4,
        rating -> Nullable<Int4>,
        #[max_length = 255]
        comment -> Nullable<Varchar>,
        user_id -> Int4,
        album_id -> Int4,
    }
}

diesel::table! {
    roles (id) {
        id -> Int4,
        name -> Text,
    }
}

diesel::table! {
    users (id) {
        id -> Int4,
        #[max_length = 255]
        username -> Varchar,
        #[max_length = 255]
        email -> Varchar,
        #[max_length = 255]
        password -> Varchar,
        is_accepted_terms -> Bool,
        is_active -> Nullable<Bool>,
        is_superuser -> Nullable<Bool>,
        last_login -> Nullable<Timestamptz>,
        registered_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
        #[max_length = 100]
        timezone -> Varchar,
        role_id -> Int4,
    }
}

diesel::table! {
    wishlists (id) {
        id -> Int4,
        user_id -> Int4,
        album_id -> Int4,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::joinable!(albums -> artists (artist_id));
diesel::joinable!(albums -> collections (collection_id));
diesel::joinable!(albums -> genres (genre_id));
diesel::joinable!(collections -> users (user_id));
diesel::joinable!(loans -> albums (album_id));
diesel::joinable!(loans -> users (user_id));
diesel::joinable!(ratings -> albums (album_id));
diesel::joinable!(ratings -> users (user_id));
diesel::joinable!(users -> roles (role_id));
diesel::joinable!(wishlists -> albums (album_id));
diesel::joinable!(wishlists -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(
    albums,
    artists,
    collections,
    genres,
    loans,
    ratings,
    roles,
    users,
    wishlists,
);
