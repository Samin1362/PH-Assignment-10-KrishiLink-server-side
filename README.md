# 🌾 KrishiLink Backend API

A complete Node.js + Express.js + MongoDB backend API for the KrishiLink social agro-network platform connecting farmers, traders, and consumers.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Testing](#testing)
- [Deployment](#deployment)

---

## 🎯 Overview

KrishiLink is a social agro-network platform that enables farmers to post their crops, buyers to show interest, and facilitates agricultural transactions. The backend provides RESTful APIs with Firebase authentication, MongoDB storage, and comprehensive CRUD operations.

### Key Features

✅ Complete CRUD operations for crops  
✅ User management system  
✅ Interest/inquiry management  
✅ Search functionality  
✅ Firebase JWT authentication  
✅ Owner-based authorization  
✅ Automatic quantity management  
✅ Duplicate prevention  
✅ Production-ready error handling  

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js v5.1.0
- **Database:** MongoDB (Official Driver v7.0.0)
- **Authentication:** Firebase Admin SDK
- **Environment:** dotenv v16.6.1
- **Development:** nodemon v3.1.11
- **Deployment:** Vercel-ready

---

## 🚀 Installation

### Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account
- Firebase project (optional for development)

### Steps

1. **Clone the repository**

```bash
git clone <repository-url>
cd KrishiLink-server-side
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=krishilinkDB
NODE_ENV=development

# Optional: For Firebase authentication
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

4. **Start the server**

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server will run on: `http://localhost:5000`

---

## ⚙️ Configuration

### Environment Variables

| Variable                   | Description                          | Required | Default      |
| -------------------------- | ------------------------------------ | -------- | ------------ |
| `PORT`                     | Server port number                   | No       | 5000         |
| `MONGODB_URI`              | MongoDB connection string            | Yes      | -            |
| `DB_NAME`                  | Database name                        | No       | krishilinkDB |
| `NODE_ENV`                 | Environment (development/production) | No       | development  |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON        | No       | -            |

### Database Collections

The application uses two MongoDB collections:

1. **crops** - Stores crop information with embedded interests
2. **users** - Stores user profiles and information

---

## 📚 API Documentation

### Base URL

```
Local: http://localhost:5000
Production: https://your-app.vercel.app
```

### Response Format

All API responses follow a consistent structure:

**Success Response:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical details (dev mode only)"
}
```

---

## 🌾 Crops API

### 1. Get All Crops

Retrieve all crops with optional search functionality.

**Endpoint:** `GET /api/crops`

**Query Parameters:**

- `search` (optional) - Search term for name, type, location, or description

**Request Examples:**

```bash
# Get all crops
curl http://localhost:5000/api/crops

# Search crops
curl "http://localhost:5000/api/crops?search=tomato"
```

**Response:**

```json
{
  "success": true,
  "message": "Crops fetched successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Tomato",
      "type": "Vegetable",
      "pricePerUnit": 55,
      "unit": "kg",
      "quantity": 400,
      "description": "Fresh organic tomatoes",
      "location": "Bogura",
      "image": "https://example.com/tomato.jpg",
      "owner": {
        "ownerEmail": "farmer@example.com",
        "ownerName": "John Farmer"
      },
      "interests": [],
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Latest Crops

Retrieve the 6 most recently added crops (for homepage).

**Endpoint:** `GET /api/crops/latest`

**Request:**

```bash
curl http://localhost:5000/api/crops/latest
```

**Response:**

```json
{
  "success": true,
  "message": "Latest crops fetched successfully",
  "data": [ /* 6 most recent crops */ ]
}
```

---

### 3. Get Single Crop

Retrieve detailed information about a specific crop.

**Endpoint:** `GET /api/crops/:id`

**URL Parameters:**

- `id` - Crop's MongoDB ObjectId

**Request:**

```bash
curl http://localhost:5000/api/crops/507f1f77bcf86cd799439011
```

**Response:**

```json
{
  "success": true,
  "message": "Crop fetched successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Tomato",
    "type": "Vegetable",
    ...
  }
}
```

**Error (404):**

```json
{
  "success": false,
  "message": "Crop not found"
}
```

---

### 4. Get All Interests (Aggregated)

Retrieve all interests from all crops using MongoDB aggregation.

**Endpoint:** `GET /api/crops/interest`

**Request:**

```bash
curl http://localhost:5000/api/crops/interest
```

**Response:**

```json
{
  "success": true,
  "message": "All interests fetched successfully",
  "data": [
    {
      "_id": "i5544",
      "cropId": "u6564",
      "userEmail": "buyer@example.com",
      "userName": "Jane Buyer",
      "quantity": 100,
      "message": "Interested in buying",
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 5. Create Crop 🔒

Add a new crop posting. **Authentication required.**

**Endpoint:** `POST /api/crops`

**Authentication:** Required (Firebase JWT token)

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <firebase-token>
```

**Request Body:**

```json
{
  "name": "Tomato",
  "type": "Vegetable",
  "pricePerUnit": 55,
  "unit": "kg",
  "quantity": 400,
  "description": "Fresh organic tomatoes",
  "location": "Bogura",
  "image": "https://example.com/tomato.jpg",
  "owner": {
    "ownerEmail": "farmer@example.com",
    "ownerName": "John Farmer"
  }
}
```

**Request:**

```bash
curl -X POST http://localhost:5000/api/crops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "name": "Tomato",
    "type": "Vegetable",
    "pricePerUnit": 55,
    "unit": "kg",
    "quantity": 400,
    "description": "Fresh organic tomatoes",
    "location": "Bogura",
    "image": "https://example.com/tomato.jpg",
    "owner": {
      "ownerEmail": "farmer@example.com",
      "ownerName": "John Farmer"
    }
  }'
```

**Response (201):**

```json
{
  "success": true,
  "message": "Crop added successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Tomato",
    "interests": [],
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    ...
  }
}
```

**Error (401):**

```json
{
  "success": false,
  "message": "Unauthorized: No token provided"
}
```

---

### 6. Update Crop 🔒

Update crop information. **Owner only.**

**Endpoint:** `PUT /api/crops/:id`

**Authentication:** Required (Owner verification)

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <firebase-token>
```

**Request Body:** (partial update supported)

```json
{
  "pricePerUnit": 60,
  "quantity": 350,
  "description": "Updated description"
}
```

**Request:**

```bash
curl -X PUT http://localhost:5000/api/crops/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "pricePerUnit": 60,
    "quantity": 350
  }'
```

**Response (200):**

```json
{
  "success": true,
  "message": "Crop updated successfully",
  "data": { /* updated crop */ }
}
```

**Error (403):**

```json
{
  "success": false,
  "message": "Unauthorized: You can only update your own crops"
}
```

---

### 7. Delete Crop 🔒

Delete a crop posting. **Owner only.**

**Endpoint:** `DELETE /api/crops/:id`

**Authentication:** Required (Owner verification)

**Request:**

```bash
curl -X DELETE http://localhost:5000/api/crops/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

**Response (200):**

```json
{
  "success": true,
  "message": "Crop deleted successfully",
  "data": {
    "deletedCount": 1
  }
}
```

---

## 💬 Interests API

### 1. Add Interest

Show interest in a specific crop.

**Endpoint:** `POST /api/interests`

**Request Body:**

```json
{
  "cropId": "507f1f77bcf86cd799439011",
  "userEmail": "buyer@example.com",
  "userName": "Jane Buyer",
  "quantity": 100,
  "message": "Interested in buying 100kg"
}
```

**Request:**

```bash
curl -X POST http://localhost:5000/api/interests \
  -H "Content-Type: application/json" \
  -d '{
    "cropId": "507f1f77bcf86cd799439011",
    "userEmail": "buyer@example.com",
    "userName": "Jane Buyer",
    "quantity": 100,
    "message": "Interested in buying 100kg"
  }'
```

**Response (201):**

```json
{
  "success": true,
  "message": "Interest added successfully",
  "data": {
    "_id": "i5544",
    "cropId": "507f1f77bcf86cd799439011",
    "userEmail": "buyer@example.com",
    "userName": "Jane Buyer",
    "quantity": 100,
    "message": "Interested in buying 100kg",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error (400 - Duplicate):**

```json
{
  "success": false,
  "message": "You have already shown interest in this crop"
}
```

---

### 2. Get Sent Interests

Retrieve all interests sent by a specific user (My Interests page).

**Endpoint:** `GET /api/interests/sent?email=<user-email>`

**Query Parameters:**

- `email` (required) - User's email address

**Request:**

```bash
curl "http://localhost:5000/api/interests/sent?email=buyer@example.com"
```

**Response:**

```json
{
  "success": true,
  "message": "Sent interests fetched successfully",
  "data": [
    {
      "_id": "i5544",
      "cropId": "507f1f77bcf86cd799439011",
      "userEmail": "buyer@example.com",
      "userName": "Jane Buyer",
      "quantity": 100,
      "status": "pending",
      "cropDetails": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Tomato",
        "type": "Vegetable",
        "pricePerUnit": 55,
        "unit": "kg",
        "location": "Bogura",
        "image": "https://example.com/tomato.jpg",
        "owner": {
          "ownerEmail": "farmer@example.com",
          "ownerName": "John Farmer"
        }
      }
    }
  ]
}
```

---

### 3. Get Received Interests

Retrieve all interests for crops owned by a specific user.

**Endpoint:** `GET /api/interests/received?email=<owner-email>`

**Query Parameters:**

- `email` (required) - Crop owner's email address

**Request:**

```bash
curl "http://localhost:5000/api/interests/received?email=farmer@example.com"
```

**Response:**

```json
{
  "success": true,
  "message": "Received interests fetched successfully",
  "data": [
    {
      "_id": "i5544",
      "cropId": "507f1f77bcf86cd799439011",
      "userEmail": "buyer@example.com",
      "userName": "Jane Buyer",
      "quantity": 100,
      "status": "pending",
      "cropDetails": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Tomato",
        "type": "Vegetable",
        "pricePerUnit": 55,
        "quantity": 400
      }
    }
  ]
}
```

---

### 4. Update Interest Status

Accept or reject an interest. **Automatically reduces crop quantity on acceptance.**

**Endpoint:** `PUT /api/interests/status`

**Request Body:**

```json
{
  "interestId": "i5544",
  "cropId": "507f1f77bcf86cd799439011",
  "status": "accepted"
}
```

**Status Options:** `pending`, `accepted`, `rejected`

**Request:**

```bash
curl -X PUT http://localhost:5000/api/interests/status \
  -H "Content-Type: application/json" \
  -d '{
    "interestId": "i5544",
    "cropId": "507f1f77bcf86cd799439011",
    "status": "accepted"
  }'
```

**Response (200):**

```json
{
  "success": true,
  "message": "Interest accepted successfully",
  "data": {
    /* updated crop with reduced quantity */
  }
}
```

**Behavior:**

- When status = `"accepted"`: Crop quantity is automatically reduced by interest quantity
- Status updates are tracked with timestamps
- Returns the updated crop document

---

## 👤 Users API

### 1. Create User

Register a new user (called during sign-up).

**Endpoint:** `POST /api/users`

**Request Body:**

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "photoURL": "https://example.com/photo.jpg"
}
```

**Request:**

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "photoURL": "https://example.com/photo.jpg"
  }'
```

**Response (201):**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "photoURL": "https://example.com/photo.jpg",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Note:** Prevents duplicate users. Returns existing user if email already exists.

---

### 2. Get User by Email

Retrieve user information by email address.

**Endpoint:** `GET /api/users/:email`

**Request:**

```bash
curl http://localhost:5000/api/users/user@example.com
```

**Response (200):**

```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "photoURL": "https://example.com/photo.jpg",
    "phone": "123-456-7890",
    "address": "123 Main St",
    "bio": "Farmer from Bogura"
  }
}
```

---

### 3. Update User Profile

Update user profile information.

**Endpoint:** `PUT /api/users/:email`

**Request Body:** (all fields optional)

```json
{
  "name": "John Doe Updated",
  "photoURL": "https://example.com/new-photo.jpg",
  "phone": "123-456-7890",
  "address": "123 Main St",
  "bio": "Experienced farmer from Bogura"
}
```

**Request:**

```bash
curl -X PUT http://localhost:5000/api/users/user@example.com \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe Updated",
    "phone": "123-456-7890",
    "bio": "Experienced farmer"
  }'
```

**Response (200):**

```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": { /* updated user */ }
}
```

---

### 4. Get All Users

Retrieve all registered users.

**Endpoint:** `GET /api/users`

**Request:**

```bash
curl http://localhost:5000/api/users
```

**Response (200):**

```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": [ /* array of users */ ]
}
```

---

## 🔐 Authentication

The API uses Firebase JWT authentication for protected routes.

### Development Mode (No Firebase Setup)

If Firebase credentials are not configured, the server runs in development mode:

**Headers required:**

```
Authorization: Bearer dev-token
user-email: your-email@example.com
```

**Example:**

```bash
curl -X POST http://localhost:5000/api/crops \
  -H "Authorization: Bearer dev-token" \
  -H "user-email: farmer@example.com" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### Production Mode (With Firebase)

#### Backend Setup:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to Project Settings > Service Accounts
3. Click "Generate new private key"
4. Add the downloaded JSON to `.env`:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"..."}
```

#### Frontend Implementation:

**1. Install Firebase:**

```bash
npm install firebase
```

**2. Configure Firebase:**

```javascript
// firebase.config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

**3. Login and Get Token:**

```javascript
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase.config";

// Login
const userCredential = await signInWithEmailAndPassword(auth, email, password);

// Get token
const token = await userCredential.user.getIdToken();

// Use in API calls
fetch("http://localhost:5000/api/crops", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(cropData),
});
```

### Protected Endpoints

| Endpoint                | Method | Authentication |
| ----------------------- | ------ | -------------- |
| `POST /api/crops`       | POST   | ✅ Required    |
| `PUT /api/crops/:id`    | PUT    | ✅ Owner only  |
| `DELETE /api/crops/:id` | DELETE | ✅ Owner only  |

---

## 🧪 Testing

### Using cURL

**Health Check:**

```bash
curl http://localhost:5000/
```

**Create a Crop:**

```bash
curl -X POST http://localhost:5000/api/crops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -H "user-email: farmer@example.com" \
  -d '{
    "name": "Rice",
    "type": "Grain",
    "pricePerUnit": 50,
    "unit": "kg",
    "quantity": 1000,
    "description": "Premium basmati rice",
    "location": "Dinajpur",
    "image": "https://example.com/rice.jpg",
    "owner": {
      "ownerEmail": "farmer@example.com",
      "ownerName": "John Farmer"
    }
  }'
```

**Get All Crops:**

```bash
curl http://localhost:5000/api/crops
```

**Search Crops:**

```bash
curl "http://localhost:5000/api/crops?search=rice"
```

### Using Postman

1. Create a new collection "KrishiLink API"
2. Add base URL as variable: `{{base_url}}` = `http://localhost:5000`
3. For protected routes, add header:
   - Key: `Authorization`
   - Value: `Bearer YOUR_TOKEN`

### Response Codes

| Code | Meaning             | Description                     |
| ---- | ------------------- | ------------------------------- |
| 200  | OK                  | Request successful              |
| 201  | Created             | Resource created successfully   |
| 400  | Bad Request         | Invalid request data            |
| 401  | Unauthorized        | Missing or invalid token        |
| 403  | Forbidden           | Insufficient permissions        |
| 404  | Not Found           | Resource not found              |
| 500  | Internal Server Error | Server error occurred         |

---

## 🌐 Deployment

### Deploy to Vercel

1. **Install Vercel CLI (optional):**

```bash
npm i -g vercel
```

2. **Login to Vercel:**

```bash
vercel login
```

3. **Configure environment variables in Vercel Dashboard:**

   - `MONGODB_URI`
   - `DB_NAME`
   - `NODE_ENV=production`
   - `FIREBASE_SERVICE_ACCOUNT` (if using Firebase)

4. **Deploy:**

```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Vercel Configuration

The project includes `vercel.json` for seamless deployment:

```json
{
  "version": 2,
  "builds": [{ "src": "index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "index.js" }]
}
```

---

## 📂 Project Structure

```
KrishiLink-server-side/
├── config/
│   ├── db.js              # MongoDB configuration
│   └── firebase.js        # Firebase Admin setup
├── middleware/
│   └── verifyToken.js     # Authentication middleware
├── routes/
│   ├── cropsRoutes.js     # Crop endpoints
│   ├── interestsRoutes.js # Interest endpoints
│   └── usersRoutes.js     # User endpoints
├── index.js               # Server entry point
├── package.json           # Dependencies
├── vercel.json            # Vercel config
├── .env                   # Environment variables
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

---

## 📊 Database Schema

### Crops Collection

```javascript
{
  _id: ObjectId,
  name: String,
  type: String,
  pricePerUnit: Number,
  unit: String,
  quantity: Number,
  description: String,
  location: String,
  image: String,
  owner: {
    ownerEmail: String,
    ownerName: String
  },
  interests: [
    {
      _id: String,
      cropId: String,
      userEmail: String,
      userName: String,
      quantity: Number,
      message: String,
      status: String, // "pending" | "accepted" | "rejected"
      createdAt: Date,
      updatedAt: Date
    }
  ],
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Users Collection

```javascript
{
  _id: ObjectId,
  email: String, // unique
  name: String,
  photoURL: String,
  phone: String,
  address: String,
  bio: String,
  role: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚨 Common Issues & Solutions

### Issue: "Unauthorized: No token provided"

**Solution:** Add Authorization header with Firebase token or use development mode headers.

### Issue: "Crop not found"

**Solution:** Verify the crop ID is valid and exists in the database.

### Issue: "You have already shown interest"

**Solution:** Users can only show interest once per crop. Check existing interests.

### Issue: Database connection failed

**Solution:** Check MongoDB URI in `.env` and ensure network access is allowed.

---

## 📝 NPM Scripts

```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
npm install      # Install dependencies
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 👨‍💻 Author

KrishiLink Development Team

---

## 📞 Support

For issues and questions:

- Check this documentation
- Review the [Firebase documentation](https://firebase.google.com/docs)
- Check [MongoDB documentation](https://docs.mongodb.com)

---

**Built with ❤️ for the agricultural community** 🌾
