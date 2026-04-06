import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'clearclaim.db');

async function seed() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Init schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      company TEXT,
      role TEXT NOT NULL,
      cis_rate INTEGER DEFAULT 20,
      accountant_email TEXT,
      employee_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subcontractor_id INTEGER NOT NULL,
      invoice_number TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      vat_amount REAL NOT NULL DEFAULT 0,
      work_from TEXT NOT NULL,
      work_to TEXT NOT NULL,
      cost_code TEXT,
      po_reference TEXT,
      notes TEXT,
      job_code TEXT,
      area TEXT,
      job_description TEXT,
      cis_rate INTEGER NOT NULL DEFAULT 0,
      cis_amount REAL NOT NULL DEFAULT 0,
      retention_rate REAL DEFAULT 5.0,
      retention_amount REAL DEFAULT 0,
      retention_released REAL DEFAULT 0,
      retention_release_date TEXT,
      application_number INTEGER DEFAULT 1,
      cumulative_value REAL DEFAULT 0,
      previous_certified REAL DEFAULT 0,
      this_application REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'queried')),
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at TEXT,
      reviewer_comment TEXT,
      FOREIGN KEY (subcontractor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ai_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      matched_invoice_id INTEGER NOT NULL,
      flag_type TEXT NOT NULL,
      confidence_score INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (matched_invoice_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      job_code TEXT NOT NULL,
      area TEXT NOT NULL,
      description TEXT NOT NULL,
      line_value REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      cis_rate INTEGER DEFAULT 20,
      contractor_id INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (contractor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Projects table
  db.exec(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contractor_id INTEGER,
    name TEXT NOT NULL,
    reference TEXT,
    address TEXT,
    contract_value REAL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Employees, timesheets, holiday tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contractor_id INTEGER NOT NULL,
      user_id INTEGER,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      hourly_rate REAL DEFAULT 0,
      weekly_hours REAL DEFAULT 40,
      holiday_allowance INTEGER DEFAULT 28,
      holiday_used INTEGER DEFAULT 0,
      start_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS timesheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      contractor_id INTEGER NOT NULL,
      week_starting TEXT NOT NULL,
      project_id INTEGER,
      mon_hours REAL DEFAULT 0,
      tue_hours REAL DEFAULT 0,
      wed_hours REAL DEFAULT 0,
      thu_hours REAL DEFAULT 0,
      fri_hours REAL DEFAULT 0,
      sat_hours REAL DEFAULT 0,
      sun_hours REAL DEFAULT 0,
      total_hours REAL DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      reviewer_comment TEXT,
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS holiday_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      contractor_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_requested REAL NOT NULL,
      type TEXT DEFAULT 'annual',
      notes TEXT,
      status TEXT DEFAULT 'pending',
      reviewer_comment TEXT,
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT
    );
  `);

  // Clear existing data
  db.exec('DELETE FROM holiday_requests; DELETE FROM timesheets; DELETE FROM employees; DELETE FROM ai_flags; DELETE FROM attachments; DELETE FROM invoice_lines; DELETE FROM invoices; DELETE FROM invites; DELETE FROM password_reset_tokens; DELETE FROM users;');

  const hash = async (pw: string) => bcrypt.hash(pw, 10);

  const contractorHash = await hash('demo123');
  const sub1Hash = await hash('demo123');
  const sub2Hash = await hash('demo123');
  const sub3Hash = await hash('demo123');

  const emp1Hash = await hash('demo123');
  const emp2Hash = await hash('demo123');
  const emp3Hash = await hash('demo123');

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, company, role, cis_rate) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertEmployeeUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, company, role, cis_rate, employee_id) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const contractor = insertUser.run('contractor@clearclaim.co.uk', contractorHash, 'John Mitchell', 'Mitchell Construction Ltd', 'contractor', 0);
  const sub1 = insertUser.run('sub1@clearclaim.co.uk', sub1Hash, 'Dave Smith', 'Smith Electrical Ltd', 'subcontractor', 20);
  const sub2 = insertUser.run('sub2@clearclaim.co.uk', sub2Hash, 'Tom Jones', 'Jones Groundworks', 'subcontractor', 30);
  const sub3 = insertUser.run('sub3@clearclaim.co.uk', sub3Hash, 'Alan Peak', 'Peak Plumbing Services', 'subcontractor', 20);

  const sub1Id = sub1.lastInsertRowid;
  const sub2Id = sub2.lastInsertRowid;
  const sub3Id = sub3.lastInsertRowid;

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (
      subcontractor_id, invoice_number, description, amount, vat_amount,
      work_from, work_to, cost_code, po_reference, notes, job_description,
      cis_rate, cis_amount,
      retention_rate, retention_amount, retention_released, retention_release_date,
      application_number, cumulative_value, previous_certified, this_application,
      status, submitted_at, reviewed_at, reviewer_comment
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLine = db.prepare(`
    INSERT INTO invoice_lines (invoice_id, job_code, area, description, line_value)
    VALUES (?, ?, ?, ?, ?)
  `);

  // ── Smith Electrical — App 1 (approved) ──────────────────────────────
  const inv1 = insertInvoice.run(
    sub1Id, 'SE-2024-001',
    'First fix electrical works — residential block A. Installation of cable containment, conduit runs and first fix wiring floors 1–3.',
    8500.00, 1700.00, '2024-01-08', '2024-01-26', 'ELEC-01', 'PO-2024-001',
    'All works completed per spec drawing E-101.',
    'First fix electrical works — residential block A, floors 1–3.',
    20, 1700.00,
    5.0, 425.00, 425.00, '2024-12-31', // retention fully released
    1, 8500.00, 0, 8500.00,
    'approved', '2024-01-29 09:00:00', '2024-02-01 14:00:00', 'Approved. Good work.'
  );
  const inv1Id = inv1.lastInsertRowid;
  insertLine.run(inv1Id, 'JOB-2024-001', 'Block A - Ground Floor', 'First fix wiring and cable containment, ground floor', 4200.00);
  insertLine.run(inv1Id, 'JOB-2024-001', 'Block A - Level 1',      'First fix wiring and cable containment, level 1',      2800.00);
  insertLine.run(inv1Id, 'JOB-2024-001', 'Block A - Level 2',      'First fix wiring and cable containment, level 2',      1500.00);

  // ── Smith Electrical — App 2 DUPLICATE ─────────────────────────────────
  const inv2 = insertInvoice.run(
    sub1Id, 'SE-2024-001B',
    'First fix electrical works resubmission — Block A ground floor works previously submitted in error.',
    5800.00, 1160.00, '2024-01-08', '2024-01-26', 'ELEC-01', 'PO-2024-001',
    'Resubmission of ground floor portion.',
    'First fix electrical works — Block A, ground floor.',
    20, 1160.00,
    5.0, 290.00, 0, null,
    2, 14300.00, 8500.00, 5800.00,
    'pending', '2024-02-05 10:30:00', null, null
  );
  const inv2Id = inv2.lastInsertRowid;
  insertLine.run(inv2Id, 'JOB-2024-001', 'Block A - Ground Floor', 'First fix wiring and cable containment, ground floor', 4200.00);
  insertLine.run(inv2Id, 'JOB-2024-001', 'Block A - Level 3',      'First fix wiring, level 3 (new)',                      1600.00);

  // ── Smith Electrical — App 3 (approved) ──────────────────────────────
  const inv3 = insertInvoice.run(
    sub1Id, 'SE-2024-002',
    'Second fix electrical works — residential block A, floors 1–3. Consumer units, sockets, switches and luminaires.',
    12000.00, 2400.00, '2024-02-05', '2024-02-23', 'ELEC-02', 'PO-2024-001', null,
    'Second fix electrical works — residential block A, floors 1–3.',
    20, 2400.00,
    5.0, 600.00, 0, '2025-06-30',
    3, 20500.00, 8500.00, 12000.00,
    'approved', '2024-02-26 08:00:00', '2024-02-28 11:00:00', null
  );
  const inv3Id = inv3.lastInsertRowid;
  insertLine.run(inv3Id, 'JOB-2024-001', 'Block A - Level 1', 'Second fix — consumer units and sockets level 1', 4500.00);
  insertLine.run(inv3Id, 'JOB-2024-001', 'Block A - Level 2', 'Second fix — consumer units and sockets level 2', 4500.00);
  insertLine.run(inv3Id, 'JOB-2024-001', 'Block A - Level 3', 'Second fix — consumer units and sockets level 3', 3000.00);

  // ── Smith Electrical — App 4 (queried) ───────────────────────────────
  const inv4 = insertInvoice.run(
    sub1Id, 'SE-2024-003',
    'External lighting installation — car park and perimeter. LED flood lights, cabling and timer controls.',
    4750.00, 950.00, '2024-03-04', '2024-03-15', 'ELEC-03', 'PO-2024-002',
    'Weather delays on days 3 and 4.',
    'External lighting — car park and perimeter.',
    20, 950.00,
    5.0, 237.50, 0, null,
    4, 25250.00, 20500.00, 4750.00,
    'queried', '2024-03-18 09:15:00', '2024-03-20 10:00:00',
    'Please provide daywork sheets for weather delay days.'
  );
  const inv4Id = inv4.lastInsertRowid;
  insertLine.run(inv4Id, 'JOB-2024-002', 'External Works - Car Park',   'LED flood lights and timer controls, car park',   3000.00);
  insertLine.run(inv4Id, 'JOB-2024-002', 'External Works - Perimeter', 'LED perimeter lighting cabling and fixtures',    1750.00);

  // ── Jones Groundworks — App 1 (approved) ────────────────────────────
  const inv5 = insertInvoice.run(
    sub2Id, 'JG-001',
    'Excavation and subbase installation — car park area phase 1. Bulk excavation, disposal, hardcore fill and compaction.',
    22500.00, 4500.00, '2024-01-15', '2024-02-09', 'CIVIL-01', 'PO-2024-003', null,
    'Groundworks and subbase — car park phase 1.',
    30, 6750.00,
    5.0, 1125.00, 0, '2025-03-31',
    1, 22500.00, 0, 22500.00,
    'approved', '2024-02-12 08:30:00', '2024-02-14 15:00:00', null
  );
  const inv5Id = inv5.lastInsertRowid;
  insertLine.run(inv5Id, 'JOB-2024-002', 'External Works - Car Park', 'Bulk excavation and disposal',               12000.00);
  insertLine.run(inv5Id, 'JOB-2024-002', 'External Works - Car Park', 'Hardcore fill and compaction to spec',       10500.00);

  // ── Jones Groundworks — App 2 DUPLICATE ─────────────────────────────
  const inv6 = insertInvoice.run(
    sub2Id, 'JG-001B',
    'Excavation and groundworks — car park phase 1 subbase works and compaction. Duplicate submitted in error.',
    22500.00, 4500.00, '2024-01-15', '2024-02-09', 'CIVIL-01', 'PO-2024-003',
    'Duplicate submitted in error.',
    'Groundworks duplicate — car park phase 1.',
    30, 6750.00,
    5.0, 1125.00, 0, null,
    2, 45000.00, 22500.00, 22500.00,
    'pending', '2024-02-20 11:00:00', null, null
  );
  const inv6Id = inv6.lastInsertRowid;
  insertLine.run(inv6Id, 'JOB-2024-002', 'External Works - Car Park', 'Bulk excavation and disposal',         12000.00);
  insertLine.run(inv6Id, 'JOB-2024-002', 'External Works - Car Park', 'Hardcore fill and compaction to spec', 10500.00);

  // ── Jones Groundworks — App 3 (pending) ─────────────────────────────
  const inv7 = insertInvoice.run(
    sub2Id, 'JG-002',
    'Drainage installation — surface water and foul drainage runs, manholes and connections.',
    18750.00, 3750.00, '2024-02-12', '2024-03-08', 'CIVIL-02', 'PO-2024-003', null,
    'Drainage installation — surface and foul drainage.',
    30, 5625.00,
    5.0, 937.50, 0, '2025-06-30',
    3, 41250.00, 22500.00, 18750.00,
    'pending', '2024-03-11 08:00:00', null, null
  );
  const inv7Id = inv7.lastInsertRowid;
  insertLine.run(inv7Id, 'JOB-2024-002', 'External Works - Drainage', 'Surface water drainage runs and manholes', 10500.00);
  insertLine.run(inv7Id, 'JOB-2024-002', 'External Works - Drainage', 'Foul drainage connections and testing',     8250.00);

  // ── Peak Plumbing — App 1 (pending) ─────────────────────────────────
  const inv8 = insertInvoice.run(
    sub3Id, 'PP-2024-01',
    'Mechanical first fix — domestic hot and cold water services, soil and waste pipework.',
    9200.00, 1840.00, '2024-02-19', '2024-03-15', 'MECH-01', 'PO-2024-004',
    'All pipework pressure tested and certified.',
    'Mechanical first fix — DHW, CWS and soil/waste.',
    20, 1840.00,
    2.5, 230.00, 0, '2025-09-30',
    1, 9200.00, 0, 9200.00,
    'pending', '2024-03-18 13:00:00', null, null
  );
  const inv8Id = inv8.lastInsertRowid;
  insertLine.run(inv8Id, 'JOB-2024-001', 'Block A - Ground Floor', 'Hot and cold water services, ground floor', 3200.00);
  insertLine.run(inv8Id, 'JOB-2024-001', 'Block A - Level 1',      'Hot and cold water services, level 1',      3000.00);
  insertLine.run(inv8Id, 'JOB-2024-001', 'Block A - Level 2',      'Soil and waste pipework, levels 1–2',       3000.00);

  // ── Projects ──────────────────────────────────────────────────────────
  const contractorId = contractor.lastInsertRowid;

  const insertProject = db.prepare(`INSERT INTO projects (contractor_id, name, reference, address, contract_value, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  insertProject.run(contractorId, 'City Centre Refurb', 'CCR-2024-01', '14 High Street, Newcastle NE1 1AA', 250000, '2024-01-15', '2024-12-31', 'active');
  insertProject.run(contractorId, 'Riverside Development Phase 2', 'RD2-2024-07', 'Riverside Way, Sunderland SR1 3TU', 480000, '2024-07-01', '2025-06-30', 'active');

  // ── Employees ──────────────────────────────────────────────────────────
  const insertEmployee = db.prepare(`
    INSERT INTO employees (contractor_id, name, email, role, hourly_rate, weekly_hours, holiday_allowance, holiday_used, start_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const emp1 = insertEmployee.run(contractorId, 'Sarah Connor', 'emp1@clearclaim.co.uk', 'Site Supervisor', 18.50, 40, 28, 5, '2023-03-01');
  const emp2 = insertEmployee.run(contractorId, 'Tom Bradley', 'emp2@clearclaim.co.uk', 'Groundworker', 14.00, 40, 25, 3, '2023-06-15');
  const emp3 = insertEmployee.run(contractorId, 'Lisa Park', 'emp3@clearclaim.co.uk', 'Admin Coordinator', 16.00, 37.5, 28, 10, '2022-11-01');

  const emp1Id = emp1.lastInsertRowid;
  const emp2Id = emp2.lastInsertRowid;
  const emp3Id = emp3.lastInsertRowid;

  // Create user accounts for employees
  const empUser1 = insertEmployeeUser.run('emp1@clearclaim.co.uk', emp1Hash, 'Sarah Connor', 'Mitchell Construction Ltd', 'employee', 0, emp1Id);
  const empUser2 = insertEmployeeUser.run('emp2@clearclaim.co.uk', emp2Hash, 'Tom Bradley', 'Mitchell Construction Ltd', 'employee', 0, emp2Id);
  const empUser3 = insertEmployeeUser.run('emp3@clearclaim.co.uk', emp3Hash, 'Lisa Park', 'Mitchell Construction Ltd', 'employee', 0, emp3Id);

  // Link user_id back to employee
  db.prepare('UPDATE employees SET user_id = ? WHERE id = ?').run(empUser1.lastInsertRowid, emp1Id);
  db.prepare('UPDATE employees SET user_id = ? WHERE id = ?').run(empUser2.lastInsertRowid, emp2Id);
  db.prepare('UPDATE employees SET user_id = ? WHERE id = ?').run(empUser3.lastInsertRowid, emp3Id);

  // Get a project id
  const proj = db.prepare(`SELECT id FROM projects WHERE contractor_id = ? LIMIT 1`).get(contractorId) as any;
  const projId = proj?.id || null;

  // ── Timesheets ─────────────────────────────────────────────────────────
  const insertTs = db.prepare(`
    INSERT INTO timesheets (employee_id, contractor_id, week_starting, project_id, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, total_hours, notes, status, reviewer_comment, submitted_at, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Week dates (last 3 Mondays)
  const now = new Date();
  function lastMonday(weeksBack: number): string {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - ((day === 0 ? 6 : day - 1)) - (weeksBack * 7));
    return d.toISOString().split('T')[0];
  }

  insertTs.run(emp1Id, contractorId, lastMonday(2), projId, 8, 8, 8, 8, 8, 0, 0, 40, 'Normal week', 'approved', 'Good work.', new Date(Date.now() - 14 * 86400000).toISOString(), new Date(Date.now() - 13 * 86400000).toISOString());
  insertTs.run(emp1Id, contractorId, lastMonday(1), projId, 9, 8, 8, 8, 9, 4, 0, 46, 'Overtime on Mon/Fri + Saturday', 'approved', null, new Date(Date.now() - 7 * 86400000).toISOString(), new Date(Date.now() - 6 * 86400000).toISOString());
  insertTs.run(emp2Id, contractorId, lastMonday(2), projId, 8, 8, 8, 8, 8, 0, 0, 40, null, 'approved', null, new Date(Date.now() - 14 * 86400000).toISOString(), new Date(Date.now() - 13 * 86400000).toISOString());
  insertTs.run(emp2Id, contractorId, lastMonday(0), projId, 8, 8, 8, 8, 8, 0, 0, 40, 'Standard week', 'pending', null, new Date().toISOString(), null);

  // ── Holiday requests ───────────────────────────────────────────────────
  const insertHol = db.prepare(`
    INSERT INTO holiday_requests (employee_id, contractor_id, start_date, end_date, days_requested, type, notes, status, reviewer_comment, submitted_at, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertHol.run(emp1Id, contractorId, '2026-05-26', '2026-05-30', 5, 'annual', 'Bank holiday week', 'approved', 'Approved. Enjoy!', new Date(Date.now() - 30 * 86400000).toISOString(), new Date(Date.now() - 29 * 86400000).toISOString());
  insertHol.run(emp3Id, contractorId, '2026-06-16', '2026-06-20', 5, 'annual', 'Family holiday', 'pending', null, new Date(Date.now() - 2 * 86400000).toISOString(), null);
  insertHol.run(emp2Id, contractorId, '2026-04-14', '2026-04-14', 1, 'sick', 'Feeling unwell', 'approved', null, new Date(Date.now() - 7 * 86400000).toISOString(), new Date(Date.now() - 6 * 86400000).toISOString());

  // ── AI flags for duplicate pairs ─────────────────────────────────────
  const insertFlag = db.prepare(`
    INSERT INTO ai_flags (invoice_id, matched_invoice_id, flag_type, confidence_score, reason)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertFlag.run(
    inv2Id, inv1Id,
    'EXACT_DUPLICATE', 90,
    'Line "JOB-2024-001 / Block A - Ground Floor": same job code & area with overlapping work period (matched invoice SE-2024-001); Line "JOB-2024-001 / Block A - Ground Floor": same job code, area and line value £4200.00'
  );

  insertFlag.run(
    inv6Id, inv5Id,
    'EXACT_DUPLICATE', 90,
    'Line "JOB-2024-002 / External Works - Car Park": same job code & area with overlapping work period (matched invoice JG-001); Line "JOB-2024-002 / External Works - Car Park": same job code, area and line value £12000.00'
  );

  console.log('\n✅ ClearClaim database seeded successfully!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('  TEST LOGIN CREDENTIALS');
  console.log('═══════════════════════════════════════════════════');
  console.log('  CONTRACTOR:  contractor@clearclaim.co.uk / demo123');
  console.log('  SUBCON 1:    sub1@clearclaim.co.uk / demo123  → Smith Electrical Ltd');
  console.log('  SUBCON 2:    sub2@clearclaim.co.uk / demo123  → Jones Groundworks');
  console.log('  SUBCON 3:    sub3@clearclaim.co.uk / demo123  → Peak Plumbing Services');
  console.log('  EMPLOYEE 1:  emp1@clearclaim.co.uk / demo123  → Sarah Connor (Site Supervisor)');
  console.log('  EMPLOYEE 2:  emp2@clearclaim.co.uk / demo123  → Tom Bradley (Groundworker)');
  console.log('  EMPLOYEE 3:  emp3@clearclaim.co.uk / demo123  → Lisa Park (Admin Coordinator)');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  8 invoices with retention and application numbers seeded.');
  console.log('  2 duplicate pairs flagged at LINE level.');
  console.log('═══════════════════════════════════════════════════\n');

  db.close();
}

seed().catch(console.error);
