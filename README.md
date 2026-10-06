<div align="center">

# ⚡ Matrix

**A sleek, personal habit-tracking and daily accountability system built with React Native (Expo) and Django REST Framework.**

[![React Native](https://img.shields.io/badge/React_Native-0.79-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-v53-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Django](https://img.shields.io/badge/Django-6.x-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.18-red?logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![Neon Database](https://img.shields.io/badge/Neon_PostgreSQL-Serverless-00E599?logo=postgresql&logoColor=black)](https://neon.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<br />

</div>

---

## 📖 Overview

**Matrix** is an all-in-one daily habit tracker, checklist manager, and reflection journal. Designed with a frictionless personal-use architecture, Matrix eliminates tedious login hurdles while delivering a high-performance experience backed by serverless PostgreSQL (**Neon**) and a responsive mobile/web frontend.

---

## ✨ Features

- **🎯 Daily Accountability & Today View**
  - Dynamic daily checklist automatically generated according to each plan's schedule.
  - Interactive checkboxes with real-time percentage progress bar.
  - Automatic **"PERFECT DAY"** badge when all scheduled tasks are achieved.
  - Rest/Skip day recording with custom reasons.

- **📅 Interactive Heatmap Calendar**
  - Switch effortlessly between **Month** and **Week** views.
  - GitHub-style color intensity heatmap based on daily completion rate.
  - Visual indicators for perfect days (⭐), rest days (☕), and notes.
  - Quick tap to open any day's details, manage tasks, or log reflections.

- **📝 Daily Reflection & Mood Journal**
  - Rate your mood with 5 expressive emoji states (*Rough*, *Down*, *Okay*, *Good*, *Super*).
  - Add and edit notes and highlights for each day.
  - In-place saving and one-click note deletion.

- **📋 Flexible Plans & Templates**
  - Create recurring routines with customizable schedules:
    - **Daily** (every day)
    - **Weekdays** (select specific days: Mon, Wed, Fri, etc.)
    - **Interval** (e.g., every 2 or 3 days)
    - **One-time** checklists
  - Personalize plans with curated color palettes and icons.
  - Duplicate, archive, or delete plans with confirmation protection.

- **🌓 One-Tap Theme Switcher**
  - Fast, accessible top-bar toggle between **Dark Mode** and **Light Mode**.
  - Persisted user preference with curated HSL color tokens.

- **🐘 Cloud-Ready Database**
  - Built-in support for **Neon Serverless PostgreSQL** with SSL pooling.
  - Automatic fallback to local **SQLite** when no cloud database is specified.

---

## 🛠️ Architecture & Tech Stack

```
Matrix-Check-list/
├── backend/                  # Django REST Framework API
│   ├── backend/              # Core settings, WSGI/ASGI, URLs
│   │   ├── matrix/           # Habit models, views, serializers & logic
│   │   │   ├── models.py     # Plan, Task, TaskCompletion, SkipDay, DayNote
│   │   │   ├── views/        # Modular API endpoints
│   │   │   └── services/     # Streak & schedule computation engines
│   │   └── settings.py       # dj-database-url, Neon SSL, CORS, JWT
│   └── requirements.txt      # Python dependencies
└── frontend/Matrix/          # React Native Mobile & Web App
    ├── src/
    │   ├── app/              # Expo Router filesystem routing
    │   │   └── (tabs)/       # Main navigation (Today, Plans, Calendar)
    │   ├── components/       # Reusable UI components (ThemeToggle, BottomSheet, etc.)
    │   ├── hooks/            # TanStack React Query & theme state hooks
    │   ├── services/         # Axios API clients
    │   └── constants/        # Design system & color tokens
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Python** 3.11+
- **Node.js** 18+ & **npm**
- *(Optional)* Free account on [Neon](https://neon.tech) for PostgreSQL hosting

---

### 1. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to configure your settings:
   ```env
   SECRET_KEY=your-secure-random-secret-key
   DEBUG=True
   ALLOWED_HOSTS=*

   # Optional: Paste your Neon DB connection string here
   # DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require
   ```
   > 💡 *If `DATABASE_URL` is commented out or empty, Django will automatically use local SQLite (`db.sqlite3`).*

5. **Run migrations**:
   ```bash
   cd backend
   python manage.py migrate
   ```

6. **(Optional) Seed demo data**:
   ```bash
   python manage.py seed_demo
   ```

7. **Start the API server**:
   ```bash
   python manage.py runserver
   ```
   The backend API will be available at `http://127.0.0.1:8000/`.

---

### 2. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend/Matrix
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Ensure `EXPO_PUBLIC_API_URL` points to your backend:
   ```env
   # Local Web:
   EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api

   # Android Emulator:
   # EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
   ```

4. **Start the Expo development server**:
   ```bash
   npx expo start
   ```

5. **Open the app**:
   - Press **`w`** in the terminal to open in your web browser.
   - Scan the QR code with **Expo Go** (Android / iOS) to run on your phone.
   - Press **`a`** for Android emulator or **`i`** for iOS simulator.

---

## 🐘 Configuring Neon PostgreSQL

Matrix is pre-configured for **Neon serverless Postgres** with SSL and connection pooling out of the box:

1. Create a project at [console.neon.tech](https://console.neon.tech).
2. Copy the **Connection String** from your dashboard (choose the pooled or direct connection).
3. Ensure `?sslmode=require` is present at the end of the URL:
   ```
   postgresql://[user]:[password]@[endpoint]-pooler.[region].aws.neon.tech/neondb?sslmode=require
   ```
4. Paste the connection string into `backend/.env` as `DATABASE_URL`.
5. Run migrations:
   ```bash
   cd backend/backend
   python manage.py migrate
   ```

---

## ▲ Deploying Backend to Vercel

The backend is pre-configured with `backend/vercel.json` and WSGI serverless handlers.

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "feat: add Vercel deployment and APK build config"
   git push origin main
   ```

2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Import your GitHub repository (`Matrix-Check-list`).
   - In **Root Directory**, click Edit and select **`backend`**.
   - Under **Environment Variables**, add:
     - `DATABASE_URL`: Your Neon PostgreSQL connection string (including `?sslmode=require`)
     - `SECRET_KEY`: A secure random secret key string
     - `DEBUG`: `False`
     - `ALLOWED_HOSTS`: `*`
   - Click **Deploy**.

3. **Verify Deployment**:
   - Your API will be live at `https://<your-project>.vercel.app/api/today/`.

---

## 📱 Building the Android APK (Install on your phone)

Matrix includes `eas.json` configured for direct `.apk` output without Google Play dependencies.

1. **Update API URL in frontend**:
   In `frontend/Matrix/.env`, set your live Vercel backend URL:
   ```env
   EXPO_PUBLIC_API_URL=https://<your-project>.vercel.app/api
   ```

2. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

3. **Log in to Expo**:
   ```bash
   eas login
   ```
   *(If you don't have an Expo account, create a free one at [expo.dev](https://expo.dev).)*

4. **Trigger the Cloud APK Build**:
   ```bash
   cd frontend/Matrix
   eas build -p android --profile preview
   ```

5. **Install on your phone**:
   - When the build finishes (usually 3–5 minutes), EAS will print a **direct download link** and a **QR Code**.
   - Scan the QR code or open the link on your Android phone to download and install the `Matrix.apk`!

---

## 📡 Core API Reference

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/today/` | Returns scheduled plans, tasks, progress, and note for today |
| `POST` | `/api/tasks/{id}/toggle/` | Toggles completion state for a task on a specific date |
| `GET` | `/api/calendar/?start=YYYY-MM-DD&end=YYYY-MM-DD` | Heatmap data, streak counts, and day completion percentages |
| `GET` / `PUT` / `DELETE` | `/api/notes/{date}/` | Retrieve, upsert, or delete mood & reflection note for a date |
| `GET` / `POST` | `/api/plans/` | List all active plans or create a new plan with tasks |
| `POST` | `/api/plans/{id}/duplicate/` | Duplicate an existing plan and its tasks |
| `POST` | `/api/skips/` | Record a rest / skip day for a plan on a date |
| `GET` / `POST` | `/api/templates/` | Pre-built templates (e.g., Morning Routine, Workout, Deep Work) |

---

## 🛡️ Security & Git Hygiene

- **Sensitive credentials are protected**:
  - `.gitignore` prevents `.env`, `db.sqlite3`, `venv/`, and `node_modules/` from being committed.
  - Safe environment templates (`.env.example`) are provided in both `backend` and `frontend`.
- Always replace `SECRET_KEY` with a strong random value when deploying to production.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](frontend/Matrix/LICENSE) file for details.
