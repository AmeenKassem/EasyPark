package com.example.demo.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class CreateBookingRequest {

    @NotNull
    private Long parkingId;

    @NotNull
    private LocalDateTime startTime;

    @NotNull
    private LocalDateTime endTime;

    public Long getParkingId() { return parkingId; }
    public void setParkingId(Long parkingId) { this.parkingId = parkingId; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
}
