# Universal AI Agent Context & Handoff Guide

## Mission
This document is the single source of truth for any AI model (Antigravity, Claude, ChatGPT, Cursor, Copilot, etc.) working on this repository for the GoDaddy Hackathon.

## Project Metadata
- Project Owner: Ujjwal Kaushik (BTech 3rd Year)
- Hackathon: GoDaddy Hackathon (College Evaluation)
- Time Window: 120 Minutes Total (Must have a working demo ready before pitch cutoff)
- Pitch Length: 3 Minutes (Structure: Problem -> Breakdown -> Live Demo -> Next Steps)
- Tech Stack:
  - Frontend: React 18, Vite
  - Backend: To be decided based on problem statement
  - Version Control: Managed manually by user (Do NOT push to git)

## Hackathon Constraints & Strategy (Locked)
1. First 15 Mins: Problem breakdown, user persona, and MVP boundary definition.
2. Anti-Scope Creep: Build only the core working flow. No extra decorative features until MVP works.
3. Edge Case Handling: Prevent crashes on empty inputs, double submissions, or unexpected data.
4. Working Prototype Over Slides: Evaluation strictly prioritizes a live working demo over PowerPoint.
5. Pitch Formula (3 Minutes):
   - Problem definition and who has it
   - How the problem was broken down
   - Live working demo
   - Future scope / What next

## Current Status & Completed Work
- [x] Workspace initialized (`frontend`, `backend`, `rules`, `hooks`, `agent`).
- [x] Frontend scaffolded with Vite + React:
  - `src/main.jsx`
  - `src/App.jsx`
  - `src/components/Navbar.jsx`
  - `src/components/Footer.jsx`
  - `src/pages/Home.jsx`
- [x] Safety and content rules locked in `rules/always/safety.md`.
- [x] Protection hooks configured in `hooks/pre-commit`, `.cursor/hooks.json`, `.claude/settings.json`.
- [x] Universal AI handoff and rules synced.
- [ ] Problem Statement analysis & flow discussion (Tomorrow with user).
- [ ] Backend setup and integration (Tomorrow).
- [ ] Live interactive demo views (Tomorrow).
- [ ] 3-Minute Pitch script and edge case checklist (Tomorrow).

## Instructions for Incoming AI Models
1. Do NOT recreate or delete existing folders.
2. Read `rules/always/safety.md` before responding or performing any action.
3. Check `agent/status.json` or this file to know the exact stage of the project.
4. Focus purely on a working MVP. Reject any scope creep.
5. Obey the Fact vs Assumption and line-proof rules.
