# CanteenIQ — Yellow Rush Hour (GoDaddy Hackathon)

> **"Kill the Canteen Queue"** — An intelligent pre-ordering, capacity-gated, and demand-forecasting platform built for single-counter college canteens.

Developed by **Ujjwal Kaushik** for the **GoDaddy Hackathon (Yellow · Rush Hour Track)**.

---

## 🎯 The Problem
At 1:00 PM, over 400 college students rush into the campus canteen, which operates with only **one physical counter**. 
- **The Bottleneck:** Half the students wait 15–20 minutes, some give up and walk away hungry.
- **The Stockout Trap:** Fast-moving items (Samosas, Chai) run out prematurely, while other prepared food spoils.
- **The Starvation Bug:** If a student places a future bulk pre-order for 7:00 PM (e.g. 50 samosas), traditional e-commerce carts dumbly deduct all 50 from shelf stock immediately, starving walk-in students at 4:30 PM.
- **Uncollected Food Waste:** Students book slots, forget to collect, and food sits cold without accountability.

---

## 💡 The Solution: CanteenIQ

CanteenIQ replaces chaotic counter crowding with structured, high-throughput slot bookings, dual-bucket inventory isolation, and day-of-week AI demand forecasting:

```
[ Student App ] ─── 15-Min Slot Booking ───► [ Single Counter Gatekeeper ] ───► [ Kitchen KDS ]
       │                                                 │                            │
       ▼                                                 ▼                            ▼
 Live Stepper Tracking                        Gate Refusal (Cap: 20)            Cook-Ahead Alert
(0% ➔ 100% Gradient)                       Auto Next Slot Shift (>45 min Pipeline)
```

---

## 🧠 The Human-AI Collaborative Engineering Methodology
The core differentiator of this project is not just *what* was built, but **HOW it was built** — using AI as a disciplined engineering peer rather than an unchecked code generator:

1. **Governance & Rules Before Code:**
   - Established strict boundaries via `rules/always/safety.md` and `agent/CONTEXT.md` to prevent hallucinations, state drift, and unauthorized file edits.
2. **Mutual Cross-Questioning:**
   - Instead of blind prompting, we engaged in bilateral architectural debates (e.g. challenging single-counter throughput, synthesizing 30 days of data to quantify the 15-minute lunch surge).
3. **Edge-Case Stress Testing (Human Directed):**
   - **The Samosa Starvation Trap:** Surfaced the 4:30 PM walk-in vs. 7:00 PM advance order conflict, co-designed the **Dual-Bucket Rule** to isolate ready shelf stock from cook-ahead pipeline.
   - **The No-Show Wastage Trap:** Surfaced the 30-minute overdue uncollected order scenario, designed real-time owner alerts and 1-click blacklist & restock.
4. **Correcting AI Oversights:**
   - Caught and rejected AI's naive React-state slot counter (vulnerable to race conditions) and forced atomic server-side gatekeeping with HTTP 409 rejections.
   - Iterated through UI hierarchy from unstyled text lists into smooth continuous gradient steppers and flex-aligned owner controls.

---

## 🚀 Key Innovations & Algorithmic Features

### 1. 15-Minute Slot Capacity & Hard Gate Refusal
- Slots run from **10:00 AM to 5:00 PM** (28 distinct 15-minute pickup windows).
- Enforces a hard cap of **20 orders per slot** (single-counter physical throughput limit).
- **Gate Test Passing:** If a slot reaches 20/20, the system refuses overflow and automatically calculates/recommends the **closest next available slot**.
- **Real-Time Expiry:** Past slots expire automatically to prevent invalid bookings.

### 2. Dual-Bucket Inventory Rule
Prevents future advance orders from starving current walk-in students:
- **Bucket 1: Shelf-Ready Stock (Immediate Walk-in $\le$ 45 mins):** Deducts directly from current shelf stock.
- **Bucket 2: Cook-Ahead Pipeline (Advance Pre-orders $>$ 45 mins):** Does **not** starve shelf stock. Instead, it generates a scheduled batch alert for the kitchen 45 minutes prior to pickup.

### 3. AI Demand Intelligence & Time-Series Forecasting
- **30-Day Historical Baseline:** Analyzes 5,500+ synthetic order records.
- **Day-of-Week Multipliers:** Automatically adapts to demand patterns (e.g., **1.25× Friday Peak Rush**, **0.3× Weekend Low Traffic**).
- **Dynamic Safety Buffer Calculation:**
  $$\text{Target Prep Units} = \text{Expected Base Demand} + \text{Dynamic Safety Buffer}$$
- **Chef AI Prep Advisor:** Generates day-by-day prep recommendations (Monday to Saturday) with plain-English rationales and a 1-click **"Apply AI Prep Plan"** button.
- **Missed Demand & Lost Revenue Tracker:** Detects and quantifies revenue lost to stockouts and suggests menu alternatives.

### 4. Overdue Uncollected Order Violation & Blacklisting
- If an order is not collected within **30 minutes past its scheduled slot**:
  - Automatically flagged as **Uncollected Overdue**.
  - Triggers a high-priority red alert card on the Owner Dashboard (`/owner`) and Slot Manager (`/owner/slots`).
  - Owner gets a one-click **"Blacklist & Restock"** button that cancels the uncollected order, penalizes the student profile, and restores inventory.

### 5. Continuous Animated Stepper & Kitchen KDS
- Real-time order progress tracking (`0%` ➔ `100%`) across 5 stages:
  `Confirmed` ➔ `Preparing` ➔ `Almost Ready` ➔ `Ready for Pickup` ➔ `Collected`.
- Three-column info grid displaying Pickup Slot, Estimated Wait time, and Orders Ahead.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React 18, Vite, Lucide React Icons, Recharts, React Router v6.
- **Backend:** Node.js, Express.js.
- **Database:** Local JSON File-backed Database (`backend/data/db.json`) for zero-latency, 100% offline hackathon reliability.
- **Synthetic Data Engine:** Historical order synthesizer (`backend/data-generator.js`) analyzing 30-day velocity, hourly rush bell curves, and peak bottlenecks.

---

## 📁 Repository Structure

```
GoDaddy/
├── frontend/                     # Vite + React Client
│   ├── src/
│   │   ├── components/           # Reusable UI (OrderStepper, SlotPicker, Navbar, etc.)
│   │   ├── pages/
│   │   │   ├── student/          # Student App (StudentApp, MyOrders, OrderTrack)
│   │   │   ├── owner/            # Owner Portal (Overview, Demand, Slots, Inventory, Menu)
│   │   │   └── Kitchen.jsx       # Kitchen Production Display (KDS)
│   │   ├── store/                # Global AppContext & State Provider
│   │   └── utils/                # Helpers, Analytics, and Forecasting Models
├── backend/                      # Node Express Server
│   ├── server.js                 # REST API endpoints & Slot Gatekeeper
│   ├── database.js               # JSON DB persistence layer
│   ├── data-generator.js         # 30-Day synthetic order generator
│   └── data/                     # Local storage (db.json, analytics.json)
├── agent/                        # AI Context & status files
├── PITCH_GUIDE.md                # 3-Minute Hackathon Winning Pitch Script
└── README.md                     # Project documentation
```

---

## ⚡ Quick Start

### 1. Start the Backend API Server
```bash
cd backend
npm install
node server.js
```
*Backend runs on `http://localhost:5000` with live endpoints:*
- `GET /menu` — Live menu and real-time stock levels.
- `GET /slots` — 15-minute slot capacities and real-time usage.
- `POST /orders` — Places order with slot validation & dual-bucket check.
- `POST /orders/:id/status` — Kitchen status transitions (`confirmed` ➔ `preparing` ➔ `almost` ➔ `ready` ➔ `collected`).
- `GET /demand/insights` — 30-day analytics and day-of-week forecasts.
- `POST /demo/reset` — 1-click database reset for judging demos.

### 2. Start the Frontend Client
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🏆 Key Edge Cases Handled

| Edge Case | Problem | CanteenIQ Solution |
| :--- | :--- | :--- |
| **Rush Hour Slot Congestion** | >20 students pick same 1:00 PM slot | Hard gate refusal with automatic 1-click shift to 1:15 PM slot. |
| **Starving Walk-Ins** | 7:00 PM order takes all 50 samosas at 4:30 PM | Dual-Bucket isolates future pipeline from shelf ready stock. |
| **No-Show Food Wastage** | Student forgets to pick up order >30 min | Overdue alert in Owner portal with 1-click Blacklist & Restock. |
| **Stockout Visibility Gap** | Owner doesn't know what sold out | Missed Demand Intelligence calculates lost revenue and substitutes. |
| **Offline Resilience** | Internet fails during hackathon judging | Local file-backed database ensures 100% offline, zero-lag demo. |

---

## 👥 Authors
- **Ujjwal Kaushik** — Architecture, Backend Services, Data Synthesizer, AI Demand Engine, and UI Refinements.
