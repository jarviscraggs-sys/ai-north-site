import { getDb } from './db';

interface Invoice {
  id: number;
  subcontractor_id: number;
  invoice_number: string;
  description: string;
  amount: number;
  vat_amount: number;
  work_from: string;
  work_to: string;
  cost_code: string | null;
  po_reference: string | null;
  job_code: string | null;
  area: string | null;
}

interface InvoiceLine {
  id?: number;
  invoice_id?: number;
  job_code: string;
  area: string;
  description: string;
  line_value: number;
}

interface DuplicateFlag {
  matched_invoice_id: number;
  flag_type: string;
  confidence_score: number;
  reason: string;
  flagged_line?: string; // e.g. "JOB-001 / Block A"
}

function datesOverlap(from1: string, to1: string, from2: string, to2: string): boolean {
  const f1 = new Date(from1).getTime();
  const t1 = new Date(to1).getTime();
  const f2 = new Date(from2).getTime();
  const t2 = new Date(to2).getTime();
  return f1 <= t2 && f2 <= t1;
}

function datesExactMatch(from1: string, to1: string, from2: string, to2: string): boolean {
  return from1 === from2 && to1 === to2;
}

function descriptionSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }
  return (common * 2) / (wordsA.size + wordsB.size);
}

function normalise(s: string): string {
  return s.trim().toLowerCase();
}

export function checkIntraInvoiceDuplicates(lines: InvoiceLine[]): DuplicateFlag[] {
  const flags: DuplicateFlag[] = [];
  const seen = new Map<string, InvoiceLine>();

  for (const line of lines) {
    const key = `${line.job_code.trim().toLowerCase()}|${line.area.trim().toLowerCase()}`;
    if (seen.has(key)) {
      flags.push({
        matched_invoice_id: 0, // same invoice
        flag_type: 'INTRA_INVOICE_DUPLICATE',
        confidence_score: 95,
        reason: `Duplicate line within same invoice: job code "${line.job_code}" / area "${line.area}" appears more than once`,
        flagged_line: `${line.job_code} / ${line.area}`,
      });
    } else {
      seen.set(key, line);
    }
  }

  return flags;
}

export function checkDuplicates(
  newInvoice: Invoice,
  subcontractorId: number,
  newLines?: InvoiceLine[]
): DuplicateFlag[] {
  const db = getDb();

  // Get all previous invoices for this subcontractor (excluding current)
  const existing = db.prepare(`
    SELECT * FROM invoices 
    WHERE subcontractor_id = ? AND id != ?
    ORDER BY submitted_at DESC
  `).all(subcontractorId, newInvoice.id || 0) as Invoice[];

  // Load lines for the new invoice (from DB if not supplied)
  let incomingLines: InvoiceLine[] = newLines || [];
  if (incomingLines.length === 0 && newInvoice.id) {
    incomingLines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ?').all(newInvoice.id) as InvoiceLine[];
  }

  const flags: DuplicateFlag[] = [];

  for (const inv of existing) {
    let score = 0;
    const reasons: string[] = [];
    let flagType = 'POSSIBLE_DUPLICATE';
    let flaggedLine: string | undefined;

    // Load lines for this existing invoice
    const existingLines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ?').all(inv.id) as InvoiceLine[];

    // ── Line-level duplicate checks ──────────────────────────────────────────
    for (const newLine of incomingLines) {
      for (const exLine of existingLines) {
        const sameJobArea =
          normalise(newLine.job_code) === normalise(exLine.job_code) &&
          normalise(newLine.area) === normalise(exLine.area);

        if (!sameJobArea) continue;

        const lineLabel = `${newLine.job_code} / ${newLine.area}`;

        // Same job code + area + overlapping work period → 90%
        if (datesOverlap(inv.work_from, inv.work_to, newInvoice.work_from, newInvoice.work_to)) {
          score = Math.max(score, 90);
          reasons.push(`Line "${lineLabel}": same job code & area with overlapping work period (matched invoice ${inv.invoice_number})`);
          flagType = 'EXACT_DUPLICATE';
          flaggedLine = lineLabel;
        }

        // Same job code + area + same line value → 85%
        if (Math.abs(newLine.line_value - exLine.line_value) < 0.01) {
          score = Math.max(score, 85);
          reasons.push(`Line "${lineLabel}": same job code, area and line value £${newLine.line_value.toFixed(2)}`);
          if (flagType === 'POSSIBLE_DUPLICATE') flagType = 'EXACT_DUPLICATE';
          flaggedLine = flaggedLine || lineLabel;
        }
      }
    }

    // ── Invoice-level checks (fallback / legacy) ────────────────────────────

    // Same invoice number (exact duplicate) — 95%
    if (normalise(inv.invoice_number) === normalise(newInvoice.invoice_number)) {
      score = Math.max(score, 95);
      reasons.push(`Identical invoice number: ${inv.invoice_number}`);
      flagType = 'EXACT_DUPLICATE';
    }

    // No lines on either invoice → fall back to legacy job_code/area fields
    if (incomingLines.length === 0 && existingLines.length === 0) {
      const sameJobAndArea =
        !!newInvoice.job_code && !!inv.job_code &&
        normalise(newInvoice.job_code) === normalise(inv.job_code) &&
        !!newInvoice.area && !!inv.area &&
        normalise(newInvoice.area) === normalise(inv.area);

      if (sameJobAndArea && datesOverlap(inv.work_from, inv.work_to, newInvoice.work_from, newInvoice.work_to)) {
        score = Math.max(score, 90);
        reasons.push(`Same job code (${inv.job_code}) and area (${inv.area}) with overlapping work period`);
        flagType = 'EXACT_DUPLICATE';
      }

      if (sameJobAndArea && inv.amount === newInvoice.amount) {
        score = Math.max(score, 85);
        reasons.push(`Same job code (${inv.job_code}), area (${inv.area}) and identical amount (£${inv.amount.toFixed(2)})`);
        if (flagType === 'POSSIBLE_DUPLICATE') flagType = 'EXACT_DUPLICATE';
      }
    }

    // Same amount + same work period (any invoice) — 55%
    if (inv.amount === newInvoice.amount && datesExactMatch(inv.work_from, inv.work_to, newInvoice.work_from, newInvoice.work_to)) {
      score = Math.max(score, 55);
      reasons.push(`Identical amount (£${inv.amount.toFixed(2)}) and identical work period`);
    }

    // Similar description + overlapping dates (fallback for invoices without job codes or lines)
    if (incomingLines.length === 0 && existingLines.length === 0 && !newInvoice.job_code && !inv.job_code) {
      const simScore = descriptionSimilarity(inv.description, newInvoice.description);
      if (simScore > 0.5 && datesOverlap(inv.work_from, inv.work_to, newInvoice.work_from, newInvoice.work_to)) {
        const addedScore = Math.round(simScore * 60);
        score = Math.max(score, addedScore);
        reasons.push(`Similar description (${Math.round(simScore * 100)}% match) with overlapping work dates`);
        if (flagType === 'POSSIBLE_DUPLICATE') flagType = 'POSSIBLE_RECLAIM';
      }
    }

    if (score > 40 && reasons.length > 0) {
      flags.push({
        matched_invoice_id: inv.id,
        flag_type: flagType,
        confidence_score: Math.min(score, 100),
        reason: reasons.join('; '),
        flagged_line: flaggedLine,
      });
    }
  }

  // Sort by confidence descending
  flags.sort((a, b) => b.confidence_score - a.confidence_score);

  return flags;
}

export function storeDuplicateFlags(invoiceId: number, flags: DuplicateFlag[]) {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO ai_flags (invoice_id, matched_invoice_id, flag_type, confidence_score, reason)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const flag of flags) {
    insert.run(invoiceId, flag.matched_invoice_id, flag.flag_type, flag.confidence_score, flag.reason);
  }
}
