# Home Hospital Scheduling System - Backend API

Express.js backend API for the AI-powered Home Hospital Scheduling System.

## Features

- 🔐 JWT Authentication with Supabase
- 👥 Patient management API
- 👨‍⚕️ Professional management API
- 📅 Schedule management with smart time slots
- 🤖 AI-powered patient assignment
- 📍 GPS-based route optimization
- 🔒 Role-based access control

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project with database set up

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Home-Hospital-Scheduling-System/AI-powered-Home-Hospital-Scheduling-System-Backend.git
   cd AI-powered-Home-Hospital-Scheduling-System-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```
   PORT=3001
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_role_key
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/profile` | Get current user profile |
| PUT | `/api/auth/profile` | Update user profile |

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | Get all patients |
| GET | `/api/patients/unassigned` | Get unassigned patients |
| GET | `/api/patients/:id` | Get patient by ID |
| POST | `/api/patients` | Create new patient |
| PUT | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Delete patient |

### Professionals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/professionals` | Get all professionals |
| GET | `/api/professionals/by-skill/:skill` | Get by specialization |
| GET | `/api/professionals/by-area/:area` | Get by service area |
| GET | `/api/professionals/:id` | Get professional by ID |
| GET | `/api/professionals/:id/working-hours` | Get working hours |
| PUT | `/api/professionals/:id/working-hours` | Update working hours |

### Schedules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schedules` | Get schedules (with filters) |
| GET | `/api/schedules/available-slots` | Get available time slots |
| POST | `/api/schedules/smart-assign` | Smart assign patient |
| POST | `/api/schedules` | Create schedule entry |
| PUT | `/api/schedules/:id` | Update schedule |
| DELETE | `/api/schedules/:id` | Delete schedule |

### Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assignments` | Get all assignments |
| GET | `/api/assignments/professional/:id` | Get by professional |
| POST | `/api/assignments/smart-assign` | Smart assign single patient |
| POST | `/api/assignments/bulk-assign` | Bulk assign patients |
| POST | `/api/assignments` | Create manual assignment |
| PATCH | `/api/assignments/:id/status` | Update assignment status |
| POST | `/api/assignments/:id/reassign` | Reassign to different professional |
| DELETE | `/api/assignments/:id` | Delete assignment |

## Authentication

All API endpoints (except `/health`) require a valid JWT token from Supabase Auth.

Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Project Structure

```
src/
├── index.js              # Express app entry point
├── config/
│   └── supabase.js       # Supabase client configuration
├── middleware/
│   └── auth.js           # Authentication & authorization
├── routes/
│   ├── auth.js           # Auth routes
│   ├── patients.js       # Patient routes
│   ├── professionals.js  # Professional routes
│   ├── schedules.js      # Schedule routes
│   └── assignments.js    # Assignment routes
└── services/
    ├── geoUtils.js       # Geocoding & distance calculation
    └── timeSlotOptimizer.js  # AI scheduling logic
```

## License

MIT
