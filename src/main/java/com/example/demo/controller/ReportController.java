package com.example.demo.controller;

import com.example.demo.dto.OwnerDashboardResponse;
import com.example.demo.service.ReportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    private static final Logger log = LoggerFactory.getLogger(ReportController.class);

    private final ReportService reportService;

    // Dependency Injection
    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    private Long currentUserId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }

    // Use Case 5 Implementation
    @PreAuthorize("hasRole('OWNER')")
    @GetMapping("/owner-dashboard")
    public ResponseEntity<OwnerDashboardResponse> getOwnerDashboard(Authentication auth) {
        Long ownerId = currentUserId(auth);
        log.info("action=get_owner_dashboard start ownerId={}", ownerId);

        OwnerDashboardResponse response = reportService.getOwnerDashboard(ownerId);

        log.info("action=get_owner_dashboard success ownerId={} revenue={} bookings={}",
                ownerId, response.getTotalRevenue(), response.getTotalReservations());

        return ResponseEntity.ok(response);
    }
}