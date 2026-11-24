# GoDaddy Hackathon - Prototype Project

## Project Overview
This repository contains the prototype, architecture, and pitch preparation for the GoDaddy Hackathon by Ujjwal Kaushik.

## Hackathon Evaluation & Operating Guidelines
- **Time Limit**: 120 Minutes total development and verification window.
- **Pitch Format (3 Minutes)**:
  1. Problem statement and user identification.
  2. Problem breakdown and technical approach.
  3. Live working prototype demo.
  4. Next steps and future enhancements.
- **Key Judging Focus**:
  - Clarity in breaking down the core problem.
  - A real, working software prototype (not just slides).
  - Clean explanation and edge-case handling.
- **Scope Creep Policy**: Minimum Viable Product (MVP) first. Only core user flows will be coded.

## Problem Statement & Solution
> *Status: Awaiting problem statement from user.*
- **Problem Statement**: [To be discussed tomorrow]
- **Target User**: [TBD]
- **Proposed Solution**: [TBD]
- **Key Edge Cases to Guard**: [TBD]

## Architecture & Tech Stack
- **Frontend**: React 18, Vite
- **Backend**: [To be decided based on problem statement]
- **Architecture**: Client-Server Prototype with live interactive demo

## Project Structure
```
GoDaddy/
├── frontend/           # Vite React client application
│   ├── src/
│   │   ├── components/ # Modular UI components (Navbar, Footer, etc.)
│   │   └── pages/      # Route/page views (Home, etc.)
├── backend/            # Backend API service
├── rules/              # Operating and safety rules for AI collaborators
│   └── always/
│       └── safety.md
├── hooks/              # Protection and git hooks
├── agent/              # Universal AI agent state and handoff context
│   ├── CONTEXT.md
│   └── status.json
└── README.md
```

## Running the Frontend
1. Navigate to frontend:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```

## AI Collaboration & Continuity
Any AI tool working on this repository must read [agent/CONTEXT.md](file:///c:/Users/ujjwa/Desktop/GoDaddy/agent/CONTEXT.md) and [rules/always/safety.md](file:///c:/Users/ujjwa/Desktop/GoDaddy/rules/always/safety.md) before making edits.
