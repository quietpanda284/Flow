# Flow - Project Documentation

**Flow** is a high-fidelity productivity dashboard inspired by Rize.io. It is designed to help users track their focus time, plan their days, and analyze the discrepancy between their intended schedule and their actual performance.

## 1. Architecture Overview

The project is built as a Monorepo containing both the Frontend and Backend, designed to be run locally.

### Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React (Icons).
- **Backend:** Node.js, Express.
- **Database:** SQLite (Default) or MySQL via Sequelize ORM.
- **Authentication:** JWT (JSON Web Tokens) stored in HTTP-only cookies.

### System Design

1. **Client (Vite):** Runs on port 5174. It serves the React application. It uses a Proxy configuration to forward /api requests to the backend.
2. **Server (Express):** Runs on port 3006. It handles API requests, authentication, and database operations.
3. **Data Persistence:** Data is stored in a local database.sqlite file by default, ensuring zero-configuration startup.

---

## 2. Key Features

### A. Mission Control (Home)

The landing dashboard provides a comparative view of the user's day:

- **Metrics Bar:** Displays "Commitment Ratio" (Actual vs. Planned duration) and "Adherence Rate" (Schedule fidelity).
- **Dual Timeline:** A read-only vertical timeline showing Planned blocks alongside Actual blocks for visual comparison.
- **Category Breakdown:** A breakdown of time spent on Focus, Meetings, and Breaks.

### B. Daily Planning

An interactive vertical timeline allowing users to structure their day:

- **Drag & Drop:** Click and drag on the grid to create time blocks.
- **Context Menu:** Right-click to edit or delete blocks.
- **Visual Distinction:** Blocks are color-coded based on category (Focus = Green, Meeting = Blue, Break = Orange).

### C. Focus Timer

A Pomodoro-style timer that records "Actual" work data:

- **Modes:** Focus (25/50 min) and Break (5/10 min).
- **Tracking:** When a timer completes, it automatically saves a TimeBlock to the database marked as isPlanned: false.
- **Categorization:** Users can select a specific category (e.g., "Development") before starting the timer.

### D. Trends

Long-term analytics:

- **Heatmap:** GitHub-style contribution graph showing productivity consistency over the last year.
- **Stats:** Displays "Today's Productivity", "Peak Productive Hour", and aggregate schedule adherence.

### E. Account & Security

- **Authentication:** Registration and Login system with hashed passwords (bcrypt).
- **Management:** Users can change their password or permanently delete their account (cascading delete of all user data).

### F. Developer Mode

A toggle in Settings that enables a "Test" page. This allows the user/developer to:

- **Seed Database:** Generate dummy data for the current day.
- **Reset Database:** Wipe all data for the current user.

---

## 3. Data Model

The application relies on three core entities managed by Sequelize:

### 1. User

- **id:** UUID.
- **username:** Unique identifier.
- **passwordHash:** Securely hashed password.

### 2. Category

- **type:** Enum (focus, meeting, break, other).
- **name:** Custom name (e.g., "Coding", "Email").
- **userId:** Owner of the category.

### 3. TimeBlock

The central unit of data. A block can be either **Planned** (Intent) or **Actual** (Reality).

- **isPlanned:** Boolean. Differentiates between what was scheduled vs. what was tracked by the timer.
- **startTime / endTime:** Stored as HH:MM strings.
- **durationMinutes:** Integer.
- **date:** YYYY-MM-DD.
- **categoryId:** Links to a specific category.

---

## 4. Project Structure

codeText

```
/
├── components/         # React UI components (Timer, Timeline, Charts)
├── context/            # Global state (AuthContext)
├── server/             # Backend logic
│   └── index.ts        # Express app, API routes, and DB models
├── services/           # Frontend API fetch wrappers
├── utils/              # Helper functions (analytics, time formatting)
├── types.ts            # TypeScript interfaces
├── App.tsx             # Main routing and layout logic
├── index.html          # Entry point
└── vite.config.ts      # Vite configuration (Proxy setup)
```

## 5. Getting Started

### Prerequisites

- Node.js installed.

### Installation & Run

1. Install dependencies:

```bash
npm install
```

2. Start the development environment (runs both Client and Server):

```bash
npm run dev
```

3. Open browser to: http://localhost:5174

### Database

- On the first run, `database.sqlite` will be created automatically.
- New users are automatically seeded with default categories (Development, Collaboration, Breaks, Admin).
