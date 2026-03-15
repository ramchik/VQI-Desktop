# VQI Desktop Registry

A single-hospital offline vascular surgery patient registry modeled after the **Vascular Quality Initiative (VQI)** by the Society for Vascular Surgery.

## Features

### Core Registry Modules
- **Patient Registry** — Full demographics, comorbidities, medications (130+ fields)
- **Procedure Registry** — All vascular procedure types with intraoperative and postoperative data
- **VQI-Style Clinical Modules**:
  - Carotid Module (CEA / CAS / TCAR)
  - Aortic Module (EVAR / TEVAR / Open AAA)
  - PAD/Bypass Module (with WIfI score, patency tracking)
  - Dialysis Access Module
- **Follow-up Tracking** — 30-day, 6-month, 1-year, and annual follow-ups with patency, ABI, imaging
- **Dashboard** — Live outcome metrics (stroke rate, mortality, limb salvage, reintervention)
- **Reports** — Publishable research tables (Table 1 baseline characteristics, Table 2 outcomes)
- **Data Export** — CSV export for R, SPSS, Stata statistical analysis

### Auto-Calculated Quality Metrics
- 30-day stroke rate after carotid surgery
- 30-day perioperative mortality
- Limb salvage rate
- Reintervention rate
- Graft patency (primary / assisted / secondary)
- Endoleak incidence after EVAR

### Security & Architecture
- Fully offline — no internet connection required
- Local SQLite database with WAL mode for performance
- Role-based access — Surgeon, Data Manager, Administrator
- Audit logging of all edits
- Backup system — SQLite database backup to any location
- CSV export for statistical software

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop Framework | Electron 28 |
| UI | React 18 + custom CSS |
| Database | SQLite (better-sqlite3) |
| Charts | Recharts |
| Build | Webpack 5 + Babel |

## Database Schema (~130+ fields)

```
patients → comorbidities → medications
        → procedures → intraoperative
                     → postoperative
                     → followup (multiple)
                     → evar_module
                     → carotid_module
                     → pad_module
surgeons
users
audit_log
```

## Installation

```bash
npm install
npm run build
npm start
```

**Default credentials:** `admin` / `admin123`
*(Change immediately in User Management)*

## Development

```bash
npm run dev     # Run with webpack watch + Electron
npm run build   # Production build
```

## Procedure Types Supported

- Carotid Endarterectomy (CEA)
- Carotid Artery Stenting (CAS)
- TCAR (Transcarotid Artery Revascularization)
- EVAR (Endovascular Aortic Repair)
- TEVAR (Thoracic EVAR)
- Open AAA Repair
- Open Thoracoabdominal Aortic Repair
- Peripheral Bypass
- Peripheral Angioplasty/Stenting
- Lower/Upper Extremity Amputation
- Dialysis Access Creation/Revision
- Thrombectomy/Embolectomy

## Research Capabilities

The registry produces data compatible with:
- Kaplan-Meier survival and patency curves
- Logistic regression for outcome predictors
- Table 1 baseline characteristics (auto-generated)
- Table 2 procedural outcomes (auto-generated)
- Export to R, SPSS, Stata, Excel

## Platform

- Windows 10/11 (primary target)
- macOS (compatible)
- Linux (compatible)

---

*Modeled after the Vascular Quality Initiative (VQI) by the Society for Vascular Surgery. For single-hospital offline use.*