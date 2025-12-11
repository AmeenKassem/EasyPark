package com.example.demo.controller;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.dto.ResetPasswordRequest;
import com.example.demo.model.Role;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.validation.Valid;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.demo.dto.ForgotPasswordRequest;
import com.example.demo.dto.ResetPasswordRequest;

import java.util.Map;

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
    void resetPasswordEndpoint_forExistingUser_returnsTempPassword() throws Exception {
        RegisterRequest reg = buildRegisterRequest(
                "Reset API User",
                "resetapi@example.com",
                "050-8888888",
                "Original1!",
                Role.OWNER
        );
        userService.register(reg);

        ResetPasswordRequest request = new ResetPasswordRequest("resetapi@example.com");

        mockMvc.perform(
                        post("/api/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tempPassword").exists());
    }

    @Test
    void resetPasswordEndpoint_forNonExistingUser_returns400() throws Exception {
        ResetPasswordRequest request = new ResetPasswordRequest("no-such-api@example.com");

        mockMvc.perform(
                        post("/api/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request))
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("User not found"));
    }

    // here 
//    @Test
//    void getUsersEndpoint_returnsRegisteredUsers() throws Exception {
//        userService.register(buildRegisterRequest(
//                "User A", "userA@example.com", "050-9999999", "Password1!", Role.DRIVER));
//        userService.register(buildRegisterRequest(
//                "User B", "userB@example.com", "050-1010101", "Password1!", Role.OWNER));
//
//        mockMvc.perform(
//                        get("/api/auth/users")
//                                .accept(MediaType.APPLICATION_JSON)
//                )
//                .andExpect(status().isOk())
//                .andExpect(jsonPath("$[0].email").exists())
//                .andExpect(jsonPath("$[1].email").exists());
//    }
}
