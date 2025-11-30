# Job Portal API

A secure, role-based Job Portal backend built using **Node.js**, **Express**, and **MongoDB**.  
Supports **jobseekers**, **employers**, and **admins** with authentication, job posting, company management, and job applications — all with strong security & validation.

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

---

## Project Structure

```
src/
  server.js
  config/
    dbConfig.js
  routes/
    userRoutes.js
    jobRoutes.js
    companyRoutes.js
    applicationRoutes.js
  controllers/
    userController.js
    jobController.js
    companyController.js
    applicationController.js
  models/
    userModel.js
    jobModel.js
    companyModel.js
    applicationModel.js
  middlewares/
    authMiddleware.js
    logoutMiddleware.js
    roleMiddleware.js
    validateMiddleware.js
    sanitizeMiddleware.js
    loginLimiter.js
    verificationRateLimit.js
  utils/
    asyncHandler.js
    apiError.js
    apiResponse.js
    tokens.js
    slugify.js
    emails.js
    uploadHelper.js
    constants.js
    JoiSchema/
      authAndUserSchema.js
      companySchema.js
      jobSchema.js
      applicationSchema.js
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

# Pagination Limit
MAX_PAGE_LIMIT=100

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
npm run start
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
GET    /api/users
GET    /api/users/:id
```

### **Companies**
```
POST   /api/companies
GET    /api/companies
GET    /api/companies/:idOrSlug
PATCH  /api/companies/:id
DELETE /api/companies/:id
POST   /api/companies/:id/verify
POST   /api/companies/:id/unverify
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
GET    /api/applications/job/:jobId
GET    /api/applications/job/:jobId/stats
GET    /api/applications/:id
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

## Scripts
```json
"scripts": {
  "start": "nodemon src/server.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

---

## License
This project is licensed under **ISC License**.

---

## Future Improvements
- Swagger API documentation  
- Admin dashboard UI  
- Notification emails on status change  
- WebSockets for real-time updates  
- Better employer analytics dashboard  

---

