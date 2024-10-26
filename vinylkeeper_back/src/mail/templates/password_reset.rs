pub fn password_reset_template(token: &str) -> String {
    format!(
        "Click on this link to reset your password: https://VINYLKEEPER.com/reset-password?token={}",
        token
    )
}
