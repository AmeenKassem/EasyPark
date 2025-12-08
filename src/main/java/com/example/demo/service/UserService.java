package com.example.demo.service;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.dto.UserSummary;
import com.example.demo.model.User;
import com.example.demo.model.Role;
import com.example.demo.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    private static final String TEMP_PASSWORD_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

    private final SecureRandom secureRandom = new SecureRandom();

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    @Transactional
    public User register(RegisterRequest request) {
        logger.info("Attempting to register user with email: {}", request.getEmail());

        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            logger.warn("Registration failed: email {} is already in use", request.getEmail());
            throw new IllegalArgumentException("Email already in use");
        });

        // Validate and map role
        Role role;
        try {
            role = Role.valueOf(request.getRole().toString());
        } catch (IllegalArgumentException ex) {
            logger.error("Registration failed: invalid role '{}'", request.getRole());
            throw new IllegalArgumentException("Invalid role: " + request.getRole());
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setRole(role);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        User saved = userRepository.save(user);
        logger.info("User registered successfully with id: {}", saved.getId());

        return saved;
    }

    @Transactional(readOnly = true)
    public User login(LoginRequest request) {
        logger.info("Login attempt for email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    logger.warn("Login failed: user with email {} not found", request.getEmail());
                    return new IllegalArgumentException("Invalid email or password");
                });

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            logger.warn("Login failed: invalid password for user {}", request.getEmail());
            throw new IllegalArgumentException("Invalid email or password");
        }

        logger.info("Login successful for user with email: {}", request.getEmail());
        return user;
    }

    @Transactional(readOnly = true)
    public List<UserSummary> getAllUsers() {
        logger.info("Fetching all users for dashboard display.");

        return userRepository.findAll()
                .stream()
                .map(user -> new UserSummary(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getRole().name()
                ))
                .toList();
    }

    // ============================
    // RESET PASSWORD (FORGOT)
    // ============================
    @Transactional
    public String resetPassword(String email) {
        logger.info("Password reset requested for email: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    logger.warn("Password reset failed: user with email {} not found", email);
                    return new IllegalArgumentException("User not found");
                });

        String tempPassword = "123456";
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        userRepository.save(user);

        logger.info("Password reset successfully for user with email: {}", email);
        return tempPassword; // this is what the controller sends back in JSON
    }


}
