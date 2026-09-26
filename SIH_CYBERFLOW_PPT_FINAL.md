# CyberFlow — SIH 2026 Grand Finale Master Presentation Deck
> **Fact-Checked & Verified against Codebase (`2026-09-26`)**  
> **Problem Statement:** AI/ML Prediction of Fraud Cash-out Locations & ATM Shortlisting (MHA / I4C)  
> **Target Duration:** 6–8 Minute Pitch | **Deck Format:** 6 Core Slides + Backup Q&A

---

## 📊 Executive Presentation Overview

| Slide # | Slide Title | Core Focus | Key Data / Visual |
|---|---|---|---|
| **01** | Title & Problem Context | Vision, Problem Statement & Team | Problem ID, Title, Ecosystem Positioning |
| **02** | Proposed Solution & Innovation | Reconstructing Layering Lag to Pre-Withdrawal Awareness | Before/After Flow Diagram & 4 Core Deliverables |
| **03** | Technical Architecture & Stack | End-to-End Pipeline & 9-Component System | System Architecture Table & Graph Execution Flow |
| **04** | Feasibility & Risk Mitigation | Statistical Guardrails & Evidentiary Non-Repudiation | Welch's t-test Table, Risk Matrix, BSA Sec 65B |
| **05** | Performance & Measured Impact | Held-out Evaluation Results & Social/Economic Benefits | 600-Case Test Set Confusion Matrix & Metrics |
| **06** | Research & Legal References | Citations, Standards & Admissibility Framework | TreeSHAP, Welch (1947), BSA Sec 65B, I4C Framework |

---

## Slide 1 — Title & Problem Context

### 🎨 Visual Layout & Structure
* **Header / Banner:** National Cyber Crime Coordination Centre (I4C) & MHA Hackathon Context.
* **Left Column:** Project Name (**CyberFlow**), Tagline (*"Proactive Cyber-Financial Crime Intelligence & Cash-out Forecasting"*), Problem Statement ID & Title.
* **Right Column:** Key System Attributes (Decision-Support Prototype, Explainable ML, SHA-256 Ledger, MapLibre Geospatial Engine).

### 📝 On-Slide Text (Ready for PPT)

#### Header:
**Smart India Hackathon 2026 — Grand Finale**  
*Ministry of Home Affairs (MHA) / Indian Cyber Crime Coordination Centre (I4C)*

#### Project Title:
# CYBERFLOW
### Proactive Cyber-Financial Crime Intelligence & Cash-out Forecasting

#### Problem Statement:
* **PS Title:** Predictive Analytics for Financial Cybercrime & Cash-out Location Shortlisting
* **System Purpose:** AI/ML decision-support system shifting LEA investigations from post-incident reporting to pre-withdrawal awareness.

#### Core Technological Pillars:
* 🌐 **Graph Reconstruction:** Multi-hop transaction linking & node correlation.
* 🤖 **Explainable AI:** XGBoost + Native TreeSHAP feature contribution tracing.
* 🗺️ **Geospatial Shortlisting:** Macro risk zone heatmap & Top-3 candidate ATM ranking.
* 🔒 **Evidentiary Integrity:** SHA-256 hash-chained alert ledger aligned with Section 65B BSA.

---

### 🎙️ Presenter Script (Speaking Notes)
> *"Respected Members of the Jury, good morning/afternoon. Today, financial cybercrime moves at digital speed while traditional investigation moves at administrative speed. When a victim loses money to a digital arrest or payment gateway scam, fraud syndicates layer those funds across multiple accounts and cash out at physical ATMs within minutes—long before manual cross-bank tracing can even begin.*
>
> *We present **CyberFlow**—an explainable, decision-support intelligence platform built specifically for Law Enforcement Agencies and Financial Intelligence Units. CyberFlow shifts the paradigm from reactive post-incident paper tracing to proactive pre-withdrawal awareness by combining multi-hop graph analysis, XGBoost machine learning, and spatial ATM candidate ranking."*

---

### ❓ Jury Q&A & Defense Strategy
* **Q: Is CyberFlow an automated asset-freezing system?**
  * **A:** *"No, sir/ma'am. CyberFlow is strictly a **decision-support prototype**. Every recommended action—whether notifying a local cyber cell or requesting bank account verification—requires explicit human investigator approval before external dispatch. It empowers officers with ranked evidence, preserving full human agency."*

---

## Slide 2 — Proposed Solution & Innovation

### 🎨 Visual Layout & Structure
* **Top Banner:** Problem vs. Solution Paradigm Shift.
* **Diagram 1 (Flowchart):** 
  * *Traditional Path:* Complaint Filed → Days of Manual Spreadsheet Tracing → Funds Withdrawn / Trail Cold.
  * *CyberFlow Path:* Complaint Ingested → Graph Reconstruction → 42-Feature Extraction → XGBoost + Spatial Ranking → Top-3 Candidate ATMs Shortlisted + Hash-Chained Alert.
* **Bottom Grid:** 4 Cards representing PS Key Deliverables (A, B, C, D).

### 📝 On-Slide Text (Ready for PPT)

#### The Layering Lag Challenge:
* **Current Investigation Gap:** Centralized complaint aggregation exists (NCRP), but cross-bank tracing is manual, sequential, and spreadsheet-driven.
* **The Syndicate Advantage:** Fraud networks consolidate funds into mule clusters and execute ATM cash-outs in minutes.

#### The CyberFlow Paradigm Shift:
* Reconstructs the multi-hop transaction topology automatically upon intake.
* Forecasts likely cash-out **zones** and ranks candidate **ATMs** before manual cross-bank tracing typically starts.

#### Mapping to PS Key Deliverables:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 DELIVERABLE MAP                                        │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ Deliverable A:           │ Deliverable B:           │ Deliverable C:                   │
│ Predictive Engine        │ Command Heatmap          │ Law Enforcement Interface        │
│ • 42 Engineered Features │ • Zone-level Heatmap     │ • Role-Gated 5-Step Case Wizard  │
│ • 5 XGBoost Models       │ • Built on MapLibre GL   │ • TreeSHAP Evidence Dossier      │
│ • Risk, Priority & Zone  │ • Case Drill-down        │ • Actionable Intelligence Center │
├──────────────────────────┴──────────────────────────┴──────────────────────────────────┤
│ Deliverable D: Alert & Notification System                                             │
│ • Role-Aware Dispatch (LEA, Bank/FI, I4C)  • Cryptographic SHA-256 Audit Trail        │
│ • Delivered Email Intelligence Briefs (SMTP) • Honest Simulation Labels for External API │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 🎙️ Presenter Script (Speaking Notes)
> *"To understand CyberFlow’s innovation, look at the flow diagram on this slide. Currently, when a complaint is registered, officers must manually request bank statements, map account chains across different financial institutions, and draft formal letters. By the time this manual reconciliation happens, the cash-out has already occurred.*
>
> *CyberFlow inserts itself at the moment of intake. It ingests the complaint, constructs a directed transaction graph, extracts 42 graph-topological and behavioral features, and passes them to 5 XGBoost models. Instead of giving a vague country-wide risk score, CyberFlow predicts the likely cash-out **zone** and ranks a Top-3 candidate **ATM shortlist** with confidence percentages—giving field officers an immediate, actionable target."*

---

### ❓ Jury Q&A & Defense Strategy
* **Q: Why don't you claim a 'Golden 60 Minutes' or 'Sub-2-Minute Interception' window?**
  * **A:** *"Because as honest engineers, we do not claim unbenchmarked operational numbers. CyberFlow generates its recommendation instantly upon complaint ingestion. The actual physical interception depends on field team dispatch, but CyberFlow eliminates the manual multi-day tracing lag entirely."*

---

## Slide 3 — Technical Approach & System Architecture

### 🎨 Visual Layout & Structure
* **Left Column:** Verified Technology Stack (Frontend, Backend, AI/ML, Security).
* **Center / Right Table:** 9-Component Modular Architecture Specification.
* **Bottom Banner:** Codebase Integrity & Live Access Verification Links.

### 📝 On-Slide Text (Ready for PPT)

#### 1. Tech Stack (100% Codebase Verified)
* **Frontend & Mapping:** React 19, Vite, **MapLibre GL JS** (3D vector maps), Framer Motion, `react-force-graph-2d`.
* **Backend & Security:** Node.js, Express.js, JWT RBAC, `express-validator`, `express-rate-limit`, Helmet.
* **AI/ML Core:** Python, XGBoost (5 models), scikit-learn, pandas, NumPy, NetworkX, SciPy.
* **Database & Integrity:** SQLite prototype with documented PostgreSQL/PostGIS & Neo4j migration path; SHA-256 Hash Chain.

#### 2. Component Architecture Table

| Component | Technology | Function & Production Specification |
|---|---|---|
| **Ingestion & Validation** | Node.js, express-validator | Validates complaint payloads, enforces RBAC, rate-limiting & schema contracts |
| **Entity Graph Builder** | Python, NetworkX | Constructs directed multi-hop graph (`Account → Transaction → Device → ATM`) |
| **Feature Extraction** | pandas, NumPy | Computes 42 features (velocity, fan-in/out, hop depth, betweenness, device consistency) |
| **Predictive Core** | XGBoost (5 models) | Evaluates fraud stage, next action, risk score, priority, and zone candidates |
| **Explainability Engine** | TreeSHAP (`pred_contribs`) | Extracts real per-case Shapley-value feature attributions for legal auditability |
| **Q-Learning Engine** | Tabular Q-learning | Recommends next investigation step; dynamically updates on verified evidence |
| **Spatial Ranking** | Weighted Candidate Scoring | Combines zone confidence, ATM withdrawal history & device proximity to rank Top-3 ATMs |
| **Cryptographic Ledger** | SHA-256 Hash Chain | Appends alert hashes to immutable ledger (`hash = SHA256(payload + prev_hash)`) |
| **Investigator UI** | React, MapLibre GL JS | Renders Macro Heatmap, 5-step Case Wizard, and formal Printable Dossier |

---

### 🎙️ Presenter Script (Speaking Notes)
> *"Our technical architecture is modular and decoupled by design. The Node.js API layer handles security, JWT authentication, role-based access control, and input validation. The Python AI engine receives the payload, constructs a directed property graph using NetworkX, and extracts 42 structural features.*
>
> *Crucially, we do not treat machine learning as a black box. We use XGBoost native TreeSHAP to compute exact Shapley value contributions for every single case. When an officer looks at a high-risk prediction, CyberFlow shows them the exact features that drove that score—such as a hop depth of 4, a high fan-out ratio, or low device consistency."*

---

### ❓ Jury Q&A & Defense Strategy
* **Q: Why are you using SQLite instead of Neo4j or PostgreSQL in this demo?**
  * **A:** *"For a standalone demo, SQLite guarantees zero runtime setup failure on stage. However, our architecture is strictly decoupled: entity relationships are structured to migrate directly to Neo4j for graph queries and PostgreSQL/PostGIS for spatial indexing at production scale."*

---

## Slide 4 — Feasibility Analysis & Risk Mitigation

### 🎨 Visual Layout & Structure
* **Top Quad-Grid:** Technical, Operational, Economic, and Policy Feasibility.
* **Center Table:** Welch’s t-test Feature Significance & Statistical Guardrails.
* **Right Panel:** Risk Mitigation & Safety Controls (Insufficient Evidence State, BSA Sec 65B).

### 📝 On-Slide Text (Ready for PPT)

#### 1. Multi-Dimensional Feasibility

```
┌─────────────────────────────────────────┬─────────────────────────────────────────┐
│ TECHNICAL FEASIBILITY                   │ OPERATIONAL FEASIBILITY                 │
│ • Modular API + Python AI Engine        │ • No ML expertise needed for officers   │
│ • TreeSHAP plain-language attribution   │ • Dual views: Supervisory Heatmap &     │
│ • Clear DB upgrade path (Postgres/Neo4j)│   5-Step Case Wizard for field officers │
├─────────────────────────────────────────┼─────────────────────────────────────────┤
│ ECONOMIC FEASIBILITY                    │ POLICY & LEGAL FEASIBILITY              │
│ • 100% Open-Source stack (no licenses)  │ • Strict decision-support (human choice)│
│ • Tabular CPU execution (no GPU cluster)│ • BSA Section 65B compliant audit trail │
│ • Low hosting cost (Render/Vercel)      │ • I4C proactive mandate alignment       │
└─────────────────────────────────────────┴─────────────────────────────────────────┘
```

#### 2. Statistical Validation & Guardrails (Welch's t-test)
* **Feature Rigor:** Conducted Welch's t-test comparing fraud cases against legitimate business transactions on held-out data.
* **Significant Drivers (p < 0.05):** Hop depth, transaction velocity, distinct device count, and network betweenness centrality.
* **Transparent Modeling Choice:** Zone-fraction features had higher p-values ($p \approx 0.63–0.87$) and were retained explicitly for macro-spatial context rather than dropped—an honest, documented design decision.

#### 3. Operational Safety & Risk Mitigation Matrix

| Operational Risk | Mitigation Strategy Built into CyberFlow |
|---|---|
| **Thin / Missing Data** | **Insufficient Evidence Safety State:** Automatically flags low-data cases and degrades confidence scores instead of issuing false high-priority alerts. |
| **False Positives** | Trained against legitimate business transaction profiles to eliminate false flags on high-velocity commercial activity. |
| **Legal Admissibility** | Every alert dispatches a cryptographic SHA-256 hash containing parent block links, preventing retroactive evidence tampering under Section 65B BSA. |

---

### 🎙️ Presenter Script (Speaking Notes)
> *"Feasibility must be proven, not assumed. From an economic standpoint, CyberFlow uses a 100% open-source stack running on standard CPU servers—requiring zero expensive GPU clusters. Operationally, it presents plain-language intelligence so field officers don't need data science degrees to make decisions.
>
> *Furthermore, we built statistical guardrails into the engine. We ran Welch’s t-tests across our 42 features to verify that topological metrics like hop depth and device count are statistically significant ($p < 0.05$). Additionally, if a complaint arrives with sparse data, CyberFlow doesn't hallucinate a prediction—it triggers an explicit 'Insufficient Evidence' safety state."*

---

### ❓ Jury Q&A & Defense Strategy
* **Q: How does your system comply with Indian evidentiary law (Bharatiya Sakshya Adhiniyam / BSA)?**
  * **A:** *"Under Section 65B of BSA, electronic records must prove chain of custody and tamper-evidence. Every alert generated by CyberFlow computes a SHA-256 hash incorporating the case payload and the previous alert's hash. This creates an append-only, tamper-evident audit trail suitable for court admissibility."*

---

## Slide 5 — Measured Performance, Impact & Benefits

### 🎨 Visual Layout & Structure
* **Left Box:** Held-Out Test Set Results & Confusion Matrix (600 Cases).
* **Right Top:** Quantitative Model Precision & Conservative Design Philosophy.
* **Right Bottom:** Social, Economic & Energy Benefits.

### 📝 On-Slide Text (Ready for PPT)

#### 1. Real, Measured Model Evaluation (Held-out Test Set)
* **Dataset Size:** 600 total cases (510 fraud incidents, 90 legitimate commercial transactions).

```
                      HELD-OUT CONFUSION MATRIX
                 ┌──────────────────┬──────────────────┐
                 │  Actual Fraud    │  Actual Legit    │
 ┌───────────────┼──────────────────┼──────────────────┤
 │ Flagged Fraud │ 336 (True Pos)   │   0 (False Pos)  │
 ├───────────────┼──────────────────┼──────────────────┤
 │ Cleared Legit │ 174 (False Neg)  │  90 (True Neg)   │
 └───────────────┴──────────────────┴──────────────────┘
```

#### 2. Performance Metrics

$$\text{Precision} = \frac{336}{336 + 0} = \mathbf{100.0\%} \quad \Big| \quad \text{False Positive Rate} = \mathbf{0.0\%}$$

$$\text{Accuracy} = \mathbf{71.0\%} \quad \Big| \quad \text{Recall} = \mathbf{65.9\%} \quad \Big| \quad \text{F1 Score} = \mathbf{0.79}$$

* **Conservative Tuning Philosophy:** CyberFlow is deliberately tuned for **100% Precision (0% False Positive Rate)** on commercial transactions, ensuring legitimate business payouts are never mistakenly flagged or frozen.

#### 3. Core Impact & Ecosystem Benefits
* **Qualitative Efficiency:** Replaces multi-bank spreadsheet tracing with instant graph visualization and ranked ATM candidate shortlists.
* **Social Benefit:** Empowers district cyber cells with command-center grade predictive intelligence.
* **Environmental & Energy Benefit:** Tabular gradient-boosted trees consume orders of magnitude less energy per prediction compared to heavy deep-learning neural networks.

---

### 🎙️ Presenter Script (Speaking Notes)
> *"Let us look at actual measured model performance on our held-out test set of 600 cases. 
>
> *CyberFlow achieved **100% Precision with a 0% False Positive Rate**. Out of 90 legitimate commercial business cases in the test set, zero were falsely flagged as fraud. We deliberately chose a conservative decision threshold: in financial cybercrime, falsely freezing a legitimate business account creates severe legal and economic fallout. CyberFlow ensures that when an alert is dispatched, the evidence is solid."*

---

### ❓ Jury Q&A & Defense Strategy
* **Q: 71% accuracy and 65.9% recall mean you miss 34% of fraud. Is that acceptable?**
  * **A:** *"Yes, because in decision-support for financial fraud, precision is prioritized over recall to prevent false accusations. Furthermore, the risk threshold in CyberFlow is a configurable parameter. Law enforcement administrators can adjust the decision threshold to increase recall depending on operational priorities."*

---

## Slide 6 — Research References & Legal Admissibility

### 🎨 Visual Layout & Structure
* **Top Box:** Academic & Methodological Foundations.
* **Middle Box:** Statutory & Legal Admissibility (BSA Section 65B).
* **Bottom Box:** Institutional Mandate Alignment (I4C / MHA).

### 📝 On-Slide Text (Ready for PPT)

#### 1. Methodological & Scientific Foundations
* **Gradient Boosting Core:** Chen, T., & Guestrin, C. (2016). *XGBoost: A Scalable Tree Boosting System*. ACM SIGKDD.
* **Explainable AI (XAI):** Lundberg, S. M., & Lee, S.-I. (2017). *A Unified Approach to Interpreting Model Predictions (TreeSHAP)*. NIPS.
* **Statistical Rigor:** Welch, B. L. (1947). *The Generalization of Student's Problem when Several Different Population Variances are Involved*. Biometrika.

#### 2. Statutory Framework & Evidence Logging
* **Bharatiya Sakshya Adhiniyam (BSA) Section 65B:** Electronic evidence admissibility via cryptographic hash-chaining (`SHA-256`).
* **Non-Repudiation:** Append-only ledger ties case predictions, timestamps, and officer approvals into an unalterable audit chain.

#### 3. National Policy Alignment
* **I4C Mandate:** Directly supports the Citizen Financial Cyber Fraud Reporting & Management System (CFCFRMS) proactive mitigation objectives.
* **Inter-Agency Coordination:** Automated cross-jurisdictional alerting bridges operational gaps between originating LEAs and cash-out zone Cyber Cells.

---

### 🎙️ Presenter Script (Speaking Notes)
> *"To conclude, CyberFlow is anchored in established scientific literature and Indian statutory frameworks. We utilize Chen & Guestrin’s XGBoost framework alongside Lundberg’s TreeSHAP for explainability, and Welch’s two-sample t-test for feature validation.
>
> *Legally, our SHA-256 hash-chained alert ledger satisfies Section 65B of the Bharatiya Sakshya Adhiniyam, preserving electronic chain of custody. CyberFlow delivers a scientifically grounded, legally defensible, and operationally ready solution for modern cyber-financial crime defense. Thank you, and we welcome your questions."*

---

## 📐 Presentation Diagram Specifications (For Slide Creation)

### Diagram 1: Operational Flowchart (Slide 2 & 3)
```
┌──────────────────────────┐
│  NCRP Complaint Intake   │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Entity Graph Builder    │ (NetworkX Multi-hop Graph)
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  42-Feature Extraction   │ (Velocity, Hop Depth, Betweenness)
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│   XGBoost Engine (5x)    │ ───► TreeSHAP Explanation Dossier
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Geospatial & ATM Shortlist│ (Macro Zone Heatmap + Top-3 ATMs)
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Cryptographic SHA-256    │ ───► Role-Aware Alert Dispatch
│    Chain of Custody      │      (LEA, Bank/FI, I4C)
└──────────────────────────┘
```

---

## 🛡️ Master Jury Q&A Defense Matrix (Quick Reference)

| Question Area | Common Jury Challenge | Codebase Fact-Checked Response |
|---|---|---|
| **Data Realism** | *"Is your data real bank data?"* | *"No, sir/ma'am. Due to DPDP Act and banking privacy laws, we generated a synthetic dataset adhering strictly to real fraud topologies (investment scams, digital arrest, fake gateways). The evaluation pipeline uses standard held-out train/test splits with zero data leakage."* |
| **Live SMS / Bank API** | *"Did you connect real SMS gateways or Bank APIs?"* | *"No. We practice honest labeling: our backend actually dispatches real SMTP email briefs to officers, but SMS and Bank API channels are explicitly labeled 'simulated' in the UI because live gateway integration requires official government staging credentials."* |
| **Model Black-Box** | *"How can a judge trust an AI prediction?"* | *"CyberFlow uses TreeSHAP to calculate exact Shapley feature values for every prediction. Instead of a black-box score, officers receive a mathematical explanation showing exactly which features (e.g. hop depth = 4) created the risk rating."* |
| **Scalability** | *"How will this scale across India?"* | *"The Node.js and Python architecture is completely stateless and containerizable. For nationwide deployment, SQLite migrates to PostgreSQL/PostGIS and NetworkX scales to Neo4j cluster nodes."* |
