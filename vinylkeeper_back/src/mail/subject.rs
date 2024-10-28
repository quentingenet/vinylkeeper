pub enum MailSubject {
    PasswordReset,
    Welcome,
    AccountConfirmation,
    NewUserRegistered,
}

impl MailSubject {
    pub fn as_str(&self) -> &str {
        match self {
            MailSubject::PasswordReset => "Password reset",
            MailSubject::Welcome => "Welcome to Vinyl Keeper",
            MailSubject::AccountConfirmation => "Please confirm your account",
            MailSubject::NewUserRegistered => "New user registered",
        }
    }
}
