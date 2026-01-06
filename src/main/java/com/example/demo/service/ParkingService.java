package com.example.demo.service;

import com.example.demo.dto.BookedIntervalResponse;
import com.example.demo.dto.CreateParkingRequest;
import com.example.demo.dto.UpdateParkingRequest;
import com.example.demo.model.Booking;
import com.example.demo.model.BookingStatus;
import com.example.demo.model.Parking;
import com.example.demo.repository.BookingRepository;
import com.example.demo.repository.ParkingRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
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
    public List<BookedIntervalResponse> getBusyIntervals(Long parkingId, LocalDateTime from, LocalDateTime to) {
        Parking p = parkingRepository.findById(parkingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parking spot not found"));

        // Default to the parking’s availability window when not provided
        LocalDateTime effectiveFrom = (from != null)
                ? from
                : (p.getAvailableFrom() != null ? p.getAvailableFrom() : LocalDateTime.now().minusYears(1));

        LocalDateTime effectiveTo = (to != null)
                ? to
                : (p.getAvailableTo() != null ? p.getAvailableTo() : LocalDateTime.now().plusYears(1));

        if (!effectiveFrom.isBefore(effectiveTo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from must be before to");
        }

        List<Booking> overlaps = bookingRepository.findOverlaps(parkingId, effectiveFrom, effectiveTo, BUSY_STATUSES);

        return overlaps.stream().map(BookedIntervalResponse::from).toList();
    }

}
