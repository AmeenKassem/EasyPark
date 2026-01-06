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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private ParkingRepository parkingRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private BookingServiceImpl bookingService;

    private User driver;
    private Parking parking;
    private Booking booking;

    // אותו Helper ל-Reflection
    private void setEntityId(Object entity, Long id) {
        try {
            Field field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set ID", e);
        }
    }

    @BeforeEach
    void setUp() {
        driver = new User();
        setEntityId(driver, 100L);

        parking = new Parking();
        setEntityId(parking, 10L);
        parking.setOwnerId(200L);
        parking.setActive(true);
        parking.setPricePerHour(10.0);
        // Default: available always
        parking.setAvailableFrom(null);
        parking.setAvailableTo(null);

        booking = new Booking();
        setEntityId(booking, 500L);
        booking.setDriver(driver);
        booking.setParking(parking);
        booking.setStatus(BookingStatus.PENDING);
        booking.setStartTime(LocalDateTime.now().plusDays(1));
        booking.setEndTime(LocalDateTime.now().plusDays(1).plusHours(2));
    }

    @Test
    void create_ShouldSuccess_WhenNoOverlap() {
        // Arrange
        CreateBookingRequest req = new CreateBookingRequest();
        req.setParkingId(10L);
        req.setStartTime(LocalDateTime.now().plusHours(1));
        req.setEndTime(LocalDateTime.now().plusHours(3)); // 2 hours duration

        when(parkingRepository.findById(10L)).thenReturn(Optional.of(parking));
        when(userRepository.findById(100L)).thenReturn(Optional.of(driver));

        // Mock countOverlaps -> 0 (Space is free)
        when(bookingRepository.countOverlaps(eq(10L), any(), any(), any())).thenReturn(0L);

        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        Booking result = bookingService.create(100L, req);

        // Assert
        assertNotNull(result);
        assertEquals(BookingStatus.PENDING, result.getStatus());
        // Price calc: 2 hours * 10.0 = 20.0
        assertEquals(20.0, result.getTotalPrice());
        verify(bookingRepository).save(any(Booking.class));
    }

    @Test
    void create_ShouldThrowConflict_WhenOverlapExists() {
        // Arrange
        CreateBookingRequest req = new CreateBookingRequest();
        req.setParkingId(10L);
        req.setStartTime(LocalDateTime.now().plusHours(1));
        req.setEndTime(LocalDateTime.now().plusHours(2));

        when(parkingRepository.findById(10L)).thenReturn(Optional.of(parking));
        when(userRepository.findById(100L)).thenReturn(Optional.of(driver));

        // Mock countOverlaps -> 1 (Space taken)
        when(bookingRepository.countOverlaps(eq(10L), any(), any(), any())).thenReturn(1L);

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> bookingService.create(100L, req));

        assertEquals(409, ex.getStatusCode().value()); // CONFLICT
    }

    @Test
    void create_ShouldThrowBadRequest_WhenParkingInactive() {
        // Arrange
        parking.setActive(false);
        CreateBookingRequest req = new CreateBookingRequest();
        req.setParkingId(10L);
        req.setStartTime(LocalDateTime.now().plusHours(1));
        req.setEndTime(LocalDateTime.now().plusHours(2));

        when(parkingRepository.findById(10L)).thenReturn(Optional.of(parking));

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> bookingService.create(100L, req));
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("not active"));
    }

    @Test
    void updateStatus_ShouldSuccess_WhenOwnerApproves() {
        // Arrange
        UpdateBookingStatusRequest req = new UpdateBookingStatusRequest();
        req.setStatus("APPROVED");

        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        // Owner ID is 200L (defined in setUp)
        Booking result = bookingService.updateStatus(200L, 500L, req);

        // Assert
        assertEquals(BookingStatus.APPROVED, result.getStatus());
    }

    @Test
    void updateStatus_ShouldThrowForbidden_WhenNotOwner() {
        // Arrange
        UpdateBookingStatusRequest req = new UpdateBookingStatusRequest();
        req.setStatus("APPROVED");
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));

        // Act & Assert (User 999 is not owner)
        assertThrows(ResponseStatusException.class,
                () -> bookingService.updateStatus(999L, 500L, req));
    }

    @Test
    void cancel_ShouldSuccess_WhenDriverCancelsFutureBooking() {
        // Arrange: Booking is in future (set in setUp)
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        Booking result = bookingService.cancel(100L, 500L);

        // Assert
        assertEquals(BookingStatus.CANCELLED, result.getStatus());
    }

    @Test
    void cancel_ShouldThrowBadRequest_WhenBookingAlreadyStarted() {
        // Arrange: Set start time to past
        booking.setStartTime(LocalDateTime.now().minusHours(1));

        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));

        // Act & Assert
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> bookingService.cancel(100L, 500L));

        assertTrue(ex.getReason().contains("Cannot cancel after booking has started"));
    }
}