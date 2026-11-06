# TeleDoc Ghana 🇬🇭 - Telemedicine & Teleconsultation Platform

A modern, production-ready Telehealth ecosystem connecting Ghanaian patients with certified medical doctors. Built with a **Client-Server Architecture** utilizing an **Expo React Native** mobile client, **Express + TypeScript** backend API, **PostgreSQL 18** database, **Agora WebRTC** video/audio calling, **Socket.io** real-time in-platform messaging, **MinIO/S3** medical records storage, and **Hubtel Mobile Money (MoMo) & Card** recurring subscription billing (10 GHS / month after a 90-day free trial).

---

## 🏛 System Architecture & Topology

```
┌─────────────────────────────────┐       ┌────────────────────────────────┐
│   Patient & Doctor Mobile App   │       │   Super Admin Web Dashboard    │
│      (Expo React Native)        │       │    (React + Vite + Tailwind)   │
└────────────────┬────────────────┘       └───────────────┬────────────────┘
                 │ HTTPS / WSS                            │ HTTPS
                 └────────────────┬───────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        Node.js Core API (Express)                        │
│                                                                          │
│  • JWT Auth & Strict RBAC        • Doctor Discovery & Booking Engine     │
│  • Agora RTC Video Token Minting • Socket.io Consultation Chat Server    │
│  • Clinical Notes & e-Rx Sync    • Hubtel MoMo Recurring Paywall Engine  │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  ▼
                      ┌──────────────────────┐
                      │    PostgreSQL 18     │
                      │  (Port 5433, Prisma) │
                      └──────────────────────┘
```

---

## 📦 Monorepo Directory Structure

```text
teledoc/
├── apps/
│   ├── api/                   # Core Backend REST API & Socket.io (Node/Express/Prisma)
│   │   ├── prisma/            # PostgreSQL Schema & Seeder
│   │   ├── src/
│   │   │   ├── lib/           # Agora RTC, Socket.io, Storage & Push Notifications
│   │   │   ├── middleware/    # Auth (JWT), RBAC & 90-Day Subscription Paywall
│   │   │   ├── routes/        # Auth, Admin, Doctors, Appointments, Consultations, Billing
│   │   │   └── server.ts      # HTTP & WebSocket Server
│   │   └── package.json
│   │
│   ├── admin/                 # Super Admin Web Dashboard (React + Vite + Tailwind)
│   │   ├── src/               # Doctor verification, Credential approval & Stats
│   │   ├── dist/              # Production optimized web assets
│   │   └── package.json
│   │
│   └── mobile/                # Expo React Native App (Patient & Doctor Workspace)
│       ├── src/
│       │   ├── api/           # API client with token interceptor
│       │   ├── context/       # Auth & Subscription State Provider
│       │   └── screens/       # Patient Discovery, Appointments, Room, e-Rx, Paywall, Doctor Clinical Dashboard
│       └── package.json
│
├── packages/
│   └── shared/                # Shared TypeScript models, enums & DTOs
│
├── scripts/
│   ├── start-db.ps1           # Starts PostgreSQL 18 on port 5433
│   ├── stop-db.ps1            # Stops PostgreSQL 18
│   └── test-platform.ps1      # Automated 7-step End-to-End Verification
│
└── package.json               # Monorepo workspace configuration
```

---

## 🚀 Quick Start Guide

### 1. Start the PostgreSQL 18 Database
```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-db.ps1
```
*(Runs on `127.0.0.1:5433`, database `teledoc`)*

### 2. Start the Backend API Server
```bash
npm run dev:api
```
*API runs at `http://localhost:5000` with WebSocket support at `ws://localhost:5000`.*

### 3. Start the Super Admin Portal
```bash
npm --prefix apps/admin run dev
```
*Accessible in browser at `http://localhost:5173`.*

### 4. Start the Mobile Client App
```bash
npm --prefix apps/mobile start
```
*Runs Expo Dev Server. Press `a` for Android Emulator, `i` for iOS Simulator, or scan the QR code with the Expo Go app.*

---

## 🔑 Pre-Seeded Test Accounts

| Role | Name | Email / Phone | Password | Access Status |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Nana Kwame | `admin@teledoc.gh` / `+233240000001` | `Password123!` | Full Admin Console Access |
| **Approved Doctor** | Dr. Kwesi Mensah, MD | `dr.mensah@teledoc.gh` / `+233240000002` | `Password123!` | Verified Cardiologist (`MDC-GH-2018-9844`) |
| **Pending Doctor** | Dr. Ama Boateng | `dr.boateng@teledoc.gh` / `+233240000003` | `Password123!` | Pediatrician (`PENDING` Super Admin Approval) |
| **Patient** | Kwame Asante | `kwame.asante@gmail.com` / `+233240000004` | `Password123!` | Active (3-Month Free Trial Tier) |

---

## 🛡️ Subsystems & Features Breakdown

### 1. Onboarding & Role-Based Access Control (RBAC)
*   **Patient Registration:** Phone/Email signup instantly provisions an automatic **90-Day (3-Month) Free Trial** timestamped in PostgreSQL (`subscriptions.trial_ends_at`).
*   **Doctor Registration:** Requires submission of Medical & Dental Council (MDC) license number, specialty, hospital affiliation, and credential documents. Status defaults to `PENDING`. Doctors cannot access patients or accept bookings until approved.
*   **Super Admin Portal:** Review pending medical licenses and certificates. One-click **Approve** or **Reject** (with reason), sending instant push notifications to the doctor.

### 2. Patient Telehealth Journey
*   **Discovery & Filtering:** Search doctors by name, specialty (Cardiology, Pediatrics, GP, etc.), or hospital.
*   **Appointment Booking:** Real-time slot selection with atomic conflict prevention. Guarded by the **Subscription Paywall Middleware**.
*   **Agora HD Video/Audio Calls:** Dynamic token minting via `POST /api/v1/consultations/:id/agora-token`.
*   **In-Platform Chat:** Low-latency Socket.io real-time chat with message persistence and typing indicators.
*   **Lab Results & History:** Patients upload PDFs or images of blood tests and imaging to cloud storage.
*   **Digital Prescriptions:** Instant synchronization of doctor-prescribed medications (drug, dosage, frequency, duration).

### 3. Doctor Clinical Workspace
*   **Appointment Dashboard:** Calendar and queue of upcoming, ongoing, and completed consultations.
*   **Live Consultation Launcher:** Enter encrypted Agora video rooms directly from appointment cards.
*   **Clinical Notes & e-Prescription:** Post-consultation documentation including formal diagnosis, private clinical notes, patient summary, and electronic prescription generation.
*   **Availability Management:** Configurable weekly recurring availability hours.

### 4. Subscription & Hubtel Monetization Engine
*   **3-Month Free Tier:** Days 1 through 90 offer full, unrestricted access.
*   **Paywall Guard (`requireActiveSubscription`):** After 90 days, booking actions return `HTTP 402 PAYMENT_REQUIRED`.
*   **Local Payment Gateway (Hubtel):** Integrated with MTN Mobile Money, Telecel Cash (Vodafone), AT Money, and Visa/Mastercard for **10 GHS / month**.
*   **Webhooks & Idempotency:** Secure callback handling via `POST /api/v1/webhooks/hubtel`.

---

## 🧪 Automated End-to-End Test Suite

Run the complete 7-stage automated verification script at any time:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-platform.ps1
```

Verification stages:
1. `API Health Check` (HTTP 200)
2. `Patient Authentication & 90-day Trial Status Calculation`
3. `Super Admin Verification Loop & Pending Queue`
4. `Doctor Discovery & MDC License Attributes`
5. `Patient Appointment Booking & Conflict Protection`
6. `Agora WebRTC Dynamic Token Minting`
7. `Hubtel Mobile Money 10 GHS Subscription Billing & Verification`
