package com.example.demo.service;

/**
 * Simple abstraction for sending emails from the application.
 */
public interface EmailService {

    /**
     * Sends a password reset email to the given recipient.
     *
     * @param toEmail   recipient email address
     * @param resetLink full URL with the password reset token
     */
    void sendPasswordResetEmail(String toEmail, String resetLink);
}