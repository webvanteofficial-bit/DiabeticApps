# Sugar Log – Complete Guide

## 1. Overview

Sugar Log is a React + Vite blood sugar tracker. It supports:

- User signup/login with password complexity rules
- Blood sugar readings with date/time, tag, note, value
- Overview dashboard, history, and 30-day report
- Charts and statistics
- PDF download and browser print for the report
- Local storage plus IndexedDB (Dexie) for users and login records

## 2. Tech Stack

- React 19
- React Router DOM 7
- Vite 8
- Dexie 4 (IndexedDB wrapper)
- jsPDF 4 + jspdf-autotable 5
- Oxlint for linting

## 3. Folder Structure

```text
sugar-log/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   ├── logo.png
│   └── ...
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   ├── Dashboard.jsx
│   ├── db.js
│   ├── assets/
│   │   ├── Sugar_Log_Ribbon_Logo.png
│   │   └── ...
│   ├── components/
│   │   └── ProtectedRoute.jsx
│   └── pages/
│       ├── Login.jsx
│       └── Signup.jsx
└── dist/                  # production build output
```

## 4. Setup and Commands

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

## 5. Application Flow

- `/` redirects to `/login`
- `/login` authenticates an existing user
- `/signup` creates a new user
- `/dashboard` is protected and shows the tracker

Authentication state is stored in `localStorage` under `sugarlog.user`. User records are stored in IndexedDB and mirrored to `localStorage` under `sugarlog.users`.

## 6. Data Storage

### 6.1 Readings

- Storage key: `sugarlog.v1`
- Format: array of objects:

```json
{
  "id": 1700000000000,
  "v": 110,
  "t": 1700000000000,
  "tag": "Fasting",
  "n": "before breakfast"
}
```

- `v`: blood sugar value in mg/dL
- `t`: timestamp in milliseconds
- `tag`: time-of-day tag
- `n`: note (optional)

### 6.2 Users

IndexedDB database name: `sugarlog`

Stores:

- `users`: `++id,&email,name,password`
- `loginRecords`: `++id,email,action,timestamp`

### 6.3 DB Commands

Import the database:

```js
import { db, migrateUsers } from "./db";
```

Read all users:

```js
const users = await db.users.toArray();
```

Find a user by email:

```js
const user = await db.users.where("email").equals("you@example.com").first();
```

Add a user:

```js
await db.users.add({ name, email, password });
```

Read login records:

```js
const records = await db.loginRecords.toArray();
```

Add a login record:

```js
await db.loginRecords.add({ email, action: "login", timestamp: Date.now() });
```

Migrate old localStorage users into IndexedDB:

```js
await migrateUsers();
```

You can also inspect the database in browser DevTools:
`Application -> IndexedDB -> sugarlog`

## 7. Main Files and Components

### 7.1 `src/main.jsx`

Renders the React app into `#root`.

### 7.2 `src/App.jsx`

Defines routes:

- `/`
- `/login`
- `/signup`
- `/dashboard`

### 7.3 `src/components/ProtectedRoute.jsx`

Redirects to `/login` if `sugarlog.user` is missing.

### 7.4 `src/pages/Signup.jsx`

- Collects name, email, password, confirm password
- Requires password length >= 6
- Requires at least one special character
- Checks duplicate email in IndexedDB
- Stores user in IndexedDB and localStorage
- Records signup in `loginRecords`

### 7.5 `src/pages/Login.jsx`

- Authenticates against IndexedDB
- Records login in `loginRecords`
- Stores session in `localStorage`

### 7.6 `src/Dashboard.jsx`

Main tracker UI. Contains:

- `LV`: level thresholds, labels, colors
- `lvl(v)`: returns matching level
- `TAGS`: time-of-day tags
- `guess(hour)`: guesses a tag from hour
- `Chart`: bar chart for 24h/7d/30d
- `Urgent`: urgent alerts for very low or very high values
- `Add`: popup for adding a reading
- `Row`: reading row used in history and latest readings
- `Stats`: summary cards
- `downloadPdf()`: generates the PDF report

### 7.7 `src/db.js`

Creates and exports the Dexie database and migration helper.

## 8. Levels

Level thresholds are defined in `src/Dashboard.jsx`:

```js
const LV = [
  [54, "Very low", "...", "#f0625a"],
  [70, "Low", "...", "#f59a3d"],
  [100, "Normal fasting", "...", "#4cbf7a"],
  [180, "High, depending on timing", "...", "#f59a3d"],
  [250, "High", "...", "#f0625a"],
  [300, "Very high", "...", "#d8433b"],
  [400, "Extremely high", "...", "#b3261e"],
  [Infinity, "Dangerously high; urgent medical assessment", "...", "#8e1b15"]
];
```

To change levels, edit this array. Keep thresholds in ascending order.

## 9. Tags

Tags are defined in `src/Dashboard.jsx`:

```js
const TAGS = ["Fasting", "Before breakfast", ...];
```

The `guess(hour)` function maps an hour to a default tag. Update both if you add or rename tags.

## 10. Styling

- Global styles: `src/index.css`
- Unused template styles: `src/App.css`
- Responsive breakpoints: 900px and 720px
- Print styles hide `.noprint`, `.fab`, `.bnav`, and `.top .tools`

## 11. PDF Report

The Download PDF button uses jsPDF and jspdf-autotable.

PDF includes:

- Logo at top left, 35 mm wide
- Title: `Blood sugar report`
- Generated date: `DD/MM/YYYY`
- Table columns: Date, When, Note, mg/dL
- Grey header row
- Thin row lines
- Bold mg/dL value
- Filename: `blood-sugar-report-YYYY-MM-DD.pdf`

To modify PDF layout, edit `downloadPdf()` in `src/Dashboard.jsx`.

## 12. Print View

The Print button calls `window.print()`. Print CSS hides controls and keeps the report table. The on-screen report table and print table both keep the Level column.

## 13. How to Modify Common Things

### Add a new reading field

1. Add state in `Add` component.
2. Include it in `onSave({ ... })`.
3. Update `Row` to display it.
4. Update report table and PDF body in `downloadPdf()`.

### Change password rules

Edit `src/pages/Signup.jsx`:

```js
if (password.length < 6) { ... }
if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) { ... }
```

### Change logo

Replace `src/assets/Sugar_Log_Ribbon_Logo.png` and keep the import in `src/Dashboard.jsx`:

```js
import logoUrl from "./assets/Sugar_Log_Ribbon_Logo.png";
```

### Change database schema

Edit `src/db.js` and increase the version number:

```js
db.version(2).stores({ ... });
```

## 14. Notes

- Passwords are stored in plain text in this demo. For production, hash passwords on a real backend.
- IndexedDB is browser-specific and per-origin.
- `dist/` is generated by `npm run build`.
```

This is good. Write file.<|end|><|start|>-start to=bash<|channel|>analysis <|constrain|>xml<|message|><rfl:parameter name="command">
cd "C:\Users\DEll\Downloads\testing\sugar-log"; Test-Path GUIDE.md
## 15. Supabase Setup

This app uses Supabase for user and login record storage.

Client file: src/db.js

Supabase project URL:
https://rnxnytmmyzuhqznbjwll.supabase.co

Publishable key is stored in src/db.js. The secret key is NOT stored in the frontend.

Create these tables in the Supabase SQL editor before using authentication:

`sql
create table if not exists users (
  id bigserial primary key,
  name text not null,
  email text unique not null,
  password text not null,
  created_at timestamptz default now()
);

create table if not exists login_records (
  id bigserial primary key,
  email text not null,
  action text not null,
  timestamp bigint not null
);

alter table users disable row level security;
alter table login_records disable row level security;
`

For production, enable Row Level Security and add proper policies instead of disabling it.
