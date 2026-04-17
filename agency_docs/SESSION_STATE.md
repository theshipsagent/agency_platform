# Session State
Last updated: 2026-03-29 (end of session 2)

## Current Goal
Build shipping/chartering document library for Orbit platform integration

## Completed (All Sessions)
- Project structure, CLAUDE.md, kanban board (26 docs), auto-run permissions
- CONVO_AGENCY_DOCS.md for async workflow
- **Statement of Facts (SOF)** — template + field map JSON
- **Cargo Manifest** — template (landscape, bulk-focused)
- **Stowage Plan** — template (dynamic SVG ship profiles)
- **Notice of Readiness (NOR)** — template + field map JSON (charter party focused, readiness checklist, acceptance/rejection)

## Next Session — CONGENBILL B/L
- **Build CONGENBILL template** — charter party bill of lading (GENCON), most common dry bulk B/L
- Field layout confirmed from BIMCO samples (1994 + 2007 editions):
  - Page 1 (face): Shipper | B/L No. | Ref No. | Consignee | Vessel | Notify address | Port of loading | Port of discharge | Shipper's description of goods | Gross weight | On-deck cargo note | Freight/C/P ref | SHIPPED clause | Freight advance | Date shipped on board | Place/date of issue | No. of original B/Ls | Signature (Master / Agent for Master / Agent for Owner)
  - Page 2 (Conditions of Carriage): (1) C/P incorporation (2) General Paramount Clause — Hague/Hague-Visby (3) General Average — York-Antwerp Rules 1994 (4) New Jason Clause (5) Both-to-Blame Collision Clause
- **Must stay true to standard BIMCO form** — not a custom design
- After CONGENBILL, William will prioritize remaining B/L types

## Full BIMCO B/L Inventory (researched this session)
### Charter Party B/Ls
1. CONGENBILL 2022 — GENCON, general dry cargo ← BUILD FIRST
2. HEAVYCONBILL 2016 — HEAVYCON, heavy/voluminous
3. GRAINCONBILL 2016 — GRAINCON, grain
4. FERTICONBILL 2016 — FERTICON, fertilizer
5. CEMENTVOYBILL 2016 — CEMENTVOY, cement
6. BIMCHEMVOYBILL 2016 — BIMCHEMVOY, chemical tanker
7. HEAVYLIFTVOYBILL 2016 — HEAVYLIFTVOY, heavy lift
8. COMBICONBILL 2016 — COMBICON, combined transport

### Liner / Carrier B/Ls
9. CONLINEBILL 2016 — standard liner B/L
10. Blank Back Liner B/L 2016
11. MULTIDOC 2016 — multimodal
12. HYDROBILL 2017 — liquid hydrocarbon

### Waybills
13. GENWAYBILL 2016 — general sea waybill
14. LINEWAYBILL 2016 — liner waybill
15. MULTIWAYBILL 2016 — multimodal waybill

### Other
16. WORLDFOODRECEIPT 2017 — WFP/humanitarian

## Remaining Non-B/L Documents
- Letter of Protest
- PDA / FDA
- Mate's Receipt
- Draft Survey Report
- Plus ~14 more on kanban

## Key Decisions
- 6 document categories, HTML templates, JSON field maps
- B/L templates must stay true to BIMCO standard forms
- OceanDatum placeholder branding on non-standard docs

## Files Created/Modified This Session
- `templates/notice_of_readiness.html` — NEW
- `field_maps/notice_of_readiness_fields.json` — NEW
- `SESSION_STATE.md` — updated
