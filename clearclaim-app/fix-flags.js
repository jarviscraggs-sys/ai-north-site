const Database = require('better-sqlite3');
const db = new Database('./clearclaim.db');

// Fix INV 05 - add intra-invoice duplicate flag
const lines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = 9').all();
const seen = {};
let flagged = 0;

for (const line of lines) {
  const key = `${line.job_code.toLowerCase()}|${line.area.toLowerCase()}`;
  if (seen[key]) {
    db.prepare(`INSERT INTO ai_flags (invoice_id, matched_invoice_id, flag_type, confidence_score, reason) VALUES (?, ?, ?, ?, ?)`).run(
      9, 9, 'INTRA_INVOICE_DUPLICATE', 95,
      `Duplicate line within same invoice: job code "${line.job_code}" / area "${line.area}" appears more than once`
    );
    console.log(`Flagged duplicate line: ${line.job_code} / ${line.area}`);
    flagged++;
  } else {
    seen[key] = line;
  }
}

console.log(`Total flags added: ${flagged}`);
const allFlags = db.prepare('SELECT * FROM ai_flags WHERE invoice_id = 9').all();
console.log('All flags for INV 05:', JSON.stringify(allFlags, null, 2));
