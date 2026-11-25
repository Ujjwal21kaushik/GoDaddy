# GoDaddy Hackathon - 3-Minute Winning Pitch Guide

## Pitch Order & Timing (Total: 180 Seconds)

### 0:00 - 0:30 (30s): The Problem & User Identification
- **Say:** "Hi judges. At 1:00 PM, 400 college students rush into our canteen with just one counter. Half of them wait 15 minutes, some give up, popular samosas run out, while other cooked food goes straight to waste. This is the Rush Hour bottleneck."
- **Visual:** Show empty counter vs. rush statistic on screen.

### 0:30 - 1:00 (30s): The Data Insight (Required Criterion)
- **Say:** "Before writing code, we generated and analyzed 30 days of synthetic order data across 5,500+ records.
- **The Core Insight:** 48.3% of all daily lunch demand is compressed into a single 15-minute window: **1:00 PM to 1:15 PM**. Peak items are Samosa and Masala Chai, spiking 125% on Fridays.
- **Why this matters:** A single counter can only serve 30 students in 15 minutes. Without pre-allocated pickup slots, physical queues are mathematically guaranteed to fail."
- **Visual:** Toggle to **📊 30-Day Data Insights** tab and show the Peak Slots table and Demand Prediction matrix.

### 1:00 - 2:15 (75s): The Live End-to-End Demo (Passing the 90-Min Gate)
- **Action 1: Student 3-Tap Flow**
  - Tap 1: Select Samosa.
  - Tap 2: Select 1:00 PM - 1:15 PM slot (point out it has 1 spot left).
  - Tap 3: Confirm order. Token `T-103` appears instantly.
- **Action 2: The Gate Refusal Test (The Judge's Trap)**
  - Select another item and try booking the **1:00 PM - 1:15 PM** slot again.
  - **Show Refusal:** System blocks the order with an alert: *"Pickup slot 1:00 PM - 1:15 PM is full!"*
  - **Show Smart Recommendation:** System suggests: *"Accept Next Slot: 1:15 PM - 1:30 PM"*. One-click accept passes the gate test with flying colors.
- **Action 3: Kitchen KDS & Cook-Ahead (Level 3 Twist)**
  - Toggle to **🍳 Kitchen KDS**.
  - Show token `T-103` in the queue.
  - Highlight the yellow predictive banner: *"At 12:45 PM, system tells the chef to fry 35 Samosas in advance based on Wednesday's 1:00 PM surge."*
  - Click **Start Preparing ➔ Mark Ready ➔ Collected**.

### 2:15 - 2:45 (30s): Best Prompt & What AI Got Wrong (Required Criterion)
- **Best Prompt:** *"Create a concurrent slot booking algorithm that enforces a hard max limit of 3 orders per 15-minute slot, refuses overflow with HTTP 409, and immediately calculates the closest next available slot with available spots."*
- **What AI Got Wrong:**
  - *"Initially, the AI wrote code that simply checked `orderCount >= maxLimit` inside a standard React state without backend locking. Under rapid clicking, two students could claim the same last spot simultaneously (race condition). We fixed this by moving the slot counter and locking logic into our server API with atomic incrementation and refusal codes."*

### 2:45 - 3:00 (15s): What We Would Do Next & Wrap Up
- **Next Steps:** WhatsApp automated pickup notifications when token is marked "Ready", and IoT token display screen above the canteen counter.
- **Closing:** "CanteenIQ kills the queue, predicts food preparation, and ensures no student wastes their lunch break. Thank you!"
