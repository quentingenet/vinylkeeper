use lettre::transport::smtp::authentication::Credentials;
use lettre::transport::smtp::client::Tls;
use lettre::{SmtpTransport, Transport};
use std::env;

pub fn smtp_client() -> SmtpTransport {
    let smtp_server = env::var("SMTP_SERVER").expect("SMTP_SERVER must be set");
    let smtp_username = env::var("SMTP_USERNAME").expect("SMTP_USERNAME must be set");
    let smtp_password = env::var("SMTP_PASSWORD").expect("SMTP_PASSWORD must be set");
    let smtp_port = env::var("SMTP_PORT")
        .unwrap_or_else(|_| "587".to_string())
        .parse::<u16>()
        .expect("SMTP_PORT must be a valid port number");

    let creds = Credentials::new(smtp_username, smtp_password);

    SmtpTransport::builder_dangerous(smtp_server)
        .port(smtp_port)
        .credentials(creds)
        .tls(Tls::Opportunistic)
        .build()
}
