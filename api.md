# Internship Project Complete API Documentation (Homster)

Welcome to the definitive backend API documentation. Every single individual endpoint available across all route modules is explicitly detailed below with request bodies and response structures.

---

## 🔐 1. Authentication & Identity Subsystem (`/api/auth`)

### Register Customer
*   **POST** `/api/auth/register/customer`
*   **Description:** Registers a new user with the `customer` role.
*   **Request Body:**
    ```json
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "password": "Password123",
      "gender": "male"
    }
    ```
*   **Response (201):**
    ```json
    {
      "success": true,
      "message": "Customer registered successfully",
      "accessToken": "...",
      "user": { "id": "...", "firstName": "John", "role": "customer", "email": "...", "phone": "..." }
    }
    ```

### Register Vendor
*   **POST** `/api/auth/register/vendor`
*   **Description:** Registers a new vendor with legal documents.
*   **Request Body:**
    ```json
    {
      "firstName": "Jane",
      "lastName": "Vendor",
      "email": "jane@business.com",
      "phone": "9988776655",
      "password": "SecurePassword",
      "businessName": "Jane Services",
      "ownerName": "Jane Doe",
      "aadharNumber": "123456789012",
      "panNumber": "ABCDE1234F",
      "aadharFront": "url_to_image",
      "aadharBack": "url_to_image",
      "panCard": "url_to_image",
      "experience": 5,
      "skills": ["Plumbing", "Electrical"],
      "serviceAreas": ["Mumbai", "Thane"]
    }
    ```
*   **Response (201):**
    ```json
    {
      "success": true,
      "message": "Vendor registered successfully. Waiting for admin approval.",
      "accessToken": "...",
      "user": { "id": "...", "role": "vendor", "verificationStatus": "pending" }
    }
    ```

### Login
*   **POST** `/api/auth/login`
*   **Request Body:**
    ```json
    {
      "email": "john@example.com",
      "password": "Password123",
      "role": "customer" 
    }
    ```
*   **Response (200):**
    ```json
    {
      "success": true,
      "message": "Customer logged in successfully",
      "accessToken": "...",
      "user": { "id": "...", "firstName": "John", "role": "customer" }
    }
    ```
    *Note: Sets `refreshToken` in HttpOnly cookie.*

### Refresh Token
*   **POST** `/api/auth/refresh`
*   **Request:** Requires `refreshToken` cookie.
*   **Response (200):** `{ "success": true, "accessToken": "..." }`

### Logout
*   **POST** `/api/auth/logout`
*   **Authentication:** Required
*   **Response (200):** `{ "success": true, "message": "Logged out successfully" }`

### Get Me
*   **GET** `/api/auth/me`
*   **Authentication:** Required
*   **Response (200):** `{ "success": true, "user": { ... } }`

---

## 🛍️ 2. Customer Services Explorer (`/api/user/services`)

### Get Categories
*   **GET** `/api/user/services/categories`
*   **Response (200):** `{ "success": true, "data": [{ "_id": "...", "name": "Plumbing", "image": "..." }, ...] }`

### Search Services
*   **GET** `/api/user/services/search?query=pipe&page=1&limit=10`
*   **Response (200):** Paginated services matching "pipe".

### Get Top Rated Services
*   **GET** `/api/user/services/top-rated?limit=5`
*   **Response (200):** List of services with highest average ratings.

### Get Services by Category
*   **GET** `/api/user/services/category/:categoryId`
*   **Response (200):** `{ "success": true, "data": { "category": { ... }, "services": [...] } }`

### Get Service Details
*   **GET** `/api/user/services/:serviceId`
*   **Response (200):** Full service object with vendor details.

---

## 🛒 3. Customer Booking Operations (`/api/user/bookings`)

### Create Booking
*   **POST** `/api/user/bookings/`
*   **Authentication:** `customer`
*   **Request Body:**
    ```json
    {
      "serviceId": "...",
      "vendorId": "...",
      "bookingDate": "2024-07-20",
      "timeSlot": { "startTime": "10:00", "endTime": "11:00" },
      "serviceAddress": {
        "street": "123 Main St",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "label": "Home"
      },
      "paymentMethod": "online",
      "customerNotes": "Please come on time."
    }
    ```
*   **Response (201):** `{ "success": true, "data": { "status": "pending", ... } }`

### Get My Bookings
*   **GET** `/api/user/bookings/?status=confirmed&page=1`
*   **Response (200):** Paginated bookings list for the logged-in customer.

### Get Booking Details
*   **GET** `/api/user/bookings/:bookingId`
*   **Response (200):** Detailed booking info including status and pricing.

### Cancel Booking
*   **PUT** `/api/user/bookings/:bookingId/cancel`
*   **Request Body:** `{ "reason": "Change of plans" }`

### Reschedule Booking
*   **PUT** `/api/user/bookings/:bookingId/reschedule`
*   **Request Body:** 
    ```json
    { 
      "bookingDate": "2024-07-21", 
      "timeSlot": { "startTime": "14:00", "endTime": "15:00" }, 
      "reason": "Family emergency" 
    }
    ```

---

## 💳 4. Customer Payment Integration (`/api/user/payments`)

### Create Razorpay Order
*   **POST** `/api/user/payments/create-order`
*   **Request Body:** `{ "bookingId": "..." }`
*   **Response (200):** `{ "success": true, "order": { "id": "order_...", "amount": 50000 }, "key": "..." }`

### Verify Payment
*   **POST** `/api/user/payments/verify-payment`
*   **Request Body:**
    ```json
    {
      "razorpay_order_id": "...",
      "razorpay_payment_id": "...",
      "razorpay_signature": "...",
      "bookingId": "..."
    }
    ```
*   **Response (200):** `{ "success": true, "message": "Payment verified...", "data": { "status": "completed", ... } }`

---

## 🛠️ 5. Vendor Custom Service Control (`/api/vendor/services`)

### Create Standalone Service
*   **POST** `/api/vendor/services/`
*   **Authentication:** `vendor` (Approved)
*   **Request Body:**
    ```json
    {
      "name": "Custom AC Service",
      "description": "Full deep cleaning",
      "category": "...",
      "basePrice": 800,
      "estimatedDuration": "2 hours",
      "features": ["Water cleaning", "Gas check"]
    }
    ```
*   **Response (201):** `{ "success": true, "service": { "approvalStatus": "pending", ... } }`

### Get My Services
*   **GET** `/api/vendor/services/`
*   **Response (200):** All services created by the vendor with approval statuses.

### Update Service
*   **PUT** `/api/vendor/services/:id`
*   **Request Body:** `{ "basePrice": 850, "isActive": true }`

---

## 📅 6. Vendor Booking Management (`/api/vendor/bookings`)

### Accept Booking
*   **PUT** `/api/vendor/bookings/:id/accept`
*   **Response (200):** Sets status to `confirmed`.

### Reject Booking
*   **PUT** `/api/vendor/bookings/:id/reject`
*   **Request Body:** `{ "reason": "Outside service area" }`

### Assign Worker
*   **PUT** `/api/vendor/bookings/:id/assign-worker`
*   **Request Body:** `{ "workerId": "..." }`

### Verify Start OTP
*   **POST** `/api/vendor/bookings/:id/verify-start-otp`
*   **Request Body:** `{ "otp": "123456" }`
*   **Response (200):** Moves status to `on_the_way` (or `in_progress` depending on flow).

### Verify End OTP
*   **POST** `/api/vendor/bookings/:id/verify-end-otp`
*   **Request Body:** `{ "otp": "654321" }`
*   **Response (200):** Status moves to `work_done` (or `completed` if cash).

### Submit Proof of Work
*   **POST** `/api/vendor/bookings/:id/proof-of-work`
*   **Request Body:** 
    ```json
    { 
      "beforeImages": ["url1"], 
      "afterImages": ["url2"], 
      "vendorNotes": "Done successfully" 
    }
    ```

---

## 👤 7. Vendor Profile & Catalog (`/api/vendor/profile`)

### Get Profile
*   **GET** `/api/vendor/profile/`
*   **Response (200):** Full vendor details and subscription info.

### Update Profile
*   **PUT** `/api/vendor/profile/`
*   **Request Body:** `{ "businessName": "Jane Pro Services", "experience": 6 }`

### Select Catalog Service
*   **POST** `/api/vendor/profile/services/select`
*   **Request Body:** `{ "serviceId": "...", "vendorPrice": 500 }`
*   **Description:** Adds a pre-defined system service to the vendor's offerings.

### Update Availability
*   **PUT** `/api/vendor/profile/availability`
*   **Request Body:** `{ "isAvailable": true }`

### Update Current Location
*   **PUT** `/api/vendor/profile/location`
*   **Request Body:** `{ "longitude": 72.8777, "latitude": 19.0760 }`

---

## 👷 8. Vendor Field Workers (`/api/vendor/workers`)

### Add Worker
*   **POST** `/api/vendor/workers/`
*   **Request Body:**
    ```json
    {
      "firstName": "Bob",
      "lastName": "Worker",
      "phone": "9000000001",
      "password": "WorkerPassword",
      "aadharNumber": "000011112222"
    }
    ```

---

## 🛡️ 9. Admin User Management (`/api/admin/users`)

### Get All Users
*   **GET** `/api/admin/users/`
*   **Response (200):** List of all customers and vendors.

### Block/Unblock User
*   **PUT** `/api/admin/users/:id/block`
*   **PUT** `/api/admin/users/:id/unblock`

---

## 🏢 10. Admin Vendor Oversight (`/api/admin/vendors`)

### Approve Vendor
*   **PUT** `/api/admin/vendors/:id/approve`
*   **Response (200):** Status becomes `approved`.

### Reject Vendor
*   **PUT** `/api/admin/vendors/:id/reject`
*   **Request Body:** `{ "reason": "Documents blurry" }`

---

## 📂 11. Admin Global Categories & Services (`/api/admin/categories` & `/api/admin/services`)

### Create Category
*   **POST** `/api/admin/categories/`
*   **Request Body:** `{ "name": "Electrical", "image": "..." }`

### Approve Vendor Service
*   **PUT** `/api/admin/services/approval/:serviceId/approve`
*   **Description:** Approves a custom service created by a vendor.

---

## 📊 12. Admin Analytics & Bookings (`/api/admin`)

### Get Stats
*   **GET** `/api/admin/stats`
*   **Response (200):** Global platform metrics.

### Export Bookings
*   **GET** `/api/admin/export/bookings`
*   **Response:** CSV file stream.

---

## 🔔 13. Notifications (`/api/notifications`)

### Get Notifications
*   **GET** `/api/notifications/`
*   **Response (200):** Paginated user notifications.

### Mark as Read
*   **PUT** `/api/notifications/:notificationId/read`

---

## 🩺 14. Global Utilities

### Health Check
*   **GET** `/health`
*   **Response (200):** `{ "status": "UP" }`
