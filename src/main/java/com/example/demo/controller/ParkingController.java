package com.example.demo.controller;

import com.example.demo.dto.BookedIntervalResponse;
import com.example.demo.dto.CreateParkingRequest;
import com.example.demo.dto.ParkingResponse;
import com.example.demo.dto.UpdateParkingRequest;
import com.example.demo.model.Parking;
import com.example.demo.service.ParkingService;
import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/parking-spots")
@CrossOrigin(origins = "*")
public class ParkingController {

    private static final Logger log = LoggerFactory.getLogger(ParkingController.class);

    private final ParkingService parkingService;

    public ParkingController(ParkingService parkingService) {
        this.parkingService = parkingService;
    }

    private Long currentUserId(Authentication auth) {
        return (Long) auth.getPrincipal(); // set by JwtAuthenticationFilter
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping
    public ResponseEntity<ParkingResponse> create(@Valid @RequestBody CreateParkingRequest req,
                                                  Authentication auth) {
        Long userId = currentUserId(auth);
        log.info("action=parking_create start userId={} covered={} pricePerHour={}",
                userId, req.isCovered(), req.getPricePerHour());

        Parking p = parkingService.create(userId, req);

        log.info("action=parking_create success userId={} parkingId={}", userId, p.getId());
        return ResponseEntity.ok(ParkingResponse.from(p));
    }

    @PreAuthorize("hasRole('OWNER')")
    @PutMapping("/{id}")
    public ResponseEntity<ParkingResponse> update(@PathVariable Long id,
                                                  @Valid @RequestBody UpdateParkingRequest req,
                                                  Authentication auth) {
        Long userId = currentUserId(auth);
        log.info("action=parking_update start userId={} parkingId={} active={}", userId, id, req.isActive());

        Parking p = parkingService.update(userId, id, req);

        log.info("action=parking_update success userId={} parkingId={}", userId, p.getId());
        return ResponseEntity.ok(ParkingResponse.from(p));
    }

    @PreAuthorize("hasRole('OWNER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        Long userId = currentUserId(auth);
        log.info("action=parking_delete start userId={} parkingId={}", userId, id);

        parkingService.delete(userId, id);

        log.info("action=parking_delete success userId={} parkingId={}", userId, id);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasRole('OWNER')")
    @GetMapping("/my")
    public ResponseEntity<List<ParkingResponse>> mySpots(Authentication auth) {
        Long userId = currentUserId(auth);
        log.info("action=parking_list_mine start userId={}", userId);

        List<ParkingResponse> out = parkingService.listMine(userId)
                .stream().map(ParkingResponse::from).toList();

        log.info("action=parking_list_mine success userId={} count={}", userId, out.size());
        return ResponseEntity.ok(out);
    }

    @GetMapping("/search")
    public ResponseEntity<List<ParkingResponse>> search(
            @RequestParam(required = false) Boolean covered,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice
    ) {
        log.info("action=parking_search start covered={} minPrice={} maxPrice={}", covered, minPrice, maxPrice);

        List<ParkingResponse> out = parkingService.search(covered, minPrice, maxPrice)
                .stream().map(ParkingResponse::from).toList();

        log.info("action=parking_search success count={}", out.size());
        return ResponseEntity.ok(out);
    }
    @GetMapping("/{id}/busy")
    public ResponseEntity<List<BookedIntervalResponse>> busy(
            @PathVariable Long id,
            @RequestParam(required = false) LocalDateTime from,
            @RequestParam(required = false) LocalDateTime to
    ) {
        log.info("action=parking_busy start parkingId={} from={} to={}", id, from, to);

        List<BookedIntervalResponse> out = parkingService.getBusyIntervals(id, from, to);

        log.info("action=parking_busy success parkingId={} count={}", id, out.size());
        return ResponseEntity.ok(out);
    }

}
