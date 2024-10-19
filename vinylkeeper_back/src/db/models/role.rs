use diesel::sql_types::Text;
use serde::{Deserialize, Serialize};

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
