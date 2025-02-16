from fastapi import APIRouter, HTTPException, status, Response, Request, Depends
from sqlalchemy.orm import Session
from vinylkeeper_back.services.user_service import authenticate_user, register_user, AuthError, send_password_reset_email as send_password_reset_email_service, reset_password as reset_password_service
from vinylkeeper_back.utils.auth_utils.auth import TokenType, create_token, verify_token   
from vinylkeeper_back.schemas.user_schemas import AuthUser, CreateUser, EmailUpdatePassword, ResetPassword
from jose import JWTError
from vinylkeeper_back.core.config_env import Settings
from vinylkeeper_back.db.session import get_db
from vinylkeeper_back.core.logging import logger
from vinylkeeper_back.utils.auth_utils.auth import verify_token
from vinylkeeper_back.mails.client_mail import MailSubject, send_mail

router = APIRouter()

def set_token_cookie(response: Response, token: str, token_type: TokenType):
    max_age = (Settings().ACCESS_TOKEN_EXPIRE_MINUTES if token_type == TokenType.ACCESS 
               else Settings().REFRESH_TOKEN_EXPIRE_MINUTES) * 60
    
    response.set_cookie(
        key=f"{token_type.value}_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="None",
        max_age=max_age,
        path="/",
        domain=Settings().COOKIE_DOMAIN if Settings().APP_ENV != "development" else None
    )

@router.post("/auth")
async def authenticate(response: Response, auth_user: AuthUser, db: Session = Depends(get_db)):
    try:
        user = authenticate_user(db, auth_user.email, auth_user.password)
        user_uuid = str(user.user_uuid)
        if len(user_uuid) > 1:
            isLoggedIn = True
        else:
            isLoggedIn = False
        access_token = create_token(user_uuid, TokenType.ACCESS)
        set_token_cookie(response, access_token, TokenType.ACCESS)
        logger.info(f"User logged in: {user.username} - {user.email}")
        return {"isLoggedIn": isLoggedIn}
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@router.post("/register")
async def create_user(response: Response, new_user: CreateUser, db: Session = Depends(get_db)):
    try:
        if not new_user.email or not new_user.username or not new_user.password:
            raise AuthError("Missing required fields")
        else:
            user_data = new_user.dict()
            user = register_user(db, user_data)
            user_uuid = str(user.user_uuid)
            access_token = create_token(user_uuid, TokenType.ACCESS)
            set_token_cookie(response, access_token, TokenType.ACCESS)
            logger.info(f"New user registered: {user.username} - {user.email}")
            send_mail(to=Settings().EMAIL_ADMIN, subject=MailSubject.NewUserRegistered, username=user.username, user_email=user.email)
        return {"isLoggedIn": True}
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/check-auth")
async def check_auth(request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        if not (request.cookies.get("access_token") or request.cookies.get("refresh_token")):
            return {"isLoggedIn": False}
        else:
            user_uuid = verify_token(request)
            if len(user_uuid) > 1:
                isLoggedIn = True
                new_access_token = create_token(user_uuid, TokenType.ACCESS)
                set_token_cookie(response, new_access_token, TokenType.ACCESS)
                new_refresh_token = create_token(user_uuid, TokenType.REFRESH)
                set_token_cookie(response, new_refresh_token, TokenType.REFRESH)
            else:
                isLoggedIn = False
            return {"isLoggedIn": isLoggedIn}
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@router.post("/logout")
async def logout(response: Response):
    domain = None if Settings().APP_ENV == "development" else Settings().COOKIE_DOMAIN
    path = "/"
    samesite = "None"
    isLoggedIn = False
    
    response.set_cookie(
        key="access_token",
        value="",
        httponly=True,
        secure=True,
        samesite=samesite,
        max_age=0,
        path=path,
        domain=domain
    )
    response.set_cookie(
        key="refresh_token",
        value="",
        httponly=True,
        secure=True,
        samesite=samesite,
        max_age=0,
        path=path,
        domain=domain
    )

    return {"isLoggedIn": isLoggedIn}

@router.post("/forgot-password")
async def forgot_password(email: EmailUpdatePassword, db: Session = Depends(get_db)):
    try:
        send_password_reset_email_service(db, email.email)
        return {"message": "Password reset email sent successfully"}
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/reset-password")
async def reset_password(reset_password: ResetPassword, db: Session = Depends(get_db)):
    try:
        reset_password_service(db, reset_password.token, reset_password.new_password)
        return {"message": "Password reset successfully"}
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
