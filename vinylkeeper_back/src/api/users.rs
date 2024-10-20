use rocket::post;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct AuthUser {
    pub email: String,
    pub password: String,
}

#[post("/auth", format = "json", data = "<auth_user>")]
pub async fn authenticate(auth_user: Json<AuthUser>) -> Result<Json<String>, Status> {
    let user_service = UserService::new(&Pool<ConnectionManager && ConnectionManager<..>>);
    match user_service.authenticate(&auth_user.email, &auth_user.password) {
        Ok(token) => Ok(Json(token)),
        Err(err) => {
            eprintln!("Authentication error: {}", err);
            Err(Status::Unauthorized)
        }
    }
}
