package org.quentingenet.vinylkeeper_back.security.service;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class CookieService {

    @Value("${jwt.access-token.expiration}")
    private int accessTokenExpiration;

    @Value("${jwt.refresh-token.expiration}")
    private int refreshTokenExpiration;

    public void setAccessTokenCookie(String token, HttpServletResponse response) {
        setCookie("access_token", token, accessTokenExpiration, response);
    }

    public void setRefreshTokenCookie(String token, HttpServletResponse response) {
        setCookie("refresh_token", token, refreshTokenExpiration, response);
    }

    private void setCookie(String name, String value, int maxAge, HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .sameSite("None")
                .maxAge(maxAge)
                .build();
        
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void clearTokenCookies(HttpServletResponse response) {
        clearCookie("access_token", response);
        clearCookie("refresh_token", response);
    }

    private void clearCookie(String name, HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .sameSite("None")
                .maxAge(0)
                .build();
        
        response.addHeader("Set-Cookie", cookie.toString());
    }
}