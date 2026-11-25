# GoDaddy Hackathon — 3-Minute Winning Pitch Guide

## Pitch Order & Timing (Total: 180 Seconds)

### 0:00 - 0:30 (30s): The Problem & User Identification
- **Say:** "Hi judges. At 1:00 PM, over 400 college students rush into our canteen with just one counter. Half of them wait 15–20 minutes, some give up and walk away hungry, fast-moving samosas run out, while other cooked food goes straight to waste. This is the single-counter bottleneck."
- **Visual:** Show empty counter vs. rush statistic on screen.

### 0:30 - 1:00 (30s): The Data Insight & AI Forecasting (Required Criterion)
- **Say:** "Before writing code, we generated and analyzed 30 days of synthetic order data across 5,500+ records.
- **The Core Insight:** Lunch demand is compressed into 15-minute bursts. Fridays see a **125% rush multiplier** on Samosas and Chai.
- **AI Solution:** Our Time-Series Forecasting model calculates day-of-week safety buffers (Monday to Saturday) so the chef knows the exact prep target in advance without spoilage."
- **Visual:** Toggle to **Owner ➔ Demand Intelligence** tab and show the Day-by-Day Forecast table and Safety Buffers.

### 1:00 - 2:00 (60s): The Live Demo & Key Edge Cases (The Wow Factor)
- **Action 1: Student 3-Tap Flow & Continuous Stepper**
  - Select Samosa, pick a 15-minute slot, and place order.
  - Show the live horizontal gradient stepper (`Confirmed` ➔ `Preparing` ➔ `Almost Ready` ➔ `Ready` ➔ `Collected`).
- **Action 2: The Gate Refusal Test (The Judge's Trap)**
  - Attempt to book a full slot (capped at 20 orders).
  - Show gate refusal + instant auto-shift recommendation to the next available slot.
- **Action 3: The Dual-Bucket Inventory Rule (Our Secret Weapon)**
  - Explain: *"If a student pre-orders 50 samosas for 7:00 PM at 4:30 PM, traditional carts dumbly set shelf stock to 0. CanteenIQ's Dual-Bucket isolates immediate walk-in stock from future kitchen pipeline batches, so 4:30 walk-ins never starve."*
- **Action 4: Kitchen KDS & Overdue Order Blacklist**
  - Show Kitchen KDS updating status in real-time.
  - Show the **Uncollected Overdue Alert (>30 mins past slot)** on the Owner screen with the one-click **"Blacklist & Restock"** action.

### 2:00 - 2:40 (40s): Best Prompt & What AI Got Wrong (Required Criterion)
- **Best Prompt:** *"Design a concurrent dual-bucket inventory and capacity-gated slot booking algorithm that enforces a hard max of 20 orders per 15-minute slot, auto-shifts overflow, and isolates immediate shelf stock from advance pre-orders."*
- **What AI Got Wrong:**
  - *"Initially, the AI deducted stock immediately for all future slots, causing walk-in students to see 'Out of Stock' even when fresh food was sitting on the counter. We corrected this by architecting the Dual-Bucket threshold: orders within 45 minutes consume shelf stock, while orders past 45 minutes schedule a kitchen cook-ahead batch."*

### 2:40 - 3:00 (20s): What We Would Do Next & Wrap Up
- **Next Steps:** WhatsApp automated pickup alerts when token is marked 'Ready', and an IoT token display screen above the counter.
- **Closing:** "CanteenIQ kills the queue, predicts food preparation, and ensures no student wastes their lunch break. Thank you!"
