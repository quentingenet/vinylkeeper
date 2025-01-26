use rocket::routes;

use crate::api::{
    collections::{
        create_collection, delete_collection, get_collections, switch_area_collection,
        update_collection,
    },
    request_proxy::search,
    users::{authenticate, create_user, forgot_password, logout, refresh_token, reset_password},
};

pub fn user_routes() -> Vec<rocket::Route> {
    routes![
        authenticate,
        create_user,
        refresh_token,
        forgot_password,
        logout,
        reset_password
    ]
}

pub fn collection_routes() -> Vec<rocket::Route> {
    routes![
        create_collection,
        get_collections,
        switch_area_collection,
        update_collection,
        delete_collection
    ]
}

pub fn request_proxy_routes() -> Vec<rocket::Route> {
    routes![search]
}
