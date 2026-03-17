# BillsAI Server

Backend API for the BillsAI React Native app, providing authentication and bill management functionality.

## Features

- User authentication with JWT
- Password reset functionality
- User profile management
- Bill management (create, read, update, delete)
- Bill payment tracking
- Bill statistics and analytics

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- Express Validator for request validation

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)

## Installation

1. Clone the repository (if not already done)
2. Navigate to the server directory:

```bash
cd server
```

3. Install dependencies:

```bash
npm install
```

4. Configure environment variables - copy the `.env.example` file to `.env` and update it with your settings:

```bash
cp .env.example .env
```

Then edit the `.env` file with your MongoDB connection string and JWT secret.

## Configuration

Update the `.env` file with your specific configuration:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/billsai
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

## Running the Server

### Development mode

```bash
npm run dev
```

This will start the server with nodemon for automatic reloading during development.

### Production mode

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/me` - Get the current authenticated user
- `POST /api/auth/forgot-password` - Request a password reset
- `POST /api/auth/reset-password/:token` - Reset password with token
- `PUT /api/auth/update-password` - Update password (authenticated)

### User Management

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Bill Management

- `GET /api/bills` - Get all bills (with filtering options)
- `GET /api/bills/:id` - Get a bill by ID
- `POST /api/bills` - Create a new bill
- `PUT /api/bills/:id` - Update a bill
- `DELETE /api/bills/:id` - Delete a bill
- `POST /api/bills/:id/payments` - Add a payment to a bill
- `GET /api/bills/statistics` - Get bill statistics

## Testing the API

You can use tools like Postman or curl to test the API endpoints.

Example curl command for login:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

## Error Handling

The API uses standard HTTP status codes:

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

All error responses include a message explaining the error.

## Security

- Passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Input validation using express-validator
- MongoDB injection protection via Mongoose

## License

This project is licensed under the MIT License.
