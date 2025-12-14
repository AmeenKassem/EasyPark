package com.example.demo.service;

import com.example.demo.dto.CreateParkingRequest;
import com.example.demo.dto.UpdateParkingRequest;
import com.example.demo.model.Parking;
import com.example.demo.repository.ParkingRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ParkingService {

    private final ParkingRepository parkingRepository;

    public ParkingService(ParkingRepository parkingRepository) {
        this.parkingRepository = parkingRepository;
    }

    public Parking create(Long ownerId, CreateParkingRequest req) {
        validateAvailability(req.getAvailableFrom(), req.getAvailableTo());

        Parking p = new Parking();
        p.setOwnerId(ownerId);
        p.setLocation(req.getLocation());
        p.setLat(req.getLat());
        p.setLng(req.getLng());
        p.setPricePerHour(req.getPricePerHour());
        p.setCovered(req.isCovered());
        p.setAvailableFrom(req.getAvailableFrom());
        p.setAvailableTo(req.getAvailableTo());
        p.setActive(true);

        return parkingRepository.save(p);
    }

    public Parking update(Long ownerId, Long parkingId, UpdateParkingRequest req) {
        validateAvailability(req.getAvailableFrom(), req.getAvailableTo());

        Parking p = parkingRepository.findById(parkingId)
                .orElseThrow(() -> new IllegalArgumentException("Parking spot not found"));

        if (!p.getOwnerId().equals(ownerId)) {
            throw new AccessDeniedException("You are not the owner of this parking spot");
        }

        p.setLocation(req.getLocation());
        p.setLat(req.getLat());
        p.setLng(req.getLng());
        p.setPricePerHour(req.getPricePerHour());
        p.setCovered(req.isCovered());
        p.setAvailableFrom(req.getAvailableFrom());
        p.setAvailableTo(req.getAvailableTo());
        p.setActive(req.isActive());

        return parkingRepository.save(p);
    }

    public void delete(Long ownerId, Long parkingId) {
        Parking p = parkingRepository.findById(parkingId)
                .orElseThrow(() -> new IllegalArgumentException("Parking spot not found"));

        if (!p.getOwnerId().equals(ownerId)) {
            throw new AccessDeniedException("You are not the owner of this parking spot");
        }

        parkingRepository.delete(p);
    }

    public List<Parking> listMine(Long ownerId) {
        return parkingRepository.findByOwnerId(ownerId);
    }

    /**
     * Phase A: simple search filters (covered + price range).
     * Note: dynamic filtering is done in memory for now (safe for small data).
     */
    public List<Parking> search(Boolean covered, Double minPrice, Double maxPrice) {
        return parkingRepository.findAll().stream()
                .filter(Parking::isActive)
                .filter(p -> covered == null || p.isCovered() == covered)
                .filter(p -> minPrice == null || p.getPricePerHour() >= minPrice)
                .filter(p -> maxPrice == null || p.getPricePerHour() <= maxPrice)
                .toList();
    }

    private void validateAvailability(java.time.LocalDateTime from, java.time.LocalDateTime to) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new IllegalArgumentException("availableTo must be after availableFrom");
        }
    }
}
