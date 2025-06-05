package org.quentingenet.vinylkeeper_back.security.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.quentingenet.vinylkeeper_back.security.service.AuthenticationService;
import org.quentingenet.vinylkeeper_back.dto.AuthenticationRequest;
import org.quentingenet.vinylkeeper_back.dto.AuthenticationResponse;
import org.quentingenet.vinylkeeper_back.security.service.CookieService;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthenticationController {

    private final AuthenticationService authenticationService;
    private final CookieService cookieService;

    public AuthenticationController(
            AuthenticationService authenticationService,
            CookieService cookieService) {
        this.authenticationService = authenticationService;
        this.cookieService = cookieService;
    }

    @PostMapping("")
    public ResponseEntity<?> authenticate(
            @RequestBody AuthenticationRequest request,
            HttpServletResponse response
    ) {
        AuthenticationResponse authResponse = authenticationService.authenticate(request);
        
        cookieService.setAccessTokenCookie(authResponse.getAccessToken(), response);
        cookieService.setRefreshTokenCookie(authResponse.getRefreshToken(), response);

        return ResponseEntity.ok(Map.of("isLoggedIn", true));
    }

    @GetMapping("/check-auth")
    public ResponseEntity<?> checkAuth(HttpServletRequest request, HttpServletResponse response) {
        try {
            String accessToken = extractAccessTokenFromCookies(request);
            if (accessToken == null) {
                return ResponseEntity.ok(Map.of("isLoggedIn", false));
            }

            String newAccessToken = authenticationService.refreshToken(accessToken);
            cookieService.setAccessTokenCookie(newAccessToken, response);
            return ResponseEntity.ok(Map.of("isLoggedIn", true));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("isLoggedIn", false));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        cookieService.clearTokenCookies(response);
        return ResponseEntity.ok(Map.of(
            "message", "Logged out successfully",
            "isLoggedIn", false
        ));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        try {
            authenticationService.sendPasswordResetEmail(request.get("email"));
            return ResponseEntity.ok(Map.of("message", "Password reset email sent successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("detail", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        try {
            authenticationService.resetPassword(request.get("token"), request.get("new_password"));
            return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("detail", e.getMessage()));
        }
    }

    private String extractAccessTokenFromCookies(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals("access_token")) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private String extractRefreshTokenFromCookies(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals("refresh_token")) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}