package com.example.demo.controller;

import com.example.demo.dto.CreateParkingRequest;
import com.example.demo.model.Parking;
import com.example.demo.service.ParkingService;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ParkingController.class)
@AutoConfigureMockMvc(addFilters = false)
class ParkingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ParkingService parkingService;

    @MockitoBean
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    // --- Helper for Reflection ID ---
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
    void create_ShouldReturn200_WhenRequestIsValid() throws Exception {
        // Arrange
        Long userId = 200L;
        // יוצרים את הטוקן כאן ומעבירים אותו ב-perform
        TestingAuthenticationToken auth = new TestingAuthenticationToken(userId, "PASSWORD", "ROLE_OWNER");

        CreateParkingRequest req = new CreateParkingRequest();
        req.setLocation("Tel Aviv Center");
        req.setPricePerHour(25.0);
        req.setCovered(true);
        req.setAvailableFrom(LocalDateTime.now().plusDays(1));
        req.setAvailableTo(LocalDateTime.now().plusDays(2));
        req.setLat(32.0);
        req.setLng(34.0);

        Parking mockParking = new Parking();
        setEntityId(mockParking, 1L);
        mockParking.setOwnerId(userId);
        mockParking.setLocation("Tel Aviv Center");
        mockParking.setPricePerHour(25.0);

        when(parkingService.create(eq(userId), any(CreateParkingRequest.class))).thenReturn(mockParking);

        // Act & Assert
        mockMvc.perform(post("/api/parking-spots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .principal(auth)) // <--- התיקון: מעבירים את המשתמש ישירות לבקשה
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.location").value("Tel Aviv Center"));
    }

    @Test
    void create_ShouldReturn400_WhenPriceIsNegative() throws Exception {
        // Arrange
        Long userId = 200L;
        TestingAuthenticationToken auth = new TestingAuthenticationToken(userId, "PASSWORD", "ROLE_OWNER");

        CreateParkingRequest req = new CreateParkingRequest();
        req.setLocation("Tel Aviv");
        req.setPricePerHour(-10.0); // Invalid
        req.setLat(32.0);
        req.setLng(34.0);

        // Act & Assert
        mockMvc.perform(post("/api/parking-spots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .principal(auth)) // <--- התיקון
                .andExpect(status().isBadRequest());
    }

    @Test
    void search_ShouldReturnList() throws Exception {
        // Arrange
        Parking p = new Parking();
        setEntityId(p, 10L);
        p.setLocation("Haifa");

        when(parkingService.search(null, 10.0, 50.0)).thenReturn(List.of(p));

        // Act & Assert
        // בחיפוש אין צורך באותנטיקציה לפי הקוד שלך, אבל אם היה צורך - היינו מוסיפים .principal()
        mockMvc.perform(get("/api/parking-spots/search")
                        .param("minPrice", "10.0")
                        .param("maxPrice", "50.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10))
                .andExpect(jsonPath("$[0].location").value("Haifa"));
    }
}