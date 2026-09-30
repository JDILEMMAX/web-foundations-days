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
| **Day 1** | Monday | How the Web Works + HTML | Semantic QuickNotes skeleton, About page, forms, tables and accessible navigation | [`day1/`](./day1/) | **Completed (100/100)** |
| **Day 2** | Tuesday | CSS - Styling & Layout | Modern layout models, Flexbox, Grid, CSS custom properties and responsive UI | `day2/` | Planned |
| **Day 3** | Wednesday | JavaScript Fundamentals | Core logic, data structures, event loops and Console engine for QuickNotes | `day3/` | Planned |
| **Day 4** | Thursday | DOM, Events & Browser Storage | DOM manipulation, state persistence via `localStorage` and UI interaction | `day4/` | Planned |
| **Day 5** | Monday | Client-Server, HTTP & APIs | Network request lifecycle, RESTful endpoints and asynchronous `fetch()` pipelines | `day5/` | Planned |
| **Day 6** | Tuesday | Data & Storage | Relational schemas, database normalisation, storage trade-offs and query design | `day6/` | Planned |
| **Day 7** | Wednesday | System Design - Scaling | Architectural blueprinting, caching layers, load balancers and 1M user scale | `day7/` | Planned |
| **Day 8** | Thursday | Capstone - Design & Present | Comprehensive architecture defense, system metrics and executive presentation | `day8/` | Planned |

---

## 3. Day 1 Architecture: Semantic HTML5 & Accessible Navigation

The Day 1 deliverables set up the core structural foundation for the QuickNotes ecosystem across two interlinked pages:

```text
day1/
├── index.html       # Primary application entry point & semantic note structure
└── about.html       # Documentation portal, usage guide, keyboard map & feedback form
```

### Key Architectural Specifications Implemented:
* **Strict Semantic Hierarchy:** Built without layout containers, using `<header>`, `<nav>`, `<main>`, `<section>`, `<article>` and `<footer>` elements.
* **WAI-ARIA Navigation Awareness:** Navigation anchors feature bidirectional relative paths equipped with `aria-current="page"` to provide immediate positional context to screen readers.
* **Input-Label Binding & Validation:** Native browser-enforced validation with matching `for` and `id` references across text, email and multi-line textarea controls.
* **Rich Keystroke Semantics:** Standardized `<kbd>` wrappers for operational key sequences (`Enter`, `Tab` and `Ctrl + S`) in compliance with MDN input device markup specifications.
* **W3C Standards Compliance:** Verified against the W3C Markup Validation Service with zero syntax errors, unclosed tags or invalid nesting.

---

## 4. Engineering Standards & Repository Governance

All code submitted to this repository satisfies the following guidelines:
1. **Zero-Dependency Vanilla Baseline:** Core web standards (HTML5, modern CSS3 and vanilla ES6+) are prioritized to master underlying browser rendering engines and runtimes before incorporating external abstractions.
2. **Accessibility-First Design:** Full adherence to WCAG accessibility principles, keyboard focus flows, screen-reader friendliness and accessible color contrast.
3. **Auditable Git History:** Granular, atomic commits following strict Conventional Commit specifications (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
4. **Resilient System Architectures:** Engineering decisions are evaluated against latency, fault tolerance, maintainability and real-world scalability.

---

## 5. Local Development & Verification

To inspect or serve the daily modules locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/JDILEMMAX/web-foundations-days.git
   cd web-foundations-days
   ```

2. Open the project in VS Code:
   ```bash
   code .
   ```

3. Launch any HTML file using the **Live Server** extension (`Go Live` or `Alt + L, Alt + O`) to preview with instant reload.

---

## License

This repository is maintained by Jesse Vincent under the [MIT License](LICENSE).