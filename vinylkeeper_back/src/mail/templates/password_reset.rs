pub fn password_reset_template(token: &str) -> String {
    let frontend_url = match std::env::var("APP_ENV").as_deref() {
        Ok("production") => std::env::var("FRONTEND_URL")
            .unwrap_or_else(|_| "https://vinylkeeper.org".to_string()),
        _ => "http://localhost:5173".to_string(),
    };

    format!(
        r#"<!DOCTYPE html>
        <html>
        <body>
            <p>Hello,</p>
            <p>Please click on the following link to reset your password :</p>
            <p><a href="{}/reset-password?token={}">Reset your password on Vinyl Keeper</a></p>
            <p>If you did not request a password reset, please ignore this email. This link expires in 15 minutes.</p>
            <p>Best regards,<br>The Vinyl Keeper Team</p>
            <br/>
            <p>Not needed to answer to this email.</p>
        </body>
        </html>"#,
        frontend_url, token
    )
}
