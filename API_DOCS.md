# CanteenIQ - Complete Backend API Contract (Single Counter & Dynamic Slots)

Base URL: `http://localhost:5000`

---

## 1. Student Screen APIs

### 1.1 GET `/api/student/menu`
Returns all menu items, current remaining stock, and low stock warnings.

### 1.2 GET `/api/student/slots`
Returns all 28 slots from **10:00 AM to 5:00 PM** (15-min intervals).
- **Slot Object:**
```json
{
  "id": "slot-1",
  "label": "10:00 AM - 10:15 AM",
  "capacity": 20,
  "booked": 5,
  "spotsLeft": 15,
  "isPast": true,
  "isCurrentActive": false,
  "isFull": false,
  "canBook": false,
  "status": "EXPIRED (Time Passed)"
}
```

### 1.3 POST `/api/student/orders`
Place an order for a chosen slot.
- **Request Body:**
```json
{
  "studentName": "Ujjwal",
  "requestedSlotId": "slot-13",
  "items": [{ "id": "m1", "quantity": 2 }]
}
```
- **Time Expiry Rejection (400 Bad Request):**
  If student tries booking a slot that has passed:
  ```json
  {
    "success": false,
    "code": "SLOT_EXPIRED",
    "message": "The slot '10:00 AM - 10:15 AM' has already expired! You cannot book past time."
  }
  ```
- **Capacity 20 Full Auto-Shift (201 Created):**
  If slot has 20/20 orders booked, the backend automatically places it in the next upcoming slot (e.g., `1:15 PM - 1:30 PM`) and sets `"shiftedToNextSlot": true`.

### 1.4 GET `/api/student/track/:orderId`
Returns Blinkit-style tracking with live remaining minutes (`timeRemainingText`).

---

## 2. Kitchen Dashboard APIs

### 2.1 GET `/api/kitchen/feed`
Returns active kitchen orders (`token`, `slotLabel`, `items`, `status`) and production summary.

### 2.2 PATCH `/api/kitchen/orders/:orderId/status`
Updates status: `{ "status": "Preparing" }` (`Placed` -> `Preparing` -> `Ready` -> `Completed`).

---

## 3. Owner Dashboard APIs

### 3.1 GET `/api/owner/analytics`
Returns total revenue today, popular items, and AI stock refill recommendation table with safety buffer advice.

---

## 4. Demo Helper APIs

### 4.1 POST `/api/demo/set-time`
Allows setting mock time for judges to test time expiry:
- Body: `{ "time": "13:05" }` (Simulates 1:05 PM) or `{ "time": null }` (Uses real system clock).

### 4.2 POST `/api/demo/reset`
Resets the database to baseline demo state.
