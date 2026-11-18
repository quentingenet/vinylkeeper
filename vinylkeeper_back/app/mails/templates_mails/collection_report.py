from html import escape

REASON_LABELS = {
    "offensive": "Offensive or inappropriate content",
    "spam": "Spam or advertising",
    "other": "Something else",
}


def collection_report_template(
    collection_id: int,
    collection_name: str,
    owner_username: str,
    reason: str,
    username: str,
    user_email: str,
    comment: str = None,
) -> str:
    collection_name, owner_username, username, user_email = (
        escape(str(value)) for value in (collection_name, owner_username, username, user_email)
    )
    comment_html = f"<p><strong>Comment:</strong> {escape(comment)}</p>" if comment else ""

    return f"""<!DOCTYPE html>
    <html>
    <body>
        <p>Hello Admin,</p>
        <p>A member reported abuse in a public collection:</p>
        <ul>
            <li><strong>Collection:</strong> {collection_name} (#{int(collection_id)})</li>
            <li><strong>Owner:</strong> {owner_username}</li>
            <li><strong>Reason:</strong> {escape(REASON_LABELS.get(reason, reason))}</li>
            <li><strong>Reported by:</strong> {username} ({user_email})</li>
        </ul>
        {comment_html}
        <p>You can check the collection from the Reports tab of the admin panel.</p>
        <p>Best regards,<br>The Vinyl Keeper Team</p>
        <br/>
        <p>Not needed to answer to this email.</p>
    </body>
    </html>"""
