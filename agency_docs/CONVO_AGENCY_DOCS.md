# User Convo — Agency Documents Project
**Format:** William's input (stream-of-consciousness) → Claude's parsed action items → Claude's reply
**Usage:** William writes/dictates thoughts here. Say "read user convo" in Claude Code to pick up.

---

## 2026-03-29 13:35

### William (raw):
Want to use this project to pull real sample shipping/chartering documents, build the actual document templates from those samples. Branding comes later. Need this convo file open in Sublime for easy back-and-forth. Voice typing due to arthritis — stream of consciousness style. Claude should parse intent into actionable items, reply with structured response, keep everything timestamped.

### Parsed Action Items:
1. Set up USER_CONVO.md as the running conversation log (done)
2. Focus on sourcing real sample documents first, not design/branding
3. Build templates from actual document examples
4. Branding is a later phase

### Claude Reply:
Convo file is live. Ready for your next stream-of-consciousness dump — just dictate your thoughts here or in the Claude Code prompt with "read user convo" and I'll pick it up, parse it, and act on it.

---

## 2026-03-29 13:40

### William (raw):
OK yes the first document I want you to work on is the statement of facts and there are many many many versions of statement of facts and we're gonna have to think that through the alleged benchmark is the Bimco BIMCO recommended statement of facts but General by enlarge most of them that are actually used to have a header with the basic particulars of the ship in the voyage which we can discuss and then they have then it's just a time log from there with date to from in a place that you put the description of the event and then usually after that there may be a notes column and then at the bottom depending on the need they may put some cargo details after it finished just like the storage in the total cargo loaded pretty basic and then you have the signature at the bottom where either the master the agent or the Docker elevator sign it which we can customise later usually you put free placeholders for signature is One being the agent and for now and respect the branding just do Ocean Daum generic branding and we can change that later just like a fake company on it based on Ocean Daum that'll be fine

### Parsed Action Items:
1. **Build Statement of Facts (SOF) as first document** — the priority template
2. **Structure:** Header (vessel/voyage particulars) → Time log table (Date, Day, From, To, Event Description, Notes) → Cargo summary at bottom (stowage, total cargo) → Signatures
3. **BIMCO SOF is the benchmark** but real-world versions are simpler — header + time log + cargo + signatures
4. **Three signature blocks:** Agent, Master, Terminal/Dock/Elevator
5. **Branding:** Use "OceanDatum" as placeholder company for now — generic branding, will customize later
6. **Note:** Many SOF variations exist — this is the general-purpose dry cargo version; may need tanker variant later

### Claude Reply:
SOF template is built and should be open in your browser now. Here's what I created:

**`templates/statement_of_facts.html`** — Full HTML template with:
- OceanDatum Maritime branding (placeholder — easy to swap later)
- Header grid: vessel name, IMO, flag, owners, charterers, shippers, receivers, port, berth, voyage, cargo, charter party, arrived from, next port
- Arrival/departure quick reference: drafts (F/A), NOR tendered/accepted, free pratique, laytime commenced
- Time log table: Date | Day | From | To | Event/Description | Notes — pre-filled with standard port call milestones (arrival, NOR, pilot, berthed, commenced ops, completed, sailed) plus 12 blank rows
- Cargo summary: description, B/L quantity, stowage factor, total loaded/discharged, shortage/overage
- General remarks box
- Three signature blocks: Agent, Master, Terminal/Elevator

**`field_maps/statement_of_facts_fields.json`** — Complete field mapping for future Orbit integration

Take a look in the browser and tell me what to change — layout, fields to add/remove, row count, anything.

---

