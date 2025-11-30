# Job Portal API

A secure, role-based Job Portal backend built using **Node.js**, **Express**, and **MongoDB**.  
Supports **jobseekers**, **employers**, and **admins** with authentication, job posting, company management, and job applications — all with strong security, validation, and **automated testing**.

---

## Features

### Authentication
- Register + email OTP verification  
- Login with access token + refresh token (HTTP-only cookies)  
- Forgot password + password reset OTP  
- Refresh token rotation  
- Logout  
- Change password  
- Secure profile update with avatar + resume upload (Cloudinary)

### Company Management
- Create/update/delete companies  
- Upload & update company logo  
- Slug generation  
- Admin can verify/unverify companies  
- Company listing with search & filters  

### Job Management
- Create/update/delete job postings  
- Employer can post jobs for their own company only  
- Filtering by:
  - title/description (search)
  - company
  - jobType
  - experienceLevel
  - city/state/country
  - remote (true/false)
  - status (open/closed/paused)
  - minSalary / maxSalary  
- Sorting, pagination  
- Get job by ID or slug  

### Job Applications
- Jobseekers can apply once per job (unique constraint enforced)  
- Resume snapshot + job snapshot stored  
- Employer/admin can:
  - View applicants  
  - Update application status  
  - Mark viewed  
  - Get applicants stats  
- Jobseeker can:
  - View own applications  
  - View personal stats  
  - Delete own application  

### Security
- Helmet  
- CORS with credentials  
- Global rate limiting  
- Input validation with Joi  
- MongoDB query sanitization  
- XSS sanitization  
- Central error handler  
- Secure cookies for refresh tokens  
- Protected routes via auth + role middleware  

---

## Tech Stack

- Node.js  
- Express.js  
- MongoDB + Mongoose  
- Cloudinary (file uploads)  
- Nodemailer (emails)  
- JWT Auth  
- Joi validation  
- Rate limiting  
- Sanitization middlewares  
- Jest + Supertest (Automated Testing)

---

## Project Structure

```
src/
  server.js
  app.js
  config/
  routes/
  controllers/
  models/
  middlewares/
  utils/
tests/
  health.test.js
  auth.test.js
  user.test.js
  jobs.test.js
```

---

## Installation

### 1) Clone & Install
```bash
git clone <your-repo-url>
cd jobportal
npm install
```

### 2) Create `.env`
```
PORT=6000
MONGO_URI=your_mongo_uri

# JWT
JWT_ACCESS_SECRET=access_secret_here
JWT_REFRESH_SECRET=refresh_secret_here
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d

# Bcrypt
BCRYPT_ROUNDS=12

# OTP System
VERIFY_OTP_EXPIRES_MIN=10
RESEND_VERIFY_MINUTES=5
RESET_OTP_EXPIRES_MIN=10
RESEND_RESET_MINUTES=5

# Cookies
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=localhost

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxxx
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx

# SMTP
SMTP_HOST=xxxx
SMTP_PORT=587
SMTP_USER=xxxx
SMTP_PASS=xxxx
SMTP_FROM="Job Portal <noreply@yourdomain.com>"
```

---

## Run Server

```bash
npm start
```

Default URL:
```
http://localhost:6000
```

Health check:
```
GET /api/health
```

---

## Roles Overview

| Role        | Permissions |
|-------------|-------------|
| jobseeker   | Apply jobs, manage applications, update profile |
| employer    | Manage own company, post jobs, manage applicants |
| admin       | Full control of users, companies, jobs, applications |

---

## API Endpoints Summary

### **Users**
```
POST   /api/users/register
POST   /api/users/verify-email-otp
POST   /api/users/login
POST   /api/users/resend-verification
POST   /api/users/forgot-password
POST   /api/users/reset-password
POST   /api/users/change-password
POST   /api/users/session/refresh
POST   /api/users/session/logout
GET    /api/users/me
PATCH  /api/users/me
```

### **Companies**
```
POST   /api/companies
GET    /api/companies
GET    /api/companies/:idOrSlug
PATCH  /api/companies/:id
DELETE /api/companies/:id
```

### **Jobs**
```
POST   /api/jobs
GET    /api/jobs
GET    /api/jobs/my
GET    /api/jobs/:idOrSlug
PATCH  /api/jobs/:id
PATCH  /api/jobs/:id/status
DELETE /api/jobs/:id
```

### **Applications**
```
POST   /api/applications/:jobId/apply
GET    /api/applications/my
GET    /api/applications/my/stats
PATCH  /api/applications/:id/status
PATCH  /api/applications/:id/viewed
DELETE /api/applications/:id
```

---

## Application & Job Stats

- `/api/applications/my/stats` → jobseeker stats  
- `/api/applications/job/:jobId/stats` → employer/admin stats  
- `/api/jobs/my` → employer/admin job list  

---

# ✅ Automated Testing

This project includes automated tests using:

- **Jest** – Test runner  
- **Supertest** – API testing  
- **MongoDB Memory Server** – In-memory test DB  
- **cross-env** – OS-independent test env  
- **Mocked email sending**

### Test Files
```
tests/
  health.test.js
  auth.test.js
  user.test.js
  jobs.test.js
```

---

## ✔ Minimum Testing Coverage

### 1️⃣ Health Test  
- `/api/health` → 200

### 2️⃣ Auth Tests  
- Register validation fail  
- Register success  
- Login blocked (email unverified)  
- Login success  

### 3️⃣ Protected Route Test  
- `/api/users/me` without token → 401  
- `/api/users/me` with token → 200  

### 4️⃣ Public Jobs Test  
- `/api/jobs` → returns array  

---

## Run Tests

```bash
npm test
```

---

## Scripts
```json
"scripts": {
  "start": "nodemon src/server.js",
  "test": "cross-env NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand"
}
```

---

## License
This project is licensed under **ISC License**.

---

## Future Improvements
- Swagger API documentation  
- Admin dashboard UI  
- Notification emails  
- WebSockets for real-time updates  
- Better employer analytics  

---
