package com.example.demo.controller;

import com.example.demo.dto.AuthResponse;
import com.example.demo.dto.ForgotPasswordRequest;
import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.dto.ResetPasswordRequest;
import com.example.demo.dto.UserSummary;
import com.example.demo.model.User;
import com.example.demo.service.UserService;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import com.example.demo.security.JwtService;
import com.example.demo.dto.GoogleLoginRequest;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*") // later restrict to your actual frontend origin
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;


    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    // ============================
    // REGISTER
    // ============================
    // @PostMapping("/register")
    // public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
    //     User user = userService.register(request);
    //     return ResponseEntity.ok(new AuthResponse("Registration successful"));
    // }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        // 1. Create the user
        User user = userService.register(request);

        // 2. Generate JWT
        String token = jwtService.generateToken(user);

        // 3. Build UserSummary
        UserSummary summary = new UserSummary(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name()
        );

        // 4. Return AuthResponse with token + user
        AuthResponse response = new AuthResponse(
                "Registration successful",
                token,
                summary
        );

        return ResponseEntity.ok(response);
    }

    // ============================
    // LOGIN
    // ============================

    // @PostMapping("/login")
    // public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
    //     userService.login(request);
    //     return ResponseEntity.ok(new AuthResponse("Login successful"));
    // }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        // 1. Authenticate user
        User user = userService.login(request);

        // 2. Generate JWT
        String token = jwtService.generateToken(user);

        // 3. Build UserSummary
        UserSummary summary = new UserSummary(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name()
        );

        // 4. Build AuthResponse
        AuthResponse response = new AuthResponse(
                "Login successful",
                token,
                summary
        );

        return ResponseEntity.ok(response);
    }

    // ============================
    // LIST ALL USERS
    // ============================
    @GetMapping("/users")
    public ResponseEntity<List<UserSummary>> getUsers() {
        List<UserSummary> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    // ============================
    // FORGOT / RESET PASSWORD
    // ============================
    // @PostMapping("/reset-password")
    // public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
    //     String tempPassword = userService.resetPassword(request.getEmail());

    //     // frontend expects: { "tempPassword": "123456" }
    //     return ResponseEntity.ok(Map.of("tempPassword", tempPassword));
    // }

    @PostMapping("/forgot-password")
    public ResponseEntity<AuthResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            // This will create a reset token, store it in the database
            // and send an email with the reset link.
            userService.createPasswordResetToken(request.getEmail());
        } catch (IllegalArgumentException ex) {
            // Do not reveal whether the email exists or not in the system.
            // We always return the same generic message.
        }

        AuthResponse response = new AuthResponse(
                "If this email exists in our system, a reset link has been sent."
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<AuthResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        // This will validate the token and update the user's password.
        userService.resetPasswordWithToken(request.getToken(), request.getNewPassword());

        AuthResponse response = new AuthResponse(
                "Password has been reset successfully"
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/google-login")
    public ResponseEntity<AuthResponse> googleLogin(@RequestBody GoogleLoginRequest request) {
        try {
            // Delegate the actual Google login / registration logic to the service
            User user = userService.loginWithGoogle(request);

            String token = jwtService.generateToken(user);

            UserSummary summary = new UserSummary(
                    user.getId(),
                    user.getFullName(),
                    user.getEmail(),
                    user.getPhone(),
                    user.getRole().name()
            );

            AuthResponse response = new AuthResponse(
                    "Login successful",
                    token,
                    summary
            );
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException ex) {
            // For example: invalid state, email mismatch, etc.
            return ResponseEntity.badRequest().body(new AuthResponse(ex.getMessage()));
        } catch (Exception ex) {
            // Generic fallback
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new AuthResponse("Google login failed: " + ex.getMessage()));
        }
    }
}
