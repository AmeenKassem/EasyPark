package com.example.demo.dto;

import com.example.demo.model.Notification;

import java.time.LocalDateTime;

/**
 * Wire representation of a {@link Notification}.
 *
 * <p>Decouples the persistence entity from the API/WebSocket contract and
 * guarantees a stable JSON shape that matches the frontend:
 * {@code id, userId, title, message, createdAt, read}.
 */
public class NotificationResponse {

    private Long id;
    private Long userId;
    private String title;
    private String message;
    private LocalDateTime createdAt;
    private boolean read;

    public static NotificationResponse from(Notification n) {
        NotificationResponse r = new NotificationResponse();
        r.id = n.getId();
        r.userId = n.getRecipientId();
        r.title = n.getTitle();
        r.message = n.getMessage();
        r.createdAt = n.getCreatedAt();
        r.read = n.isRead();
        return r;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    // Serializes as the JSON property "read".
    public boolean isRead() { return read; }
}
