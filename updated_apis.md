# Updated Location-Based & Profile APIs Documentation

This document contains only the APIs that have been recently updated or added to support geospatial features, address management, and profile controls.

---

## 🛍️ 1. Customer Services Explorer (`/api/user/services`)

### Get All Services
*   **GET** `/api/user/services/`
*   **Description:** Retrieves services with optional proximity filtering. Results are sorted by distance if coordinates are provided.
*   **Query Parameters:**
    *   `latitude`: (Number) User's latitude.
    *   `longitude`: (Number) User's longitude.
    *   `radius`: (Number) Search radius in kilometers. **Default: 10**.
*   **Response (200):** Services within the radius (closest first) or global list if coordinates are omitted.

### Search Services
*   **GET** `/api/user/services/search`
*   **Description:** Search for services by keyword with proximity support.
*   **Query Parameters:**
    *   `query`: (String) Search term (required).
    *   `latitude`: (Number) Optional.
    *   `longitude`: (Number) Optional.
    *   `radius`: (Number) Search radius in km. **Default: 10**.
*   **Response (200):** Matching services sorted by proximity (if coordinates provided).

### Get Services by Category
*   **GET** `/api/user/services/category/:categoryId`
*   **Description:** Filter services by category and distance.
*   **Query Parameters:**
    *   `latitude`: (Number) Optional.
    *   `longitude`: (Number) Optional.
    *   `radius`: (Number) Search radius in km. **Default: 10**.
*   **Response (200):** Services in the category, filtered by 10km radius if coordinates provided.

---

## 🛒 2. Customer Booking Operations (`/api/user/bookings`)

### Create Booking
*   **POST** `/api/user/bookings/`
*   **Description:** Creates a new booking. Requires precise customer coordinates.
*   **Request Body (Partial):**
    ```json
    {
      "serviceId": "...",
      "vendorId": "...",
      "serviceAddress": {
        "street": "...",
        "city": "...",
        "pincode": "...",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "label": "Home/Office"
      }
    }
    ```
*   **Validation:** `latitude` and `longitude` are now **mandatory** inside the `serviceAddress` object.

---

## 📍 3. Customer Address Management (`/api/user/addresses`)

### Add Address
*   **POST** `/api/user/addresses/`
*   **Description:** Saves a new address with geospatial coordinates.
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

### Get All Addresses
*   **GET** `/api/user/addresses/`
*   **Response (200):** Returns array of saved addresses including their `_id`.

### Update Address
*   **PUT** `/api/user/addresses/:addressId`
*   **Description:** Update specific address details or coordinates.

### Set Default Address
*   **PUT** `/api/user/addresses/:addressId/default`
*   **Description:** Mark an address as the primary service location.

---

## 👤 4. Customer Profile Management (`/api/user/profile`)

### Get Profile
*   **GET** `/api/user/profile/`
*   **Response (200):** Current user data.

### Update Profile
*   **PUT** `/api/user/profile/`
*   **Note:** **Email is immutable** and cannot be changed.
*   **Request Body:**
    ```json
    {
      "firstName": "John",
      "lastName": "Doe",
      "phone": "9876543210",
      "gender": "male"
    }
    ```

---

## 🛠️ 5. Vendor Service & Profile Control

### Create Standalone Service (`/api/vendor/services`)
*   **POST** `/api/vendor/services/`
*   **Description:** Automatically attaches the vendor's current location to the service record for discovery by customers.
*   **Response (201):** Includes the `location` field in the saved service object.

### Update Current Location (`/api/vendor/profile/location`)
*   **PUT** `/api/vendor/profile/location`
*   **Description:** Updates the vendor's primary location. This location is used as the center point for "Discovery" and "Nearby Services" queries.
*   **Request Body:**
    ```json
    { 
      "longitude": 72.8777, 
      "latitude": 19.0760 
    }
    ```
*   **Response (200):** `{ "success": true, "message": "Location updated successfully" }`
