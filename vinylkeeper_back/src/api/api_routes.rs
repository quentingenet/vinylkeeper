use rocket::routes;

use crate::api::users::{
    authenticate, create_user, forgot_password, refresh_token, reset_password,
};

pub fn user_routes() -> Vec<rocket::Route> {
    routes![
        authenticate,
        create_user,
        refresh_token,
        forgot_password,
        reset_password
    ]
}
