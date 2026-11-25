# CanteenIQ - Elite Student Ordering Experience (UI Prompt)

> **Instructions for UI Developer / AI:**
> Copy and paste the entire prompt below into Cursor / v0 / Claude / Gemini to generate the stunning, production-ready Student Ordering Dashboard component for React.

---

### PROMPT TO COPY-PASTE TO AI:

```markdown
You are a Principal Product Designer & Senior Frontend Engineer at Swiggy / Blinkit / Apple.
Build an ultra-modern, clean, mobile-first and desktop-responsive React component named `StudentDashboard.jsx` for our college canteen management web app called "CanteenIQ".

### 1. Backend API Integration (Express port 5000)
The component connects to these live endpoints:
- `GET http://localhost:5000/api/student/menu`
  Returns menu items: `{ id, name, category, price, stock, totalInitial, inStock, lowStock, stockStatusMessage, image, isPopular }`
- `GET http://localhost:5000/api/student/slots`
  Returns all 28 slots from 10:00 AM to 5:00 PM: `{ id, label, capacity, booked, spotsLeft, isPast, isFull, canBook, status, isLunchPeak }`
- `GET http://localhost:5000/api/student/recommendations/:itemId`
  Returns chef alternatives when an item is sold out.
- `POST http://localhost:5000/api/student/orders`
  Body: `{ studentName, requestedSlotId, items: [{ id, quantity }] }`
  Returns confirmation ticket: `{ success, shiftedToNextSlot, message, order: { orderId, token, slotLabel, estimatedMins } }`
- `GET http://localhost:5000/api/student/track/:orderId`
  Returns Blinkit-style tracking with live ETA: `{ timeRemainingText, status }`

---

### 2. Design Aesthetics & Visual Identity
- **Style**: Contemporary Neo-Bento UI with warm clean surfaces (Soft Slate #f8fafc background, crisp white cards, rich amber/orange accents #f97316 for food appetite, emerald green #10b981 for available stock, smooth shadows, micro-interactions).
- **Typography**: Clean, geometric sans-serif (Inter/Geist/Outfit style) with bold pricing and prominent badge tags.
- **Micro-interactions**: Hover card float, cart bump animation, animated slot drawer, and celebratory confetti/ticket reveal modal.

---

### 3. Step-by-Step User Journey & UI Components to Build

#### A. Header & Sticky Glass Navbar
- Brand: `⚡ CanteenIQ` with subtitle: `Skip the Counter Queue`.
- Live Status Pill: `🟢 Counter Status: Active (15-min pickup windows)`.
- **Floating Cart Button**: Displays current cart count and subtotal (e.g. `🛒 2 items • ₹65`) with animated badge.

#### B. Category Filter Pills
- Filter tabs: `All Items`, `🔥 Popular Today`, `Snacks`, `Meals`, `Beverages`.

#### C. Dhaasu Food Card Grid (High-Conversion Bento Cards)
Each food card must feature:
1. **Large High-Res Food Visual / Emoji**: Crisp emoji badge with subtle gradient background.
2. **Top Badges**:
   - `🔥 Chef's Best Seller` (if `isPopular` is true).
   - Real-time stock status badge:
     - `In Stock (X left)` in Emerald.
     - `⚠️ Low Stock: Only 3 left!` in Amber.
     - `🔴 SOLD OUT` in Ruby Red (Card opacity dimmed).
3. **Food Title & Category**: e.g., `Samosa (2 pcs)` • `Snack`.
4. **Prep Time Meter**: Small clock badge e.g., `⚡ ~6 mins prep`.
5. **Price & Quantity / Add Button**:
   - Price formatted in bold: `₹25`.
   - If in stock: Clean `+ Add to Plate` button. Once added, transforms into an interactive `[-] 1 [+]` stepper.
   - If Sold Out: Disabled button + `✨ View Alternatives` button that opens a chef recommendations popover!

#### D. Bottom Floating Action Bar (Sticky Checkout Bar)
When cart has >= 1 item, a sticky bottom glassmorphism bar slides up smoothly:
- Shows: `Total: ₹XX • X items`.
- Big Call-to-Action button: `Select Pickup Slot & Buy ➔`.
- Clicking this opens the **Slide-Up Slot Selection Drawer**.

#### E. Slide-Up 15-Minute Slot Selection Drawer / Modal
When the student clicks "Select Pickup Slot & Buy", an elegant modal / drawer opens:
1. **Header**: "Choose Your 15-Minute Pickup Slot (10:00 AM – 5:00 PM)".
2. **Real-time Notice**: "Slots that have already passed are automatically locked."
3. **Slot Cards Grid (15-minute intervals)**:
   - Shows time: e.g., `1:00 PM - 1:15 PM`.
   - Shows status pill:
     - 🔴 `EXPIRED (Time Passed)` -> Disabled, grayed out, cursor not-allowed.
     - 🚨 `FULL (20/20 Booked)` -> Red border, disabled. Note: "Auto-shifts to next slot if selected".
     - 🟢 `Available (14 spots left)` -> Clickable, highlights in vibrant orange/green border with checkmark.
     - 🔥 `Peak Rush (1:00 PM - 1:15 PM)` tag to guide students to pick quieter slots.
4. **Action Button**: `Proceed to Order Confirmation ➔` (Enabled only when an active valid slot is chosen).

#### F. Final Order Confirmation Modal (The "Buy" Confirmation)
Clicking proceed opens the final confirmation modal:
1. Student Name input (defaults to "Student" or allows custom name).
2. Clean summary receipt:
   - Items list with quantities and subtotal.
   - Chosen Pickup Slot: `e.g. 1:15 PM - 1:30 PM`.
   - Assigned Counter: `Main Canteen Counter`.
   - Estimated Waiting Time: `~7 minutes`.
3. Button: `Confirm & Place Order (No Payment Needed for Hackathon)`.

#### G. Post-Order Success Screen (Digital Boarding Pass / Token)
Once placed, a celebratory digital boarding pass appears:
1. Large, bold Token: `T-103`.
2. Pickup Slot: `1:15 PM - 1:30 PM`.
3. Live Blinkit-Style Status Progress Bar:
   - `Placed ✓` ➔ `Preparing 🍳` ➔ `Ready for Pickup 🔔` ➔ `Collected 🎉`.
4. Live dynamic countdown message from backend: e.g. `~7 mins remaining (Order in queue for 1:15 PM slot)`.
5. "Track Live Status" button (polls `/api/student/track/:orderId` every 5 seconds).
6. "Order Again" button to reset the view.

---

### 4. Technical Quality Requirements
- Pure React code with inline styles or Tailwind CSS.
- Smooth transitions, zero page reloads.
- Robust mock fallback state so if backend is temporarily paused, the UI still renders and demoes beautifully.
```
