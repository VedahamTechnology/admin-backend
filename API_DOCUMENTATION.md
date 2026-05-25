# Homster API Documentation

**Base URL:** `http://localhost:5000/api` (or your server URL)

**Last Updated:** May 25, 2026

---

## Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [Admin APIs](#admin-apis)
3. [Vendor APIs](#vendor-apis)
4. [User APIs](#user-apis)
5. [Notification APIs](#notification-apis)
6. [Error Handling](#error-handling)

---

## Authentication APIs

### 1. Register Customer

**Endpoint:** `POST /api/auth/register/customer`

**Authentication:** Not required

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "securePassword123",
  "gender": "male"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Customer registered successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "UC-00001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "role": "customer"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Email already registered" | "Phone already registered" | "Please provide all required fields"
}
```

---

### 2. Register Vendor

**Endpoint:** `POST /api/auth/register/vendor`

**Authentication:** Not required

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "9876543211",
  "password": "securePassword123",
  "gender": "female",
  "businessName": "Jane's Cleaning Services",
  "experience": 5,
  "skills": ["House Cleaning", "Office Cleaning"],
  "serviceAreas": [
    {
      "city": "Mumbai",
      "pincode": "400001"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Vendor registered successfully. Waiting for admin approval.",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439012",
    "userId": "UV-00001",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "9876543211",
    "role": "vendor",
    "verificationStatus": "pending"
  }
}
```

---

### 3. Login

**Endpoint:** `POST /api/auth/login`

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "customer"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Customer logged in successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "UC-00001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "role": "customer"
  }
}
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "Your account is deactivated. Contact support." | "Your account is banned. Contact support." | "Your account is pending. Wait for admin approval."
}
```

---

### 4. Refresh Access Token

**Endpoint:** `POST /api/auth/refresh`

**Authentication:** Not required (uses refresh token from cookies)

**Request Body:** None (refresh token in httpOnly cookie)

**Response (200):**
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 5. Get Current User

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required (Bearer token)

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "UC-00001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "role": "customer",
    "isActive": true,
    "isBanned": false,
    "createdAt": "2026-05-20T10:30:00Z",
    "updatedAt": "2026-05-25T15:45:30Z"
  }
}
```

---

### 6. Logout

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Required (Bearer token)

**Request Body:** None

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Admin APIs

### Admin Users Management

#### 1. Get All Users

**Endpoint:** `GET /api/admin/users`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `isActive` (optional): Filter by active status (true/false)

**Response (200):**
```json
{
  "success": true,
  "total": 150,
  "page": 1,
  "pages": 15,
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "UC-00001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "gender": "male",
      "role": "customer",
      "isActive": true,
      "isBanned": false,
      "location": {
        "type": "Point",
        "coordinates": [72.8479, 19.0176],
        "city": "Mumbai",
        "pincode": "400001",
        "address": "123 Main Street"
      },
      "createdAt": "2026-05-20T10:30:00Z",
      "updatedAt": "2026-05-25T15:45:30Z"
    }
  ]
}
```

---

#### 2. Get User By ID

**Endpoint:** `GET /api/admin/users/:id`

**Authentication:** Required (Admin only)

**Response (200):**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "UC-00001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "gender": "male",
    "role": "customer",
    "isActive": true,
    "isBanned": false,
    "location": { ... },
    "createdAt": "2026-05-20T10:30:00Z"
  }
}
```

---

#### 3. Block User

**Endpoint:** `PUT /api/admin/users/:id/block`

**Authentication:** Required (Admin only)

**Request Body:** None

**Response (200):**
```json
{
  "success": true,
  "message": "User blocked successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "UC-00001",
    "email": "john@example.com",
    "isBanned": true
  }
}
```

---

#### 4. Unblock User

**Endpoint:** `PUT /api/admin/users/:id/unblock`

**Authentication:** Required (Admin only)

**Request Body:** None

**Response (200):**
```json
{
  "success": true,
  "message": "User unblocked successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "UC-00001",
    "email": "john@example.com",
    "isBanned": false
  }
}
```

---

#### 5. Delete User

**Endpoint:** `DELETE /api/admin/users/:id`

**Authentication:** Required (Admin only)

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

#### 6. Search Users

**Endpoint:** `GET /api/admin/users/search`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `query` (required): Search term (name, email, phone, city, pincode, userId, gender)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "query": "John",
  "total": 5,
  "page": 1,
  "pages": 1,
  "users": [...]
}
```

---

### Admin Vendors Management

#### 1. Get All Vendors

**Endpoint:** `GET /api/admin/vendors`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `status` (optional): Filter by verification status (pending, approved, rejected)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "total": 50,
  "page": 1,
  "pages": 5,
  "vendors": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "userId": "UV-00001",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "9876543211",
      "role": "vendor",
      "isActive": true,
      "isBanned": false,
      "vendor": {
        "businessName": "Jane's Cleaning Services",
        "ownerName": "Jane Smith",
        "experience": 5,
        "skills": ["House Cleaning", "Office Cleaning"],
        "verificationStatus": "approved",
        "rejectionReason": null,
        "isAvailable": true,
        "serviceCategories": [
          {
            "_id": "507f1f77bcf86cd799439013",
            "name": "Cleaning"
          }
        ]
      },
      "location": { ... },
      "createdAt": "2026-05-20T10:30:00Z"
    }
  ]
}
```

---

#### 2. Get Vendor By ID

**Endpoint:** `GET /api/admin/vendors/:id`

**Authentication:** Required (Admin only)

**Response (200):**
```json
{
  "success": true,
  "vendor": { ... }
}
```

---

#### 3. Approve Vendor

**Endpoint:** `PUT /api/admin/vendors/:id/approve`

**Authentication:** Required (Admin only)

**Request Body:** None

**Response (200):**
```json
{
  "success": true,
  "message": "Vendor approved successfully",
  "vendor": {
    "id": "507f1f77bcf86cd799439012",
    "userId": "UV-00001",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "verificationStatus": "approved"
  }
}
```

---

#### 4. Reject Vendor

**Endpoint:** `PUT /api/admin/vendors/:id/reject`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "reason": "Incomplete documentation"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Vendor rejected",
  "vendor": {
    "id": "507f1f77bcf86cd799439012",
    "verificationStatus": "rejected",
    "rejectionReason": "Incomplete documentation"
  }
}
```

---

#### 5. Block Vendor

**Endpoint:** `PUT /api/admin/vendors/:id/block`

**Authentication:** Required (Admin only)

**Response (200):**
```json
{
  "success": true,
  "message": "Vendor blocked successfully",
  "vendor": {
    "id": "507f1f77bcf86cd799439012",
    "userId": "UV-00001",
    "email": "jane@example.com",
    "isBanned": true
  }
}
```

---

#### 6. Unblock Vendor

**Endpoint:** `PUT /api/admin/vendors/:id/unblock`

**Authentication:** Required (Admin only)

**Response (200):**
```json
{
  "success": true,
  "message": "Vendor unblocked successfully",
  "vendor": {
    "id": "507f1f77bcf86cd799439012",
    "isBanned": false
  }
}
```

---

#### 7. Delete Vendor

**Endpoint:** `DELETE /api/admin/vendors/:id`

**Authentication:** Required (Admin only)

**Response (200):**
```json
{
  "success": true,
  "message": "Vendor deleted successfully"
}
```

---

#### 8. Search Vendors

**Endpoint:** `GET /api/admin/vendors/search`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `query` (required): Search term (name, email, phone, business name, city)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

---

#### 9. Get Vendors By Distance

**Endpoint:** `GET /api/admin/vendors/nearby`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `latitude` (required): User latitude
- `longitude` (required): User longitude
- `distance` (optional): Distance in km (default: 5)
- `limit` (optional): Items per page (default: 10)

---

### Admin Categories Management

#### 1. Create Category

**Endpoint:** `POST /api/admin/categories`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "name": "Cleaning",
  "description": "Home and office cleaning services",
  "image": "https://example.com/cleaning.jpg",
  "icon": "🧹",
  "displayOrder": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "category": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Cleaning",
    "description": "Home and office cleaning services",
    "image": "https://example.com/cleaning.jpg",
    "icon": "🧹",
    "displayOrder": 1,
    "isActive": true,
    "createdAt": "2026-05-25T10:30:00Z"
  }
}
```

---

#### 2. Get All Categories

**Endpoint:** `GET /api/admin/categories`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `isActive` (optional): Filter by active status (true/false/all) (default: true)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "total": 10,
  "page": 1,
  "pages": 1,
  "categories": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Cleaning",
      "description": "Home and office cleaning services",
      "image": "https://example.com/cleaning.jpg",
      "icon": "🧹",
      "displayOrder": 1,
      "isActive": true,
      "createdAt": "2026-05-25T10:30:00Z"
    }
  ]
}
```

---

#### 3. Get Category By ID

**Endpoint:** `GET /api/admin/categories/:id`

**Authentication:** Required (Admin only)

**Response (200):**
```json
{
  "success": true,
  "category": { ... }
}
```

---

#### 4. Update Category

**Endpoint:** `PUT /api/admin/categories/:id`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "name": "Cleaning Services",
  "description": "Updated description",
  "image": "https://example.com/cleaning-new.jpg",
  "icon": "🧼",
  "isActive": true,
  "displayOrder": 2
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Category updated successfully",
  "category": { ... }
}
```

---

#### 5. Delete Category

**Endpoint:** `DELETE /api/admin/categories/:id`

**Authentication:** Required (Admin only)

**Response (200):**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

#### 6. Bulk Update Category Status

**Endpoint:** `POST /api/admin/categories/bulk/status`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "ids": ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"],
  "isActive": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Categories updated successfully",
  "updatedCount": 2
}
```

---

### Admin Services Management

#### 1. Create Service (Admin)

**Endpoint:** `POST /api/admin/services`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "name": "Home Cleaning",
  "description": "Professional home cleaning service",
  "category": "507f1f77bcf86cd799439013",
  "brand": "507f1f77bcf86cd799439014",
  "basePrice": 500,
  "discountedPrice": 450,
  "estimatedDuration": 120,
  "image": "https://example.com/cleaning.jpg",
  "images": ["https://example.com/cleaning1.jpg"],
  "features": ["Dusting", "Mopping", "Cleaning"],
  "includes": ["Materials", "Labour"],
  "excludes": ["Windows cleaning"],
  "displayOrder": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Service created successfully",
  "service": {
    "_id": "507f1f77bcf86cd799439015",
    "name": "Home Cleaning",
    "description": "Professional home cleaning service",
    "category": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Cleaning"
    },
    "basePrice": 500,
    "discountedPrice": 450,
    "estimatedDuration": 120,
    "isActive": true,
    "vendors": []
  }
}
```

---

#### 2. Get All Services (Admin)

**Endpoint:** `GET /api/admin/services`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `category` (optional): Filter by category ID
- `isActive` (optional): Filter by active status (true/false/all) (default: true)
- `search` (optional): Search by name or description
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "total": 50,
  "page": 1,
  "pages": 5,
  "services": [ ... ]
}
```

---

#### 3. Get Service By ID

**Endpoint:** `GET /api/admin/services/:id`

**Authentication:** Required (Admin only)

**Response (200):**
```json
{
  "success": true,
  "service": {
    "_id": "507f1f77bcf86cd799439015",
    "name": "Home Cleaning",
    "description": "Professional home cleaning service",
    "category": { ... },
    "brand": { ... },
    "basePrice": 500,
    "discountedPrice": 450,
    "estimatedDuration": 120,
    "vendors": [
      {
        "vendorId": {
          "_id": "507f1f77bcf86cd799439012",
          "firstName": "Jane",
          "lastName": "Smith",
          "businessName": "Jane's Cleaning"
        },
        "vendorPrice": 550,
        "isAvailable": true
      }
    ]
  }
}
```

---

#### 4. Update Service (Admin)

**Endpoint:** `PUT /api/admin/services/:id`

**Authentication:** Required (Admin only)

**Request Body:** Same as Create Service

**Response (200):**
```json
{
  "success": true,
  "message": "Service updated successfully",
  "service": { ... }
}
```

---

#### 5. Delete Service

**Endpoint:** `DELETE /api/admin/services/:id`

**Authentication:** Required (Admin only)

**Response (200):**
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

---

#### 6. Get Services By Category

**Endpoint:** `GET /api/admin/services/category/:categoryId`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "total": 10,
  "page": 1,
  "pages": 1,
  "services": [ ... ]
}
```

---

#### 7. Remove Vendor From Service

**Endpoint:** `PUT /api/admin/services/:id/remove-vendor`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "vendorId": "507f1f77bcf86cd799439012"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Vendor removed from service successfully",
  "service": { ... }
}
```

---

#### 8. Bulk Update Service Status

**Endpoint:** `POST /api/admin/services/bulk/status`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "ids": ["507f1f77bcf86cd799439015", "507f1f77bcf86cd799439016"],
  "isActive": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Services updated successfully",
  "updatedCount": 2
}
```

---

## Vendor APIs

### Vendor Profile Management

#### 1. Get Vendor Profile

**Endpoint:** `GET /api/vendor/profile`

**Authentication:** Required (Vendor only)

**Response (200):**
```json
{
  "success": true,
  "vendor": {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "UV-00001",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "9876543211",
    "gender": "female",
    "role": "vendor",
    "location": { ... },
    "vendor": {
      "businessName": "Jane's Cleaning Services",
      "ownerName": "Jane Smith",
      "experience": 5,
      "skills": ["House Cleaning", "Office Cleaning"],
      "serviceCategories": [ ... ],
      "verificationStatus": "approved",
      "isAvailable": true
    }
  }
}
```

---

#### 2. Update Vendor Profile

**Endpoint:** `PUT /api/vendor/profile`

**Authentication:** Required (Vendor only)

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "9876543211",
  "gender": "female",
  "businessName": "Jane's Premium Cleaning",
  "ownerName": "Jane Smith",
  "experience": 6,
  "skills": ["House Cleaning", "Office Cleaning", "Carpet Cleaning"],
  "address": "123 Main Street",
  "city": "Mumbai",
  "pincode": "400001"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "vendor": {
    "id": "507f1f77bcf86cd799439012",
    "userId": "UV-00001",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "9876543211",
    "businessName": "Jane's Premium Cleaning",
    "ownerName": "Jane Smith",
    "experience": 6,
    "location": { ... }
  }
}
```

---

#### 3. Update Current Location

**Endpoint:** `PUT /api/vendor/profile/location`

**Authentication:** Required (Vendor only)

**Request Body:**
```json
{
  "latitude": 19.0176,
  "longitude": 72.8479
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Location updated successfully"
}
```

---

#### 4. Add Service Categories

**Endpoint:** `POST /api/vendor/profile/categories`

**Authentication:** Required (Vendor only, Approved only)

**Request Body:**
```json
{
  "categoryIds": ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Service categories added successfully",
  "serviceCategories": [ ... ]
}
```

---

#### 5. Update Availability

**Endpoint:** `PUT /api/vendor/profile/availability`

**Authentication:** Required (Vendor only, Approved only)

**Request Body:**
```json
{
  "isAvailable": true,
  "availabilityHours": {
    "Monday": { "start": "09:00", "end": "18:00" },
    "Tuesday": { "start": "09:00", "end": "18:00" },
    "Wednesday": { "start": "09:00", "end": "18:00" },
    "Thursday": { "start": "09:00", "end": "18:00" },
    "Friday": { "start": "09:00", "end": "18:00" },
    "Saturday": { "start": "10:00", "end": "16:00" },
    "Sunday": { "start": null, "end": null }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Availability updated successfully"
}
```

---

#### 6. Get Vendor Stats

**Endpoint:** `GET /api/vendor/profile/stats`

**Authentication:** Required (Vendor only, Approved only)

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "totalBookings": 50,
    "completedBookings": 45,
    "cancelledBookings": 3,
    "pendingBookings": 2,
    "averageRating": 4.5,
    "totalEarnings": 22500,
    "thisMonthEarnings": 2500
  }
}
```

---

#### 7. Get Available Services

**Endpoint:** `GET /api/vendor/profile/services/available`

**Authentication:** Required (Vendor only, Approved only)

**Query Parameters:**
- `categoryId` (optional): Filter by category
- `search` (optional): Search by service name
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "total": 50,
  "page": 1,
  "pages": 5,
  "services": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Home Cleaning",
      "description": "Professional home cleaning service",
      "category": { ... },
      "basePrice": 500,
      "discountedPrice": 450,
      "estimatedDuration": 120,
      "image": "https://example.com/cleaning.jpg"
    }
  ]
}
```

---

#### 8. Get Service Categories

**Endpoint:** `GET /api/vendor/profile/services/categories`

**Authentication:** Required (Vendor only, Approved only)

**Response (200):**
```json
{
  "success": true,
  "categories": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Cleaning",
      "description": "Cleaning services",
      "icon": "🧹",
      "isActive": true
    }
  ]
}
```

---

#### 9. Select Service

**Endpoint:** `POST /api/vendor/profile/services/select`

**Authentication:** Required (Vendor only, Approved only)

**Request Body:**
```json
{
  "serviceId": "507f1f77bcf86cd799439015",
  "vendorPrice": 550
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Service selected successfully",
  "service": {
    "_id": "507f1f77bcf86cd799439015",
    "name": "Home Cleaning",
    "vendorPrice": 550,
    "isAvailable": true
  }
}
```

---

#### 10. Get My Selected Services

**Endpoint:** `GET /api/vendor/profile/services/my-services`

**Authentication:** Required (Vendor only, Approved only)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `isActive` (optional): Filter by active status

**Response (200):**
```json
{
  "success": true,
  "total": 10,
  "page": 1,
  "pages": 1,
  "services": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Home Cleaning",
      "description": "Professional home cleaning service",
      "vendorPrice": 550,
      "basePrice": 500,
      "isAvailable": true,
      "category": { ... }
    }
  ]
}
```

---

#### 11. Update Service Pricing

**Endpoint:** `PUT /api/vendor/profile/services/pricing`

**Authentication:** Required (Vendor only, Approved only)

**Request Body:**
```json
{
  "serviceId": "507f1f77bcf86cd799439015",
  "vendorPrice": 600
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Service pricing updated successfully"
}
```

---

#### 12. Remove Service

**Endpoint:** `POST /api/vendor/profile/services/remove`

**Authentication:** Required (Vendor only, Approved only)

**Request Body:**
```json
{
  "serviceId": "507f1f77bcf86cd799439015"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Service removed successfully"
}
```

---

### Vendor Services Management

#### 1. Create Service (Vendor)

**Endpoint:** `POST /api/vendor/services`

**Authentication:** Required (Vendor only, Approved only)

**Request Body:**
```json
{
  "name": "Premium House Cleaning",
  "description": "Deep cleaning service for houses",
  "category": "507f1f77bcf86cd799439013",
  "brand": "507f1f77bcf86cd799439014",
  "basePrice": 600,
  "discountedPrice": 550,
  "estimatedDuration": 180,
  "image": "https://example.com/premium-cleaning.jpg",
  "images": ["https://example.com/image1.jpg"],
  "features": ["Deep Cleaning", "Sanitization"],
  "includes": ["All materials", "Labour"],
  "excludes": ["Outside areas"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Service created successfully",
  "service": {
    "_id": "507f1f77bcf86cd799439020",
    "name": "Premium House Cleaning",
    "description": "Deep cleaning service for houses",
    "basePrice": 600,
    "discountedPrice": 550,
    "estimatedDuration": 180,
    "category": { ... },
    "vendors": [
      {
        "vendorId": "507f1f77bcf86cd799439012",
        "vendorPrice": 600,
        "isAvailable": true
      }
    ]
  }
}
```

---

#### 2. Get My Services

**Endpoint:** `GET /api/vendor/services`

**Authentication:** Required (Vendor only, Approved only)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `isActive` (optional): Filter by active status

**Response (200):**
```json
{
  "success": true,
  "total": 8,
  "page": 1,
  "pages": 1,
  "services": [ ... ]
}
```

---

#### 3. Get Service By ID (Vendor)

**Endpoint:** `GET /api/vendor/services/:id`

**Authentication:** Required (Vendor only, Approved only)

**Response (200):**
```json
{
  "success": true,
  "service": { ... }
}
```

---

#### 4. Update Service (Vendor)

**Endpoint:** `PUT /api/vendor/services/:id`

**Authentication:** Required (Vendor only, Approved only)

**Request Body:** Same as Create Service

**Response (200):**
```json
{
  "success": true,
  "message": "Service updated successfully",
  "service": { ... }
}
```

---

#### 5. Delete Service (Vendor)

**Endpoint:** `DELETE /api/vendor/services/:id`

**Authentication:** Required (Vendor only, Approved only)

**Response (200):**
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

---

#### 6. Update Service Availability

**Endpoint:** `PUT /api/vendor/services/:id/availability`

**Authentication:** Required (Vendor only, Approved only)

**Request Body:**
```json
{
  "isAvailable": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Service availability updated successfully"
}
```

---

#### 7. Search Services (Vendor)

**Endpoint:** `GET /api/vendor/services/search`

**Authentication:** Required (Vendor only, Approved only)

**Query Parameters:**
- `query` (required): Search term
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "services": [ ... ]
}
```

---

#### 8. Get Categories (Public Browse)

**Endpoint:** `GET /api/vendor/services/browse/categories`

**Authentication:** Not required

**Response (200):**
```json
{
  "success": true,
  "categories": [ ... ]
}
```

---

#### 9. Get Services By Category (Public Browse)

**Endpoint:** `GET /api/vendor/services/browse/category/:categoryId`

**Authentication:** Not required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "services": [ ... ]
}
```

---

### Vendor Bookings Management

#### 1. Get My Bookings (Vendor)

**Endpoint:** `GET /api/vendor/bookings`

**Authentication:** Required (Vendor only, Approved only)

**Query Parameters:**
- `status` (optional): Filter by status (pending, accepted, rejected, completed, cancelled)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "total": 20,
  "page": 1,
  "pages": 2,
  "bookings": [
    {
      "_id": "507f1f77bcf86cd799439025",
      "bookingId": "BK-00001",
      "customer": {
        "_id": "507f1f77bcf86cd799439011",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "9876543210"
      },
      "service": {
        "_id": "507f1f77bcf86cd799439015",
        "name": "Home Cleaning",
        "basePrice": 500,
        "estimatedDuration": 120
      },
      "category": {
        "name": "Cleaning"
      },
      "bookingDate": "2026-06-01T10:00:00Z",
      "timeSlot": {
        "startTime": "10:00",
        "endTime": "12:00"
      },
      "status": "pending",
      "pricing": {
        "basePrice": 500,
        "platformFee": 75,
        "tax": 0,
        "totalAmount": 575
      }
    }
  ]
}
```

---

#### 2. Get Booking By ID (Vendor)

**Endpoint:** `GET /api/vendor/bookings/:id`

**Authentication:** Required (Vendor only, Approved only)

**Response (200):**
```json
{
  "success": true,
  "booking": {
    "_id": "507f1f77bcf86cd799439025",
    "bookingId": "BK-00001",
    "customer": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "address": "123 Main Street, Mumbai"
    },
    "service": {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Home Cleaning",
      "basePrice": 500,
      "estimatedDuration": 120,
      "features": ["Dusting", "Mopping"],
      "includes": ["Materials", "Labour"]
    },
    "category": {
      "name": "Cleaning"
    },
    "bookingDate": "2026-06-01T10:00:00Z",
    "timeSlot": {
      "startTime": "10:00",
      "endTime": "12:00"
    },
    "serviceAddress": {
      "label": "Home",
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "instructions": "Ring the bell twice"
    },
    "status": "pending",
    "pricing": {
      "basePrice": 500,
      "platformFee": 75,
      "tax": 0,
      "totalAmount": 575,
      "vendorPayout": 425
    },
    "payment": {
      "method": "cash",
      "status": "pending"
    }
  }
}
```

---

#### 3. Accept Booking

**Endpoint:** `PUT /api/vendor/bookings/:id/accept`

**Authentication:** Required (Vendor only, Approved only)

**Request Body:** None

**Response (200):**
```json
{
  "success": true,
  "message": "Booking accepted successfully",
  "booking": {
    "id": "507f1f77bcf86cd799439025",
    "bookingId": "BK-00001",
    "status": "accepted"
  }
}
```

---

#### 4. Reject Booking

**Endpoint:** `PUT /api/vendor/bookings/:id/reject`

**Authentication:** Required (Vendor only, Approved only)

**Request Body:**
```json
{
  "reason": "Not available on this date"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Booking rejected successfully",
  "booking": {
    "id": "507f1f77bcf86cd799439025",
    "bookingId": "BK-00001",
    "status": "rejected",
    "reason": "Not available on this date"
  }
}
```

---

#### 5. Complete Booking

**Endpoint:** `PUT /api/vendor/bookings/:id/complete`

**Authentication:** Required (Vendor only, Approved only)

**Request Body:** None

**Response (200):**
```json
{
  "success": true,
  "message": "Booking marked as completed successfully",
  "booking": {
    "id": "507f1f77bcf86cd799439025",
    "bookingId": "BK-00001",
    "status": "completed"
  }
}
```

---

#### 6. Cancel Booking

**Endpoint:** `PUT /api/vendor/bookings/:id/cancel`

**Authentication:** Required (Vendor only, Approved only)

**Request Body:**
```json
{
  "reason": "Emergency situation"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "booking": {
    "id": "507f1f77bcf86cd799439025",
    "bookingId": "BK-00001",
    "status": "cancelled"
  }
}
```

---

#### 7. Get Booking Stats (Vendor)

**Endpoint:** `GET /api/vendor/bookings/stats`

**Authentication:** Required (Vendor only, Approved only)

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "totalBookings": 50,
    "pendingBookings": 2,
    "acceptedBookings": 10,
    "completedBookings": 35,
    "cancelledBookings": 3,
    "totalEarnings": 22500,
    "thisMonthEarnings": 2500,
    "averageRating": 4.5
  }
}
```

---

#### 8. Search Bookings (Vendor)

**Endpoint:** `GET /api/vendor/bookings/search`

**Authentication:** Required (Vendor only, Approved only)

**Query Parameters:**
- `query` (required): Search term (customer name, booking ID, service name)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "bookings": [ ... ]
}
```

---

#### 9. Submit Proof of Work

**Endpoint:** `POST /api/vendor/bookings/:id/proof-of-work`

**Authentication:** Required (Vendor only, Approved only)

**Description:** Vendors submit proof of work (before and after images) after completing a service. Can only be submitted for completed bookings.

**Request Body:**
```json
{
  "beforeImages": ["https://example.com/before1.jpg", "https://example.com/before2.jpg"],
  "afterImages": ["https://example.com/after1.jpg", "https://example.com/after2.jpg"],
  "vendorNotes": "Completed all cleaning tasks successfully"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Proof of work submitted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439025",
    "bookingId": "BK-00001",
    "status": "completed",
    "proofOfWork": {
      "beforeImages": ["https://example.com/before1.jpg", "https://example.com/before2.jpg"],
      "afterImages": ["https://example.com/after1.jpg", "https://example.com/after2.jpg"],
      "vendorNotes": "Completed all cleaning tasks successfully",
      "completedAt": "2026-06-01T12:05:00Z"
    }
  }
}
```

---

## User APIs

### User Services Management

#### 1. Get All Services (User)

**Endpoint:** `GET /api/user/services`

**Authentication:** Not required

**Query Parameters:**
- `category` (optional): Filter by category ID
- `search` (optional): Search by service name or description
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Sort field (name, basePrice, ratings.average) (default: createdAt)
- `sortOrder` (optional): Sort order (asc, desc) (default: desc)
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price

**Response (200):**
```json
{
  "success": true,
  "message": "Services retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Home Cleaning",
      "description": "Professional home cleaning service",
      "category": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Cleaning",
        "slug": "cleaning"
      },
      "basePrice": 500,
      "discountedPrice": 450,
      "estimatedDuration": 120,
      "image": "https://example.com/cleaning.jpg",
      "vendors": [
        {
          "vendorId": {
            "_id": "507f1f77bcf86cd799439012",
            "firstName": "Jane",
            "lastName": "Smith",
            "businessName": "Jane's Cleaning",
            "profileImage": "https://example.com/jane.jpg",
            "rating": 4.5
          },
          "vendorPrice": 550,
          "isAvailable": true
        }
      ]
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

---

#### 2. Get Categories (User)

**Endpoint:** `GET /api/user/services/categories`

**Authentication:** Not required

**Response (200):**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Cleaning",
      "slug": "cleaning",
      "image": "https://example.com/cleaning.jpg",
      "description": "Cleaning services"
    }
  ]
}
```

---

#### 3. Get Services By Category

**Endpoint:** `GET /api/user/services/category/:categoryId`

**Authentication:** Not required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Sort field (default: displayOrder)
- `sortOrder` (optional): Sort order (asc, desc) (default: asc)
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price
- `search` (optional): Search term

**Response (200):**
```json
{
  "success": true,
  "message": "Services retrieved successfully",
  "data": {
    "category": { ... },
    "services": [ ... ]
  },
  "pagination": { ... }
}
```

---

#### 4. Get Service Details

**Endpoint:** `GET /api/user/services/:serviceId`

**Authentication:** Not required

**Response (200):**
```json
{
  "success": true,
  "message": "Service details retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "name": "Home Cleaning",
    "description": "Professional home cleaning service",
    "category": { ... },
    "brand": { ... },
    "basePrice": 500,
    "discountedPrice": 450,
    "estimatedDuration": 120,
    "image": "https://example.com/cleaning.jpg",
    "images": ["https://example.com/image1.jpg"],
    "features": ["Dusting", "Mopping"],
    "includes": ["Materials", "Labour"],
    "excludes": ["Windows cleaning"],
    "vendors": [ ... ]
  }
}
```

---

#### 5. Search Services (User)

**Endpoint:** `GET /api/user/services/search`

**Authentication:** Not required

**Query Parameters:**
- `query` (required): Search term
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "message": "Services retrieved successfully",
  "data": [ ... ],
  "pagination": { ... }
}
```

---

#### 6. Get Top Rated Services

**Endpoint:** `GET /api/user/services/top-rated`

**Authentication:** Not required

**Query Parameters:**
- `limit` (optional): Number of services (default: 10)

**Response (200):**
```json
{
  "success": true,
  "message": "Top rated services retrieved successfully",
  "data": [ ... ]
}
```

---

### User Bookings Management

#### 1. Create Booking

**Endpoint:** `POST /api/user/bookings`

**Authentication:** Required (Customer only)

**Request Body:**
```json
{
  "serviceId": "507f1f77bcf86cd799439015",
  "vendorId": "507f1f77bcf86cd799439012",
  "bookingDate": "2026-06-01",
  "timeSlot": {
    "startTime": "10:00",
    "endTime": "12:00"
  },
  "serviceAddress": {
    "label": "Home",
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "instructions": "Ring the bell twice"
  },
  "paymentMethod": "cash",
  "customerNotes": "Please be careful with furniture"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439025",
    "bookingId": "BK-00001",
    "customer": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "profileImage": "https://example.com/john.jpg"
    },
    "vendor": {
      "_id": "507f1f77bcf86cd799439012",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "9876543211",
      "businessName": "Jane's Cleaning",
      "profileImage": "https://example.com/jane.jpg"
    },
    "service": {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Home Cleaning",
      "description": "Professional home cleaning service",
      "image": "https://example.com/cleaning.jpg",
      "basePrice": 500,
      "estimatedDuration": 120
    },
    "category": {
      "name": "Cleaning"
    },
    "bookingDate": "2026-06-01T10:00:00Z",
    "timeSlot": {
      "startTime": "10:00",
      "endTime": "12:00"
    },
    "serviceAddress": { ... },
    "status": "pending",
    "pricing": {
      "basePrice": 500,
      "platformFee": 75,
      "tax": 0,
      "discount": 0,
      "totalAmount": 575,
      "vendorPayout": 425
    },
    "payment": {
      "method": "cash",
      "status": "pending"
    }
  }
}
```

---

#### 2. Get My Bookings (User)

**Endpoint:** `GET /api/user/bookings`

**Authentication:** Required (Customer only)

**Query Parameters:**
- `status` (optional): Filter by status (pending, accepted, rejected, completed, cancelled)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order (asc, desc) (default: desc)

**Response (200):**
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": [ ... ],
  "pagination": {
    "total": 20,
    "page": 1,
    "limit": 10,
    "pages": 2
  }
}
```

---

#### 3. Get Booking Details

**Endpoint:** `GET /api/user/bookings/:bookingId`

**Authentication:** Required (Customer only)

**Response (200):**
```json
{
  "success": true,
  "message": "Booking details retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439025",
    "bookingId": "BK-00001",
    "customer": { ... },
    "vendor": { ... },
    "service": { ... },
    "category": { ... },
    "bookingDate": "2026-06-01T10:00:00Z",
    "timeSlot": { ... },
    "serviceAddress": { ... },
    "status": "pending",
    "pricing": { ... },
    "payment": { ... }
  }
}
```

---

#### 4. Cancel Booking

**Endpoint:** `PUT /api/user/bookings/:bookingId/cancel`

**Authentication:** Required (Customer only)

**Request Body:**
```json
{
  "reason": "Change of plans"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "bookingId": "BK-00001",
    "status": "cancelled",
    "reason": "Change of plans"
  }
}
```

---

#### 5. Reschedule Booking

**Endpoint:** `PUT /api/user/bookings/:bookingId/reschedule`

**Authentication:** Required (Customer only)

**Description:** Reschedule an existing booking to a new date and time. The previous reschedule history is automatically tracked.

**Request Body:**
```json
{
  "bookingDate": "2026-06-05",
  "timeSlot": {
    "startTime": "14:00",
    "endTime": "16:00"
  },
  "reason": "Previous date not available"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Booking rescheduled successfully",
  "data": {
    "bookingId": "BK-00001",
    "bookingDate": "2026-06-05T14:00:00Z",
    "timeSlot": {
      "startTime": "14:00",
      "endTime": "16:00"
    },
    "rescheduledAt": "2026-05-25T15:45:30Z",
    "rescheduleHistory": [
      {
        "previousDate": "2026-06-01",
        "previousSlot": {
          "startTime": "10:00",
          "endTime": "12:00"
        },
        "rescheduledBy": "customer",
        "reason": "Previous date not available",
        "timestamp": "2026-05-25T15:45:30Z"
      }
    ]
  }
}
```

---

#### 6. Verify Start OTP

**Endpoint:** `POST /api/user/bookings/:bookingId/verify-start-otp`

**Authentication:** Required (Customer only)

**Request Body:**
```json
{
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "bookingId": "BK-00001",
    "serviceStarted": true,
    "startTime": "2026-06-01T10:00:00Z"
  }
}
```

---

#### 7. Verify End OTP

**Endpoint:** `POST /api/user/bookings/:bookingId/verify-end-otp`

**Authentication:** Required (Customer only)

**Request Body:**
```json
{
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "bookingId": "BK-00001",
    "serviceCompleted": true,
    "endTime": "2026-06-01T12:00:00Z"
  }
}
```

---

#### 8. Get Booking Stats (User)

**Endpoint:** `GET /api/user/bookings/stats`

**Authentication:** Required (Customer only)

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "totalBookings": 25,
    "pendingBookings": 2,
    "acceptedBookings": 5,
    "completedBookings": 17,
    "cancelledBookings": 1,
    "totalSpent": 11500,
    "thisMonthSpent": 1500
  }
}
```

---

#### 9. Search Bookings (User)

**Endpoint:** `GET /api/user/bookings/search`

**Authentication:** Required (Customer only)

**Query Parameters:**
- `query` (required): Search term (vendor name, booking ID, service name)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "bookings": [ ... ]
}
```

---

## Notification APIs

### 1. Get Notifications

**Endpoint:** `GET /api/notifications`

**Authentication:** Required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439030",
      "userId": "507f1f77bcf86cd799439011",
      "type": "booking_created",
      "title": "New Booking",
      "message": "You have a new booking from John Doe",
      "relatedData": {
        "bookingId": "507f1f77bcf86cd799439025",
        "bookingNumber": "BK-00001"
      },
      "isRead": false,
      "createdAt": "2026-05-25T15:45:30Z",
      "updatedAt": "2026-05-25T15:45:30Z"
    }
  ]
}
```

---

### 2. Get Unread Count

**Endpoint:** `GET /api/notifications/unread/count`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "unreadCount": 5
  }
}
```

---

### 3. Get Notifications By Type

**Endpoint:** `GET /api/notifications/type/:type`

**Authentication:** Required

**Path Parameters:**
- `type`: Notification type (booking_created, booking_accepted, booking_rejected, booking_completed, booking_cancelled, etc.)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": [ ... ]
}
```

---

### 4. Get Preferences

**Endpoint:** `GET /api/notifications/preferences`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Notification preferences retrieved successfully",
  "data": {
    "emailNotifications": true,
    "smsNotifications": true,
    "pushNotifications": true,
    "bookingNotifications": true,
    "promotionalNotifications": false
  }
}
```

---

### 5. Mark Notification As Read

**Endpoint:** `PUT /api/notifications/:notificationId/read`

**Authentication:** Required

**Request Body:** None

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read successfully",
  "data": {
    "notificationId": "507f1f77bcf86cd799439030",
    "isRead": true
  }
}
```

---

### 6. Mark All Notifications As Read

**Endpoint:** `PUT /api/notifications/read/all`

**Authentication:** Required

**Request Body:** None

**Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read successfully",
  "data": {
    "updatedCount": 5
  }
}
```

---

### 7. Delete Notification

**Endpoint:** `DELETE /api/notifications/:notificationId`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

### 8. Clear All Notifications

**Endpoint:** `DELETE /api/notifications`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "All notifications cleared successfully",
  "data": {
    "deletedCount": 15
  }
}
```

---

## Error Handling

### Standard Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Additional error details (only in development mode)"
}
```

### Common HTTP Status Codes

| Status Code | Meaning |
|------------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource successfully created |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Missing or invalid authentication token |
| 403 | Forbidden - User doesn't have permission to access resource |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Server-side error |

### Common Error Messages

- **Missing Required Fields:** "Please provide all required fields"
- **Unauthorized:** "Invalid or expired token"
- **Forbidden:** "You do not have permission to access this resource"
- **Not Found:** "Resource not found"
- **Duplicate Entry:** "Email already registered" | "Phone already registered"
- **Account Status Issues:** "Your account is deactivated" | "Your account is banned"

---

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

### Token Details

- **Access Token:** Valid for 15 minutes
- **Refresh Token:** Valid for 7 days (stored in httpOnly cookie)
- **Token Type:** JWT (JSON Web Token)

### Refresh Token Usage

When access token expires, use the refresh endpoint to get a new one:

```
POST /api/auth/refresh
```

The refresh token is automatically included in the request cookies.

---

## Socket.IO Events (Real-Time Notifications)

The API supports real-time notifications via WebSocket using Socket.IO.

### Client-Side Events

1. **Connect & Join User Room:**
   ```javascript
   socket.emit('user:join', userId);
   ```

2. **Leave User Room:**
   ```javascript
   socket.emit('user:leave', userId);
   ```

### Server-Side Events (Listen for)

1. **Booking Created:**
   ```
   Event: booking:created
   Payload: { bookingId, vendorId, customerId, ... }
   ```

2. **Booking Accepted:**
   ```
   Event: booking:accepted
   Payload: { bookingId, vendorId, ... }
   ```

3. **Booking Rejected:**
   ```
   Event: booking:rejected
   Payload: { bookingId, vendorId, reason, ... }
   ```

4. **Booking Completed:**
   ```
   Event: booking:completed
   Payload: { bookingId, vendorId, ... }
   ```

---

**End of API Documentation**

For any issues or questions, please contact the development team.

