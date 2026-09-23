# CyberFlow: Predictive Analytics Framework for Proactive Cybercrime Intervention
**Technical Writeup & System Architecture (PPT Companion Guide)**

## 1. Executive Summary
CyberFlow is an advanced **Predictive Analytics Framework** designed to transition cybercrime management from a reactive complaint-logging system to a **proactive, intelligence-driven defense mechanism**. By analyzing historical cybercrime data and financial network patterns, CyberFlow forecasts likely cash withdrawal locations *before* the fraudsters can cash out, enabling Law Enforcement Agencies (LEAs) and Financial Institutions (FIs) to execute timely interventions.

## 2. Core Problem Addressed
The National Cybercrime Reporting Portal (NCRP) receives over 8,000 complaints daily. Currently, LEAs and banks act on these complaints *reactively*, often after funds have been withdrawn from ATMs or untraceable endpoints. 

**The Solution:** CyberFlow intercepts complaint data in real-time, models the financial flow using Artificial Intelligence (AI) trained on massive historical datasets, and predicts the exact hotspots and zones where the stolen funds are likely to surface next. This enables rapid deployment of local teams and immediate bank-level freezing.

---

## 3. Key Deliverables & System Components

### A. Predictive Analytics Engine (Powered by Historical Data)
An AI/ML-powered core that analyzes financial data to detect patterns and predict withdrawal hotspots.
*   **Historical Data Ingestion (Critical):** Our Predictive Engine continuously ingests bulk historical NCRP logs and bank CDRs to build the baseline for our Q-Learning and XGBoost models. When a new complaint arrives, it is evaluated against this massive historical baseline to predict the hotspot.
*   **Graph-Theoretic Analysis:** Converts account-to-account transfers into directed networks to identify mule networks and consolidation hubs.
*   **Machine Learning (XGBoost):** Classifies the operational state of the fraud (e.g., *layering*, *consolidation*) and predicts the most likely next action.

### B. Risk Heatmap Dashboard (Macro & Micro GIS UI)
A GIS-enabled, ultra-smooth 3D visual dashboard for operational command.
*   **Macro "Command Center" Heatmap:** A God's Eye View aggregating all 8,000+ daily complaints into a city-wide/state-wide heatmap. Features explicit drill-down filters for **Crime Category** (e.g., Investment Scams vs Digital Arrest) and **Time Window**. Commanders use this to view cross-jurisdictional threat clusters.
*   **Micro "Case-Centric" Mapping:** Investigators drill down into individual complaints, visualizing the exact predicted ATM hotspots for a specific case with cinematic 3D pitch and building extrusions.

### C. Law Enforcement Interface (Cross-Jurisdictional Intelligence)
A highly secure, wizard-driven portal designed for investigators, actively breaking down physical jurisdictional barriers.
*   **Cross-Jurisdictional Routing:** A major bottleneck is a victim in Delhi filing a complaint while the cash-out happens in Kolkata. CyberFlow features **Geo-Fenced Jurisdiction Mapping**. If a cross-border cash-out is predicted, the intelligence is simultaneously routed to *both* the local investigating officer and the remote physical intervention team.
*   **Stage 1-5 Wizard:** From Incident Validation, to Entity Correlation (Graphing), AI Prediction, 3D Mapping, and final Action Center dispatch.

### D. Alert & Notification System (Multi-Channel Dispatch)
A comprehensive dispatch engine ensuring intelligence reaches the right hands instantly.
*   **Explicit Delivery Channels:** The platform does not rely solely on dashboard alerts. Alerts are simultaneously pushed to:
    *   **Beat Officers:** via **SMS** Gateway (e.g., NIC/Twilio).
    *   **Investigating Officers (IOs):** via **Email** alerts (AWS SES/SMTP).
    *   **Financial Institutions:** via **API Bank Switch Holds** to instantly freeze funds.
    *   **I4C Officers:** via **Dashboard Triggers**.
*   **Blockchain-Backed Audit Trail:** Dispatched alerts are hashed and logged on a local PoW ledger to ensure non-repudiation and cross-agency trust.

### E. 3-Layer Defense Architecture (Prediction Failsafe)
CyberFlow does not rely on a single-point ATM prediction. It deploys a **multi-layered failsafe** to ensure fund recovery even when the Q-Learning model backtracks and shifts its prediction mid-operation:

*   **Layer 1 — Digital Account Freeze (Location-Independent):** The moment a case is ingested, an automated NPCI Switch Hold freezes the identified mule account across **all ATMs nationwide**. Even if the predicted ATM changes 5 times, the criminal cannot withdraw from *any* machine. This is the ultimate failsafe — it is completely independent of which ATM the AI predicts.
*   **Layer 2 — Zone-Based Deployment (Not Point Deployment):** Instead of dispatching a single officer to a single ATM, CyberFlow positions **multiple officers across the predicted zone**, each covering one of the top-ranked ATM candidates. When the prediction shifts from ATM-A to ATM-B within the same zone, the nearest pre-positioned officer is simply redirected — not dispatched from scratch.
*   **Layer 3 — Real-Time Re-Dispatch:** When the Q-Learning model detects a node mismatch and backtracks, the system instantly pushes a **CANCEL** alert to the officer heading to the old ATM and a **NEW DISPATCH** to the nearest officer to the corrected ATM. The Action Center includes a live scenario simulation demonstrating this entire failsafe sequence in real-time.

---

## 4. Technical Architecture Stack
*   **Frontend (UI/UX):** React.js + Vite. Designed with a premium, light-themed "Glass" UI using Framer Motion and MapLibre GL for 3D mapping.
*   **Backend API:** Node.js + Express. Handles rate-limiting, JWT authentication, and headless integration endpoints (`/api/integration/predict`).
*   **AI Engine:** Python (scikit-learn, XGBoost, NetworkX). Operates as an orchestrated subprocess.

## 5. Logical Integration with NCRP/CFCFRMS Workflow
CyberFlow is designed as an **Intelligence Middleware** that operates seamlessly between the Citizen Financial Cyber Fraud Reporting and Management System (CFCFRMS) and the State Police Investigation phase:
1.  **Ingestion:** CyberFlow connects to the State Police API feed, intercepting tickets the moment a 1930 call is logged.
2.  **NLP Extraction:** It instantly parses unstructured descriptions to extract Indicators of Interest (IOIs).
3.  **Graphing & Prediction:** Cross-references IOIs against historical data to predict cash-out zones.
4.  **Dossier Generation:** Presents the IO with a unified intelligence dossier and auto-dispatches alerts.

## 6. Business Impact
By shifting from a reactive pipeline to a predictive framework, CyberFlow:
1.  **Increases Fund Recovery:** By identifying withdrawal locations in advance, funds can be frozen before cash-out.
2.  **Optimizes LEA Resources:** Prevents wasted effort by directing police to high-probability hotspots.
3.  **Strengthens National Security:** Creates a unified, data-driven defense against organized financial cyber fraud across all jurisdictions.
