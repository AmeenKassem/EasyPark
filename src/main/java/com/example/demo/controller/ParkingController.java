package com.example.demo.controller;

import com.example.demo.model.Parking;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/parking")
public class ParkingController {

    //  parking spots list
    private List<Parking> parkingList = new ArrayList<>();

    // Create (Add parking to list)
    @PreAuthorize("hasRole('OWNER')")
    @PostMapping("/add")
    public Parking addParking(@RequestBody Parking parking) {
        parkingList.add(parking);
        return parking;
    }

    // Read (Get all parking spots)
    @GetMapping("/all")
    public List<Parking> getAllParking() {
        return parkingList;
    }
}