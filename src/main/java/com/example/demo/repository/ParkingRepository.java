package com.example.demo.repository;

import com.example.demo.model.Parking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParkingRepository extends JpaRepository<Parking, Long> {
    List<Parking> findByOwnerId(Long ownerId);
}
