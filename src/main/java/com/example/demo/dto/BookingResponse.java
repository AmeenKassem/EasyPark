package com.example.demo.dto;

import com.example.demo.model.Booking;

import java.time.LocalDateTime;

public class BookingResponse {

    private Long id;
    private Long parkingId;
    private Long driverId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private Double totalPrice;

    public static BookingResponse from(Booking b) {
        BookingResponse r = new BookingResponse();
        r.id = b.getId();
        r.parkingId = (b.getParking() != null) ? b.getParking().getId() : null;
        r.driverId = (b.getDriver() != null) ? b.getDriver().getId() : null;
        r.startTime = b.getStartTime();
        r.endTime = b.getEndTime();
        r.status = (b.getStatus() != null) ? b.getStatus().name() : null;
        r.totalPrice = b.getTotalPrice();
        return r;
    }

    public Long getId() { return id; }
    public Long getParkingId() { return parkingId; }
    public Long getDriverId() { return driverId; }
    public LocalDateTime getStartTime() { return startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public String getStatus() { return status; }
    public Double getTotalPrice() { return totalPrice; }
}
