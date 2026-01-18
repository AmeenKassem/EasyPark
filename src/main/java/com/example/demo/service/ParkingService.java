package com.example.demo.service;

import com.example.demo.dto.BookedIntervalResponse;
import com.example.demo.dto.CreateParkingRequest;
import com.example.demo.dto.UpdateParkingRequest;
import com.example.demo.model.*;
import com.example.demo.repository.BookingRepository;
import com.example.demo.repository.ParkingRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Service
public class ParkingService {

    private static final Logger log = LoggerFactory.getLogger(ParkingService.class);

    private final ParkingRepository parkingRepository;
    private final BookingRepository bookingRepository;
    private static final Collection<BookingStatus> BUSY_STATUSES =
            List.of(BookingStatus.PENDING, BookingStatus.APPROVED);

    public ParkingService(ParkingRepository parkingRepository, BookingRepository bookingRepository) {
        this.parkingRepository = parkingRepository;
        this.bookingRepository = bookingRepository;
    }

    @Transactional
    public Parking create(Long ownerId, CreateParkingRequest req) {
        Parking p = new Parking();
        p.setOwnerId(ownerId);
        p.setLocation(req.getLocation());
        p.setLat(req.getLat());
        p.setLng(req.getLng());
        p.setPricePerHour(req.getPricePerHour());
        p.setCovered(req.isCovered());
        p.setActive(true);

        handleAvailability(p, req.getAvailabilityType(), req.getSpecificAvailability(), req.getRecurringSchedule());

        Parking saved = parkingRepository.save(p);
        log.info("action=parking_create_service success ownerId={} parkingId={}", ownerId, saved.getId());
        return saved;
    }

    @Transactional
    public Parking update(Long ownerId, Long parkingId, UpdateParkingRequest req) {
        log.debug("action=parking_update_service start ownerId={} parkingId={}", ownerId, parkingId);

        Parking p = parkingRepository.findById(parkingId)
                .orElseThrow(() -> new IllegalArgumentException("Parking spot not found"));

        if (!p.getOwnerId().equals(ownerId)) {
            throw new AccessDeniedException("You are not the owner of this parking spot");
        }
// Block updates only if there is an APPROVED booking that has not ended yet
        if (bookingRepository.existsApprovedNotEndedForParking(parkingId, LocalDateTime.now())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot update spot: there is an approved booking that has not ended yet."
            );
        }



        // Update basic fields
        p.setLocation(req.getLocation());
        p.setLat(req.getLat());
        p.setLng(req.getLng());
        p.setPricePerHour(req.getPricePerHour());
        p.setCovered(req.isCovered());
        p.setActive(req.isActive());

// --- UPDATE AVAILABILITY LOGIC ---
// Only overwrite availability if the client explicitly sent availabilityType.
// (Quick edits from ManageSpots should NOT include availabilityType.)
        if (req.getAvailabilityType() != null) {
            p.getAvailabilityList().clear(); // orphanRemoval deletes rows
            handleAvailability(p,
                    req.getAvailabilityType(),
                    req.getSpecificAvailability(),
                    req.getRecurringSchedule());
        }


        Parking saved = parkingRepository.save(p);
        log.info("action=parking_update_service success ownerId={} parkingId={}", ownerId, saved.getId());
        return saved;
    }

    // Helper method to reuse logic between Create and Update
    private void handleAvailability(Parking p, String typeStr,
                                    List<CreateParkingRequest.SpecificSlotDto> specificSlots,
                                    List<CreateParkingRequest.RecurringScheduleDto> recurringSlots) {
        if (typeStr != null) {
            try {
                AvailabilityType type = AvailabilityType.valueOf(typeStr.toUpperCase());
                p.setAvailabilityType(type);

                if (type == AvailabilityType.SPECIFIC && specificSlots != null) {
                    for (CreateParkingRequest.SpecificSlotDto slot : specificSlots) {
                        ParkingAvailability pa = new ParkingAvailability();
                        pa.setStartDateTime(slot.getStart());
                        pa.setEndDateTime(slot.getEnd());
                        p.addAvailability(pa);
                    }
                } else if (type == AvailabilityType.RECURRING && recurringSlots != null) {
                    for (CreateParkingRequest.RecurringScheduleDto slot : recurringSlots) {
                        ParkingAvailability pa = new ParkingAvailability();
                        pa.setDayOfWeek(slot.getDayOfWeek());
                        pa.setStartTime(slot.getStart());
                        pa.setEndTime(slot.getEnd());
                        p.addAvailability(pa);
                    }
                }
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid availability type");
            }
        }
    }

    public void delete(Long ownerId, Long parkingId) {
        Parking p = parkingRepository.findById(parkingId)
                .orElseThrow(() -> new IllegalArgumentException("Parking spot not found"));
        if (!p.getOwnerId().equals(ownerId)) {
            throw new AccessDeniedException("You are not the owner");
        }
        parkingRepository.delete(p);
    }

    public List<Parking> listMine(Long ownerId) {
        return parkingRepository.findByOwnerId(ownerId);
    }

    public List<Parking> search(Boolean covered, Double minPrice, Double maxPrice) {
        return parkingRepository.findAll().stream()
                .filter(Parking::isActive)
                .filter(p -> covered == null || p.isCovered() == covered)
                .filter(p -> minPrice == null || p.getPricePerHour() >= minPrice)
                .filter(p -> maxPrice == null || p.getPricePerHour() <= maxPrice)
                .toList();
    }

    public List<BookedIntervalResponse> getBusyIntervals(Long parkingId, LocalDateTime from, LocalDateTime to) {
        Parking p = parkingRepository.findById(parkingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parking spot not found"));

        // FIX: Removed p.getAvailableFrom() usage as fields are deleted.
        // Default to +/- 1 year if params missing
        LocalDateTime effectiveFrom = (from != null) ? from : LocalDateTime.now().minusYears(1);
        LocalDateTime effectiveTo = (to != null) ? to : LocalDateTime.now().plusYears(1);

        if (!effectiveFrom.isBefore(effectiveTo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from must be before to");
        }

        List<Booking> overlaps = bookingRepository.findOverlaps(parkingId, effectiveFrom, effectiveTo, BUSY_STATUSES);
        return overlaps.stream().map(BookedIntervalResponse::from).toList();
    }
}