package com.example.demo.service;

import com.example.demo.model.Notification;

import java.util.List;

public interface NotificationService {
    List<Notification> listForUser(Long userId);
    long countUnread(Long userId);
    Notification createNotification(Long recipientId, String title, String message);
    List<Notification> markAllAsRead(Long userId);
    List<Notification> clearAll(Long userId);
}
