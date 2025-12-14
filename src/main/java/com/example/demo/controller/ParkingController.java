package com.example.demo.controller;

import com.example.demo.model.Parking;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/parking")
public class ParkingController {

    //  parking spots list
    private final Map<String, Parking> parkingList;


    public ParkingController() {
        this.parkingList = new HashMap<>();
    }

    // Create (Add parking to list)
    @PreAuthorize("hasRole('OWNER')")
    @PostMapping("/add")
    public void addParking(@RequestBody Parking parking) {
        parkingList.put(parking.getParkingId(), parking);
    }

    // Read (Get all parking spots)
    @GetMapping("/all")
    public List<Parking> getAllParking() {
        return List.copyOf(parkingList.values());
    }
    public Parking removeParking(String id) {
        return parkingList.remove(id);
    }


}