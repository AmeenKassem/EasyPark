package com.example.demo.service;

import com.example.demo.dto.CreateParkingRequest;
import com.example.demo.dto.UpdateParkingRequest;
import com.example.demo.model.Parking;
import com.example.demo.repository.ParkingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ParkingServiceTest {

    @Mock
    private ParkingRepository parkingRepository;

    @InjectMocks
    private ParkingService parkingService;

    private Long ownerId = 200L;
    private Parking parking;

    // פונקציית עזר להגדרת ID (כמו ב-ReportServiceTest)
    private void setEntityId(Object entity, Long id) {
        try {
            Field field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set ID for testing", e);
        }
    }

    @BeforeEach
    void setUp() {
        parking = new Parking();
        setEntityId(parking, 1L);
        parking.setOwnerId(ownerId);
        parking.setActive(true);
        parking.setPricePerHour(10.0);
        parking.setCovered(true);
    }

    @Test
    void create_ShouldSaveAndReturnParking() {
        // Arrange
        CreateParkingRequest req = new CreateParkingRequest();
        req.setLocation("Tel Aviv");
        req.setPricePerHour(20.0);
        req.setCovered(false);
        // Valid times
        req.setAvailableFrom(LocalDateTime.now().plusDays(1));
        req.setAvailableTo(LocalDateTime.now().plusDays(2));

        when(parkingRepository.save(any(Parking.class))).thenAnswer(invocation -> {
            Parking p = invocation.getArgument(0);
            setEntityId(p, 55L); // simulate DB id generation
            return p;
        });

        // Act
        Parking result = parkingService.create(ownerId, req);

        // Assert
        assertNotNull(result);
        assertEquals(55L, result.getId());
        assertEquals(ownerId, result.getOwnerId());
        assertEquals("Tel Aviv", result.getLocation());
        assertTrue(result.isActive()); // Default is active
        verify(parkingRepository).save(any(Parking.class));
    }

    @Test
    void create_WhenDatesInvalid_ShouldThrowException() {
        // Arrange
        CreateParkingRequest req = new CreateParkingRequest();
        // To is BEFORE From -> Invalid
        req.setAvailableFrom(LocalDateTime.now().plusDays(2));
        req.setAvailableTo(LocalDateTime.now().plusDays(1));

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> parkingService.create(ownerId, req));
        verify(parkingRepository, never()).save(any());
    }

    @Test
    void update_WhenOwnerMatches_ShouldUpdate() {
        // Arrange
        UpdateParkingRequest req = new UpdateParkingRequest();
        req.setLocation("New Location");
        req.setActive(false);
        req.setPricePerHour(15.0);

        when(parkingRepository.findById(1L)).thenReturn(Optional.of(parking));
        when(parkingRepository.save(any(Parking.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        Parking result = parkingService.update(ownerId, 1L, req);

        // Assert
        assertEquals("New Location", result.getLocation());
        assertFalse(result.isActive());
        assertEquals(15.0, result.getPricePerHour());
    }

    @Test
    void update_WhenNotOwner_ShouldThrowAccessDenied() {
        // Arrange
        Long otherOwnerId = 999L;
        when(parkingRepository.findById(1L)).thenReturn(Optional.of(parking));

        UpdateParkingRequest req = new UpdateParkingRequest();

        // Act & Assert
        assertThrows(AccessDeniedException.class,
                () -> parkingService.update(otherOwnerId, 1L, req));
    }

    @Test
    void delete_WhenOwnerMatches_ShouldDelete() {
        // Arrange
        when(parkingRepository.findById(1L)).thenReturn(Optional.of(parking));

        // Act
        parkingService.delete(ownerId, 1L);

        // Assert
        verify(parkingRepository).delete(parking);
    }

    @Test
    void listMine_ShouldReturnList() {
        // Arrange
        when(parkingRepository.findByOwnerId(ownerId)).thenReturn(Collections.singletonList(parking));

        // Act
        List<Parking> result = parkingService.listMine(ownerId);

        // Assert
        assertEquals(1, result.size());
        assertEquals(parking.getId(), result.get(0).getId());
    }

    @Test
    void search_ShouldFilterCorrectly() {
        // Arrange: Create a mix of parking spots
        Parking p1 = new Parking(); p1.setActive(true); p1.setCovered(true); p1.setPricePerHour(10.0);
        Parking p2 = new Parking(); p2.setActive(true); p2.setCovered(false); p2.setPricePerHour(20.0);
        Parking p3 = new Parking(); p3.setActive(false); p3.setCovered(true); p3.setPricePerHour(5.0); // Inactive

        when(parkingRepository.findAll()).thenReturn(Arrays.asList(p1, p2, p3));

        // Act 1: Search for Covered only
        List<Parking> covered = parkingService.search(true, null, null);
        assertEquals(1, covered.size(), "Should find only active & covered");
        assertEquals(10.0, covered.get(0).getPricePerHour());

        // Act 2: Search for Price range (15 - 25)
        List<Parking> expensive = parkingService.search(null, 15.0, 25.0);
        assertEquals(1, expensive.size());
        assertEquals(20.0, expensive.get(0).getPricePerHour());

        // Act 3: Verify inactive is ignored
        List<Parking> allActive = parkingService.search(null, null, null);
        assertEquals(2, allActive.size());
    }
}