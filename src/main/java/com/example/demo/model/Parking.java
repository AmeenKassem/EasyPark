package com.example.demo.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class Parking {
    @Id
    private Long id;
    private String location;
    private double price;
    private String type; // Sunny or not

    // Default constructor (Required for JSON deserialization)
    public Parking() {
    }

    public Parking(Long id, String location, double price, String type) {
        this.id = id;
        this.location = location;
        this.price = price;
        this.type = type;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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