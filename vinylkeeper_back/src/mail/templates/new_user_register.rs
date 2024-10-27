pub fn new_user_register_template(username: &str, user_email: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
        <html>
        <body>
            <p>Hello Admin,</p>
            <p>A new user has registered:</p>
            <ul>
                <li><strong>Username:</strong> {}</li>
                <li><strong>Email:</strong> {}</li>
            </ul>
            <p>Best regards,<br>The Vinyl Keeper Team</p>
        </body>
        </html>"#,
        username, user_email
    )
}
