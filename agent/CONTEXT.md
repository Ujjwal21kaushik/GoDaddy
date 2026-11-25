# Universal AI Agent Context & Handoff Guide

## Mission
Single source of truth for CanteenIQ during the GoDaddy Rush Hour Hackathon.

## Team Ownership
- **Ujjwal Kaushik & Backend AI**: Backend API Services, Single Counter Engine, Dynamic 10:00 AM to 5:00 PM Slots with Time Expiry & Limit 20 per slot, Local JSON DB, and Owner AI Demand Refill Engine.
- **Teammate**: Building the 3 Frontend Views (Student, Kitchen, Owner) using `API_DOCS.md`.

## System Architecture (Updated)
- **Counter Architecture:** Exactly 1 physical counter (as per GoDaddy canteen problem statement).
- **Time Slots:** 28 distinct 15-minute buckets from **10:00 AM to 5:00 PM** (`10:00-10:15`, `10:15-10:30`, ... `4:45-5:00 PM`).
- **Slot Limit:** Hard limit of **20 orders per slot**.
- **Real-time Expiry Rule:**
  - As clock progresses, past slots are expired (`isPast: true`, `canBook: false`).
  - If a student tries booking a past slot (e.g. 10:00 AM when current time is 4:00 PM), the API rejects it with HTTP 400 `SLOT_EXPIRED`.
- **90-Minute Gate Refusal & Auto-Shift:**
  - If a slot reaches 20/20, system shifts the order to the next available upcoming slot.
- **Stock Lock & Chef Recommendations:**
  - Atomic stock deduction; if requested > stock, HTTP 409 `OUT_OF_STOCK` with recommendations.
