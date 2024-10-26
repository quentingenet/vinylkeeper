pub fn password_reset_template(token: &str) -> String {
    format!(
        "Hello,\n\nPlease click on the following link to reset your password:\n\
         http://127.0.0.1:5173/reset-password?token={}\n\n\
         If you did not request a password reset, please ignore this email.\nLink expires in 15 minutes.\n\n\
         Best regards,\n\
         The Vinyl Keeper Team",
        token
    )
}
