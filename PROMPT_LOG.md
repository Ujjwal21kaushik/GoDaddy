# Hackathon Prompt & AI Debugging Log (Required by Criteria)

## Prompt 1: Synthetic Data Generation & Demand Analytics
- **Prompt:** "Write a Node.js data generator that creates 30 days of realistic college canteen orders factoring in weekday vs weekend demand, lunch rush between 12:30 and 14:00, and calculates peak 15-minute slots, top 5 items, and a demand prediction formula based on sales, buffer, and current stock."
- **AI Output:** Successfully produced `backend/data-generator.js` with 5,500+ realistic simulated orders.
- **What AI Got Wrong:** Initially forgot that unsold food is not equal to wasted food unless perishable expiration is factored in. We corrected the calculation to use `Prepared - Sold = Leftover`, and applied waste penalties only to fresh meals (sandwiches, rolls) while beverages have higher shelf-stability.

## Prompt 2: The 90-Minute Gate Refusal Logic
- **Prompt:** "Create an Express API endpoint for placing orders that checks slot capacities, refuses orders when a 15-minute bucket is full with HTTP 409, and automatically returns the next best quieter slot."
- **AI Output:** Clean API endpoint in `backend/server.js`.
- **What AI Got Wrong:** The AI initially returned just a generic string "Slot is full" without suggesting alternative slots. The hackathon criteria explicitly stated: *"Your app must refuse it and offer the next slot"*. We updated the response payload to return `{ code: 'SLOT_FULL', suggestedSlot: nextAvailable }` with a 1-click accept button in the frontend.

## Prompt 3: 3-Tap Student Ordering UX
- **Prompt:** "Build a mobile-first React component where a student can complete an order in exactly 3 taps: Tap 1 to pick food, Tap 2 to pick time slot, Tap 3 to confirm and receive a token."
- **AI Output:** Designed `frontend/src/components/StudentOrder.jsx`.
- **What AI Got Wrong:** The AI initially put quantity selectors, payment gateway placeholders, and multi-step cart modals which required 6+ taps. We stripped it down to a crisp, high-speed 3-tap workflow ideal for hackathon evaluation.
