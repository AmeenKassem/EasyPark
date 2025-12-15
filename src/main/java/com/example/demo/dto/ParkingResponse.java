package com.example.demo.dto;

import com.example.demo.model.Parking;

import java.time.LocalDateTime;

public class ParkingResponse {

    private Long id;
    private Long ownerId;
    private String location;
    private Double lat;
    private Double lng;
    private double pricePerHour;
    private boolean covered;
    private LocalDateTime availableFrom;
    private LocalDateTime availableTo;
    private boolean active;

    public static ParkingResponse from(Parking p) {
        ParkingResponse r = new ParkingResponse();
        r.id = p.getId();
        r.ownerId = p.getOwnerId();
        r.location = p.getLocation();
        r.lat = p.getLat();
        r.lng = p.getLng();
        r.pricePerHour = p.getPricePerHour();
        r.covered = p.isCovered();
        r.availableFrom = p.getAvailableFrom();
        r.availableTo = p.getAvailableTo();
        r.active = p.isActive();
        return r;
    }

    public Long getId() { return id; }
    public Long getOwnerId() { return ownerId; }
    public String getLocation() { return location; }
    public Double getLat() { return lat; }
    public Double getLng() { return lng; }
    public double getPricePerHour() { return pricePerHour; }
    public boolean isCovered() { return covered; }
    public LocalDateTime getAvailableFrom() { return availableFrom; }
    public LocalDateTime getAvailableTo() { return availableTo; }
    public boolean isActive() { return active; }
}
