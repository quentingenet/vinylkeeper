from html import escape


def new_atlas_spot_template(
    place_name: str,
    place_city: str,
    place_country: str,
    place_type: str,
    username: str,
    user_email: str,
    place_description: str = None
) -> str:
    place_name, place_city, place_country, place_type, username, user_email = (
        escape(str(value)) for value in (place_name, place_city, place_country, place_type, username, user_email)
    )
    description_html = (
        f"<li><strong>Description:</strong> {escape(place_description)}</li>" if place_description else ""
    )

    return f"""<!DOCTYPE html>
    <html>
    <body>
        <p>Hello Admin,</p>
        <p>A new spot has been suggested for the Atlas and requires moderation:</p>
        <ul>
            <li><strong>Spot name:</strong> {place_name}</li>
            <li><strong>Location:</strong> {place_city}, {place_country}</li>
            <li><strong>Type:</strong> {place_type}</li>
            {description_html}
            <li><strong>Submitted by:</strong> {username} ({user_email})</li>
        </ul>
        <p>Please review and approve or reject this suggestion in the admin panel.</p>
        <p>Best regards,<br>The Vinyl Keeper Team</p>
        <br/>
        <p>Not needed to answer to this email.</p>
    </body>
    </html>"""
