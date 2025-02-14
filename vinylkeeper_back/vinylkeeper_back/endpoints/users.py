from fastapi import APIRouter, HTTPException, status, Response, Request, Depends
from sqlalchemy.orm import Session
from vinylkeeper_back.services.user_service import authenticate_user, register_user, AuthError
from vinylkeeper_back.utils.auth_utils.auth import TokenType, create_token, verify_token   
from vinylkeeper_back.schemas.user_schemas import AuthUser, CreateUser
from jose import JWTError
from vinylkeeper_back.core.config_env import Settings
from vinylkeeper_back.db.session import get_db

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
        return {"isLoggedIn": isLoggedIn}
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@router.post("/register")
async def create_user(response: Response, new_user: CreateUser, db: Session = Depends(get_db)):
    try:
        user_data = new_user.dict()
        user = register_user(db, user_data)
        user_uuid = str(user.user_uuid)
        access_token = create_token(user_uuid, TokenType.ACCESS)
        set_token_cookie(response, access_token, TokenType.ACCESS)
        return {"access_token": access_token}
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/check-auth")
async def check_auth(request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        token = request.cookies.get("access_token") or request.cookies.get("refresh_token")
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Access token is required")
        user_uuid = verify_token(token)
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

# TODO: Add a route to send a password reset email
# TODO: Add a route to reset a password
