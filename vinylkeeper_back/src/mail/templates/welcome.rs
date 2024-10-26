pub fn welcome_template(username: &str) -> String {
    format!(
        "Welcome to our app, {}! We’re excited to have you with us.",
        username
    )
}
