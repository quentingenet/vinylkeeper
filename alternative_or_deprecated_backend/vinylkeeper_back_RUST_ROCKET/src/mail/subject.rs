pub enum MailSubject {
    PasswordReset,
    NewUserRegistered,
}

impl MailSubject {
    pub fn as_str(&self) -> &str {
        match self {
            MailSubject::PasswordReset => "Password reset",
            MailSubject::NewUserRegistered => "New user registered",
        }
    }
}
