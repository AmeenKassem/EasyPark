package com.example.demo.service;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.model.Role;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional  // roll back DB after each test
class UserServiceTests {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    // for verifying password hashes
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @BeforeEach
    void cleanDatabase() {
        userRepository.deleteAll();
    }

    private RegisterRequest buildRegisterRequest(
            String fullName, String email, String phone, String password, Role role) {

        RegisterRequest req = new RegisterRequest();
        req.setFullName(fullName);
        req.setEmail(email);
        req.setPhone(phone);
        req.setPassword(password);
        req.setRole(role);
        return req;
    }

    @Test
    void register_createsUserWithHashedPasswordAndCorrectRole() {
        RegisterRequest request = buildRegisterRequest(
                "Test User",
                "test@example.com",
                "050-0000000",
                "Password1!",
                Role.BOTH
        );

        User user = userService.register(request);

        assertNotNull(user.getId(), "User ID should be generated");
        assertEquals("Test User", user.getFullName());
        assertEquals("test@example.com", user.getEmail());
        assertEquals(Role.BOTH, user.getRole());

        // password must be hashed
        assertNotEquals("Password1!", user.getPasswordHash());
        assertTrue(
                encoder.matches("Password1!", user.getPasswordHash()),
                "Stored password hash should match the original password"
        );
    }

    @Test
    void register_withDuplicateEmail_throwsIllegalArgumentException() {
        RegisterRequest request = buildRegisterRequest(
                "User 1",
                "duplicate@example.com",
                "050-1111111",
                "Password1!",
                Role.BOTH
        );
        userService.register(request);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> userService.register(request),
                "Expected second registration with same email to fail"
        );

        assertTrue(
                ex.getMessage().contains("Email already in use"),
                "Error message should mention email already in use"
        );
    }

    @Test
    void login_withCorrectCredentials_returnsUser() {
        RegisterRequest request = buildRegisterRequest(
                "Login User",
                "login@example.com",
                "050-2222222",
                "Password1!",
                Role.BOTH
        );
        userService.register(request);

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("login@example.com");
        loginRequest.setPassword("Password1!");

        User loggedIn = userService.login(loginRequest);

        assertNotNull(loggedIn);
        assertEquals("login@example.com", loggedIn.getEmail());
    }

    @Test
    void login_withWrongPassword_throwsIllegalArgumentException() {
        RegisterRequest request = buildRegisterRequest(
                "Login User",
                "wrongpass@example.com",
                "050-3333333",
                "Password1!",
                Role.BOTH
        );
        userService.register(request);

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("wrongpass@example.com");
        loginRequest.setPassword("WrongPassword!");

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> userService.login(loginRequest)
        );

        assertEquals("Invalid email or password", ex.getMessage());
    }

    @Test
    void resetPassword_changesPasswordHash_andReturnsTempPassword() {
        RegisterRequest request = buildRegisterRequest(
                "Reset User",
                "reset@example.com",
                "050-4444444",
                "Original1!",
                Role.BOTH
        );
        User user = userService.register(request);
        String oldHash = user.getPasswordHash();

        String tempPassword = userService.resetPassword("reset@example.com");

        assertNotNull(tempPassword);
        assertFalse(tempPassword.isBlank());

        User updated = userRepository.findByEmail("reset@example.com")
                .orElseThrow();

        assertNotEquals(oldHash, updated.getPasswordHash());
        assertTrue(
                encoder.matches(tempPassword, updated.getPasswordHash()),
                "New hash should match returned temp password"
        );
    }

    @Test
    void resetPassword_forNonExistingEmail_throwsIllegalArgumentException() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> userService.resetPassword("no-such-user@example.com")
        );

        assertEquals("User not found", ex.getMessage());
    }
}
