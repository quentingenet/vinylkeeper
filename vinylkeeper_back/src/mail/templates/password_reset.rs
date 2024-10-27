pub fn password_reset_template(token: &str) -> String {
    let frontend_url = match std::env::var("APP_ENV").as_deref() {
        Ok("production") => std::env::var("FRONTEND_URL")
            .unwrap_or_else(|_| "https://vinyl-keeper.quentingenet.fr".to_string()),
        _ => "http://127.0.0.1:5173".to_string(),
    };

    format!(
        r#"<!DOCTYPE html>
        <html>
        <body>
            <p>Hello,</p>
            <p>Please click on the following link to reset your password:</p>
            <p><a href="{}/reset-password?token={}">Reset your password</a></p>
            <p>If you did not request a password reset, please ignore this email. This link expires in 15 minutes.</p>
            <p>Best regards,<br>The Vinyl Keeper Team</p>
        </body>
        </html>"#,
        frontend_url, token
    )
}
