# Web Foundations & System Design

[![PLP Exclusive SE Cohort](https://img.shields.io/badge/PLP-Exclusive%20SE%20Cohort-red.svg)](https://powerlearnproject.org)
[![Author](https://img.shields.io/badge/Engineer-Jesse%20Vincent-blue.svg)](https://github.com/JDILEMMAX)
[![Pod](https://img.shields.io/badge/Evaluation%20Pod-Pod%2092%20(Commit%20Crew)-orange.svg)](#)
[![W3C Validated](https://img.shields.io/badge/W3C-Validated%20HTML5-brightgreen.svg)](https://validator.w3.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An auditable, enterprise-grade engineering repository tracking daily coursework, core architectures and practical system implementations for the **Web Foundations & System Design** module within the Power Learn Project (PLP) Exclusive Software Engineering track.

---

## 1. Engineering Profile & Pod Lineage

* **Lead Engineer:** Jesse Vincent ([@JDILEMMAX](https://github.com/JDILEMMAX))
* **Role:** Systems Architect, Senior Pod Lead and Full-Stack Developer
* **Programme:** Exclusive Software Engineering Cohort (PLP Africa)
* **Timezone:** East Africa Time (EAT, UTC+3)
* **Historical Standing:** Pod 92 ("Commit Crew") Lead during the Evaluation Phase, achieving a verified top score of 62 in the final Reflex Readiness Sprint.
* **Preceding Engineering Milestones:**
  * **Sprint 1 (The Northstar Sprint):** Support Deflection MVP engineered in FastAPI, SQLite and ES6 with strict task governance and conventional commits.
  * **Sprint 2 (The Meridian Pivot):** High-pressure architectural migration from synchronous integrations to an asynchronous, non-blocking queue (`asyncio.Queue`) paired with decoupled webhook receivers.
  * **Sprint 3 (The Reflex Sprint):** Auditable retail dispatch and chain-of-custody engine featuring multi-persona RBAC, dual-factor Proof of Delivery (4-digit PIN + QR), SQLite WAL logging and public cloud deployment on Render.

---

## 2. Module Overview & Timetable Roadmap

This repository hosts daily assignments spanning client-side engineering, standards-compliant web foundations, scalable networking and distributed systems.

| Day | Weekday | Topic | Primary Deliverables | Directory | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Day 1** | Monday | How the Web Works + HTML | Semantic QuickNotes skeleton, About page, forms, tables and accessible navigation | [`day1/`](./day1/) | **Completed (98/100)** |
| **Day 2** | Tuesday | CSS - Styling & Layout | Modern layout models, Flexbox, Grid, CSS custom properties and responsive UI | [`day2/`](./day2/) | **Completed (98/100)** |
| **Day 3** | Wednesday | JavaScript Fundamentals | Core logic, data structures, event loops and Console engine for QuickNotes | [`day3/`](./day3/) | **Completed (96/100)** |
| **Day 4** | Thursday | DOM, Events & Browser Storage | DOM manipulation, state persistence via `localStorage` and UI interaction | [`day4/`](./day4/) | **Completed (98/100)** |
| **Day 5** | Monday | Client-Server, HTTP & APIs | Network request lifecycle, RESTful endpoints and asynchronous `fetch()` pipelines | [`day5/`](./day5/) | **Completed (98/100)** |
| **Day 6** | Tuesday | Data & Storage | Relational schemas, database normalisation, storage trade-offs and query design | `day6/` | Planned |
| **Day 7** | Wednesday | System Design - Scaling | Architectural blueprinting, caching layers, load balancers and 1M user scale | `day7/` | Planned |
| **Day 8** | Thursday | Capstone - Design & Present | Comprehensive architecture defense, system metrics and executive presentation | `day8/` | Planned |

> **Major Milestone Project 1:** QuickNotes standalone production application engineered and deployed in repository [`quicknotes-app`](https://github.com/JDILEMMAX/quicknotes-app) (**Verified Score: 100/100**).

---

## 3. Directory Layout Architecture

```text
web-foundations-days/
├── .gitignore
├── LICENSE
├── README.md
├── day1/
│   ├── index.html       # Primary application entry point & semantic note structure
│   └── about.html       # Product documentation, keyboard matrix & feedback form
├── day2/
│   ├── index.html       # Styled QuickNotes application with sticky note cards
│   ├── about.html       # Styled documentation portal with CSS Grid feature matrix
│   └── style.css        # Unified stylesheet: Flexbox, CSS Grid, Box Model & Media Queries
├── day3/
│   ├── index.html       # Host shell with deferred JavaScript execution
│   └── script.js        # Pure logic engine: Note Toolkit algorithms & validation
├── day4/
│   ├── index.html       # Accessible editor shell, metrics panel & theme toggle controls
│   ├── style.css        # CSS Custom Properties on :root, dark theme overrides & state badges
│   └── script.js        # Reactive DOM engine, word/char counters & localStorage synchronization
└── day5/
    ├── index.html       # Asynchronous User Directory DOM interface
    ├── style.css        # Responsive CSS Grid card layout with design tokens
    ├── users.js         # Fetch pipeline, error states & client-side filtering
    └── library-api.md   # RFC 7807 RESTful API architecture specification
```

---

## 4. Module Architecture Summaries

### Day 1: Semantic HTML5 & Accessible Navigation
* **Strict Semantic Hierarchy:** Built without redundant layout wrappers using `<header>`, `<nav>`, `<main>`, `<section>`, `<article>` and `<footer>` elements.
* **WAI-ARIA Positional Context:** Bidirectional relative links equipped with `aria-current="page"` to broadcast state to screen readers.
* **Input-Label Binding & Validation:** Native browser-enforced validation with matching `for` and `id` references across text, email and multi-line textarea controls.
* **Rich Keystroke Semantics:** Standardized `<kbd>` wrappers for operational key sequences (`Enter`, `Tab` and `Ctrl + S`).

### Day 2: Modern Layout Engines & Responsive UI
* **Design Tokens via CSS Variables:** Centralized color and typography variables defined on `:root` to eliminate magic values and ensure maintainable styling.
* **One-Dimensional Alignment (Flexbox):** Centered navigation bar with dynamic gaps, and a responsive input group where the text box expands via `flex: 1`.
* **Two-Dimensional Grid Cards (CSS Grid):** Feature cards laid out using `repeat(auto-fit, minmax(180px, 1fr))` for fluid reordering across screen widths without media query bloat.
* **WCAG Focus Visibility:** Dedicated `:focus-visible` styling with dual-pixel outlines and offset buffers to ensure seamless accessibility for keyboard-only operators.
* **Mobile-First Breakpoint:** Responsive `@media (max-width: 600px)` viewport configuration adjusting header padding, font scale and form stacking.

### Day 3: JavaScript Fundamentals & Algorithmic Resilience
* **Configuration Object Pattern:** Function interfaces refactored to accept self-documenting parameter objects (`{ text, category, targetArray }`), eliminating positional argument errors.
* **Dependency Injection:** Collections passed directly into data transformers to avoid global state mutation and guarantee unit test isolation.
* **Grammatical Pluralization:** Exact noun agreement handling zero, singular (`1 note`) and plural (`N notes`) states without awkward UI text.
* **Defensive Boundary Checks:** Multi-tier sanitization enforcing string type guards, whitespace trimming, duplicate rejection and category whitelisting.

### Day 4: DOM Events, Reactive State & Local Persistence
* **Data-to-UI Render Pattern:** UI updates strictly driven by state mutations, decoupling data transformations from screen manipulation.
* **XSS Attack Surface Mitigation:** All user-supplied content injected using `textContent` and programmatic node creation (`document.createElement`), completely bypassing unsafe `innerHTML` execution.
* **Reactive Input Metrics:** Real-time character and word count calculations triggering dynamic threshold classes (`.warning` at 180 characters and `.over` at 200 characters).
* **Cross-Session Hydration:** State synchronization using serialized `localStorage` transactions, providing seamless draft recovery and theme retention across page refreshes.

### Day 5: Client-Server Lifecycle, HTTP Protocols & RESTful Architecture
* **Asynchronous Data Pipelines:** Engineered robust `fetch()` routines with `async / await` and explicit `response.ok` status validation to catch 4xx and 5xx errors.
* **UI Transit Lifecycle Management:** Enforced single-flight safety by disabling submit controls during transit and using `finally` blocks to guarantee control recovery across network outcomes.
* **In-Memory Cache & Client Filtering:** Decoupled network calls from view-layer filtering by caching fetched user records, executing case-insensitive lookups with zero redundant requests.
* **Enterprise REST Resource Design:** Documented a library API specification covering complete CRUD operations, query-parameter author filtering, HTTP status code contracts and RFC 7807 problem details.

---

## 5. Engineering Standards & Repository Governance

All code submitted to this repository satisfies the following guidelines:
1. **Zero-Dependency Vanilla Baseline:** Core web standards (HTML5, modern CSS3 and vanilla ES6+) are prioritized to master underlying browser rendering engines and runtimes before incorporating external abstractions.
2. **Accessibility-First Design:** Full adherence to WCAG accessibility principles, keyboard focus flows, screen-reader friendliness and accessible color contrast.
3. **Auditable Git History:** Granular, atomic commits following strict Conventional Commit specifications (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
4. **Resilient System Architectures:** Engineering decisions are evaluated against latency, fault tolerance, maintainability and real-world scalability.

---

## License

This repository is maintained by Jesse Vincent under the [MIT License](LICENSE).