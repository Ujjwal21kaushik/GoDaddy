# Universal AI Agent Context & Handoff Guide

## Mission
Single source of truth for CanteenIQ during the GoDaddy Rush Hour Hackathon ("Kill the Canteen Queue").

## Team Ownership
- **Ujjwal Kaushik & Assistant**: Architecture, Backend API Services, Dual-Bucket Inventory Algorithm, Single Counter Gatekeeper (15-min slots, cap: 20), AI Demand Forecasting Engine (Monday–Saturday), Overdue Uncollected Order Blacklisting, and Full UI Polish.

## Key System Implementations & Rules

### 1. Single Physical Counter Architecture
- Campus canteen has exactly 1 counter.
- Maximum throughput capacity: 20 orders per 15-minute slot.

### 2. Time Slots (10:00 AM to 5:00 PM)
- 28 distinct 15-minute buckets.
- Dynamic slot expiry: past slots are marked expired.
- Gate Refusal & Auto-Shift: Overflow past 20 rejects and recommends the closest next available slot.

### 3. Dual-Bucket Inventory Rule
- **Bucket 1 (Shelf-Ready Stock):** Immediate orders ($\le$ 45 mins) consume live counter shelf inventory.
- **Bucket 2 (Cook-Ahead Pipeline):** Future orders ($>$ 45 mins) do not starve shelf stock. They trigger a scheduled batch production alert in the kitchen.

### 4. Overdue Uncollected Order Violation (>30 mins past slot)
- Tracked automatically via `now > order.slot + 30 && status !== 'collected'`.
- Visible in Owner Header Badge, Overview Dashboard (`/owner`), and Slot Manager (`/owner/slots`).
- One-click "Blacklist & Restock" action cancels order and restores inventory.

### 5. AI Demand Intelligence (Monday–Saturday)
- 30-day baseline generated with 5,500+ records.
- Time-series day multipliers (0.3× weekend to 1.25× Friday rush).
- Dynamic safety buffers and one-click "Apply AI Prep Plan".

### 6. Synchronous State & Offline Resilience
- Local JSON DB (`backend/data/db.json`) guarantees 100% offline functionality during judge demos.
- Real-time polling keeps student tracking and kitchen production synchronized.
