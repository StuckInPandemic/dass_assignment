# Felicity — Event Management System

A full-stack event management platform for the annual college fest **Felicity**, built with the MERN stack (MongoDB, Express, React, Node.js).

## 📋 Table of Contents

- [Tech Stack & Library Justifications](#tech-stack--library-justifications)
- [Advanced Features](#advanced-features)
- [Setup Instructions](#setup-instructions)
- [Project Structure](#project-structure)
- [Design Decisions](#design-decisions)

---

## Tech Stack & Library Justifications

### Backend

| Library | Version | Justification |
|---------|---------|---------------|
| **Express** | 4.x | Standard Node.js web framework for REST APIs with extensive middleware ecosystem |
| **Mongoose** | 8.x | ODM for MongoDB providing schema validation, middleware hooks, and query building |
| **bcryptjs** | 2.x | Password hashing with configurable salt rounds; JS implementation avoids native compilation issues |
| **jsonwebtoken** | 9.x | Industry-standard JWT token generation and verification for stateless authentication |
| **multer** | 1.x | Multipart form data middleware for file uploads (payment proofs) |
| **nodemailer** | 6.x | Email delivery for ticket confirmations with SMTP transport |
| **qrcode** | 1.x | QR code generation for event tickets as data URIs |
| **socket.io** | 4.x | WebSocket abstraction for real-time discussion forum with room-based messaging |
| **axios** | 1.x | HTTP client for outbound Discord webhook notifications |
| **csv-writer** | 1.x | CSV generation for participant/attendance data export |
| **cors** | 2.x | Cross-origin resource sharing for frontend-backend communication |
| **dotenv** | 16.x | Environment variable management for secrets and configuration |

### Frontend

| Library | Version | Justification |
|---------|---------|---------------|
| **React** | 19.x | Component-based UI library with hooks for state management |
| **Vite** | 7.x | Fast dev server with HMR; significantly faster than CRA/Webpack |
| **react-router-dom** | 7.x | Client-side routing with protected route support |
| **axios** | 1.x | HTTP client with interceptors for JWT token injection and 401 handling |
| **react-hook-form** | 7.x | Performant form management with validation; avoids unnecessary re-renders |
| **react-hot-toast** | 2.x | Lightweight toast notifications for feedback |
| **react-icons** | 5.x | Icon library with tree-shakeable imports |
| **recharts** | 3.x | React-native charting library for analytics dashboards |
| **dayjs** | 1.x | Lightweight date formatting (2KB vs Moment.js 67KB) |
| **qrcode.react** | 4.x | React component for QR code rendering on tickets |
| **jsqr** | 1.x | QR code scanning from camera/image for attendance tracking |
| **socket.io-client** | 4.x | Socket.io client for real-time discussion forum |
| **@dnd-kit/core** | 6.x | Drag-and-drop for custom form field reordering |

---

## Advanced Features

### Tier A

1. **Merchandise Payment Approval Workflow**
   - Participants submit merchandise or paid event orders → upload payment proof (image) → organizer reviews → approves (generates QR + ticket + email) or rejects with comments
   - Atomic stock decrement only on approval to prevent overselling
   - Also applies to normal events with registration fees

2. **QR Scanner & Attendance Tracking**
   - Camera-based QR scanning using `jsqr` library
   - File upload fallback for image-based QR scanning
   - Duplicate scan detection with previous scan time display
   - Live attendance dashboard: scanned vs total, real-time updates
   - Manual attendance override with audit logging
   - CSV export of attendance data

### Tier B

1. **Organizer Password Reset Workflow**
   - Organizer submits reset request with reason
   - Admin views all pending requests with club name and date
   - Admin approves (auto-generates new password) or rejects with comments
   - Organizer can view their reset request history with status tracking

2. **Real-Time Discussion Forum**
   - Per-event chat rooms using Socket.io
   - Threaded replies, pinned messages, reactions
   - Organizer moderation (pin/delete messages)
   - Real-time message delivery without polling

### Tier C

1. **Add to Calendar Integration**
   - Download `.ics` file (compatible with Apple Calendar, Outlook Desktop, etc.)
   - Direct Google Calendar link with pre-filled event details
   - Direct Microsoft Outlook web calendar link

---

## Setup Instructions

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB** (local or Atlas connection string)
- **SMTP Credentials** (Gmail app password or other SMTP provider for emails)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Variables

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/felicity
JWT_SECRET=your-secret-key

# SMTP (for real email delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Felicity <your-email@gmail.com>"

# Admin seed
ADMIN_EMAIL=admin@felicity.com
ADMIN_PASSWORD=admin123
```

### 3. Seed Admin Account

```bash
cd backend
node seed/adminSeed.js
```

### 4. Create Upload Directories

```bash
mkdir -p backend/uploads/payment-proofs
mkdir -p backend/uploads/qr-codes
```

### 5. Run Development Servers

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Backend: http://localhost:5000
- Frontend: http://localhost:5173

### 6. First Login

Login as admin with the credentials from `.env` to create organizer accounts.

---

## Project Structure

```
├── backend/
│   ├── config/         # Database connection
│   ├── controllers/    # Route handlers (auth, events, admin, etc.)
│   ├── middleware/      # Auth & role guard middleware
│   ├── models/         # Mongoose schemas (User, Event, Registration, etc.)
│   ├── routes/         # Express route definitions
│   ├── seed/           # Admin account seeder
│   ├── services/       # Email, QR, Discord webhook, Socket.io
│   └── server.js       # App entry point
├── frontend/
│   ├── src/
│   │   ├── api/        # Axios API functions
│   │   ├── components/ # Reusable UI components
│   │   ├── context/    # Auth context provider
│   │   ├── pages/      # Page components (participant, organizer, admin)
│   │   ├── routes/     # Protected route wrapper
│   │   └── utils/      # Calendar helpers
│   └── index.html
├── README.md
├── deployment.txt
└── how_to_run.md
```

---

## Design Decisions

- **Single User collection** with role-based access — simplifies auth while supporting three user types
- **Organizer as separate collection** linked via ObjectId — isolates organizer-specific data from auth concerns
- **Payment approval for ALL paid registrations** — not just merchandise; ensures financial accountability
- **Automatic event status updates** — events transition `published → ongoing → completed` based on time comparison, with manual override available
- **Cascade delete** — permanently deleting an organizer also removes all their events, registrations, messages, and password reset requests
- **Sub-pattern fuzzy search** — generates regex sub-patterns for typo tolerance rather than simple substring matching
- **Aggregation pipeline for participant lists** — ensures search/filter happens at the database level before pagination, not in application code
