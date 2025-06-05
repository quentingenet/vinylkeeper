package org.quentingenet.vinylkeeper_back.security.service;

import org.springframework.stereotype.Service;
import org.quentingenet.vinylkeeper_back.dto.AuthenticationRequest;
import org.quentingenet.vinylkeeper_back.dto.AuthenticationResponse;
import org.quentingenet.vinylkeeper_back.repository.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.quentingenet.vinylkeeper_back.model.User;
import org.quentingenet.vinylkeeper_back.service.UserService;

import java.util.UUID;

@Service
public class AuthenticationService {
    
    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserService userService;

    public AuthenticationService(
            UserRepository userRepository,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            UserService userService) {
        this.userRepository = userRepository;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userService = userService;
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getEmail(),
                request.getPassword()
            )
        );

        User user = (User) userService.loadUserByUsername(request.getEmail());
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return new AuthenticationResponse(accessToken, refreshToken, user.getUserUuid());
    }

    public String refreshToken(String refreshToken) {
        UUID userUuid = jwtService.extractUserUuid(refreshToken);
        UserDetails userDetails = userService.getUserByUuid(userUuid);

        if (jwtService.isTokenValid(refreshToken, userDetails)) {
            return jwtService.generateAccessToken(userDetails);
        }

        throw new IllegalArgumentException("Invalid refresh token");
    }

    public void sendPasswordResetEmail(String email) {
        // Implémentation à faire
        throw new UnsupportedOperationException("Not implemented yet");
    }

    public void resetPassword(String token, String newPassword) {
        // Implémentation à faire
        throw new UnsupportedOperationException("Not implemented yet");
    }
}
