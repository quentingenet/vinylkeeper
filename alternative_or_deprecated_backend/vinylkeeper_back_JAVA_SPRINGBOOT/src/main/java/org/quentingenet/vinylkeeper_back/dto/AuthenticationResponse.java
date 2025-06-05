package org.quentingenet.vinylkeeper_back.dto;

import java.util.UUID;

public class AuthenticationResponse {
    private String accessToken;
    private String refreshToken;
    private UUID userUuid;

    public AuthenticationResponse(String accessToken, String refreshToken, UUID userUuid) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.userUuid = userUuid;
    }

    // Getters
    public String getAccessToken() {
        return accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public UUID getUserUuid() {
        return userUuid;
    }
}