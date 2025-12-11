package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Default implementation of EmailService using Spring's JavaMailSender.
 */
@Service
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    /**
     * Sender address configured in application.properties:
     * spring.mail.from=YOUR_EMAIL@gmail.com
     */
    @Value("${spring.mail.from}")
    private String fromAddress;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        SimpleMailMessage message = new SimpleMailMessage();

        // Set basic email properties
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("Reset your password");

        // Plain-text body (can be later replaced with HTML template if needed)
        String text = "Hi,\n\n"
                + "We received a request to reset your password.\n"
                + "To choose a new password, click the link below:\n"
                + resetLink + "\n\n"
                + "If you did not request a password reset, you can ignore this email.\n";

        message.setText(text);

        // Send the email via SMTP
        mailSender.send(message);
    }
}