package com.example.demo.controller;

import com.example.demo.dto.AuthResponse;
import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.dto.ResetPasswordRequest;
import com.example.demo.dto.UserSummary;
import com.example.demo.model.User;
import com.example.demo.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*") // later restrict to your actual frontend origin
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    // ============================
    // REGISTER
    // ============================
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.register(request);
        return ResponseEntity.ok(new AuthResponse("Registration successful"));
    }

    // ============================
    // LOGIN
    // ============================
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        userService.login(request);
        return ResponseEntity.ok(new AuthResponse("Login successful"));
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
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        String tempPassword = userService.resetPassword(request.getEmail());

        // frontend expects: { "tempPassword": "123456" }
        return ResponseEntity.ok(Map.of("tempPassword", tempPassword));
    }
}
