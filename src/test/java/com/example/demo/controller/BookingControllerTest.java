package com.example.demo.controller;

import com.example.demo.dto.CreateBookingRequest;
import com.example.demo.model.Booking;
import com.example.demo.model.BookingStatus;
import com.example.demo.model.Parking;
import com.example.demo.model.User;
import com.example.demo.service.BookingService;
import com.example.demo.security.JwtService; // <--- 1. Import חשוב
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean; // <--- 2. שימוש באנוטציה החדשה
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BookingController.class)
@AutoConfigureMockMvc(addFilters = false)
class BookingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BookingService bookingService;

    // --- 3. הוספת Mock ל-JwtService כדי למנוע קריסה ---
    @MockitoBean
    private JwtService jwtService;
    // --------------------------------------------------

    @Autowired
    private ObjectMapper objectMapper;

    // --- 4. פונקציית עזר להגדרת ID באמצעות Reflection ---
    private void setEntityId(Object entity, Long id) {
        try {
            Field field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set ID for testing", e);
        }
    }
    // ---------------------------------------------------

    @Test
    void create_ShouldReturn200_WhenValid() throws Exception {
        // Arrange
        Long driverId = 100L;
        // יצירת הטוקן עבור ה-Test
        TestingAuthenticationToken auth = new TestingAuthenticationToken(driverId, "PASSWORD", "ROLE_DRIVER");

        CreateBookingRequest req = new CreateBookingRequest();
        req.setParkingId(5L);
        req.setStartTime(LocalDateTime.now().plusHours(1));
        req.setEndTime(LocalDateTime.now().plusHours(3));

        // Mock Booking result
        Booking mockBooking = new Booking();
        setEntityId(mockBooking, 555L);
        mockBooking.setStatus(BookingStatus.PENDING);

        // חשוב: מאתחלים את ה-Parking וה-Driver בתוך ההזמנה כדי ש-BookingResponse.from לא ייכשל על Null
        Parking p = new Parking();
        setEntityId(p, 5L);
        mockBooking.setParking(p);

        User u = new User();
        setEntityId(u, driverId);
        mockBooking.setDriver(u);

        when(bookingService.create(eq(driverId), any(CreateBookingRequest.class))).thenReturn(mockBooking);

        // Act & Assert
        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .principal(auth)) // <--- 5. העברת המשתמש (Principal) לבקשה
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(555))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void create_ShouldReturn400_WhenMissingDates() throws Exception {
        // Arrange
        Long userId = 100L;
        TestingAuthenticationToken auth = new TestingAuthenticationToken(userId, "PASSWORD", "ROLE_DRIVER");

        CreateBookingRequest req = new CreateBookingRequest();
        req.setParkingId(5L);
        // StartTime and EndTime are null -> should trigger @NotNull validation

        // Act & Assert
        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .principal(auth)) // <--- העברת המשתמש
                .andExpect(status().isBadRequest());
    }

    @Test
    void myBookings_ShouldReturnList() throws Exception {
        // Arrange
        Long userId = 100L;
        TestingAuthenticationToken auth = new TestingAuthenticationToken(userId, "PASSWORD", "ROLE_DRIVER");

        Booking b = new Booking();
        setEntityId(b, 11L);
        b.setStatus(BookingStatus.APPROVED);

        Parking p = new Parking(); setEntityId(p, 5L); b.setParking(p);
        User u = new User(); setEntityId(u, userId); b.setDriver(u);

        when(bookingService.listMine(userId)).thenReturn(List.of(b));

        // Act & Assert
        mockMvc.perform(get("/api/bookings/my")
                        .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(11));
    }
}