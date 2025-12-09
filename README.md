# EasyPark – Smart Parking Management Platform

![CI Status](https://github.com/AmeenKassem/EasyPark/actions/workflows/ci.yml/badge.svg)

EasyPark is a backend system built with Spring Boot for managing parking spaces, user accounts, bookings, and notifications. This project is part of the Software Engineering Seminar (Final Project) at Ben-Gurion University.

## Overview

The system includes:
- User registration, login, and password reset
- Support for Driver, Owner, and Both roles
- Parking spot management
- Booking/reservation flow
- Basic notification system
- REST API designed for frontend integration
- Automated testing and continuous integration

## Technologies

- Java 21
- Spring Boot
- Spring Data JPA
- H2 in-memory database
- Maven
- JUnit 5 and MockMvc
- GitHub Actions CI

## Project Structure

src/
 ├── main/java/com/example/demo/
 │    ├── controller/        - REST controllers
 │    ├── dto/               - Request/response objects
 │    ├── model/             - Entities (User, Parking, Booking, Notification)
 │    ├── repository/        - JPA repositories
 │    ├── service/           - Business logic layer
 │    └── DemoApplication    - Spring Boot entry point
 │
 └── test/java/com/example/demo/
      ├── controller/        - API integration tests
      ├── service/           - Service-layer tests
      └── DemoApplicationTests

## Running the Application

Start the server:
./mvnw spring-boot:run

Application runs at:
http://localhost:8080

## Running Tests

./mvnw test

Tests run automatically in GitHub Actions on each push and pull request.

## Contributing

1. Create a feature branch
2. Commit your changes
3. Open a pull request
4. Ensure all tests pass before merging

## Authors

Kfir Shalom 
Omar Ben Hamo  
Mohammad Ameen Kassem  
Ariel Mazhibovsky  
Ben-Gurion University – Software Engineering Seminar
