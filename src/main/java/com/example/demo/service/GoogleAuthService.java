package com.example.demo.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import java.util.Collections;

import com.example.demo.dto.GoogleLoginRequest;


@Service
public class GoogleAuthService {

    @Value("${google.client-id}")
    private String clientId;

    public GoogleLoginRequest verifyToken(String tokenString) {
        try {
            GoogleIdTokenVerifier verifier =
                    new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                            .setAudience(Collections.singletonList(clientId)) // Specify the CLIENT_ID of the app that accesses the backend.
                            .build();

            GoogleIdToken idToken = verifier.verify(tokenString);
            if (idToken == null) {
                throw new IllegalArgumentException("Invalid Google ID Token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();

            GoogleLoginRequest dto = new GoogleLoginRequest();
            dto.setEmail(payload.getEmail());
            dto.setFullName((String) payload.get("name"));
            dto.setGoogleUserId(payload.getSubject());

            return dto;

        } catch (Exception e) {
            throw new RuntimeException("Google token verification failed: " + e.getMessage(), e);
        }
    }
}