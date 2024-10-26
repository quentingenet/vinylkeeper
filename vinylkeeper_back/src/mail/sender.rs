use crate::mail::client::smtp_client;
use lettre::{Message, SmtpTransport, Transport};
use std::env;

pub fn send_email(to: &str, subject: &str, body: &str) -> Result<(), Box<dyn std::error::Error>> {
    let from_address = env::var("SMTP_FROM_ADDRESS")
        .unwrap_or_else(|_| "the.vinyl.keeper.app@gmail.com".to_string());

    let email = Message::builder()
        .from(from_address.parse()?)
        .to(to.parse()?)
        .subject(subject)
        .body(body.to_string())?;

    smtp_client().send(&email).map_err(|e| {
        eprintln!("Failed to send email: {:?}", e);
        Box::new(e) as Box<dyn std::error::Error>
    })?;

    Ok(())
}
