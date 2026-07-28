# Mini CRM Backend API

Backend API for a full-stack MERN mini-CRM application. It provides secure authentication, email OTP verification, JWT refresh-token flow, protected CRM contact APIs, activity logs, Redis-backed login rate limiting, MongoDB persistence, and Render deployment support.

## Project Status

This backend currently implements the required assignment backend features:

- Sign up and sign in
- Email OTP account verification
- JWT-based authentication
- Password hashing with bcrypt
- Secure HTTP-only cookie token storage
- Access-token refresh mechanism
- Protected backend routes through auth middleware
- REST APIs for authentication, profile, contacts, and activity logs
- Contact CRUD operations
- Contact search by name/email
- Contact filter by status
- Mongoose pagination
- Contact schema validation
- Request input validation
- Consistent success/error response shape
- Correct HTTP status codes
- Login rate limiting: 3 account login attempts per 10 minutes
- Upstash Redis integration for rate limiting
- Unit tests with Node test runner
- Render-ready deployment configuration through environment variables

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Nodemailer
- Redis
- Upstash Redis
- CORS
- dotenv
- Node test runner

## Folder Structure

```txt
backend/
  config/
    configuration.js        # Loads env config
    mongoConn.js            # MongoDB connection
    redis.js                # Upstash Redis client
  controllers/
    auth.controller.js      # Signup, login, OTP, refresh, password APIs
    contact.controller.js   # Contacts CRUD + activity logs
    user.controller.js      # Profile management
  middlewares/
    authMiddleware.js       # JWT route protection
    loginRateLimiter.js     # Redis login rate limiter
  models/
    activityLog.js          # Add/edit/delete event logs
    contact.js              # CRM contact schema
    otp.js                  # Email/password OTP records
    user.js                 # User schema
  routes/
    activity.routes.js
    auth.routes.js
    contact.routes.js
    index.js
    user.routes.js
  test/
    contactValidation.test.js
    responseHandler.test.js
  utils/
    authUtils.js
    contactValidation.js
    emailUtils.js
    responseHandler.js
  index.js
  package.json
```

## Environment Variables

Create `backend/.env` with these values:

```env
NODE_ENV=development
PORT=5000

MONGODB_DATABASE=mini_crm
MONGODB_URL_LOCAL=mongodb://127.0.0.1:27017
MONGODB_URL_PROD=mongodb+srv://username:password@cluster.mongodb.net

JWT_SK=replace_with_access_token_secret
JWT_REFRESH_SK=replace_with_refresh_token_secret
JWT_RESET_SK=replace_with_reset_token_secret

FRONTEND_URL=http://localhost:5173

EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_app_password
EMAIL_FROM="Mini CRM <your_email@example.com>"

REDIS_URL=redis://default:password@your-upstash-host.upstash.io:6379
```

For Render production:

```env
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

When `NODE_ENV=production`, the backend uses `MONGODB_URL_PROD` and secure cross-site cookies with `sameSite=none`.

## Local Setup

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Start production server locally:

```bash
npm start
```

Run tests:

```bash
npm test
```

## API Base URL

Local:

```txt
http://localhost:5000/api
```

Render:

```txt
https://your-render-service.onrender.com/api
```

## Authentication Flow

1. User signs up with name, email, password, and confirm password.
2. Backend hashes password with bcrypt.
3. Backend creates the user as `verified: false`.
4. Backend generates a 6-digit OTP and emails it to the user.
5. User submits OTP through the verify API.
6. Backend marks user as verified.
7. User signs in.
8. Backend creates an access token and refresh token.
9. Tokens are stored in HTTP-only cookies.
10. Protected APIs validate the access token through middleware.
11. Refresh API creates a new access token when the old access token expires.

## Security

- Passwords are hashed using bcrypt.
- Access token expires in 15 minutes.
- Refresh token expires in 7 days.
- Tokens are stored in HTTP-only cookies.
- Production cookies use `secure: true` and `sameSite: none`.
- Protected routes use `verifyToken` middleware.
- Login route is rate limited through Redis.
- Invalid or expired tokens return proper `401` responses.
- Duplicate users and duplicate contact emails return `409`.
- Validation errors return `400`.

## Login Rate Limiting

Login rate limiting is applied only to:

```txt
POST /api/auth/login
```

Current policy:

- Account-specific limit: 3 login attempts per 10 minutes
- IP safety limit: 20 login attempts per 10 minutes
- Store: Upstash Redis
- Failure mode: fail open if Redis is temporarily unavailable

The rate limiter returns:

```json
{
  "success": false,
  "message": "Too many login attempts. Please try again later.",
  "retryAfter": 600
}
```

Response headers include:

```txt
Retry-After
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
```

## Contact Model

Each contact belongs to the logged-in user.

```txt
Name
Email
Phone
Company
Status: Lead / Prospect / Customer
Notes
CreatedAt
UpdatedAt
```

Schema features:

- Required fields for name, email, phone, company, and status
- Email format validation
- Phone format validation
- Status enum validation
- Notes max length validation
- Unique contact email per user
- User-scoped contact access

## Activity Logs

Every contact create, edit, and delete event creates an activity log.

Each activity log stores:

- User ID
- User name
- User email
- Contact ID
- Contact name
- Action: `created`, `updated`, `deleted`
- Human-readable message
- Field-level change details
- Timestamp

Example update log detail:

```json
{
  "field": "Status",
  "before": "Lead",
  "after": "Customer"
}
```

If an edit request does not change any contact content, the API returns:

```txt
No content changed
```

and no activity log is created.

## API Documentation

All protected routes require a valid `accessToken` cookie.

### Health

#### GET `/`

Returns the backend health message.

#### GET `/api`

Returns the main API router health message.

### Auth APIs

#### POST `/api/auth/register`

Create a new user and send verification OTP.

Request:

```json
{
  "name": "Demo User",
  "email": "demo@example.com",
  "password": "Password123",
  "confirmPassword": "Password123"
}
```

Success:

```json
{
  "success": true,
  "message": "Registration successful! Verification OTP sent to your registered email.",
  "data": {
    "id": "user_id",
    "name": "Demo User",
    "email": "demo@example.com",
    "verified": false,
    "role": "User"
  }
}
```

#### POST `/api/auth/isverify`

Verify account using email OTP.

Request:

```json
{
  "email": "demo@example.com",
  "otp": "123456"
}
```

#### POST `/api/auth/login`

Sign in verified user. Rate limited through Upstash Redis.

Request:

```json
{
  "email": "demo@example.com",
  "password": "Password123"
}
```

Success sets:

```txt
accessToken cookie
refreshToken cookie
```

#### POST `/api/auth/refresh-token`

Creates a new access token from a valid refresh token cookie.

#### POST `/api/auth/logout`

Protected. Clears auth cookies and removes stored refresh token.

#### POST `/api/auth/forgot-password`

Sends password reset OTP if the email exists.

Request:

```json
{
  "email": "demo@example.com"
}
```

#### POST `/api/auth/reset-password`

Reset password using OTP.

Request:

```json
{
  "email": "demo@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

#### POST `/api/auth/change-password`

Protected. Change password while logged in.

Request:

```json
{
  "currentPassword": "Password123",
  "newPassword": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

### Profile APIs

#### GET `/api/users/me`

Protected. Returns logged-in user profile.

#### PATCH `/api/users/update`

Protected. Updates profile name/email.

Request:

```json
{
  "name": "Updated User",
  "email": "updated@example.com"
}
```

#### DELETE `/api/users/delete`

Protected. Deletes the logged-in user account, contacts, and activity logs.

### Contact APIs

#### GET `/api/contacts`

Protected. Returns paginated contacts.

Query params:

```txt
page=1
limit=10
search=demo
status=Lead
```

Examples:

```txt
GET /api/contacts?page=1&limit=10
GET /api/contacts?page=1&limit=10&search=asha
GET /api/contacts?page=1&limit=10&status=Customer
```

Response includes:

```json
{
  "contacts": [],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "counts": {
    "total": 0,
    "Lead": 0,
    "Prospect": 0,
    "Customer": 0
  }
}
```

#### POST `/api/contacts`

Protected. Add a contact.

Request:

```json
{
  "name": "Asha Rao",
  "email": "asha@example.com",
  "phone": "+91 98765 43210",
  "company": "Jaimax",
  "status": "Lead",
  "notes": "Interested in CRM demo"
}
```

#### PATCH `/api/contacts/:id`

Protected. Edit a contact.

Request:

```json
{
  "status": "Customer",
  "notes": "Converted after demo"
}
```

If content changed, an activity log is created with exact changed fields.

If no content changed, the API returns `No content changed` and skips activity logging.

#### DELETE `/api/contacts/:id`

Protected. Delete a contact and create a deleted activity log with the contact snapshot.

### Activity Log APIs

#### GET `/api/activity-logs`

Protected. Returns user activity logs.

Query params:

```txt
page=1
limit=3
```

#### GET `/api/activity-logs/contacts/:contactId`

Protected. Returns activity logs for one contact.

Query params:

```txt
page=1
limit=3
```

## Response Format

Success:

```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Error",
  "error": "Error details"
}
```

## Common HTTP Status Codes

```txt
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
429 Too Many Requests
500 Internal Server Error
```

## Tests

The backend uses Node's built-in test runner.

Run:

```bash
npm test
```

Current test coverage includes:

- Contact input validation
- Email normalization
- Invalid status handling
- Response handler status-code behavior

## Render Deployment

### 1. Push Backend To GitHub

Create a GitHub repository for the backend and push this backend folder.

### 2. Create Render Web Service

In Render:

- Choose `New Web Service`
- Connect the backend GitHub repository
- Runtime: Node
- Build command:

```bash
npm install
```

- Start command:

```bash
npm start
```

### 3. Add Render Environment Variables

Set these in Render:

```env
NODE_ENV=production
PORT=10000
MONGODB_DATABASE=mini_crm
MONGODB_URL_PROD=mongodb+srv://...
JWT_SK=...
JWT_REFRESH_SK=...
JWT_RESET_SK=...
FRONTEND_URL=https://your-frontend-domain.vercel.app
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=...
REDIS_URL=redis://default:password@your-upstash-host.upstash.io:6379
```

### 4. Deploy

After deployment, Render gives a live backend URL like:

```txt
https://your-service-name.onrender.com
```

Use this as the backend API URL:

```txt
https://your-service-name.onrender.com/api
```

## Upstash Redis Setup

1. Create a free Upstash Redis database.
2. Copy the Redis connection URL.
3. Add it to Render as `REDIS_URL`.
4. The backend automatically uses TLS for Upstash hosts.
5. Login rate limiting becomes active after Redis connects.

## Frontend Connection

Set the frontend API env variable to the deployed backend API:

```env
VITE_API_URL=https://your-service-name.onrender.com/api
```

Also set backend `FRONTEND_URL` to the deployed frontend domain so CORS and cookies work correctly.

## Assignment Checklist

Backend requirements:

- [x] Node.js + Express backend
- [x] MongoDB + Mongoose
- [x] Proper folder structure
- [x] Auth routes
- [x] Contact routes
- [x] JWT authentication
- [x] bcrypt password hashing
- [x] Protected backend routes
- [x] Token refresh mechanism
- [x] Secure HTTP-only token cookies
- [x] Input validation
- [x] Better schema validation
- [x] Correct HTTP status codes
- [x] Login rate limit: 3 attempts per 10 minutes
- [x] Upstash Redis rate-limit store
- [x] Mongoose pagination
- [x] Activity logs for add/edit/delete
- [x] Unit tests
- [x] Render deployment ready

Full project deliverables:

- [ ] Live frontend URL
- [ ] Live backend API URL
- [ ] GitHub frontend repository
- [ ] GitHub backend repository
- [x] API documentation in README
- [x] Postman collection available in project root

## Notes

- Existing users already marked as verified in MongoDB remain verified.
- New signups require OTP verification before login.
- Activity logs are contact-specific and include changed fields.
- Contact pagination is 10 per page.
- Activity log pagination is 3 per page.
- Redis rate limiting is applied only to the login route.
