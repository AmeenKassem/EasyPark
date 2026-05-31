package com.example.demo.service;

import com.example.demo.dto.NotificationResponse;
import com.example.demo.model.Notification;
import com.example.demo.repository.NotificationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class NotificationServiceImpl implements NotificationService {

    /** User-destination suffix that delivers a single new notification. */
    static final String QUEUE_NEW = "/queue/notifications";
    /** User-destination suffix that delivers the current unread count for the badge. */
    static final String QUEUE_UNREAD_COUNT = "/queue/notifications-unread-count";

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                   SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public List<Notification> listForUser(Long userId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public long countUnread(Long userId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    public Notification createNotification(Long recipientId, String title, String message) {
        Notification notification = new Notification();
        notification.setRecipientId(recipientId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        Notification saved = notificationRepository.save(notification);

        // 1) Push the new notification so open views can prepend it instantly.
        messagingTemplate.convertAndSendToUser(
                String.valueOf(recipientId),
                QUEUE_NEW,
                NotificationResponse.from(saved)
        );

        // 2) Push the fresh unread count so the badge updates without a REST round-trip.
        sendUnreadCount(recipientId);

        return saved;
    }

    @Override
    @Transactional
    public List<Notification> markAllAsRead(Long userId) {
        List<Notification> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);
        notifications.forEach(notification -> notification.setRead(true));
        List<Notification> saved = notificationRepository.saveAll(notifications);

        // Everything is read now -> badge must drop to 0 in real time.
        sendUnreadCount(userId);

        return saved;
    }

    @Override
    @Transactional
    public List<Notification> clearAll(Long userId) {
        notificationRepository.deleteAllByRecipientId(userId);

        sendUnreadCount(userId);

        return List.of();
    }

    private void sendUnreadCount(Long userId) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                QUEUE_UNREAD_COUNT,
                Map.of("count", countUnread(userId))
        );
    }
}
