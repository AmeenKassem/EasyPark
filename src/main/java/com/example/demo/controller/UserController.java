package com.example.demo.controller;

import com.example.demo.dto.UpdateUserProfileRequest;
import com.example.demo.dto.UpdateUserRoleRequest;
import com.example.demo.dto.UserSummary;
import com.example.demo.service.UserService;
import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    private Long currentUserId(Authentication auth) {
        return (Long) auth.getPrincipal(); // set by JwtAuthenticationFilter
    }

    @GetMapping("/me")
    public ResponseEntity<UserSummary> me(Authentication auth) {
        Long userId = currentUserId(auth);
        log.info("action=user_me start userId={}", userId);

        UserSummary out = userService.getUserSummary(userId);

        log.info("action=user_me success userId={}", userId);
        return ResponseEntity.ok(out);
    }

    @PutMapping("/me")
    public ResponseEntity<UserSummary> updateMe(Authentication auth,
                                                @Valid @RequestBody UpdateUserProfileRequest req) {
        Long userId = currentUserId(auth);
        log.info("action=user_update_me start userId={}", userId);

        UserSummary out = userService.updateProfile(userId, req);

        log.info("action=user_update_me success userId={}", userId);
        return ResponseEntity.ok(out);
    }

    @PutMapping("/me/role")
    public ResponseEntity<UserSummary> updateMyRole(Authentication auth,
                                                    @Valid @RequestBody UpdateUserRoleRequest req) {
        Long userId = currentUserId(auth);
        log.info("action=user_update_role start userId={} role={}", userId, req.getRole());

        UserSummary out = userService.updateRole(userId, req);

        log.info("action=user_update_role success userId={} role={}", userId, out.getRole());
        return ResponseEntity.ok(out);
    }

    @GetMapping
    public ResponseEntity<List<UserSummary>> listUsers() {
        log.info("action=user_list start");
        List<UserSummary> out = userService.getAllUsers();
        log.info("action=user_list success count={}", out.size());
        return ResponseEntity.ok(out);
    }
}
