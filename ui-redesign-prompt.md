# UI Redesign Prompt: Drug Court Decision Support System

Use the **ui-ux-pro-max** and **frontend-design** skills. Read the ui-ux-pro-max SKILL.md fully before writing any code.

---

## 1. Task

Redesign the frontend of my existing website. Do NOT rebuild the logic.

First, inspect the current codebase and list every page, route, component, form, API call and feature. Keep all of it working. Only the UI/UX layer, styling and interactions change.

**Show me the inventory and wait for my confirmation before redesigning.**

---

## 2. Product

A Decision Support System (DSS) for drug courts.

- **Users:** judges, court staff, and people appearing in court.
- **Core action:** run an audit that shows how recidivism risk works for an individual, with transparent, explainable results.
- **Tone:** serious and trustworthy, yet modern and premium. This is a justice-system tool, so clarity and credibility come before decoration.

---

## 3. Design direction

- **Style:** clean minimal + luxury, with a dark futuristic mode. Precise, calm, high-end (fintech / legal-tech quality, not a flashy startup template).
- **Two full themes**, dark and light, with a toggle that persists in localStorage and respects `prefers-color-scheme`.
- **Palettes:** pick premium palettes from the skill's palette database and define them as design tokens (CSS variables / Tailwind theme).
  - Dark starting point: background `#0B0E14`, surface `#12161F`, text `#E8EAF0`, accent `#6C7BFF` with a soft glow.
  - Light starting point: background `#F6F4EF`, surface `#FFFFFF`, text `#12161F`, accent `#4A58E0`.
  - The skill may refine these. Propose final values in the design system step.
- **Risk colors:** red / amber / green are used ONLY for risk levels, always with a text label and an icon, never color alone.
- **Contrast rules (both themes):**
  - Every text/background pair meets WCAG AA (4.5:1 body, 3:1 large text).
  - No hard-coded colors in components. Tokens only, so nothing overlaps or becomes unreadable when the theme switches.
  - Check charts, tables, badges, inputs, disabled states, placeholders, focus rings and overlays in BOTH modes.
- **Typography:** one display font + one body font from the skill's font pairings, with a clear type scale. Tabular figures for numbers in tables and risk scores.
- **Logo:** none yet. Use a text wordmark placeholder in a single component so the logo can be swapped in later.

---

## 4. Visual references (motion and layout language only, NOT palette)

Reference style: premium motion-studio sites with immersive depth scroll.

Borrow:

1. **Hero:** dark mode uses a pinned full-viewport hero with a soft glowing arc / gradient-mesh light source and a very large display wordmark that reveals letter by letter. Light mode uses a warm off-white stage with the same layout.
2. **Depth scroll:** a 3D card tunnel or curved-plane carousel (React Three Fiber or CSS 3D transforms), used ONCE, in the "How the audit works" section. Each card is a pipeline stage: Intake, Risk factors, Explainability, Human review, Intervention plan. Supports drag, scroll and arrow keys. Fallback for reduced-motion and low-power devices: a horizontal scroll-snap carousel.
3. **Floating control dock:** a dark pill-shaped bottom bar (backdrop blur) holding primary actions on audit and results pages (Run audit, Save, Export PDF, Compare, Theme toggle). Same pattern in both themes.
4. **Pill navbar:** centered floating pill nav, active item in a lighter pill, one primary CTA on the right.
5. **Typography:** oversized display type for headings and hero numbers, plus small uppercase monospace metadata labels (e.g. `CASE Nº 0142`, `AUDIT v1.0`, `RISK INDEX`) as editorial detail.
6. **Grain:** very low-opacity film-grain overlay on hero backgrounds only.
7. **Large-number storytelling:** count-up stats and scroll-pinned sections where text swaps while the visual stays.

Do NOT borrow: neon pink / yellow / green palettes, glitch or chromatic-aberration effects, decorative imagery, or any playful tone.

---

## 5. Motion (heavy, but purposeful)

- Smooth scrolling (Lenis), scroll-triggered reveals, parallax, and a standout animated hero (subtle 3D or particle / gradient-mesh background with a lightweight fallback).
- Animated risk gauges, number count-ups, chart draw-in, page transitions, magnetic buttons, hover micro-interactions, skeleton loaders.
- Use Framer Motion and/or GSAP. Respect `prefers-reduced-motion` by disabling heavy effects. Target 60fps and lazy-load heavy assets.
- **Heavy motion belongs to landing / marketing sections.** On audit input, results and data tables, motion stays minimal and functional so users can read and trust the numbers.

---

## 6. Pages and components

Redesign ALL existing pages with one consistent layout system, then specifically polish:

- **Landing / hero:** strong value proposition, how it works, trust and ethics section (explainability, human-in-the-loop, fairness).
- **Audit flow:** clear multi-step form with validation and progress indicator. Results view with risk score, contributing factors (explainability), charts, and recommended interventions.
- **Dashboard / data views:** bento-grid cards, clean tables with filters, sorting and empty states.
- **Shared:** navbar, footer, theme toggle, toasts, modals, loading and error states.

Keep the features of the current version. Do not add or remove functionality without asking.

---

## 7. Tech

- React + Vite. Add Tailwind CSS, shadcn/ui primitives, Framer Motion, Lenis, Lucide icons, and a chart library (Recharts or similar). Reuse what the project already has where sensible.
- Do NOT break the existing backend integration: keep API calls, routes and auth as they are.
- Fully responsive (check 375px, 768px, 1280px, 1920px), no horizontal scroll on mobile, 16px minimum side gutters.
- Accessibility: semantic HTML, keyboard navigation, visible focus states, aria labels, alt text.

---

## 8. Process

1. Inventory the current site and confirm what you found.
2. Propose the design system (palettes for both themes, fonts, spacing, radius, shadows, motion rules) and **wait for my OK**.
3. Build tokens, theme toggle and layout shell.
4. Build the hero, then each page one by one.
5. Polish pass: contrast audit in both themes, responsive, performance (Lighthouse), reduced-motion.
6. Summarize changes and anything that needs my input.

---

## 9. Constraints

- Avoid the generic AI look: no purple-gradient-on-white, no default Inter-everywhere, no emoji as icons, no cluttered stock cards.
- Use placeholder content only where real content doesn't exist, and mark it clearly.
