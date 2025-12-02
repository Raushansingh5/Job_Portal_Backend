# Job Portal API - README (YAML Version)

project:
  name: "Job Portal API"
  description: >
    A secure, role-based Job Portal backend built using Node.js, Express,
    and MongoDB. Supports jobseekers, employers, and admins with authentication,
    company management, job postings, and job applications. Includes automated
    testing, CI/CD, ESLint, Docker, and production deployments.

deployments:
  dockerfile_render: "https://job-portal-backend-with-docker.onrender.com/api/health"
  dockerhub_render: "https://jobportal-with-dockerhub.onrender.com/api/health"
  dockerhub_image: "rajatraushan5/jobportal-api:v1"

enhancements:
  - "Added ESLint (flat config)"
  - "Added GitHub Actions CI (lint + test + caching)"
  - "Added Docker support"
  - "Dockerfile-based deployment on Render"
  - "DockerHub image deployment on Render"
  - "Minimum automated testing added"

features:
  authentication:
    - "Register with email OTP verification"
    - "Login with access token + refresh token (HTTP-only cookies)"
    - "Forgot password + reset"
    - "Refresh token rotation"
    - "Logout"
    - "Change password"
    - "Profile update with avatar + resume upload"
  company_management:
    - "Create, update, delete companies"
    - "Upload & update company logo"
    - "Slug auto-generation"
    - "Admin can verify/unverify companies"
    - "Filtering + search"
  job_management:
    - "Create/update/delete jobs"
    - "Employer-specific job posting"
    - "Filtering (type, experience, location, salary)"
    - "Sorting & pagination"
    - "Get job by ID or slug"
  job_applications:
    - "Jobseeker can apply once per job"
    - "Resume & job snapshot storage"
    - "Employer can view/update applicant status"
    - "View applicant stats"
    - "Jobseeker stats + delete application"
  security:
    - "Helmet"
    - "CORS with credentials"
    - "Global rate limiting"
    - "Joi validation"
    - "MongoDB sanitization"
    - "XSS sanitization"
    - "Central error handler"
    - "Secure refresh token cookies"
    - "Role-based Access Control (RBAC)"

tech_stack:
  backend:
    - Node.js
    - Express.js
    - MongoDB
    - Mongoose
  utilities:
    - Nodemailer
    - Cloudinary
    - JWT
    - Joi Validator
    - Rate Limiting
    - Sanitization Middlewares
  testing:
    - Jest
    - Supertest
    - MongoMemoryServer
    - Cross-env
  devops:
    - Docker
    - GitHub Actions
    - ESLint (Flat Config)

project_structure: |
  src/
    server.js
    app.js
    config/
    controllers/
    models/
    routes/
    middlewares/
    utils/
  tests/
    health.test.js
    auth.test.js
    user.test.js
    jobs.test.js
  Dockerfile
  eslint.config.mjs
  .github/workflows/ci.yml

installation:
  clone: |
    git clone <your-repo-url>
    cd jobportal
    npm install
  env_file: |
    PORT=6000
    MONGO_URI=your_mongo_uri

    # JWT
    JWT_ACCESS_SECRET=access_secret_here
    JWT_REFRESH_SECRET=refresh_secret_here
    ACCESS_TOKEN_EXPIRES=15m
    REFRESH_TOKEN_EXPIRES=7d

    # Bcrypt
    BCRYPT_ROUNDS=12

    # OTP
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

run:
  server: "npm start"
  dev_url: "http://localhost:6000"
  health_check: "/api/health"

api_endpoints:
  users:
    - POST /api/users/register
    - POST /api/users/verify-email-otp
    - POST /api/users/login
    - POST /api/users/resend-verification
    - POST /api/users/forgot-password
    - POST /api/users/reset-password
    - POST /api/users/change-password
    - POST /api/users/session/refresh
    - POST /api/users/session/logout
    - GET  /api/users/me
    - PATCH /api/users/me
  companies:
    - POST /api/companies
    - GET /api/companies
    - GET /api/companies/:idOrSlug
    - PATCH /api/companies/:id
    - DELETE /api/companies/:id
  jobs:
    - POST /api/jobs
    - GET /api/jobs
    - GET /api/jobs/my
    - GET /api/jobs/:idOrSlug
    - PATCH /api/jobs/:id
    - PATCH /api/jobs/:id/status
    - DELETE /api/jobs/:id
  applications:
    - POST /api/applications/:jobId/apply
    - GET /api/applications/my
    - GET /api/applications/my/stats
    - PATCH /api/applications/:id/status
    - PATCH /api/applications/:id/viewed
    - DELETE /api/applications/:id

testing:
  description: "Automated tests included using Jest, Supertest, and MongoMemoryServer."
  coverage:
    - "Health endpoint"
    - "Auth (register + login)"
    - "Protected route (/users/me)"
    - "Public jobs endpoint"
  run_command: "npm test"

docker:
  local_build: "docker build -t jobportal-api ."
  run_container: "docker run --env-file .env -p 6000:6000 jobportal-api"
  dockerhub_image: "rajatraushan5/jobportal-api:v1"

ci_cd:
  tools:
    - GitHub Actions
    - ESLint
    - Jest Tests
    - Dependency Caching
  triggers:
    - "push: main"
    - "pull_request: main"

future_improvements:
  - Swagger API Docs
  - Admin Dashboard UI
  - Notification Emails
  - WebSockets for Real-time Updates
  - Advanced Analytics
  - Docker Compose Setup
  - VPS Deployment with Nginx + PM2

license: "ISC"
