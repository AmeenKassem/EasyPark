package com.example.demo.controller;

import com.example.demo.dto.CreateParkingRequest;
import com.example.demo.dto.ParkingResponse;
import com.example.demo.dto.UpdateParkingRequest;
import com.example.demo.model.Parking;
import com.example.demo.service.ParkingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parking-spots")
@CrossOrigin(origins = "*")
public class ParkingController {

    private final ParkingService parkingService;

    public ParkingController(ParkingService parkingService) {
        this.parkingService = parkingService;
    }

    private Long currentUserId(Authentication auth) {
        return (Long) auth.getPrincipal(); // set by JwtAuthenticationFilter
    }

    // OWNER (and BOTH) can create
    @PreAuthorize("hasRole('OWNER')")
    @PostMapping
    public ResponseEntity<ParkingResponse> create(@Valid @RequestBody CreateParkingRequest req,
                                                  Authentication auth) {
        Parking p = parkingService.create(currentUserId(auth), req);
        return ResponseEntity.ok(ParkingResponse.from(p));
    }

    // OWNER (and BOTH) can update
    @PreAuthorize("hasRole('OWNER')")
    @PutMapping("/{id}")
    public ResponseEntity<ParkingResponse> update(@PathVariable Long id,
                                                  @Valid @RequestBody UpdateParkingRequest req,
                                                  Authentication auth) {
        Parking p = parkingService.update(currentUserId(auth), id, req);
        return ResponseEntity.ok(ParkingResponse.from(p));
    }

    // OWNER (and BOTH) can delete
    @PreAuthorize("hasRole('OWNER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        parkingService.delete(currentUserId(auth), id);
        return ResponseEntity.ok().build();
    }

    // Owner’s spots
    @PreAuthorize("hasRole('OWNER')")
    @GetMapping("/my")
    public ResponseEntity<List<ParkingResponse>> mySpots(Authentication auth) {
        List<ParkingResponse> out = parkingService.listMine(currentUserId(auth))
                .stream().map(ParkingResponse::from).toList();
        return ResponseEntity.ok(out);
    }

    // Search for drivers (any authenticated user)
    @GetMapping("/search")
    public ResponseEntity<List<ParkingResponse>> search(
            @RequestParam(required = false) Boolean covered,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice
    ) {
        List<ParkingResponse> out = parkingService.search(covered, minPrice, maxPrice)
                .stream().map(ParkingResponse::from).toList();
        return ResponseEntity.ok(out);
    }
}
