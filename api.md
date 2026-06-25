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
*   **Description:** Registers a new vendor with legal documents. **(Uses Multipart Form Data)**
*   **Request Body (form-data):**
    *   `firstName`: (String) John
    *   `lastName`: (String) Doe
    *   `email`: (String) john@vendor.com
    *   `phone`: (String) 9876543210
    *   `password`: (String) password123
    *   `businessName`: (String) John Services
    *   `ownerName`: (String) John Doe
    *   `aadharNumber`: (String) 123456789012
    *   `panNumber`: (String) ABCDE1234F
    *   `experience`: (Number) 5
    *   `skills`: (Array/String) ["Plumbing"]
    *   **Files:**
        *   `aadharFront`: (File) - Uploads to Cloudinary
        *   `aadharBack`: (File) - Uploads to Cloudinary
        *   `panCard`: (File) - Uploads to Cloudinary
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

---

## 🛍️ 2. Customer Services Explorer (`/api/user/services`)

### Get All Services (with Proximity Support)
*   **GET** `/api/user/services/`
*   **Query Parameters:**
    *   `latitude`: (Number) User's latitude for location-based search.
    *   `longitude`: (Number) User's longitude for location-based search.
    *   `radius`: (Number) Search radius in km. **Default: 10**.
    *   `category`: (ID) Filter by category.
    *   `search`: (String) Search by name/description.
    *   `minPrice`/`maxPrice`: (Number) Price range filter.
    *   `page`/`limit`: (Number) Pagination.
*   **Response (200):** Services within the specified radius (if coordinates provided) or global list.

### Get Categories
*   **GET** `/api/user/services/categories`
*   **Response (200):** `{ "success": true, "data": [{ "_id": "...", "name": "Plumbing", "image": "..." }, ...] }`

### Search Services (with Proximity Support)
*   **GET** `/api/user/services/search?query=pipe&latitude=28.6139&longitude=77.2090`
*   **Query Parameters:**
    *   `query`: (String) Required. Min 2 characters.
    *   `latitude`/`longitude`: (Number) Optional coordinates for proximity search.
    *   `radius`: (Number) Optional radius in km. **Default: 10**.
*   **Response (200):** Paginated services matching "pipe" and sorted by proximity if coordinates provided.

### Get Top Rated Services
*   **GET** `/api/user/services/top-rated?limit=5`
*   **Response (200):** List of services with highest average ratings.

### Get Services by Category (with Proximity Support)
*   **GET** `/api/user/services/category/:categoryId?latitude=28.6139&longitude=77.2090`
*   **Response (200):** Services in the category, filtered by 10km radius if coordinates provided.

### Get Service Details
*   **GET** `/api/user/services/:serviceId`
*   **Response (200):** Full service object with vendor details.

---

## 🛒 3. Customer Booking Operations (`/api/user/bookings`)

### Create Booking (Requires Precise Location)
*   **POST** `/api/user/bookings/`
*   **Authentication:** `customer`
*   **Request Body:**
    ```json
    {
      "serviceId": "...",
      "vendorId": "...",
      "bookingDate": "2024-07-20",
      "timeSlot": { "startTime": "10:00 AM", "endTime": "11:00 AM" },
      "serviceAddress": {
        "street": "123 Main St",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "label": "Home",
        "instructions": "Second floor, blue door"
      },
      "paymentMethod": "online",
      "customerNotes": "Please come on time."
    }
    ```
*   **Note:** `latitude` and `longitude` are now **mandatory** inside `serviceAddress`.
*   **Response (201):** `{ "success": true, "data": { ... } }`

### Get My Bookings
*   **GET** `/api/user/bookings/?status=confirmed&page=1`
*   **Response (200):** Paginated bookings list for the logged-in customer.

### Get Booking Details
*   **GET** `/api/user/bookings/:bookingId`
*   **Response (200):** Detailed booking info including status and pricing.

---

## 🛠️ 5. Vendor Custom Service Control (`/api/vendor/services`)

### Create Standalone Service (Auto-Location)
*   **POST** `/api/vendor/services/`
*   **Authentication:** `vendor` (Approved)
*   **Description:** Creates a new service. Automatically attaches vendor's current location for discovery.
*   **Request Body (form-data):**
    *   `name`: (String)
    *   `description`: (String)
    *   `category`: (ID)
    *   `basePrice`: (Number)
    *   `estimatedDuration`: (Number)
    *   **Files:**
        *   `image`: (File, single) - Main service image
        *   `images`: (Files, multiple) - Gallery images
*   **Response (201):** `{ "success": true, "service": { "location": { ... }, ... } }`

---

## 👤 7. Vendor Profile & Catalog (`/api/vendor/profile`)

### Update Current Location
*   **PUT** `/api/vendor/profile/location`
*   **Description:** Updates the vendor's primary location used for proximity-based service discovery.
*   **Request Body:**
    ```json
    { 
      "longitude": 72.8777, 
      "latitude": 19.0760 
    }
    ```
*   **Response (200):** `{ "success": true, "message": "Location updated successfully" }`

---

## 📂 11. Admin Global Categories & Services

### Create Category
*   **POST** `/api/admin/categories/`
*   **Description:** Creates a new category. **(Uses Multipart Form Data)**
*   **Request Body (form-data):**
    *   `name`: (String)
    *   `description`: (String)
    *   **Files:**
        *   `image`: (File) - Category banner/icon
*   **Response (201):** `{ "success": true, "category": { ... } }`

---

## 📍 12. Customer Address Management (`/api/user/addresses`)

### Add Address
*   **POST** `/api/user/addresses/`
*   **Authentication:** `customer`
*   **Request Body:**
    ```json
    {
      "label": "Home",
      "street": "123 Street Name",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "isDefault": true
    }
    ```
*   **Response (201):** `{ "success": true, "message": "Address added successfully", "addresses": [...] }`

### Get All Addresses
*   **GET** `/api/user/addresses/`
*   **Response (200):** List of all saved addresses for the user.

### Update Address
*   **PUT** `/api/user/addresses/:addressId`
*   **Request Body:** Same as Add Address (all fields optional).
*   **Response (200):** `{ "success": true, "message": "Address updated successfully", "addresses": [...] }`

### Delete Address
*   **DELETE** `/api/user/addresses/:addressId`
*   **Response (200):** `{ "success": true, "message": "Address deleted successfully" }`

### Set Default Address
*   **PUT** `/api/user/addresses/:addressId/default`
*   **Response (200):** `{ "success": true, "message": "Default address updated successfully" }`

---

## 👤 13. Customer Profile Management (`/api/user/profile`)

### Get Profile
*   **GET** `/api/user/profile/`
*   **Authentication:** `customer`
*   **Response (200):** Full user object (excluding password and refresh token).

### Update Profile
*   **PUT** `/api/user/profile/`
*   **Description:** Updates user's personal information. **Note: Email cannot be changed.**
*   **Request Body:**
    ```json
    {
      "firstName": "John",
      "lastName": "Doe",
      "phone": "9876543210",
      "gender": "male"
    }
    ```
*   **Response (200):** `{ "success": true, "message": "Profile updated successfully", "user": { ... } }`

---

## 🩺 14. Global Utilities

### Health Check
*   **GET** `/health`
*   **Response (200):** `{ "status": "UP" }`
