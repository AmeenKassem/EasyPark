package com.example.demo.controller;

import com.example.demo.dto.CreateBookingRequest;
import com.example.demo.model.Booking;
import com.example.demo.model.BookingStatus;
import com.example.demo.model.Parking;
import com.example.demo.model.User;
import com.example.demo.service.BookingService;
import com.example.demo.service.EmailService;
import com.example.demo.service.UserService;
import com.example.demo.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Field;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BookingController.class)
@AutoConfigureMockMvc(addFilters = false)
class BookingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BookingService bookingService;


    @MockitoBean
    private EmailService emailService;

    @MockitoBean
    private UserService userService;
    // -------------------------------------------------------

    @MockitoBean
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;


    private void setEntityId(Object entity, Long id) {
        try {
            Field field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set ID for testing", e);
        }
    }

    @Test
    void create_ShouldReturn200_WhenValid() throws Exception {
        // Arrange
        Long driverId = 100L;
        TestingAuthenticationToken auth = new TestingAuthenticationToken(driverId, "PASSWORD", "ROLE_DRIVER");

        CreateBookingRequest req = new CreateBookingRequest();
        req.setParkingId(5L);
        req.setStartTime(LocalDateTime.now().plusHours(1));
        req.setEndTime(LocalDateTime.now().plusHours(3));

        Booking mockBooking = new Booking();
        setEntityId(mockBooking, 555L);
        mockBooking.setStatus(BookingStatus.PENDING);


        Parking p = new Parking();
        setEntityId(p, 5L);
        p.setOwnerId(200L);
        p.setLocation("Tel Aviv");
        mockBooking.setParking(p);

        User u = new User();
        setEntityId(u, driverId);
        mockBooking.setDriver(u);


        mockBooking.setStartTime(req.getStartTime());
        mockBooking.setEndTime(req.getEndTime());

        when(bookingService.create(eq(driverId), any(CreateBookingRequest.class))).thenReturn(mockBooking);

        // Act & Assert
        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(555));
    }
}