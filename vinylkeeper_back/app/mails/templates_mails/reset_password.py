import os


def reset_password_template(token: str) -> str:
    frontend_url = os.getenv("FRONTEND_URL", "https://vinylkeeper.org" if os.getenv(
        "APP_ENV") == "production" else "http://localhost:5173")

    return f"""<!DOCTYPE html>
    <html>
    <body>
        <p>Hello,</p>
        <p>Please click on the following link to reset your password :</p>
        <p><a href="{frontend_url}/reset-password?token={token}">Reset your password on Vinyl Keeper</a></p>
        <p>If you did not request a password reset, please ignore this email. This link expires in 15 minutes.</p>
        <p>Best regards,<br>The Vinyl Keeper Team</p>
        <br/>
        <p>Not needed to answer to this email.</p>
    </body>
    </html>"""
