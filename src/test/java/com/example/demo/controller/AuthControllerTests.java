package com.example.demo.controller;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.dto.ResetPasswordRequest;
import com.example.demo.model.Role;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.JwtService;
import com.example.demo.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtService jwtService;

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
    void registerEndpoint_withValidData_returns200AndPersistsUser() throws Exception {
        RegisterRequest request = buildRegisterRequest(
                "API User",
                "api@example.com",
                "050-5555555",
                "Password1!",
                Role.DRIVER
        );

        mockMvc.perform(
                        post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Registration successful"));

        assertThat(userRepository.existsByEmail("api@example.com")).isTrue();
    }

    @Test
    void registerEndpoint_withInvalidEmail_returns400() throws Exception {
        // invalid email + empty fields → triggers validation
        String json = """
                {
                  "fullName": "",
                  "email": "not-an-email",
                  "phone": "",
                  "password": "",
                  "role": "DRIVER"
                }
                """;

        mockMvc.perform(
                        post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json)
                )
                .andExpect(status().isBadRequest())
                // GlobalExceptionHandler returns a map field -> error message
                .andExpect(jsonPath("$.email").exists());
    }

    @Test
    void loginEndpoint_withCorrectCredentials_returns200() throws Exception {
        RegisterRequest reg = buildRegisterRequest(
                "Login API User",
                "loginapi@example.com",
                "050-6666666",
                "Password1!",
                Role.BOTH
        );
        userService.register(reg);

        LoginRequest login = new LoginRequest();
        login.setEmail("loginapi@example.com");
        login.setPassword("Password1!");

        mockMvc.perform(
                        post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(login))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Login successful"));
    }

    @Test
    void loginEndpoint_withWrongPassword_returns400() throws Exception {
        RegisterRequest reg = buildRegisterRequest(
                "Login API User",
                "wrongpassapi@example.com",
                "050-7777777",
                "Password1!",
                Role.DRIVER
        );
        userService.register(reg);

        LoginRequest login = new LoginRequest();
        login.setEmail("wrongpassapi@example.com");
        login.setPassword("WrongPassword!");

        mockMvc.perform(
                        post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(login))
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid email or password"));
    }
    @Test
    void forgotPassword_alwaysReturnsOk() throws Exception {
        userService.register(buildRegisterRequest(
                "User",
                "user@example.com",
                "050-1234567",
                "Password1!",
                Role.DRIVER
        ));

        mockMvc.perform(
                        post("/api/auth/forgot-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                        { "email": "user@example.com" }
                    """)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }
    @Test
    void resetPassword_withInvalidToken_fails() throws Exception {
        mockMvc.perform(
                        post("/api/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                        {
                          "token": "invalid-token",
                          "newPassword": "NewPassword123"
                        }
                    """)
                )
                .andExpect(status().isBadRequest());
    }


    @Test
    void getUsersEndpoint_withValidToken_returnsRegisteredUsers() throws Exception {
        // Arrange: create two users in the system
        var userA = userService.register(buildRegisterRequest(
                "User A", "userA@example.com", "050-9999999", "Password1!", Role.DRIVER));

        userService.register(buildRegisterRequest(
                "User B", "userB@example.com", "050-1010101", "Password1!", Role.OWNER));

        // Generate a valid JWT token for userA
        String token = jwtService.generateToken(userA);

        // Act + Assert: call /api/auth/users with Authorization header
        mockMvc.perform(
                        get("/api/auth/users")
                                .header("Authorization", "Bearer " + token)
                                .accept(MediaType.APPLICATION_JSON)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").exists())
                .andExpect(jsonPath("$[1].email").exists());
    }
}
