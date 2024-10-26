use crate::mail::client::smtp_client;
use crate::mail::subject::MailSubject;
use lettre::{message::header::ContentType, Message, Transport};
use std::env;

pub fn send_email(
    to: &str,
    subject: MailSubject,
    body: &str,
    is_html: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let from_address = env::var("SMTP_FROM_ADDRESS")
        .unwrap_or_else(|_| "the.vinyl.keeper.app@gmail.com".to_string());

    let mut email_builder = Message::builder()
        .from(from_address.parse().map_err(|e| {
            eprintln!("Failed to parse 'from' address: {:?}", e);
            e
        })?)
        .to(to.parse().map_err(|e| {
            eprintln!("Failed to parse 'to' address: {:?}", e);
            e
        })?)
        .subject(subject.as_str());

    if is_html {
        email_builder = email_builder.header(ContentType::TEXT_HTML);
    } else {
        email_builder = email_builder.header(ContentType::TEXT_PLAIN);
    }

    let email = email_builder.body(body.to_string())?;

    smtp_client().send(&email).map_err(|e| {
        eprintln!("Failed to send email: {:?}", e);
        Box::new(e) as Box<dyn std::error::Error>
    })?;

    println!("Email sent successfully to {}", to);
    Ok(())
}
