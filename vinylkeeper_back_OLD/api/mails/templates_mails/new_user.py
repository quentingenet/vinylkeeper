def new_user_register_template(username: str, user_email: str) -> str:
    return f"""<!DOCTYPE html>
    <html>
    <body>
        <p>Hello Admin,</p>
        <p>A new user has registered:</p>
        <ul>
            <li><strong>Username:</strong> {username}</li>
            <li><strong>Email:</strong> {user_email}</li>
        </ul>
        <p>Best regards,<br>The Vinyl Keeper Team</p>
        <br/>
        <p>Not needed to answer to this email.</p>
    </body>
    </html>"""
