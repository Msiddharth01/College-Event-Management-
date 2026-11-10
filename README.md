# College Event Management System (Full-Stack)

A robust, enterprise-grade full-stack platform for managing college events, venues, organizers, students, and event registrations. Built with Node.js, Express, TypeScript, and MongoDB (Mongoose) on the backend, and React 18, Vite, and Tailwind CSS on the frontend.

---

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js (v22.x)
- **Language**: TypeScript (ES2022, NodeNext module resolution)
- **Web Framework**: Express.js (v4.x)
- **Database**: MongoDB with Mongoose (v8.x)
- **Authentication & Security**: JWT (`jsonwebtoken`), `bcryptjs`, `cors`, `dotenv`
- **Development Tooling**: `ts-node-dev`

### Frontend
- **Framework & Tooling**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **UI & Icons**: `lucide-react`
- **Network**: `axios` HTTP client with custom service layer

---

## 📁 Project Structure

```text
.
├── .env.example              # Environment variables template
├── .gitignore                # Git exclusions (dist, node_modules, .env, *.log)
├── package.json              # Dependencies and execution scripts
├── tsconfig.json             # TypeScript compiler configuration (ES2022, NodeNext)
├── src/
│   ├── config/
│   │   └── db.ts             # Mongoose connection with error handling
│   ├── controllers/
│   │   ├── studentController.ts      # Student CRUD operations
│   │   ├── organizerController.ts    # Organizer CRUD operations
│   │   ├── venueController.ts        # Venue management & conflict detection
│   │   ├── eventController.ts        # Event lifecycle management
│   │   ├── registrationController.ts # Event registration & capacity tracking
│   │   ├── analyticsController.ts    # Aggregation pipeline & dashboard metrics
│   │   └── authController.ts         # User auth & token generation
│   ├── middleware/
│   │   ├── errorHandler.ts   # Centralized error handler & Mongo 11000 duplicate mapper
│   │   ├── notFound.ts       # 404 Not Found handler
│   │   └── auth.ts           # JWT authentication & role-based access control
│   ├── models/
│   │   ├── Student.ts        # Student schema & interface
│   │   ├── Organizer.ts      # Organizer schema & interface
│   │   ├── Venue.ts          # Venue schema & interface
│   │   ├── Event.ts          # Event schema with custom date validator
│   │   ├── Registration.ts   # Registration schema with compound unique index
│   │   ├── User.ts           # User authentication model with password hashing
│   │   └── index.ts          # Models barrel export
│   ├── routes/
│   │   ├── studentRoutes.ts      # /api/students endpoints
│   │   ├── organizerRoutes.ts    # /api/organizers endpoints
│   │   ├── venueRoutes.ts        # /api/venues endpoints
│   │   ├── eventRoutes.ts        # /api/events endpoints
│   │   ├── registrationRoutes.ts # /api/registrations endpoints
│   │   ├── analyticsRoutes.ts    # /api/analytics endpoints
│   │   └── authRoutes.ts         # /api/auth endpoints
│   ├── scripts/
│   │   ├── seed.ts             # Database initialization & unique index test
│   │   ├── verifyConflict.ts   # Venue scheduling conflict verification
│   │   ├── verifyCapacity.ts   # Registration capacity & attendance verification
│   │   ├── verifyAnalytics.ts  # Aggregation pipeline & metrics verification
│   │   └── testApi.ts          # Automated end-to-end API integration tests
│   ├── app.ts                # Express app configuration & middleware pipeline
│   └── index.ts              # Server entry point & database lifecycle
└── dist/                     # Compiled JavaScript output
```

---

## 🗄️ Database Schemas & Relational Rules

| Model | Key Fields | Validations & Indexes |
| :--- | :--- | :--- |
| **`Student`** | `fullName`, `rollNumber`, `email`, `department`, `year` | Unique uppercase `rollNumber`, unique lowercase `email`, `year` bounded 1–5. |
| **`Organizer`** | `name`, `email`, `department`, `contactNumber` | Unique lowercase `email`, contact phone validation. |
| **`Venue`** | `name`, `location`, `capacity`, `facilities` | Unique `name`, `capacity` minimum 1, facilities list. |
| **`Event`** | `title`, `description`, `startDate`, `endDate`, `capacity`, `status`, `organizerId`, `venueId` | Custom schema validator: `endDate > startDate`. Lifecycle statuses: `'upcoming' \| 'ongoing' \| 'completed' \| 'cancelled'`. |
| **`Registration`** | `studentId`, `eventId`, `status`, `registeredAt` | **Compound Unique Index**: `{ studentId: 1, eventId: 1 }` prevents duplicate student registrations at the database engine level. |

---

## 🌐 API Endpoint Reference

### Health Check
- `GET /health` - Health status check (`{ "status": "ok" }`).

### Students (`/api/students`)
- `POST /api/students` - Create a new student.
- `GET /api/students` - Get all students (query filters: `department`, `year`).
- `GET /api/students/:id` - Get student by MongoDB ID.
- `GET /api/students/roll/:rollNumber` - Get student by unique roll number.

### Organizers (`/api/organizers`)
- `POST /api/organizers` - Create a new organizer.
- `GET /api/organizers` - Get all organizers (query filter: `department`).
- `GET /api/organizers/:id` - Get organizer by ID.

### Venues (`/api/venues`)
- `POST /api/venues` - Create a new venue.
- `GET /api/venues` - Get all venues (query filter: `minCapacity`).
- `GET /api/venues/:id` - Get venue by ID.
- `GET /api/venues/:id/availability?startDate=...&endDate=...` - Check if venue has scheduling conflicts for a time window.

### Events (`/api/events`)
- `POST /api/events` - Create an event (validates organizer & venue exist, venue capacity limits, and venue double-booking conflicts).
- `GET /api/events` - Get all events with populated organizer & venue details (filters: `status`, `organizerId`, `venueId`, `startDate`, `endDate`, `search`).
- `GET /api/events/:id` - Get event details by ID.
- `PUT /api/events/:id` - Update event details (re-validates venue conflict if dates/venue change).
- `PATCH /api/events/:id/cancel` - Soft-cancel event (updates status to `'cancelled'`).

### Registrations (`/api/registrations`)
- `POST /api/registrations` - Register a student for an event (verifies event is `'upcoming'`, checks capacity limits, and enforces unique index).
- `GET /api/registrations/event/:eventId` - Get attendee list for an event.
- `GET /api/registrations/student/:studentId` - Get all registrations for a student.
- `PATCH /api/registrations/:id/status` - Update status (`'registered' | 'attended' | 'cancelled'`).
- `PATCH /api/registrations/:id/attend` - Mark registration attendance directly.
- `DELETE /api/registrations/:id` - Cancel registration and reopen event capacity.

### Analytics & Reporting (`/api/analytics`)
- `GET /api/analytics/events-summary` - 6-stage aggregation pipeline calculating total active registrations per event against capacity.
- `GET /api/analytics/dashboard` - Concurrently computed system counts: upcoming events, active students, venues, and confirmed registrations.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your MongoDB connection details:
```bash
cp .env.example .env
```

```env
PORT=5001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/college_events?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
```

### 3. Seed & Verify Database
Clears old test data, builds indexes, seeds mock documents, and verifies duplicate index constraint:
```bash
npm run seed
```

### 4. Run Venue Conflict Verification
Verifies overlap detection rejecting double-booked venues with HTTP 409 Conflict:
```bash
npm run verify:conflict
```

### 5. Run Registration Capacity & Attendance Verification
Verifies event capacity enforcement, status cancellation, unblocking, and attendance marking:
```bash
npm run verify:capacity
```

### 6. Run Analytics & Reporting Aggregation Verification
Executes the MongoDB aggregation pipeline (Code 4.2) and dashboard metrics:
```bash
npm run verify:analytics
```

### 7. Run Strict RBAC Authorization Verification
Verifies role-based restrictions (`student` vs `organizer`) across protected routes with HTTP 403 enforcement:
```bash
npm run verify:rbac
```

### 8. Run Automated API Integration Tests
Runs live HTTP integration tests across all core routes against the database:
```bash
npm run test:api
```

### 9. Start Backend Server
Starts the Express server with live reload on `http://localhost:5001`:
```bash
npm run dev
```

### 10. Start Frontend Client
Starts Vite dev server on `http://localhost:3000` (pointing to `http://localhost:5001/api`):
```bash
npm run frontend:dev
# or inside frontend/:
cd frontend && npm run dev
```

### 11. Production Build
```bash
# Build backend
npm run build

# Build frontend
npm run frontend:build
```

