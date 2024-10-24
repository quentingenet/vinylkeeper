use diesel::{deserialize::FromSqlRow, expression::AsExpression, sql_types::Text};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, AsExpression, FromSqlRow)]
#[diesel(sql_type = Text)]
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

    pub fn from_id(role_id: i32) -> Role {
        match role_id {
            1 => Role::Admin,
            2 => Role::User,
            3 => Role::SuperUser,
            _ => Role::User,
        }
    }
}
