def contact_message_template(**kwargs) -> str:
    """Template for contact messages"""
    username = kwargs.get('username', 'Unknown')
    email = kwargs.get('email', 'Unknown')
    user_id = kwargs.get('user_id', 'Unknown')
    subject_line = kwargs.get('subject_line', 'No subject')
    message = kwargs.get('message', 'No message')
    sent_at = kwargs.get('sent_at', 'Unknown')
    
    return f"""
    <html>
    <body>
        <h2>Contact Message from VinylKeeper User</h2>
        
        <h3>User Information:</h3>
        <ul>
            <li><strong>Username:</strong> {username}</li>
            <li><strong>Email:</strong> {email}</li>
            <li><strong>User ID:</strong> {user_id}</li>
        </ul>
        
        <h3>Message Details:</h3>
        <ul>
            <li><strong>Subject:</strong> {subject_line}</li>
            <li><strong>Message:</strong></li>
        </ul>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #C9A726; margin: 10px 0;">
            {message.replace(chr(10), '<br>')}
        </div>
        
        <p><strong>Sent at:</strong> {sent_at}</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
            This message was sent from the VinylKeeper application contact form.
        </p>
    </body>
    </html>
    """
