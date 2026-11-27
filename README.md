# OrderQuick — Smart Campus Canteen Platform

> **Skip the line. Pick up in 15 min.** — Real-time slot-gated pre-ordering, atomic walk-in inventory protection, Kitchen Display System (KDS), and Owner Analytics backed by **MongoDB Atlas**.

---

## Key Capabilities

- **Dynamic 15-Minute Pickup Slots & Rush Chart**
  - Configurable canteen operating hours (opening to closing, including late-night extensions) and per-slot capacities.
  - Real-time capacity bar chart on the student storefront showing upcoming 15-minute pickup windows.
- **Atomic Last-Item Protection & Dual-Bucket Pre-Orders**
  - **Immediate Orders (`<= 1 hr` within shelf stock):** Atomically decrements item stock in MongoDB; concurrent last-item checkouts receive a structured `409 STOCK_CONFLICT` rollback.
  - **Pre-Orders & Over-Stock Requests (`> 1 hr` future slot or exceeding shelf stock):** Routed to Owner **Approvals** (`/owner/approvals`) with cook-ahead kitchen alerts so future bulk orders never starve walk-in students.
- **3-Stage Kitchen Lifecycle**
  - Streamlined production progression in Kitchen KDS (`/kitchen`) and Student live tracking (`/order/:id`):
    `Preparing` -> `Ready` -> `Delivered`.
- **Owner Combo Deals & Automatic Cart Savings**
  - Owners can create, edit, pause/activate, and delete bundled food combos in `/owner/combos`.
  - Live combos appear automatically on the Student storefront, and `cartSummary()` greedily applies non-overlapping combo discounts.
- **Role-Based Access Control (Student vs. Kitchen & Owner)**
  - **Student Portal (`/`, `/login`, `/orders`, `/order/:id`):** First-time Sign Up asks `username`, `password`, and 10-digit `phone` (used for pre-order & cancellation updates); returning sign-in requires only `username` and `password`. Student UI shows zero Kitchen/Owner links.
  - **Kitchen & Owner Portal (`/kitchen`, `/owner/*`):** Isolated staff workspace gated behind MongoDB-stored staff authentication, `requireStaff` backend middleware (`403 FORBIDDEN` for student tokens), and an editable **Owner Profile** page (`/owner/profile`) for contact details and password updates.
  - **Access + Rotating Refresh Tokens:** Short-lived (`15m`) HMAC-SHA256 access tokens held strictly in memory paired with SHA-256 hashed rotating (`7d`) refresh tokens in MongoDB; failed/expired refreshes automatically log out the session.

---

## Tech Stack & Database

- **Frontend:** React 18, Vite, React Router, Recharts, Lucide React Icons
- **Backend:** Node.js, Express.js, Mongoose, Node `crypto` (`scrypt` password hashing + HMAC-SHA256 tokens)
- **Database:** MongoDB Atlas (`quickorder` database)
  - `users` — Student accounts (`role: 'student'`) and staff account (`role: 'staff'`), hashed passwords, and hashed refresh tokens
  - `menu_items` — Live canteen catalog (prices, stock, prep time, batch size, image URLs)
  - `combos` — Owner-created food combo bundles
  - `orders` — Order records, approval states, cancellation cutoffs, and status history
  - `settings` — `canteen_config` document (`open`, `close`, default slot cap, slot overrides)
  - `missed_demands` — Sold-out substitution and missed revenue telemetry
  - `bulk_alerts` — Scheduled cook-ahead alerts for approved future pre-orders

---

## Repository Structure

```text
GoDaddy/
├── backend/
│   ├── server.js                          # Express REST API, JWT-style access/refresh auth & RBAC
│   ├── models.js                          # Mongoose schemas (MenuItem, Combo, Order, Settings, MissedDemand, BulkAlert, User)
│   ├── database.js                        # MongoDB Atlas connection, staff/config bootstrap & demo reset
│   ├── package.json
│   └── .env                               # MONGODB_URI, DB_NAME, PORT (not committed)
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                        # RequireStudent & RequireStaff routing guards
│       ├── main.jsx
│       ├── index.css                      # OrderQuick design system
│       ├── data/
│       │   └── categories.js              # Static menu category tabs
│       ├── services/
│       │   └── api.js                     # Scoped API client with in-memory access tokens & refresh rotation
│       ├── store/
│       │   └── AppContext.jsx             # Global polling state & dual-scope auth provider
│       ├── utils/
│       │   ├── analytics.js               # Revenue, rush, and demand forecasting helpers
│       │   ├── clock.js                   # Canteen clock helper
│       │   └── helpers.js                 # Formatting, batch prep math, slots & greedy combo discount engine
│       ├── components/                    # Shared UI primitives (Modal, OrderStepper, Qty, Toasts)
│       ├── pages/
│       │   └── NotFound.jsx               # Student 404 route
│       ├── student/                       # Isolated Student Portal
│       │   ├── StudentLayout.jsx          # Student navbar, Orders badge, CartDrawer & AlternativeModal
│       │   ├── components/                # FoodCard, CartDrawer, SlotPicker, AlternativeModal
│       │   └── pages/                     # StudentApp, StudentLogin, MyOrders, OrderTrack
│       └── kitchen-owner/                 # Isolated Kitchen & Owner Portal
│           ├── StaffLayout.jsx            # Staff navbar switching between Kitchen & Owner
│           └── pages/
│               ├── StaffLogin.jsx         # Kitchen & Owner login gate
│               ├── Kitchen.jsx            # Live Kitchen Production Display (KDS)
│               └── owner/                 # OwnerLayout, Overview, Approvals, Demand, MenuManager, Combos, SlotManager, Inventory, Profile
└── README.md
```

---

## Quick Start

### 1. Configure Environment Variables

Create `backend/.env`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=<app>
DB_NAME=quickorder
PORT=5000
```

Create `frontend/.env` (optional, defaults to `http://localhost:5000`):
```env
VITE_API_URL=http://localhost:5000
```

### 2. Start the Backend API (`http://localhost:5000`)

```bash
cd backend
npm install
npm start
```

### 3. Start the Frontend Client (`http://localhost:5173`)

```bash
cd frontend
npm install
npm run dev
```

---

## Portal URLs

| Portal | URL | Access |
| :--- | :--- | :--- |
| **Student Menu** | `http://localhost:5173/` | Student Sign In / First-Time Sign Up (`/login`) |
| **Student Orders** | `http://localhost:5173/orders` | Authenticated Student |
| **Kitchen KDS** | `http://localhost:5173/kitchen` | Kitchen & Owner Staff Login |
| **Owner Console** | `http://localhost:5173/owner` | Kitchen & Owner Staff Login |

---

## REST API Summary

- **Auth & Sessions:** `POST /auth/register`, `POST /auth/login`, `POST /auth/staff/login`, `GET /auth/staff/profile` *(staff)*, `PUT /auth/staff/profile` *(staff)*, `PUT /auth/staff/password` *(staff)*, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/users` *(staff)*
- **Menu & Combos:** `GET /menu`, `POST /menu` *(staff)*, `DELETE /menu/:id` *(staff)*, `GET /combos`, `POST /combos` *(staff)*, `DELETE /combos/:id` *(staff)*
- **Slots & Settings:** `GET /slots`, `PUT /slots/settings` *(staff)*
- **Orders & Kitchen:** `GET /orders`, `POST /orders` *(auth)*, `POST /orders/:id/respond` *(auth)*, `POST /orders/:id/cancel-request` *(auth)*, `POST /orders/:id/decision` *(staff)*, `POST /orders/:id/cancel-decision` *(staff)*, `PATCH /orders/:id/status` *(staff)*, `GET /kitchen/bulk-alerts` *(staff)*
- **Demand & Demo:** `POST /demand/missed`, `GET /demand/insights`, `POST /demo/reset` *(staff)*, `GET /health`
