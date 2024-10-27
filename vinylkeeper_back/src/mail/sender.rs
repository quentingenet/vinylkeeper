use crate::mail::client::smtp_client;
use crate::mail::subject::MailSubject;
use lettre::{message::header::ContentType, Message, Transport};
use std::env;

pub fn send_email(
    to: &str,
    subject: MailSubject,
    body: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let from_address =
        env::var("SMTP_FROM_ADDRESS").unwrap_or_else(|_| "vinylkeeper@quentingenet.fr".to_string());

    println!("Preparing email to be sent from {} to {}", from_address, to);

    let email_builder = Message::builder()
        .from(from_address.parse()?)
        .to(to.parse()?)
        .subject(subject.as_str())
        .header(ContentType::TEXT_HTML)
        .body(body.to_string())?;

    println!("Sending email...");

    smtp_client().send(&email_builder).map_err(|e| {
        eprintln!("Failed to send email: {:?}", e);
        Box::new(e) as Box<dyn std::error::Error>
    })?;

    println!("Email sent successfully to {}", to);
    Ok(())
}
