# Lawgikalai Authentication API

## Overview

This is a simple Node.js + Express + MongoDB based Authentication API with:
- **Sign Up**
- **Login**
- **Forgot Password (OTP)**
- **OTP Verification**

## Project Structure


## How to Run

1. **Install Dependencies**
    ```
    npm install
    ```
2. **Start MongoDB**
    - Make sure MongoDB is running locally (default: `mongodb://localhost:27017`)
    - If using MongoDB Compass, just open the app

3. **Run Server**
    ```
    node app.js
    ```
    The server runs on [http://localhost:3000](http://localhost:3000)

## API Endpoints

### 1. Sign Up

- **POST** `/api/auth/signup`
- **Body:**
    ```json
    {
      "fullName": "Akshat Tiwari",
      "identifier": "akshat@email.com",
      "password": "password123"
    }
    ```

### 2. Login

- **POST** `/api/auth/login`
- **Body:**
    ```json
    {
      "identifier": "akshat@email.com",
      "password": "password123"
    }
    ```

### 3. Forgot Password (Send OTP)

- **POST** `/api/auth/forgot-password`
- **Body:**
    ```json
    {
      "identifier": "akshat@email.com"
    }
    ```
- OTP is printed in backend console (for demo/testing).

### 4. Verify OTP

- **POST** `/api/auth/verify-otp`
- **Body:**
    ```json
    {
      "otp": "123456"
    }
    ```

## Notes

- All endpoints use **JSON**.
- OTP is sent to console for now; integrate email/SMS as needed.
- JWT is returned on login for session management.

---

## **Contact**
For any queries, contact: [Your Name / Email]
