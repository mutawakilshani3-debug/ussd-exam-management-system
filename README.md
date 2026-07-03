# USSD Exam Management System

A full-stack examination management system: role-based dashboards
for Administrators, Examiners, Invigilators and Students, exam timetabling,
bulk student/staff import, notifications, activity logs, and downloadable
reports (PDF/Excel/CSV).

- **Backend:** Node.js, Express, MySQL (mysql2), JWT auth, bcrypt, Multer, Nodemailer
- **Frontend:** React 18, React Router, Axios, Chart.js
- **Database:** MySQL 8+, fully normalized with foreign keys

> This is a complete, runnable scaffold covering the full feature set end to
> end. A few advanced items (dark mode toggle, SMS/USSD gateway wiring,
> CSRF token middleware beyond Helmet's defaults) are left as clearly marked
> extension points — see **What's included vs. left as an extension point**
> below.

---

## 1. Prerequisites

- Node.js 18+ and npm
- MySQL 8+ (or MariaDB 10.6+) running locally or remotely
- (Optional) An SMTP account for real emails — Gmail, Mailtrap, SendGrid, etc.
  If you skip this, emails are simply logged to the backend console instead
  of failing.

## 2. Database setup

```bash
mysql -u root -p < backend/database/schema.sql
```

This creates the `ussd_db` database and every table
(users, courses, programmes, exam_timetable, notifications, activity_logs,
password_reset_tokens, file_upload_logs, etc.) with foreign keys and indexes.

## 3. Backend setup

```bash
cd backend
cp .env.example .env
# edit .env: set DB_PASSWORD, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, etc.
npm install
npm run seed     # creates the ONE Administrator account + sample programmes
npm run dev       # starts on http://localhost:5000 (nodemon)
# or: npm start
```

The seed script (`database/runSeed.js`) is safe to re-run: it checks for an
existing Administrator and refuses to create a second one, matching the
"single Admin account" requirement.

## 4. Frontend setup

```bash
cd frontend
cp .env.example .env
# REACT_APP_API_URL defaults to http://localhost:5000/api
npm install
npm start          # starts on http://localhost:3000
```

Log in with the admin email/password from your backend `.env`. From there
you can create Examiners, Invigilators, and courses; students self-register
at `/register`.

## 5. Project structure

```
backend/
  config/db.js              MySQL connection pool
  middleware/                auth (JWT), role guard, rate limiting, upload, error handler
  controllers/                one file per resource (auth, users, courses, timetable, ...)
  routes/                     Express routers, mounted in server.js
  database/schema.sql         full normalized schema
  database/runSeed.js         one-time admin + academic structure seed
  server.js                   app entry point

frontend/
  src/api/axios.js            pre-configured Axios instance (attaches JWT)
  src/context/AuthContext.js  auth state, login/register/logout
  src/components/             Sidebar, Topbar, ProtectedRoute, shared UI
  src/pages/                  Login/Register/Profile + admin/examiner/invigilator/student dashboards
  src/styles/theme.css        design system (single global stylesheet)
```

## 6. Key API endpoints

| Area | Endpoint | Notes |
|---|---|---|
| Auth | `POST /api/auth/register` | students only |
| Auth | `POST /api/auth/login` | returns JWT |
| Auth | `POST /api/auth/forgot-password` / `POST /api/auth/reset-password/:token` | |
| Auth | `PUT /api/auth/change-password` | authenticated |
| Users | `GET/POST/PUT/DELETE /api/students` `/api/examiners` `/api/invigilators` | admin only, same shape for all three |
| Users | `PATCH /api/students/:id/status` | activate/deactivate |
| Users | `POST /api/students/:id/reset-password` | admin-triggered reset |
| Courses | `GET/POST/PUT/DELETE /api/courses`, `GET /api/courses/mine` | |
| Timetable | `GET/POST/PUT/DELETE /api/timetable` | role-aware visibility |
| Timetable | `PATCH /api/timetable/:id/publish` \| `/archive` | publish notifies affected students |
| Bulk import | `GET /api/uploads/:type/template` | type = students\|examiners\|invigilators |
| Bulk import | `POST /api/uploads/:type/preview` (multipart) → `POST /api/uploads/:type/import` | two-step: preview then confirm |
| Reports | `GET /api/reports/:type/:format` | format = pdf\|excel\|csv; type = students\|examiners\|invigilators\|timetable\|upcoming-exams\|completed-exams |
| Dashboard | `GET /api/dashboard/admin` | totals + chart data + recent activity |
| Notifications | `GET /api/notifications`, `PATCH /:id/read`, `PATCH /read-all` | |
| Profile | `GET/PUT /api/profile`, `POST /api/profile/picture` (multipart) | any authenticated user |

All protected endpoints require `Authorization: Bearer <token>`.

## 7. Security features implemented

- JWT authentication + role-based authorization middleware
- bcrypt password hashing (cost 12)
- express-validator on auth inputs
- Helmet security headers
- express-rate-limit (general API + stricter auth-endpoint limiter)
- Parameterized SQL everywhere (no string-concatenated queries) → SQL injection protected
- Multer file-type/size validation for uploads
- Account enumeration protection on forgot-password
- Activity logging for CRUD, auth, and bulk-import events

## 8. What's included vs. left as an extension point

**Included and working end to end:** auth (register/login/forgot/reset/change
password), single-admin enforcement, full CRUD for students/examiners/
invigilators, courses, exam timetable with publish/archive + venue clash
detection + student notifications, bulk CSV/Excel import with preview and
per-row validation, PDF/Excel/CSV reports, admin dashboard with Chart.js
graphs and activity log, profile + picture upload, notifications.

**Left as clearly-marked extension points** (the architecture supports them,
but they're not wired up, since they depend on external accounts/services
you'll need to provide):
- Actually sending SMS/USSD messages (the Africa's Talking integration from
  your other project would plug in here) — this system tracks exam data only.
- Real email delivery requires SMTP credentials in `.env`; without them,
  emails are logged to the console instead.
- Dark mode toggle and CSRF token rotation beyond Helmet's defaults.

## 9. Default login (after seeding)

Whatever you set in `backend/.env`:
```
ADMIN_EMAIL=mutawakilshani3@gmail
ADMIN_PASSWORD=Mutawakil@1
```
**Change this password immediately after first login** via the Profile page.
