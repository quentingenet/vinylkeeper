use serde::{Deserialize, Serialize};
use diesel::sql_types::Text;

#[derive(Debug, Serialize, Deserialize, AsExpression, FromSqlRow)]
#[sql_type = "Text"]
pub enum Role {
    Admin,
    User,
    SuperUser,
}

impl Role {
    pub fn as_str(&self) -> &str {
        match self {
            Role::Admin => "admin",
            Role::User => "user",
            Role::SuperUser => "superuser",
        }
    }
}
