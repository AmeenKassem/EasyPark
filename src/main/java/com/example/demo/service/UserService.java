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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.model.PasswordResetToken;
import com.example.demo.repository.PasswordResetTokenRepository;

import java.time.LocalDateTime;
import java.util.UUID;

import java.security.SecureRandom;
import java.util.List;

import com.example.demo.dto.GoogleLoginRequest;
import com.example.demo.model.AuthProvider;
import com.example.demo.service.GoogleAuthService;

import com.example.demo.model.PasswordResetToken;
import com.example.demo.repository.PasswordResetTokenRepository;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    private static final String TEMP_PASSWORD_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

    private final SecureRandom secureRandom = new SecureRandom();

    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final GoogleAuthService googleAuthService;

    private final EmailService emailService;

    @Value("${app.frontend.reset-password-url}")
    private String resetPasswordUrl;

    @Value("${app.security.reset-token-expiration-minutes:30}")
    private long resetTokenExpirationMinutes;

    public UserService(UserRepository userRepository,
                       BCryptPasswordEncoder passwordEncoder,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       GoogleAuthService googleAuthService, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.googleAuthService = googleAuthService;
        this.emailService = emailService;
    }

    // public UserService(UserRepository userRepository) {
    //     this.userRepository = userRepository;
    //     this.passwordEncoder = new BCryptPasswordEncoder();
    // }

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
    
    // not needed anymore ! we use tokens now
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

    /**
     * Creates a password reset token for the given email and sends a reset link via email.
     *
     * This method is called from the /forgot-password endpoint.
     */
    @Transactional
    public void createPasswordResetToken(String email) {
        // Find the user by email
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User with given email does not exist"));

        // Generate a random token and expiration time
        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(resetTokenExpirationMinutes);

        // Build and persist the PasswordResetToken entity
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setToken(token);
        resetToken.setExpiresAt(expiresAt);
        resetToken.setUsed(false);

        passwordResetTokenRepository.save(resetToken);

        // Build the reset link that will be sent to the user
        String encodedToken = URLEncoder.encode(token, StandardCharsets.UTF_8);
        String resetLink = resetPasswordUrl + "?token=" + encodedToken;


        // Temporary log for development to see the reset link
        logger.info("Generated password reset link for {}: {}", user.getEmail(), resetLink);

        // Send email via SMTP
        emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
    }

    /**
     * Resets the user's password using a previously generated reset token.
     *
     * This method is called from the /reset-password endpoint.
     */
    @Transactional
    public void resetPasswordWithToken(String token, String newPassword) {
        // Find the reset token in the database
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or unknown reset token"));

        // Check if the token was already used
        if (resetToken.isUsed()) {
            throw new IllegalArgumentException("Reset token has already been used");
        }

        // Check token expiration
        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Reset token has expired");
        }

        // Get the associated user
        User user = resetToken.getUser();

        // Encode and update the new password
        String encoded = passwordEncoder.encode(newPassword);
        user.setPasswordHash(encoded);
        userRepository.save(user);

        // Mark the token as used so it cannot be reused
        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
    }

    /**
     * Handles login / registration via Google OAuth.
     *
     * Flow:
     *  - If a user with this email exists:
     *      - If providerUserId is null -> upgrade existing LOCAL account to also support GOOGLE
     *      - If providerUserId matches -> allow login
     *      - If providerUserId is different -> reject (suspicious state)
     *  - If user does not exist:
     *      - Create a new user with GOOGLE as auth provider
     *      - Generate a random internal password (so the field is not null)
     */
    @Transactional
    public User loginWithGoogle(GoogleLoginRequest request) {
        logger.info("Google login attempt for email: {}", request.getEmail());
        
        // get the ID token from the request
        String idToken = request.getGoogleIdToken();
        if (idToken == null || idToken.isBlank()) {
            throw new IllegalArgumentException("Missing Google ID token");
        }

        // verify the token and extract user info
        GoogleLoginRequest verifiedData = googleAuthService.verifyToken(idToken);

        String email = verifiedData.getEmail();
        String googleSub = verifiedData.getGoogleUserId();

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Google did not provide a valid email");
        }
        if (googleSub == null || googleSub.isBlank()) {
            throw new IllegalArgumentException("Google did not provide a valid user id (sub)");
        }

        // populate the request DTO with verified data
        request.setEmail(email);
        request.setFullName(verifiedData.getFullName());
        request.setGoogleUserId(googleSub);

        return userRepository.findByEmail(request.getEmail())
                .map(existingUser -> handleExistingGoogleUser(existingUser, request))
                .orElseGet(() -> registerGoogleUserViaGoogle(request));
    }

    /**
     * Handles the case where a user with the given email already exists.
     * We either:
     *  - upgrade the existing account to support GOOGLE
     *  - or simply allow login if the Google ID matches
     *  - or reject if there is a mismatch
     */
    private User handleExistingGoogleUser(User user, GoogleLoginRequest request) {
        String incomingGoogleId = request.getGoogleUserId();

        // First-time upgrade: user has no providerUserId yet
        if (user.getProviderUserId() == null) {
            logger.info("Upgrading existing user {} to GOOGLE auth provider", user.getEmail());
            user.setAuthProvider(AuthProvider.GOOGLE);
            user.setProviderUserId(incomingGoogleId);
            // We DO NOT remove the existing passwordHash, so normal login still works
            return userRepository.save(user);
        }

        // Existing Google-linked user, check that IDs match
        if (user.getProviderUserId().equals(incomingGoogleId)) {
            logger.info("Google login successful for existing user {}", user.getEmail());
            return user;
        }

        // Mismatch: same email but different Google IDs -> reject
        logger.warn(
                "Google login failed for email {}: stored providerUserId does not match incoming Google ID",
                user.getEmail()
        );
        throw new IllegalArgumentException("Google account does not match this email");
    }

    /**
     * Registers a completely new user that signs in via Google for the first time.
     * We still generate an internal random password so the column is not null.
     */
    private User registerGoogleUserViaGoogle(GoogleLoginRequest request) {
        logger.info("Registering new user via Google with email: {}", request.getEmail());

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        // If Google does not provide phone, you can set it to an empty string or keep a default
        user.setPhone(""); // TODO: adjust if you later collect phone for Google users
        // TODO: choose the most appropriate default role for Google signups
        user.setRole(Role.DRIVER);

        user.setAuthProvider(AuthProvider.GOOGLE);
        user.setProviderUserId(request.getGoogleUserId());

        // Generate internal random password (user does not know it, but DB column cannot be null)
        String tempPassword = generateRandomPassword(12);
        user.setPasswordHash(passwordEncoder.encode(tempPassword));

        User saved = userRepository.save(user);
        logger.info("New Google user registered with id: {}", saved.getId());
        return saved;
    }

    /**
     * Generates a random temporary password for accounts created via Google OAuth.
     */
    private String generateRandomPassword(int length) {
        StringBuilder sb = new StringBuilder(length);
        int charsLen = TEMP_PASSWORD_CHARS.length();
        for (int i = 0; i < length; i++) {
            int idx = secureRandom.nextInt(charsLen);
            sb.append(TEMP_PASSWORD_CHARS.charAt(idx));
        }
        return sb.toString();
    }
}
