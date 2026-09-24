# CyberFlow: Predictive Analytics Framework for Proactive Cybercrime Intervention
**Technical Writeup & System Architecture (SIH Finale Companion Guide)**

## 1. Executive Summary
CyberFlow is an advanced **Predictive Analytics Framework** designed to transition cybercrime management from a reactive complaint-logging system to a **proactive, intelligence-driven defense mechanism**. By analyzing historical cybercrime data and financial network patterns, CyberFlow forecasts likely cash withdrawal zones *before* fraudsters can cash out, enabling Law Enforcement Agencies (LEAs) and Financial Institutions (FIs) to execute timely interventions.

## 2. Core Problem Addressed
The National Cybercrime Reporting Portal (NCRP) receives over 8,000 complaints daily. Currently, LEAs and banks act on these complaints *reactively*, often after funds have been withdrawn from ATMs or untraceable endpoints. 

**The Solution:** CyberFlow intercepts complaint data in real-time, models the financial flow using Artificial Intelligence (AI), and predicts the geographic zones where stolen funds are likely to surface next. This enables rapid deployment of local teams and immediate bank-level freezing.

---

## 3. Key Deliverables & System Components

### A. Predictive Analytics Engine (XGBoost & Probabilistic ML)
An AI/ML-powered core that analyzes financial data to detect patterns and predict withdrawal hotspots.
*   **Probabilistic Label Generation (Data Integrity):** Unlike naive models that suffer from circular data leakage, our dataset generation uses strict probabilistic modeling of historical NCRP distributions. Features and labels are dynamically correlated with statistical noise, proving the model actually *learns* complex relationships rather than memorizing deterministic formulas.
*   **Temporal Train/Test Split:** To ensure real-world predictive validity, our model is validated using a strict temporal split (training on past events, testing on strictly future events), eliminating look-ahead bias.
*   **Machine Learning (XGBoost):** Classifies the operational state of the fraud (e.g., *layering*, *consolidation*) and predicts the most likely next action with highly accurate, non-overfit metrics.
*   **Explainable AI (TreeSHAP):** Every prediction is accompanied by a transparent SHAP-based feature importance breakdown, ensuring investigators trust *why* a location was flagged.

### B. Risk Heatmap Dashboard (Macro & Micro GIS UI)
A GIS-enabled, MapLibre GL 3D visual dashboard for operational command.
*   **Macro Command Center:** Aggregates live complaints into a city-wide heatmap. Features explicit drill-down filters for **Crime Category** and **Time Window**.
*   **Real RBI ATM Integration:** The map integrates real RBI coordinates for major cities (e.g., Delhi NCR), rendering actual physical infrastructure rather than synthetic random points, maximizing operational realism.

### C. Law Enforcement Interface (Cross-Jurisdictional Intelligence)
A highly secure, wizard-driven portal designed for investigators.
*   **Geo-Fenced Jurisdiction Mapping:** If a victim in Delhi is targeted by a cash-out in Kolkata, intelligence is simultaneously routed to *both* the local investigating officer and the remote physical intervention team.
*   **Stage 1-5 Wizard:** Guides officers from Incident Validation, Entity Correlation, AI Prediction, 3D Mapping, to the Action Center dispatch.

### D. Alert & Notification System (Multi-Channel Dispatch)
A comprehensive dispatch engine ensuring intelligence reaches the right hands instantly.
*   **Explicit Delivery Channels:** Alerts are pushed to Beat Officers (SMS/API), Investigating Officers (Email), and Financial Institutions (API Bank Switch Holds).
*   **Cryptographic Tamper-Evident Audit Log:** Dispatched alerts are hashed via SHA-256 and chained to prevent post-facto alteration, ensuring non-repudiation and cross-agency trust without the overhead of a bloated public blockchain.

---

## 4. Technical Architecture Stack (Production-Hardened)
*   **Frontend (UI/UX):** React.js + Vite. Features a premium "Glass" UI using Framer Motion and MapLibre GL.
*   **Backend API (Non-Blocking):** Node.js + Express. Completely refactored with asynchronous `spawn` wrappers and Promises to ensure the single-threaded event loop never blocks during intensive AI inference, allowing seamless scalability to 8,000+ daily complaints.
*   **Security Posture:** Hardened with strict CORS origin policies, zero hardcoded credentials, JWT-based authentication, and deep input sanitization (XSS prevention) on all API routes. `eval()` execution vectors have been fully eradicated.
*   **AI Engine:** Python (scikit-learn, XGBoost, NetworkX) integrated directly via async child processes.

## 5. Logical Integration with NCRP Workflow
CyberFlow acts as **Intelligence Middleware** operating between CFCFRMS and the State Police Investigation phase:
1.  **Ingestion:** CyberFlow connects to the State Police API feed, intercepting tickets the moment a 1930 call is logged.
2.  **Graphing & Prediction:** Cross-references IOIs against historical data to predict cash-out zones.
3.  **Dossier Generation:** Presents the IO with a unified intelligence dossier and auto-dispatches alerts.

## 6. Business Impact
By shifting from a reactive pipeline to a predictive framework, CyberFlow:
1.  **Increases Fund Recovery:** By identifying withdrawal locations in advance, funds can be frozen before cash-out.
2.  **Optimizes LEA Resources:** Prevents wasted effort by directing police to high-probability hotspots rather than chasing dead ends.
3.  **Strengthens National Security:** Creates a unified, data-driven defense against organized financial cyber fraud.
