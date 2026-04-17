# CLAUDE.md — Agency Documents Project
**Owner:** William S. Davis III
**Scope:** Shipping & ocean chartering document templates for Orbit agency platform
**Last Updated:** 2026-03-29

---

## Project Purpose
Build a complete library of maritime/shipping agency documents:
- Define field mappings for each document
- Create branded HTML templates
- Prepare for integration with Orbit sandbox agency platform
- Goal: enter ship name once → auto-populate all related forms

## Document Categories

| Category | Folder | Description |
|----------|--------|-------------|
| Vessel Operations | `documents/vessel_operations/` | NOR, SOF, Letter of Protest, etc. |
| Cargo / B/L | `documents/cargo_bl/` | Bills of Lading, Mate's Receipt, Cargo Manifest |
| Port / Agency | `documents/port_agency/` | PDA, FDA, Agency Appointment |
| Customs / Clearance | `documents/customs_clearance/` | Entry/Exit permits, Customs docs |
| Financial | `documents/financial/` | Freight Invoice, Demurrage, Port Charges |
| Surveys / Inspections | `documents/surveys_inspections/` | Draft Survey, Cargo Inspection, Hold Cleanliness |

## File Conventions
- Field maps: `field_maps/{document_name}_fields.json`
- HTML templates: `templates/{document_name}.html`
- Branded versions: `branded/{document_name}_branded.html`
- Each document folder may contain reference PDFs, notes, or examples

## Standards
- Follow LLM/ master CLAUDE.md rules (HTML fonts, file safety, etc.)
- Field names: snake_case
- All templates must use OceanDatum.ai / agency branding (TBD)
- Dates: ISO 8601
- Tonnage: Short tons (US) unless stated metric

## Integration Notes
- Target platform: Orbit sandbox
- Integration details TBD — focus first on document design and field mapping
- Ship name is the primary key — links across all documents for a vessel call

## Kanban
- Open `kanban.html` in browser to track document status
- Statuses: Not Started → Field Mapping → Template → Branded → Ready
