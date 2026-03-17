package com.example.demo.repository;

import com.example.demo.model.ParkingRating;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParkingRatingRepository extends JpaRepository<ParkingRating, Long> {
    boolean existsByParkingIdAndUserId(Long parkingId, Long userId);
}