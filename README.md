# TeleDoc Ghana 🇬🇭 - Telemedicine & Teleconsultation Platform

A modern, production-ready Telehealth ecosystem connecting Ghanaian patients with certified medical doctors. Built with a **Client-Server Architecture** utilizing an **Expo React Native** mobile client, **Express + TypeScript** backend API, **PostgreSQL 18** database, **Agora WebRTC** video/audio calling, **Socket.io** real-time in-platform messaging, **MinIO/S3** medical records storage, and **Hubtel Mobile Money (MoMo) & Card** recurring subscription billing (10 GHS / month after a 90-day free trial).

---

## 📁 Project Directory Structure

The project is structured with clean, dedicated directories at the root:

```text
teledoc/
├── api/                   # Backend REST API & Socket.io (Node / Express / TypeScript / Prisma)
│   ├── prisma/            # PostgreSQL Schema & Seed Script
│   ├── src/               # Auth, Doctors, Appointments, Consultations, Billing, Agora, Socket.io
│   ├── .env               # Port 5000, PostgreSQL 5432 connection
│   └── package.json
│
├── web/                   # Super Admin Web Dashboard (React + Vite + Tailwind)
│   ├── src/               # Doctor verification, Credential approval & Stats
│   ├── dist/              # Production-ready web assets
│   └── package.json
│
├── mobile/                # Expo React Native App (Patient App & Doctor Workspace)
│   ├── src/               # Doctor Discovery, Slot Booking, Video Call Room, Prescriptions, Lab Reports
│   ├── app.json
│   └── package.json
│
├── packages/
│   └── shared/            # Shared TypeScript DTOs, models & enums
│
├── scripts/
│   └── test-platform.ps1  # Automated 7-step End-to-End Platform Verification
│
└── package.json           # Root workspace configuration
```

---

## 🚀 How to Run the Project

You can run each component directly from its folder:

### 1. Backend API Server
Open a terminal in the project root:
```bash
cd api
npm run dev
```
* Runs on **`http://localhost:5000`**
* Connected to your local PostgreSQL 18 on port **`5432`** (`teledoc` database)
* WebSocket server active for live consultation chat

---

### 2. Super Admin Web Dashboard
Open a second terminal:
```bash
cd web
npm run dev
```
* Opens in browser at **`http://localhost:5173`**
* Log in as Super Admin (`admin@teledoc.gh` / `Password123!`) to review doctor medical licenses and approve/reject applications.

---

### 3. Mobile App (Expo React Native)
Open a third terminal:
```bash
cd mobile
npx expo start
```
* Press **`a`** to open in Android Emulator
* Press **`i`** to open in iOS Simulator
* Press **`w`** to run in your browser (web mode)
* Or scan the QR code using the **Expo Go** app on your physical Android or iPhone.

---

## 🗄️ Viewing the Database in pgAdmin 4

The database is integrated directly with your computer's system PostgreSQL 18 instance:

1. Open **pgAdmin 4** on your computer.
2. In the left sidebar, expand **Servers** ➔ **PostgreSQL 18** (Port 5432).
3. If prompted, your password is: `root`
4. Right-click on **Databases** and click **Refresh**.
5. You will see the **`teledoc`** database!
6. Expand **`teledoc`** ➔ **Schemas** ➔ **public** ➔ **Tables** to see all tables:
   * `users`
   * `doctor_profiles`
   * `doctor_availabilities`
   * `appointments`
   * `consultations`
   * `prescriptions`
   * `medical_records`
   * `subscriptions`
   * `payment_transactions`
   * `chat_messages`

---

## 🔑 Pre-Seeded Accounts for Testing

| Role | Email / Phone | Password | Description |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@teledoc.gh` / `+233240000001` | `Password123!` | Manages doctor credential verification in the Web Dashboard |
| **Approved Doctor** | `dr.mensah@teledoc.gh` / `+233240000002` | `Password123!` | Active Consultant Cardiologist (Korle-Bu Teaching Hospital) |
| **Pending Doctor** | `dr.boateng@teledoc.gh` / `+233240000003` | `Password123!` | Pediatrician awaiting Super Admin verification |
| **Patient** | `kwame.asante@gmail.com` / `+233240000004` | `Password123!` | Active 3-Month Free Trial (90 days remaining) |

---

## 🧪 Testing the Platform Automatically

You can test all subsystems (Auth, 90-day trial calculation, doctor approvals, slot booking, Agora RTC token generation, Hubtel MoMo billing) at any time:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-platform.ps1
```
