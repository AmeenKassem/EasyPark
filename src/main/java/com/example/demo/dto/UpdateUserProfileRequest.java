package com.example.demo.dto;

import jakarta.validation.constraints.Size;

public class UpdateUserProfileRequest {

    @Size(min = 2, max = 100, message = "fullName must be between 2 and 100 characters")
    private String fullName;

    @Size(max = 30, message = "phone must be at most 30 characters")
    private String phone;

    public UpdateUserProfileRequest() {}

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
