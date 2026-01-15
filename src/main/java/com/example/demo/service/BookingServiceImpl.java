package com.example.demo.service;

import com.example.demo.dto.CreateBookingRequest;
import com.example.demo.dto.UpdateBookingStatusRequest;
import com.example.demo.model.*;
import com.example.demo.repository.BookingRepository;
import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;

@Service
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final ParkingRepository parkingRepository;
    private final UserRepository userRepository;

    // These statuses are considered "blocking" for overlap checks
    private static final EnumSet<BookingStatus> ACTIVE_STATUSES =
            EnumSet.of(BookingStatus.PENDING, BookingStatus.APPROVED);

    public BookingServiceImpl(BookingRepository bookingRepository,
                              ParkingRepository parkingRepository,
                              UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.parkingRepository = parkingRepository;
        this.userRepository = userRepository;
    }

    @Override
    public Booking create(Long driverId, CreateBookingRequest req) {
        if (req.getStartTime() == null || req.getEndTime() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startTime and endTime are required");
        }
        if (!req.getStartTime().isBefore(req.getEndTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startTime must be before endTime");
        }

        Parking parking = parkingRepository.findById(req.getParkingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parking spot not found"));

        if (!parking.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parking spot is not active");
        }

        if (parking.getOwnerId() != null && parking.getOwnerId().equals(driverId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot book your own parking spot");
        }

        // --- NEW: Validate against complex availability ---
        validateParkingAvailability(parking, req.getStartTime(), req.getEndTime());
        // --------------------------------------------------

        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Driver not found"));

        long overlaps = bookingRepository.countOverlaps(
                parking.getId(),
                req.getStartTime(),
                req.getEndTime(),
                ACTIVE_STATUSES
        );

        if (overlaps > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Parking spot is already booked for that time range");
        }

        Booking booking = new Booking();
        booking.setParking(parking);
        booking.setDriver(driver);
        booking.setStartTime(req.getStartTime());
        booking.setEndTime(req.getEndTime());
        booking.setStatus(BookingStatus.PENDING);

        booking.setTotalPrice(calculateTotalPrice(parking, req.getStartTime(), req.getEndTime()));

        return bookingRepository.save(booking);
    }

    // --- Helper Method to Validate Availability ---
    private void validateParkingAvailability(Parking parking, LocalDateTime start, LocalDateTime end) {
        // If no availability is defined, assume available (or restrict - depends on logic. Here assumes closed if empty)
        if (parking.getAvailabilityList() == null || parking.getAvailabilityList().isEmpty()) {
            // Option A: If list empty, assume available anytime?
            // Option B: If list empty, assume closed?
            // Let's assume Option B for safety in a structured app:
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parking has no availability defined");
        }

        boolean isWithinSlot = false;

        if (parking.getAvailabilityType() == AvailabilityType.SPECIFIC) {
            // Check if request falls entirely within ONE of the specific slots
            for (ParkingAvailability slot : parking.getAvailabilityList()) {
                if (slot.getStartDateTime() != null && slot.getEndDateTime() != null) {
                    // Check inclusion: SlotStart <= ReqStart AND ReqEnd <= SlotEnd
                    if (!start.isBefore(slot.getStartDateTime()) && !end.isAfter(slot.getEndDateTime())) {
                        isWithinSlot = true;
                        break;
                    }
                }
            }
        } else if (parking.getAvailabilityType() == AvailabilityType.RECURRING) {
            // Convert Java DayOfWeek (1=Mon..7=Sun) to DB logic (0=Sun..6=Sat)
            int javaDay = start.getDayOfWeek().getValue();
            int dbDay = (javaDay == 7) ? 0 : javaDay;

            // Check if start and end are on the same day (simplification for recurring)
            if (!start.toLocalDate().isEqual(end.toLocalDate())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recurring bookings cannot span across midnight (multi-day)");
            }

            LocalTime reqStart = start.toLocalTime();
            LocalTime reqEnd = end.toLocalTime();

            for (ParkingAvailability slot : parking.getAvailabilityList()) {
                if (slot.getDayOfWeek() != null && slot.getDayOfWeek() == dbDay) {
                    if (slot.getStartTime() != null && slot.getEndTime() != null) {
                        // Check time inclusion
                        if (!reqStart.isBefore(slot.getStartTime()) && !reqEnd.isAfter(slot.getEndTime())) {
                            isWithinSlot = true;
                            break;
                        }
                    }
                }
            }
        }

        if (!isWithinSlot) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected time is outside the parking availability window");
        }
    }

    @Override
    public List<Booking> listMine(Long driverId) {
        return bookingRepository.findMine(driverId);
    }

    @Override
    public List<Booking> listForOwner(Long ownerId) {
        return bookingRepository.findForOwner(ownerId);
    }

    @Override
    public Booking updateStatus(Long ownerId, Long bookingId, UpdateBookingStatusRequest req) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        Long bookingOwnerId = booking.getParking().getOwnerId();
        if (!ownerId.equals(bookingOwnerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to update this booking");
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PENDING bookings can be updated");
        }

        BookingStatus newStatus = parseStatus(req.getStatus());
        if (newStatus != BookingStatus.APPROVED && newStatus != BookingStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be APPROVED or REJECTED");
        }

        booking.setStatus(newStatus);
        return bookingRepository.save(booking);
    }

    @Override
    public Booking cancel(Long driverId, Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (!driverId.equals(booking.getDriver().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to cancel this booking");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.REJECTED) {
            return booking;
        }

        if (!LocalDateTime.now().isBefore(booking.getStartTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot cancel after booking has started");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        return bookingRepository.save(booking);
    }

    private BookingStatus parseStatus(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status is required");
        }
        try {
            return BookingStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + raw);
        }
    }

    private double calculateTotalPrice(Parking parking, LocalDateTime start, LocalDateTime end) {
        double pricePerHour = parking.getPricePerHour();
        long minutes = Duration.between(start, end).toMinutes();
        long hoursRoundedUp = (minutes + 59) / 60;
        return hoursRoundedUp * pricePerHour;
    }
}