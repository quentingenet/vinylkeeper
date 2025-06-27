def new_place_suggestion_template(
    place_name: str, 
    place_city: str, 
    place_country: str, 
    place_type: str,
    username: str, 
    user_email: str,
    place_description: str = None
) -> str:
    description_html = f"<li><strong>Description:</strong> {place_description}</li>" if place_description else ""
    
    return f"""<!DOCTYPE html>
    <html>
    <body>
        <p>Hello Admin,</p>
        <p>A new place has been suggested and requires moderation:</p>
        <ul>
            <li><strong>Place Name:</strong> {place_name}</li>
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