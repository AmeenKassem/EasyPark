package com.example.demo.service;

import com.example.demo.dto.CreateBookingRequest;
import com.example.demo.dto.UpdateBookingStatusRequest;
import com.example.demo.model.Booking;
import com.example.demo.model.BookingStatus;
import com.example.demo.model.Parking;
import com.example.demo.model.User;
import com.example.demo.repository.BookingRepository;
import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
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

        // Ensure parking spot is active (adjust method/field name if different in your Parking model)
        if (!parking.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parking spot is not active");
        }
        // Prevent self-booking (driver cannot book their own parking spot)
        if (parking.getOwnerId() != null && parking.getOwnerId().equals(driverId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot book your own parking spot");
        }

        // Enforce owner's availability window (if defined)
        if (parking.getAvailableFrom() != null && req.getStartTime().isBefore(parking.getAvailableFrom())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time is before the parking availability window");
        }
        if (parking.getAvailableTo() != null && req.getEndTime().isAfter(parking.getAvailableTo())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time is after the parking availability window");
        }


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

        // Calculate total price (adjust getters if your Parking model differs)
        booking.setTotalPrice(calculateTotalPrice(parking, req.getStartTime(), req.getEndTime()));

        return bookingRepository.save(booking);
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

        // Ensure the booking belongs to an owner parking spot (adjust owner getter if needed)
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
            return booking; // already effectively inactive
        }

        // Simple rule: cannot cancel after start time
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
        // This is a simple pricing method: hours rounded up * pricePerHour
        // Adjust to your business rules as needed.
        double pricePerHour = parking.getPricePerHour(); // adjust if your field name differs

        long minutes = Duration.between(start, end).toMinutes();
        long hoursRoundedUp = (minutes + 59) / 60;

        return hoursRoundedUp * pricePerHour;
    }
}
