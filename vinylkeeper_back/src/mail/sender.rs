use crate::mail::subject::MailSubject;
use crate::{mail::client::smtp_client, services::user_service::AuthError};
use lettre::{message::header::ContentType, Message, Transport};
use std::env;

pub async fn send_email(to: &str, subject: MailSubject, body: &str) -> Result<(), AuthError> {
    let from_address = env::var("SMTP_FROM_ADDRESS").map_err(|_| AuthError::MissingConfigError)?;

    let email = Message::builder()
        .from(
            from_address
                .parse()
                .map_err(|_| AuthError::EmailSendError)?,
        )
        .to(to.parse().map_err(|_| AuthError::EmailSendError)?)
        .subject(subject.as_str())
        .header(ContentType::TEXT_HTML)
        .body(body.to_string())
        .map_err(|_| AuthError::EmailSendError)?;

    smtp_client().send(&email).map_err(|e| {
        eprintln!("Failed to send email: {:?}", e);
        AuthError::EmailSendError
    })?;

    Ok(())
}
