# CyberFlow: Predictive Analytics Framework for Proactive Cybercrime Intervention
**Technical Writeup & System Architecture (PPT Companion Guide)**

## 1. Executive Summary
CyberFlow is an advanced **Predictive Analytics Framework** designed to transition cybercrime management from a reactive complaint-logging system to a **proactive, intelligence-driven defense mechanism**. By analyzing historical cybercrime data and financial network patterns, CyberFlow forecasts likely cash withdrawal locations *before* the fraudsters can cash out, enabling Law Enforcement Agencies (LEAs) and Financial Institutions (FIs) to execute timely interventions.

## 2. Core Problem Addressed
The National Cybercrime Reporting Portal (NCRP) receives over 8,000 complaints daily. Currently, LEAs and banks act on these complaints *reactively*, often after funds have been withdrawn from ATMs or untraceable endpoints. 

**The Solution:** CyberFlow intercepts complaint data in real-time, models the financial flow using Artificial Intelligence (AI), and predicts the exact hotspots and zones where the stolen funds are likely to surface next. This enables rapid deployment of local teams and immediate bank-level freezing.

---

## 3. Key Deliverables & System Components

### A. Predictive Analytics Engine
An AI/ML-powered core that analyzes financial data to detect patterns and predict withdrawal hotspots.
*   **Graph-Theoretic Analysis:** Converts account-to-account transfers into directed networks. Extracts features like *fan-in*, *fan-out*, and *hop depth* to identify mule networks and consolidation hubs.
*   **Machine Learning (XGBoost):** Classifies the current operational state of the fraud (e.g., *layering*, *consolidation*) and predicts the most likely next action with ~93.5% accuracy.
*   **Geospatial Risk Modeling:** Ranks likely ATM and Cash-out zones based on device telemetry, historical fraud data, and network behavior.
*   **Sequential Optimizer (Q-Learning):** A Reinforcement Learning model that recommends the optimal sequence of investigative steps for LEAs.

### B. Risk Heatmap Dashboard (Map UI)
A GIS-enabled, ultra-smooth 3D visual dashboard for operational command.
*   **3D Geospatial Visualization:** Built on MapLibre with cinematic 3D pitch and smooth building extrusions, providing a premium "glass-pane" command view.
*   **Real-time Risk Zones:** Visualizes emerging fraud clusters in real-time. 
*   **Drill-Down Filters:** Allows officers to filter by time, location, confidence probability, and crime category.
*   **Intervention Simulation:** LEAs can simulate the impact of blocking a specific ATM zone before actually executing the order.

### C. Law Enforcement Interface
A highly secure, 5-stage wizard-driven portal designed for investigators.
*   **Stage 1: Incident:** Intake summary, automated data validation, and evidence sufficiency scoring.
*   **Stage 2: Correlate:** Force-directed transaction graphs mapping money flow and timeline stages.
*   **Stage 3: Predict:** AI explanations, next-action probabilities, and RL-driven investigation recommendations.
*   **Stage 4: Map:** 3D Cash-Out mapping and shortlist of probable ATMs.
*   **Stage 5: Action Center:** One-click dispatch of actionable intelligence.
*   **Role-Based Access Control (RBAC):** Strict JWT-based data segregation ensuring investigators only see authorized intelligence.

### D. Alert & Notification System
A comprehensive dispatch engine ensuring intelligence reaches the right hands instantly.
*   **Multi-Channel Dispatch:** Triggers real-time notifications to local police, nodal bank officers, and I4C via API, Dashboard Alerts, SMS, or Email.
*   **Blockchain-Backed Audit Trail:** Dispatched alerts are hashed and logged on a local PoW ledger to ensure non-repudiation and cross-agency trust.
*   **Actionable Intelligence Payloads:** Alerts include exact coordinates, suspect bank names, confidence scores, and time-sensitivity windows, maximizing the chance of recovery.

---

## 4. Technical Architecture Stack

*   **Frontend (UI/UX):** React.js + Vite. Designed with a premium, light-themed "Glass" UI using Framer Motion for ultra-smooth transitions and MapLibre GL for 3D mapping.
*   **Backend API:** Node.js + Express. Handles rate-limiting, JWT authentication, and headless integration endpoints (e.g., `/api/integration/predict`).
*   **AI Engine:** Python (scikit-learn, XGBoost, NetworkX). Operates as an orchestrated subprocess, processing incoming complaints instantly.
*   **Data Layer:** In-memory read-optimized JSON contracts with SQLite materialization for structured relational querying.

## 5. Integration Strategy (B2G/B2B)
CyberFlow is designed as an **Intelligence API Layer**, meaning it does not force the government to replace the NCRP.
*   **Headless Integration:** State portals can securely push complaints to CyberFlow via API (`x-api-key`).
*   **Instant Intelligence Return:** The engine processes the data and immediately returns a prediction contract (Risk score, predicted zones, and action plan) to the calling system.

## 6. Business Impact
By shifting from a reactive pipeline to a predictive framework, CyberFlow:
1.  **Increases Fund Recovery:** By identifying withdrawal locations in advance, funds can be frozen before cash-out.
2.  **Optimizes LEA Resources:** Prevents wasted effort by directing police to high-probability hotspots.
3.  **Strengthens National Security:** Creates a unified, data-driven defense against organized financial cyber fraud across all jurisdictions.
