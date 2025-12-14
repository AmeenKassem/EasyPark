package com.example.demo.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class Parking {
    @Id
    private String parkingId;
    private String location;
    private double price;
    private String type; // Sunny or not

    // Default constructor (Required for JSON deserialization)
    public Parking() {
    }

    public Parking(String parkingId, String location, double price, String type) {
        this.parkingId = parkingId;
        this.location = location;
        this.price = price;
        this.type = type;
    }

    // Getters and Setters
    public String getParkingId() {
        return parkingId;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}