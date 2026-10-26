# Barangay Pandi Document Request System

## Project Overview

The Barangay Pandi Document Request System is a web application that allows residents to register, manage their profiles, submit barangay document requests, and track request progress.

Barangay administrators can review resident accounts, approve registrations, manage document requests, update request statuses, view notifications and reports, and manage system settings.

## Technology Stack

- **Frontend:** HTML, CSS, and browser JavaScript
- **Backend:** Node.js and Express
- **Authentication and sessions:** Server-side sessions using `express-session`
- **Password security:** Password hashing using Node.js `scrypt`
- **Data persistence:** JSON files stored in the server-side `data/` directory


## System Workflows

### Resident Workflow

1. The resident creates an account through the registration page.
2. An administrator reviews and approves the account, where approval is required.
3. The resident logs in.
4. The resident completes or updates their profile.
5. The resident submits a document request.
6. The request appears in the resident's request-tracking area.
7. The resident monitors the request status.
8. The resident checks for status updates and notifications as the administrator processes the request.

### Administrator Workflow

1. The administrator logs in through the administrator login page.
2. The administrator views the dashboard.
3. The administrator reviews and manages resident accounts.
4. The administrator approves pending resident accounts where applicable.
5. The administrator views submitted document requests.
6. The administrator opens and reviews a request.
7. The administrator updates the request status using the available workflow.
8. The updated status is reflected in the resident's request-tracking view.

## Document Request Statuses

The system uses these statuses:

- **Pending**
- **Approved**
- **Ready for Pickup**
- **Released**
- **Rejected**

The normal processing sequence is:

```text
Pending → Approved → Ready for Pickup → Released
   └───────────────────────────────→ Rejected (where permitted)
```

The backend is responsible for enforcing authorization and permitted status changes. Hiding a control in the browser alone is not sufficient access control.

## Main Features

### Resident

- Account registration and login
- Resident profile viewing and editing
- Document request submission
- Request history and tracking
- Request status monitoring
- Notifications
- Logout

### Administrator

- Administrator login and dashboard
- Resident account management and approval
- Resident details
- Document request review and processing
- Request status updates
- Notifications
- Reports
- Administrator settings
- Logout

## Project Structure

```text
barangay-cert/
├── app.js                         # Express server, API routes, sessions, startup
├── package.json                   # Dependencies and npm scripts
├── package-lock.json              # Locked dependency versions
├── data/
│   ├── residents.json             # Resident records
│   ├── requests.json              # Document request records
│   ├── notifications.json         # Notification records
│   └── admin-settings.json        # Administrator settings and credentials
├── repositories/
│   ├── resident-store.js          # Resident data access helpers
│   └── request-store.js           # Request data access helpers
├── validators/
│   └── request-validation.js      # Server-side request validation
└── public/
    ├── home.html                  # Public landing page
    ├── register.html              # Resident registration
    ├── resident-login.html        # Resident login
    ├── resident-dashboard.html
    ├── resident-profile.html
    ├── resident-request.html
    ├── resident-track.html
    ├── resident-review.html
    ├── resident-notifications.html
    ├── admin-login.html
    ├── admin-dashboard.html
    ├── admin-residents.html
    ├── admin-residents-details.html
    ├── admin-requests.html
    ├── admin-request-details.html
    ├── admin-notifications.html
    ├── admin-reports.html
    ├── admin-settings.html
    ├── css/
    │   ├── style.css              # CSS entry point; imports organized stylesheets
    │   ├── base/                  # Global variables and base styles
    │   ├── components/            # Reusable UI components
    │   ├── layout/                # Shared layout styles
    │   └── pages/                 # Page-specific styles
    └── js/
        ├── script.js              # Remaining legacy behavior and shared coordination
        ├── notifications.js       # Notification UI behavior
        ├── core/
        │   ├── utils.js           # Shared formatting and escaping helpers
        │   └── api.js             # Shared request API helpers
        ├── resident/
        │   ├── dashboard.js       # Resident dashboard behavior
        │   ├── profile.js         # Resident profile behavior/helpers
        │   └── requests.js        # Resident request and history display
        └── admin/
            ├── dashboard.js       # Admin dashboard behavior
            ├── reports.js         # Admin reporting behavior
            └── settings.js        # Admin settings behavior
```

## How to Run Locally

### Prerequisites

- Node.js (LTS recommended)
- npm

### Setup

1. Extract the project folder.
2. Open a terminal in the project directory (the folder containing `package.json`).
3. Install dependencies:

   ```bash
   npm ci
   ```

4. Start the application:

   ```bash
   npm start
   ```

5. Open the application at [http://localhost:3000](http://localhost:3000).

The application uses port `3000` by default. Set the `PORT` environment variable to use a different port.

### Test Accounts

**Administrator (local development only)**

- Username: `admin` (unless overridden by `ADMIN_USERNAME`)
- Password: `admin123` on a fresh data setup, unless an existing administrator record has already been initialized

**Resident**

Register a resident account through the registration page.

## Backend API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Register a resident |
| `POST` | `/api/auth/login` | Resident login |
| `GET` | `/api/auth/me` | Check the current resident session |
| `PATCH` | `/api/resident/profile` | Update the signed-in resident's profile |
| `POST` | `/api/auth/logout` | End the resident session |
| `POST` | `/api/admin/login` | Administrator login |
| `POST` | `/api/admin/logout` | End the administrator session |
| `GET` | `/api/admin/settings` | Retrieve administrator settings |
| `PATCH` | `/api/admin/settings/profile` | Update administrator profile settings |
| `PATCH` | `/api/admin/settings/password` | Change the administrator password |
| `GET` | `/api/admin/residents` | List residents for administration |
| `PATCH` | `/api/admin/residents/:residentId/status` | Update a resident's status |
| `GET` | `/api/requests` | Retrieve requests visible to the signed-in user |
| `GET` | `/api/requests/:requestId` | Retrieve an authorized request |
| `POST` | `/api/requests` | Submit a document request |
| `PATCH` | `/api/requests/:requestId/status` | Update request status with administrator authorization |
| `GET` | `/api/notifications` | Retrieve notifications for the signed-in user |
| `PATCH` | `/api/notifications/:notificationId/read` | Mark a notification as read |
| `PATCH` | `/api/notifications/read-all` | Mark applicable notifications as read |
| `GET` | `/api/health` | Basic health check |

Refer to `app.js` for the actual route handlers, validation rules, and authorization logic.

