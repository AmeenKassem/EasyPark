package com.example.demo.service;

import com.example.demo.dto.CreateParkingRequest;
import com.example.demo.dto.UpdateParkingRequest;
import com.example.demo.model.Parking;
import com.example.demo.repository.ParkingRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ParkingService {

    private static final Logger log = LoggerFactory.getLogger(ParkingService.class);

    private final ParkingRepository parkingRepository;

    public ParkingService(ParkingRepository parkingRepository) {
        this.parkingRepository = parkingRepository;
    }

    public Parking create(Long ownerId, CreateParkingRequest req) {
        log.debug("action=parking_create_service start ownerId={} locationLen={} pricePerHour={} covered={}",
                ownerId,
                req.getLocation() == null ? 0 : req.getLocation().length(),
                req.getPricePerHour(),
                req.isCovered());

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

        Parking saved = parkingRepository.save(p);
        log.info("action=parking_create_service success ownerId={} parkingId={}", ownerId, saved.getId());
        return saved;
    }

    public Parking update(Long ownerId, Long parkingId, UpdateParkingRequest req) {
        log.debug("action=parking_update_service start ownerId={} parkingId={}", ownerId, parkingId);

        validateAvailability(req.getAvailableFrom(), req.getAvailableTo());

        Parking p = parkingRepository.findById(parkingId)
                .orElseThrow(() -> new IllegalArgumentException("Parking spot not found"));

        if (!p.getOwnerId().equals(ownerId)) {
            log.warn("action=parking_update_service deny ownerId={} parkingId={} actualOwnerId={}",
                    ownerId, parkingId, p.getOwnerId());
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

        Parking saved = parkingRepository.save(p);
        log.info("action=parking_update_service success ownerId={} parkingId={}", ownerId, saved.getId());
        return saved;
    }

    public void delete(Long ownerId, Long parkingId) {
        log.debug("action=parking_delete_service start ownerId={} parkingId={}", ownerId, parkingId);

        Parking p = parkingRepository.findById(parkingId)
                .orElseThrow(() -> new IllegalArgumentException("Parking spot not found"));

        if (!p.getOwnerId().equals(ownerId)) {
            log.warn("action=parking_delete_service deny ownerId={} parkingId={} actualOwnerId={}",
                    ownerId, parkingId, p.getOwnerId());
            throw new AccessDeniedException("You are not the owner of this parking spot");
        }

        parkingRepository.delete(p);
        log.info("action=parking_delete_service success ownerId={} parkingId={}", ownerId, parkingId);
    }

    public List<Parking> listMine(Long ownerId) {
        List<Parking> list = parkingRepository.findByOwnerId(ownerId);
        log.debug("action=parking_list_mine_service ownerId={} count={}", ownerId, list.size());
        return list;
    }

    public List<Parking> search(Boolean covered, Double minPrice, Double maxPrice) {
        List<Parking> out = parkingRepository.findAll().stream()
                .filter(Parking::isActive)
                .filter(p -> covered == null || p.isCovered() == covered)
                .filter(p -> minPrice == null || p.getPricePerHour() >= minPrice)
                .filter(p -> maxPrice == null || p.getPricePerHour() <= maxPrice)
                .toList();

        log.debug("action=parking_search_service covered={} minPrice={} maxPrice={} count={}",
                covered, minPrice, maxPrice, out.size());
        return out;
    }

    private void validateAvailability(java.time.LocalDateTime from, java.time.LocalDateTime to) {
        if (from != null && to != null && to.isBefore(from)) {
            log.warn("action=parking_validate fail reason=to_before_from from={} to={}", from, to);
            throw new IllegalArgumentException("availableTo must be after availableFrom");
        }
    }
}
