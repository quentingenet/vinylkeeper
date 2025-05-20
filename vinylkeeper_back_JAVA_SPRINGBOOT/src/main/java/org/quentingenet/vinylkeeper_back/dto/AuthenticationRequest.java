package org.quentingenet.vinylkeeper_back.dto;

public class AuthenticationRequest {
    private String email;
    private String password;

    // Constructeurs, getters et setters
    public AuthenticationRequest() {}

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}