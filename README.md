# Barangay Pandi Document Request System

## Project Overview

The Barangay Pandi Document Request System is a web-based system that
allows residents to register, manage their profiles, submit document
requests, and track the status of their requests.

Barangay administrators can manage resident accounts, review document
requests, and update request statuses.

---

## System Flow

### Resident Flow

1. Resident creates an account.
2. Administrator approves the resident account.
3. Resident logs in.
4. Resident completes or updates their profile.
5. Resident submits a document request.
6. The request appears in the resident's Track Request page.
7. The resident can monitor the request status.
8. The resident receives the updated status as the administrator processes
   the request.

### Administrator Flow

1. Administrator logs in.
2. Administrator views the dashboard.
3. Administrator manages registered residents.
4. Administrator approves pending resident accounts.
5. Administrator views submitted document requests.
6. Administrator reviews a request.
7. Administrator updates the request status:
   - Pending
   - Approved
   - Ready for Pickup
   - Released
   - Rejected
8. Updated request status is reflected on the resident side.

---

## Document Request Status Flow

Pending
    ↓
Approved
    ↓
Ready for Pickup
    ↓
Released

A request may also be marked as:

Rejected

---

## Test Accounts

### Administrator

Username/Email:
admin

Password:
admin123

### Resident

A resident account may be created through the registration page.

---

## How to Run

1. Open the project folder.
2. Run the project using a local development server.
3. Open the system's main page.
4. Use the test administrator credentials above to access the
   administrator panel.
5. Register a resident account to test the resident workflow.

---

## Main Features

### Resident
- Resident registration
- Resident login
- Resident profile
- Document request submission
- Request tracking
- Request status monitoring
- Notifications
- Logout

### Administrator
- Administrator login
- Dashboard
- Resident management
- Resident details
- Document request management
- Request status updates
- Notifications
- Reports
- Settings
- Logout

---

## Technology

- HTML
- CSS
- JavaScript
- Browser Local Storage / Session Storage