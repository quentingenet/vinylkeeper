from html import escape

ISSUE_LABELS = {
    "name": "Name is wrong",
    "description": "Description is wrong or outdated",
    "address": "Address is wrong, or the spot has moved",
    "website": "Website link is dead or outdated",
    "type": "Spot type is wrong",
    "closed": "Permanently closed",
}


def place_report_template(
    place_name: str,
    place_city: str,
    place_country: str,
    issues: list[str],
    username: str,
    user_email: str,
    comment: str = None,
) -> str:
    place_name, place_city, place_country, username, user_email = (
        escape(str(value)) for value in (place_name, place_city, place_country, username, user_email)
    )
    issues_html = "".join(f"<li>{escape(ISSUE_LABELS.get(issue, issue))}</li>" for issue in issues)
    comment_html = f"<p><strong>Comment:</strong> {escape(comment)}</p>" if comment else ""

    return f"""<!DOCTYPE html>
    <html>
    <body>
        <p>Hello Admin,</p>
        <p>A member reported wrong information on an Atlas spot:</p>
        <ul>
            <li><strong>Spot name:</strong> {place_name}</li>
            <li><strong>Location:</strong> {place_city}, {place_country}</li>
            <li><strong>Reported by:</strong> {username} ({user_email})</li>
        </ul>
        <p><strong>What is wrong:</strong></p>
        <ul>{issues_html}</ul>
        {comment_html}
        <p>You can fix the spot from the Reports tab of the admin panel.</p>
        <p>Best regards,<br>The Vinyl Keeper Team</p>
        <br/>
        <p>Not needed to answer to this email.</p>
    </body>
    </html>"""
