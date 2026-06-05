# Homster API Documentation

This document provides a comprehensive technical reference for the Homster platform API, featuring detailed request/response schemas, query parameters, and role-based permissions.

## 🚀 Base URL
`http://localhost:5000/api`

---

## 🔐 Authentication (`/auth`)

### Register Customer
`POST /auth/register/customer`
- **Description:** Register a new customer account.
- **Request Body:**
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | firstName | String | Yes | User's first name |
  | lastName | String | No | User's last name |
  | email | String | Yes | Unique email address |
  | phone | String | Yes | Unique phone number |
  | password | String | Yes | Minimum 8 characters |
  | gender | String | No | male, female, or other |
- **Response (201):**
  ```json
  {
    "success": true,
    "accessToken": "JWT_TOKEN",
    "user": { "id": "...", "userId": "UC-00001", "role": "customer", "email": "..." }
  }
  ```

### Register Vendor
`POST /auth/register/vendor`
- **Description:** Register a new vendor account (requires admin approval).
- **Request Body:** Includes all Customer fields plus:
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | businessName| String | Yes | Name of the business/shop |
  | experience | Number | No | Years in business |
  | skills | Array | No | String array of skills |
  | serviceAreas| Array | No | `[{ "city": "...", "pincode": "..." }]` |
- **Response (201):**
  ```json
  {
    "success": true,
    "message": "Vendor registered successfully. Waiting for admin approval.",
    "user": { "id": "...", "verificationStatus": "pending", "role": "vendor" }
  }
  ```

### Login
`POST /auth/login`
- **Request Body:** `{ "email": "...", "password": "...", "role": "customer/vendor/admin" }`
- **Response (200):** Includes `accessToken` and `user` object. Set `refreshToken` in HttpOnly cookie.

---

## 🛡️ Admin Routes (`/admin`)

### User & Vendor Management
| Method | Endpoint | Query/Body | Description |
| :--- | :--- | :--- | :--- |
| GET | `/users` | `?role, isActive, page, limit` | List users/vendors with pagination |
| GET | `/users/search` | `?query, page, limit` | Search by name, email, phone, or ID |
| PUT | `/vendors/:id/approve` | - | Approve vendor registration |
| PUT | `/vendors/:id/reject` | `{ "reason": String }` | Reject vendor registration |
| GET | `/vendors/nearby` | `?longitude, latitude, distance` | Find vendors within radius (km) |

### Worker Management
| Method | Endpoint | Query/Body | Description |
| :--- | :--- | :--- | :--- |
| GET | `/workers` | `?status, vendorId, page, limit` | List all workers with filters |
| GET | `/workers/pending` | `?page, limit` | List workers awaiting approval |
| GET | `/workers/approved` | `?page, limit` | List all approved workers |
| GET | `/workers/rejected` | `?page, limit` | List all rejected workers |
| GET | `/workers/:id` | - | Get detailed worker profile & vendor info |
| GET | `/workers/:id/bookings` | `?status, page, limit` | Get job/booking history for a worker |
| PATCH | `/workers/:id/approve` | - | Approve a worker |
| PATCH | `/workers/:id/reject` | `{ "reason": String }` | Reject a worker |

### Booking Management
| Method | Endpoint | Request Details | Description |
| :--- | :--- | :--- | :--- |
| GET | `/bookings` | `?status, vendorId, customerId, startDate, endDate` | Comprehensive booking list |
| PATCH | `/bookings/:id/status` | `{ "status": "confirmed/completed/cancelled", "reason": "..." }` | Update booking status |
| PUT | `/bookings/:id/cancel` | `{ "reason": String, "refundAmount": Number }` | Admin-initiated cancellation |

---

## 🏬 Vendor Routes (`/vendor`)

### Worker Management
| Method | Endpoint | Request Body | Description |
| :--- | :--- | :--- | :--- |
| POST | `/workers` | `{ firstName, lastName, email, phone, password, serviceCategory }` | Register a new worker for the vendor |
| GET | `/workers` | `?status, page, limit` | List vendor's workers |
| PATCH | `/bookings/:id/assign-worker` | `{ "workerId": String }` | Assign a worker to a specific booking |

### Service Management
| Method | Endpoint | Request Body | Description |
| :--- | :--- | :--- | :--- |
| POST | `/services` | `{ name, description, category, basePrice, images }` | Create service (Pending Approval) |
| PUT | `/services/:id` | `{ basePrice, isAvailable, description, ... }` | Update service details |

### Booking Operations
| Method | Endpoint | Request Body | Description |
| :--- | :--- | :--- | :--- |
| PUT | `/bookings/:id/accept` | - | Accept a pending booking request |
| PUT | `/bookings/:id/reject` | `{ "reason": String }` | Reject a pending booking request |
| POST | `/bookings/:id/verify-start-otp` | `{ "otp": String }` | Verify customer OTP to start work |
| POST | `/bookings/:id/verify-end-otp` | `{ "otp": String }` | Verify customer OTP to finish work |
| POST | `/bookings/:id/proof-of-work` | `{ "beforeImages": [], "afterImages": [], "vendorNotes": "" }` | Upload service evidence |

---

## 👤 User Routes (`/user`)

### Service Discovery
| Method | Endpoint | Query | Description |
| :--- | :--- | :--- | :--- |
| GET | `/services` | `?query, category, minPrice, maxPrice` | Search and filter services |
| GET | `/services/top-rated` | - | List services with best ratings |
| GET | `/categories` | - | List all service categories |

### Booking Management
| Method | Endpoint | Request Body/Query | Description |
| :--- | :--- | :--- | :--- |
| GET | `/bookings/vendor-availability/:vendorId` | `?date=YYYY-MM-DD` | Check vendor busy slots for a date |
| POST | `/bookings` | `{ serviceId, vendorId, bookingDate, timeSlot, serviceAddress, paymentMethod }` | Create a new booking |
| GET | `/bookings/:id` | - | Get booking details (includes assigned worker info) |
| PUT | `/bookings/:id/cancel` | `{ "reason": String }` | Cancel booking (triggers refund logic) |
| PUT | `/bookings/:id/reschedule` | `{ "bookingDate", "timeSlot", "reason" }` | Change appointment time |

---

## 🔔 Notifications (`/notifications`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/` | List all notifications for current user |
| GET | `/unread/count` | Get count of unread notifications |
| PUT | `/:id/read` | Mark specific notification as read |
| DELETE| `/` | Clear all notifications |
