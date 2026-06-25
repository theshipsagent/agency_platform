// ─── Bill of Lading type registry ─────────────────────────────────────────────
//
// THE ENGINE. A B/L in the charter-party family is two parts:
//   • Page 1 — a boxed data grid (variable, field-driven). The grid LAYOUT is
//     shared across the family; only a few boilerplate sentences differ per type.
//   • Page 2 — fixed legal "Conditions of Carriage" clauses, verbatim per type.
//
// To add a new type (NORGRAINBILL, AMWELSHBILL, GASVOYBILL, …): add one entry to
// BILL_TYPES below. The renderer (mock-adapter.renderBillOfLading) is type-agnostic
// — it reads whichever config the input's `billType` selects. No renderer change.
//
// ⚠️ COPYRIGHT: the CONGENBILL 2022 clause text below is © 2022 BIMCO, reproduced
// verbatim per an explicit product decision (2026-06-02). Commercial generation of
// BIMCO SmartCon documents may require a BIMCO licence — tracked as a separate
// commercial task, NOT a code blocker. See agency_docs FORMS_TRIAGE / session notes.

export type BillOfLadingType = 'CONGENBILL'
// engine-extensible — future: | 'NORGRAINBILL' | 'AMWELSHBILL' | 'POLCOALBILL'
//                              | 'FERTIVOYBILL' | 'CEMENTVOYBILL' | 'GASVOYBILL' | …

/** One numbered Conditions-of-Carriage clause (page 2). */
export interface BillClause {
  /** Clause number as printed, e.g. '1', '2'. */
  readonly n: string
  /** Optional bold heading, e.g. 'General Paramount Clause'. Omitted for clause 1. */
  readonly heading?: string
  /** Verbatim clause body. */
  readonly body: string
}

/** Per-type configuration consumed by the renderer. */
export interface BillTypeConfig {
  readonly codename: BillOfLadingType
  /** Masthead title, e.g. 'CONGENBILL 2022'. */
  readonly title: string
  /** Sub-title lines under the masthead. */
  readonly subtitle: readonly string[]
  // ── Page-1 fixed boilerplate (verbatim, sits inside the grid) ──
  readonly shippedClause: string
  readonly unknownClause: string
  readonly witnessClause: string
  readonly conditionsRef: string
  // ── Page-2 conditions ──
  readonly conditionsTitle: string
  readonly clauses: readonly BillClause[]
}

// ─── CONGENBILL 2022 (BIMCO) — verbatim ───────────────────────────────────────
const CONGENBILL_2022: BillTypeConfig = {
  codename: 'CONGENBILL',
  title: 'CONGENBILL 2022',
  subtitle: ['BILL OF LADING', 'To be used with charter parties'],

  shippedClause:
    'SHIPPED at the Port of Loading in apparent good order and condition on the Vessel for ' +
    'carriage to the Port of Discharge or so near thereto as the Vessel may safely get the ' +
    'goods specified above.',
  unknownClause:
    'Weight, measure, quality, quantity, condition, contents and value unknown.',
  witnessClause:
    'IN WITNESS whereof the Master or Owner or Charterer or Agent of the said Vessel has ' +
    'signed the number of Bills of Lading indicated below all of this tenor and date, any one ' +
    'of which being accomplished the others shall be void.',
  conditionsRef:
    'FOR CONDITIONS OF CARRIAGE INCLUDING THE EXCLUSIVE LAW AND ARBITRATION CLAUSE SEE PAGE 2',

  conditionsTitle: 'Conditions of Carriage',
  clauses: [
    {
      n: '1',
      body:
        'All terms and conditions, liberties and exceptions of the Charter Party, dated as ' +
        'overleaf are herewith incorporated. If the date of the Charter Party is not specified, ' +
        'the relevant charter party is deemed to be the voyage charter party that regulates the ' +
        'carriage of the cargo in respect of which this Bill of Lading has been issued.',
    },
    {
      n: '2',
      heading: 'General Paramount Clause',
      body:
        'The International Convention for the Unification of Certain Rules of Law relating to ' +
        'Bills of Lading signed at Brussels on 25 August 1924 ("the Hague Rules") as amended by ' +
        'the Protocol signed at Brussels on 23 February 1968 ("the Hague-Visby Rules") and as ' +
        'enacted in the country of shipment shall apply to this Contract. When the Hague-Visby ' +
        'Rules are not enacted in the country of shipment, the corresponding legislation of the ' +
        'country of destination shall apply, irrespective of whether such legislation may only ' +
        'regulate outbound shipments.\n' +
        'When there is no enactment of the Hague-Visby Rules in either the country of shipment or ' +
        'in the country of destination, the Hague-Visby Rules shall apply to this Contract save ' +
        'where the Hague Rules as enacted in the country of shipment or if no such enactment is ' +
        'in place, the Hague Rules as enacted in the country of destination apply compulsorily to ' +
        'this Contract.\n' +
        'The Protocol signed at Brussels on 21 December 1979 ("the SDR Protocol 1979") shall apply ' +
        'where the Hague-Visby Rules apply, whether mandatorily or by this Contract.\n' +
        'The Carrier shall in no case be responsible for loss of or damage to cargo arising prior ' +
        'to loading, after discharging, or while the cargo is in the charge of another carrier, or ' +
        'with respect to deck cargo and live animals.',
    },
    {
      n: '3',
      heading: 'General Average',
      body:
        'General Average shall be adjusted, stated and settled according to York-Antwerp Rules ' +
        '2016 in London unless another place is agreed in the Charter Party.\n' +
        "Cargo's contribution to General Average shall be paid to the Carrier even when such " +
        'average is the result of a fault, neglect or error of the Master, Pilot or Crew.',
    },
    {
      n: '4',
      heading: 'New Jason Clause',
      body:
        'In the event of accident, danger, damage or disaster before or after the commencement of ' +
        'the voyage, resulting from any cause whatsoever, whether due to negligence or not, for ' +
        'which, or for the consequence of which, the Carrier is not responsible, by statute, ' +
        'contract or otherwise, the cargo, shippers, consignees or the owners of the cargo shall ' +
        'contribute with the Carrier in General Average to the payment of any sacrifices, losses ' +
        'or expenses of a General Average nature that may be made or incurred and shall pay salvage ' +
        'and special charges incurred in respect of the cargo. If a salving vessel is owned or ' +
        'operated by the Carrier, salvage shall be paid for as fully as if the said salving vessel ' +
        'or vessels belonged to strangers. Such deposit as the Carrier, or its agents, may deem ' +
        'sufficient to cover the estimated contribution of the goods and any salvage and special ' +
        'charges thereon shall, if required, be made by the cargo, shippers, consignees or owners ' +
        'of the goods to the Carrier before delivery.',
    },
    {
      n: '5',
      heading: 'Both-to-Blame Collision Clause',
      body:
        'If the Vessel comes into collision with another vessel as a result of the negligence of ' +
        'the other vessel and any act, neglect or default of the Master, Mariner, Pilot or the ' +
        'servants of the Carrier in the navigation or in the management of the Vessel, the owners ' +
        'of the cargo carried hereunder will indemnify the Carrier against all loss or liability to ' +
        'the other or non-carrying vessel or her owners in so far as such loss or liability ' +
        'represents loss of, or damage to, or any claim whatsoever of the owners of said cargo, ' +
        'paid or payable by the other or non-carrying vessel or her owners to the owners of said ' +
        'cargo and set-off, recouped or recovered by the other or non-carrying vessel or her owners ' +
        'as part of their claim against the carrying Vessel or the Carrier.\n' +
        'The foregoing provisions shall also apply where the owners, operators or those in charge ' +
        'of any vessel or vessels or objects other than, or in addition to, the colliding vessels ' +
        'or objects are at fault in respect of a collision or contact.',
    },
    {
      n: '6',
      heading:
        'International Group of P&I Clubs/BIMCO Himalaya Clause for Bills of Lading and Other Contracts 2014',
      body:
        '(a) For the purposes of this contract, the term "Servant" shall include the owners, ' +
        'managers, and operators of vessels (other than the Carrier); underlying carriers; ' +
        'stevedores and terminal operators; and any direct or indirect servant, agent, or ' +
        'subcontractor (including their own subcontractors), or any other party employed by or on ' +
        'behalf of the Carrier, or whose services or equipment have been used to perform this ' +
        'contract whether in direct contractual privity with the Carrier or not.\n' +
        '(b) It is hereby expressly agreed that no Servant shall in any circumstances whatsoever be ' +
        'under any liability whatsoever to the shipper, consignee, receiver, holder, or other party ' +
        'to this contract (hereinafter termed "Merchant") for any loss, damage or delay of ' +
        "whatsoever kind arising or resulting directly or indirectly from any act, neglect or " +
        "default on the Servant's part while acting in the course of or in connection with the " +
        'performance of this contract.\n' +
        '(c) Without prejudice to the generality of the foregoing provisions in this clause, every ' +
        'exemption, limitation, condition and liberty contained herein (other than Art III Rule 8 ' +
        'of the Hague/Hague-Visby Rules if incorporated herein) and every right, exemption from ' +
        'liability, defence and immunity of whatsoever nature applicable to the carrier or to which ' +
        'the carrier is entitled hereunder including the right to enforce any jurisdiction or ' +
        'arbitration provision contained herein shall also be available and shall extend to every ' +
        'such Servant of the carrier, who shall be entitled to enforce the same against the Merchant.\n' +
        '(d) (i) The Merchant undertakes that no claim or allegation whether arising in contract, ' +
        'bailment, tort or otherwise shall be made against any Servant of the carrier which imposes ' +
        'or attempts to impose upon any of them or any vessel owned or chartered by any of them any ' +
        'liability whatsoever in connection with this contract whether or not arising out of ' +
        'negligence on the part of such Servant. The Servant shall also be entitled to enforce the ' +
        'foregoing covenant against the Merchant; and\n' +
        '(ii) The Merchant undertakes that if any such claim or allegation should nevertheless be ' +
        'made, it will indemnify the carrier against all consequences thereof.\n' +
        '(e) For the purpose of sub-paragraphs (a)-(d) of this clause the Carrier is or shall be ' +
        'deemed to be acting as agent or trustee on behalf of and for the benefit of all persons ' +
        'mentioned in sub-clause (a) above who are its Servant and all such persons shall to this ' +
        'extent be or be deemed to be parties to this contract.',
    },
    {
      n: '7',
      heading: 'Law and Arbitration Clause',
      body:
        'The parties to this Bill of Lading agree that any dispute or difference between them that ' +
        'arises out of or in connection with this Bill of Lading shall be referred exclusively to ' +
        'arbitration in accordance with, and subject to the law specified in, the provisions of the ' +
        'Law and Arbitration Clause that is applicable to the Charter Party identified in Clause (1) ' +
        'hereof, which provisions are understood to apply to disputes between the parties to this ' +
        'Bill of Lading. Neither party to this Bill of Lading shall bring any proceedings other than ' +
        'in accordance with the said Law and Arbitration Clause against its contracting party or ' +
        "that party's servants, agents or sub-contractors as defined above in Clause (6) hereof save " +
        'for purposes of obtaining security, compelling compliance with this Clause, or appealing or ' +
        'enforcing an award.',
    },
  ],
}

/** The registry. Add new B/L types here — the renderer needs no change. */
export const BILL_TYPES: Record<BillOfLadingType, BillTypeConfig> = {
  CONGENBILL: CONGENBILL_2022,
}
