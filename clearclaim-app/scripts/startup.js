// Startup script — initialises SQLite DB and seeds demo accounts on Railway
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'clearclaim.db');
console.log('[ClearClaim] Startup — DB path:', DB_PATH);

try {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create full schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      company TEXT,
      role TEXT NOT NULL DEFAULT 'subcontractor',
      logo_path TEXT,
      employee_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subcontractor_id INTEGER NOT NULL,
      invoice_number TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      vat_amount REAL NOT NULL DEFAULT 0,
      work_from TEXT NOT NULL DEFAULT '',
      work_to TEXT NOT NULL DEFAULT '',
      cost_code TEXT,
      po_reference TEXT,
      notes TEXT,
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
      project_id INTEGER,
      paid INTEGER DEFAULT 0,
      paid_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      job_code TEXT NOT NULL,
      area TEXT NOT NULL,
      description TEXT NOT NULL,
      line_value REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
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
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      user_id INTEGER,
      user_name TEXT,
      action TEXT,
      detail TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS email_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
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
    CREATE TABLE IF NOT EXISTS subcontractor_compliance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subcontractor_id INTEGER NOT NULL,
      contractor_id INTEGER NOT NULL,
      document_type TEXT NOT NULL,
      document_name TEXT NOT NULL,
      expiry_date TEXT,
      notes TEXT,
      status TEXT DEFAULT 'valid',
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS variations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      invoice_id INTEGER,
      subcontractor_id INTEGER NOT NULL,
      contractor_id INTEGER NOT NULL,
      variation_number TEXT NOT NULL,
      description TEXT NOT NULL,
      value REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT,
      reviewer_comment TEXT
    );
    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      raised_by INTEGER NOT NULL,
      contractor_id INTEGER NOT NULL,
      subcontractor_id INTEGER NOT NULL,
      dispute_type TEXT DEFAULT 'payment',
      description TEXT NOT NULL,
      amount_disputed REAL,
      status TEXT DEFAULT 'open',
      pay_less_notice_date TEXT,
      payment_due_date TEXT,
      resolution_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS dispute_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispute_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      user_name TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS contractor_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contractor_id INTEGER UNIQUE NOT NULL,
      max_holidays_per_day INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS employee_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      employee_id INTEGER NOT NULL,
      contractor_id INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cis_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subcontractor_id INTEGER NOT NULL,
      contractor_id INTEGER NOT NULL,
      verified_date TEXT NOT NULL,
      hmrc_reference TEXT,
      confirmed_rate INTEGER NOT NULL,
      verified_by TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS project_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      contractor_id INTEGER NOT NULL,
      uploaded_by INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      mime_type TEXT,
      category TEXT DEFAULT 'general',
      description TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS site_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subcontractor_id INTEGER NOT NULL,
      contractor_id INTEGER NOT NULL,
      invoice_id INTEGER,
      project_id INTEGER,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      caption TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subcontractor_id) REFERENCES users(id),
      FOREIGN KEY (contractor_id) REFERENCES users(id)
    );
  `);


  // Migrations
  try { db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0"); } catch(e) { /* already exists */ }

  // For each subcontractor, find their contractor via invites and ensure link exists
  try {
    // First: for all subcontractors who accepted invites, ensure sc link exists
    const inviteLinks = db.prepare(`
      SELECT DISTINCT inv.contractor_id, u.id as sub_id, inv.cis_rate
      FROM invites inv
      JOIN users u ON u.email = inv.email AND u.role = 'subcontractor'
      WHERE inv.used = 1
    `).all();
    for (const link of inviteLinks) {
      try {
        db.prepare(`INSERT OR IGNORE INTO subcontractor_contractors (subcontractor_id, contractor_id, cis_rate) VALUES (?, ?, ?)`)
          .run(link.sub_id, link.contractor_id, link.cis_rate || 20);
      } catch(e) {}
    }

    // Second: for each contractor, link all their subs (those whose invoices have contractor_id set)
    const invoiceLinks = db.prepare(`
      SELECT DISTINCT i.subcontractor_id, i.contractor_id
      FROM invoices i
      WHERE i.contractor_id IS NOT NULL
    `).all();
    for (const link of invoiceLinks) {
      try {
        db.prepare(`INSERT OR IGNORE INTO subcontractor_contractors (subcontractor_id, contractor_id, cis_rate) VALUES (?, ?, 20)`)
          .run(link.subcontractor_id, link.contractor_id);
      } catch(e) {}
    }

    // Third: link demo subs to demo contractor
    const demoContractor = db.prepare(`SELECT id FROM users WHERE email = 'contractor@getclearclaim.co.uk'`).get();
    if (demoContractor) {
      const demoSubs = db.prepare(`SELECT id FROM users WHERE email LIKE '%@getclearclaim.co.uk' AND role = 'subcontractor'`).all();
      for (const sub of demoSubs) {
        try {
          db.prepare(`INSERT OR IGNORE INTO subcontractor_contractors (subcontractor_id, contractor_id, cis_rate) VALUES (?, ?, 20)`)
            .run(sub.id, demoContractor.id);
          // Also update invoices to have contractor_id
          db.prepare(`UPDATE invoices SET contractor_id = ? WHERE subcontractor_id = ? AND contractor_id IS NULL`)
            .run(demoContractor.id, sub.id);
        } catch(e) {}
      }
    }
  } catch(e) { console.error('[ClearClaim] Sub-link migration error:', e.message); }

  // Backfill subcontractor_contractors from used invites (ensures all accepted invites are linked)
  try {
    const usedInvites = db.prepare(`
      SELECT inv.contractor_id, u.id as sub_id, inv.cis_rate
      FROM invites inv
      JOIN users u ON u.email = inv.email
      WHERE inv.used = 1
    `).all();
    for (const inv of usedInvites) {
      try {
        db.prepare(`INSERT OR IGNORE INTO subcontractor_contractors (subcontractor_id, contractor_id, cis_rate) VALUES (?, ?, ?)`)
          .run(inv.sub_id, inv.contractor_id, inv.cis_rate || 20);
      } catch(e) {}
    }
    if (usedInvites.length > 0) {
      console.log(`[ClearClaim] Migration: ensured ${usedInvites.length} sub-contractor link(s).`);
    }
  } catch(e) { console.error('[ClearClaim] Sub-contractor link migration error:', e.message); }
  // Seed demo accounts if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
  console.log('[ClearClaim] Users in DB:', userCount.c);

  if (userCount.c === 0) {
    console.log('[ClearClaim] Seeding demo accounts...');
    const hash = bcrypt.hashSync('demo123', 10);

    // --- Contractor ---
    const contractorId = db.prepare(
      `INSERT INTO users (email, password_hash, name, company, role) VALUES (?, ?, ?, ?, ?)`
    ).run('contractor@getclearclaim.co.uk', hash, 'Demo Contractor', 'Demo Construction Ltd', 'contractor').lastInsertRowid;

    // --- Subcontractors ---
    const sub1Id = db.prepare(
      `INSERT INTO users (email, password_hash, name, company, role) VALUES (?, ?, ?, ?, ?)`
    ).run('sub1@getclearclaim.co.uk', hash, 'Dave Smith', 'Smith Electrical Ltd', 'subcontractor').lastInsertRowid;

    const sub2Id = db.prepare(
      `INSERT INTO users (email, password_hash, name, company, role) VALUES (?, ?, ?, ?, ?)`
    ).run('sub2@getclearclaim.co.uk', hash, 'Tom Jones', 'Jones Groundworks', 'subcontractor').lastInsertRowid;

    const sub3Id = db.prepare(
      `INSERT INTO users (email, password_hash, name, company, role) VALUES (?, ?, ?, ?, ?)`
    ).run('sub3@getclearclaim.co.uk', hash, 'Pete Sykes', 'Peak Plumbing Services', 'subcontractor').lastInsertRowid;

    // --- Link demo subs to demo contractor ---
    const linkSub = db.prepare(`INSERT OR IGNORE INTO subcontractor_contractors (subcontractor_id, contractor_id, cis_rate) VALUES (?, ?, ?)`);
    linkSub.run(sub1Id, contractorId, 20);
    linkSub.run(sub2Id, contractorId, 20);
    linkSub.run(sub3Id, contractorId, 20);

    // --- Employee users ---
    const emp1UserId = db.prepare(
      `INSERT INTO users (email, password_hash, name, company, role) VALUES (?, ?, ?, ?, ?)`
    ).run('emp1@getclearclaim.co.uk', hash, 'Mike Johnson', 'Demo Construction Ltd', 'employee').lastInsertRowid;

    const emp2UserId = db.prepare(
      `INSERT INTO users (email, password_hash, name, company, role) VALUES (?, ?, ?, ?, ?)`
    ).run('emp2@getclearclaim.co.uk', hash, 'Sarah Williams', 'Demo Construction Ltd', 'employee').lastInsertRowid;

    const emp3UserId = db.prepare(
      `INSERT INTO users (email, password_hash, name, company, role) VALUES (?, ?, ?, ?, ?)`
    ).run('emp3@getclearclaim.co.uk', hash, 'Tom Roberts', 'Demo Construction Ltd', 'employee').lastInsertRowid;

    // --- Contractor settings ---
    db.prepare(`INSERT OR IGNORE INTO contractor_settings (contractor_id) VALUES (?)`).run(contractorId);

    // --- Demo invoices from Smith Electrical Ltd (sub1) ---
    const insertInvoice = db.prepare(`
      INSERT INTO invoices
        (subcontractor_id, invoice_number, description, amount, vat_amount, work_from, work_to,
         cis_rate, cis_amount, status, submitted_at, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertInvoice.run(sub1Id, 'INV-2024-001', 'Electrical installation – first fix', 3200, 640,
      '2024-01-08', '2024-01-19', 20, 640, 'approved', '2024-01-22 09:00:00', '2024-01-25 14:30:00');

    insertInvoice.run(sub1Id, 'INV-2024-002', 'Second fix wiring – kitchens & bathrooms', 1850, 370,
      '2024-02-05', '2024-02-16', 20, 370, 'approved', '2024-02-19 10:15:00', '2024-02-22 11:00:00');

    insertInvoice.run(sub1Id, 'INV-2024-003', 'Distribution board upgrade', 2400, 480,
      '2024-03-04', '2024-03-08', 0, 0, 'pending', '2024-03-11 08:45:00', null);

    insertInvoice.run(sub1Id, 'INV-2024-004', 'Emergency lighting installation', 1100, 220,
      '2024-03-11', '2024-03-15', 0, 0, 'queried', '2024-03-18 09:30:00', '2024-03-20 16:00:00');

    // --- Demo invoices from Jones Groundworks (sub2) ---
    insertInvoice.run(sub2Id, 'INV-GW-001', 'Foundation excavation and groundworks', 4500, 900,
      '2024-01-15', '2024-01-26', 20, 900, 'approved', '2024-01-29 08:00:00', '2024-02-01 09:15:00');

    insertInvoice.run(sub2Id, 'INV-GW-002', 'Drainage works and soakaway installation', 2800, 560,
      '2024-02-19', '2024-03-01', 0, 0, 'pending', '2024-03-04 07:30:00', null);

    // --- Employee records ---
    const insertEmployee = db.prepare(`
      INSERT INTO employees
        (contractor_id, user_id, name, email, role, hourly_rate, weekly_hours,
         holiday_allowance, holiday_used, start_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const emp1Id = insertEmployee.run(
      contractorId, emp1UserId, 'Mike Johnson', 'emp1@getclearclaim.co.uk',
      'Site Manager', 22, 45, 28, 5, '2022-03-14', 'active'
    ).lastInsertRowid;

    const emp2Id = insertEmployee.run(
      contractorId, emp2UserId, 'Sarah Williams', 'emp2@getclearclaim.co.uk',
      'Quantity Surveyor', 28, 40, 28, 3, '2021-09-06', 'active'
    ).lastInsertRowid;

    const emp3Id = insertEmployee.run(
      contractorId, emp3UserId, 'Tom Roberts', 'emp3@getclearclaim.co.uk',
      'Project Manager', 25, 42, 28, 8, '2020-06-01', 'active'
    ).lastInsertRowid;

    // Link user records to employee records
    db.prepare(`UPDATE users SET employee_id = ? WHERE id = ?`).run(emp1Id, emp1UserId);
    db.prepare(`UPDATE users SET employee_id = ? WHERE id = ?`).run(emp2Id, emp2UserId);
    db.prepare(`UPDATE users SET employee_id = ? WHERE id = ?`).run(emp3Id, emp3UserId);

    // --- Timesheets ---
    const insertTimesheet = db.prepare(`
      INSERT INTO timesheets
        (employee_id, contractor_id, week_starting, mon_hours, tue_hours, wed_hours,
         thu_hours, fri_hours, sat_hours, sun_hours, total_hours, notes, status, submitted_at, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Mike Johnson
    insertTimesheet.run(emp1Id, contractorId, '2024-03-04', 9, 9, 9, 9, 9, 0, 0, 45, 'Block A groundworks supervision', 'approved', '2024-03-08 17:00:00', '2024-03-11 09:00:00');
    insertTimesheet.run(emp1Id, contractorId, '2024-03-11', 9, 9, 9, 9, 9, 0, 0, 45, 'Electrical first fix coordination', 'approved', '2024-03-15 17:00:00', '2024-03-18 09:00:00');
    insertTimesheet.run(emp1Id, contractorId, '2024-03-18', 9, 9, 9, 9, 9, 0, 0, 45, 'Roofing and drainage works', 'approved', '2024-03-22 17:00:00', '2024-03-25 09:30:00');

    // Sarah Williams
    insertTimesheet.run(emp2Id, contractorId, '2024-03-04', 8, 8, 8, 8, 8, 0, 0, 40, 'Subcontractor invoice review and valuation', 'approved', '2024-03-08 17:30:00', '2024-03-11 10:00:00');
    insertTimesheet.run(emp2Id, contractorId, '2024-03-11', 8, 8, 8, 8, 8, 0, 0, 40, 'Variation assessments – Block B', 'approved', '2024-03-15 17:30:00', '2024-03-18 10:00:00');
    insertTimesheet.run(emp2Id, contractorId, '2024-03-18', 8, 8, 8, 8, 8, 0, 0, 40, 'Final account preparation', 'approved', '2024-03-22 17:30:00', '2024-03-25 10:30:00');

    // Tom Roberts
    insertTimesheet.run(emp3Id, contractorId, '2024-03-04', 8.5, 8.5, 8.5, 8.5, 8, 0, 0, 42, 'Programme update and client meeting', 'approved', '2024-03-08 18:00:00', '2024-03-11 11:00:00');
    insertTimesheet.run(emp3Id, contractorId, '2024-03-11', 8.5, 8.5, 8.5, 8.5, 8, 0, 0, 42, 'Subcontractor progress meetings', 'approved', '2024-03-15 18:00:00', '2024-03-18 11:00:00');
    insertTimesheet.run(emp3Id, contractorId, '2024-03-18', 8.5, 8.5, 8.5, 8.5, 8, 0, 0, 42, 'H&S inspections and site walkround', 'approved', '2024-03-22 18:00:00', '2024-03-25 11:00:00');

    // --- Holiday requests ---
    const insertHoliday = db.prepare(`
      INSERT INTO holiday_requests
        (employee_id, contractor_id, start_date, end_date, days_requested, type, notes, status, submitted_at, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Mike Johnson
    insertHoliday.run(emp1Id, contractorId, '2024-02-12', '2024-02-16', 5, 'annual', 'Half-term family holiday', 'approved', '2024-01-15 09:00:00', '2024-01-17 10:00:00');
    insertHoliday.run(emp1Id, contractorId, '2024-04-15', '2024-04-19', 5, 'annual', 'Easter break', 'pending', '2024-03-20 09:00:00', null);

    // Sarah Williams
    insertHoliday.run(emp2Id, contractorId, '2024-01-29', '2024-01-31', 3, 'annual', 'Short break', 'approved', '2024-01-08 14:00:00', '2024-01-10 09:30:00');
    insertHoliday.run(emp2Id, contractorId, '2024-05-06', '2024-05-10', 5, 'annual', 'Bank holiday week off', 'pending', '2024-03-18 11:00:00', null);

    // Tom Roberts
    insertHoliday.run(emp3Id, contractorId, '2024-02-19', '2024-02-23', 5, 'annual', 'Skiing trip', 'approved', '2023-12-01 10:00:00', '2023-12-05 09:00:00');
    insertHoliday.run(emp3Id, contractorId, '2024-03-25', '2024-03-28', 4, 'annual', 'Long weekend break', 'approved', '2024-02-26 15:00:00', '2024-02-28 11:00:00');
    insertHoliday.run(emp3Id, contractorId, '2024-06-03', '2024-06-07', 5, 'annual', 'Summer holiday – first week', 'pending', '2024-03-19 09:30:00', null);

    // --- Notifications for contractor ---
    const insertNotif = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, link, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertNotif.run(contractorId, 'invoice', 'New Invoice Submitted', 'Smith Electrical Ltd has submitted invoice INV-2024-003 for £2,400 + VAT.', '/contractor/invoices', 0, '2024-03-11 08:46:00');
    insertNotif.run(contractorId, 'invoice', 'Invoice Queried', 'You have raised a query on invoice INV-2024-004 from Smith Electrical Ltd.', '/contractor/invoices', 1, '2024-03-20 16:01:00');
    insertNotif.run(contractorId, 'invoice', 'New Invoice Submitted', 'Jones Groundworks has submitted invoice INV-GW-002 for £2,800 + VAT.', '/contractor/invoices', 0, '2024-03-04 07:31:00');
    insertNotif.run(contractorId, 'holiday', 'Holiday Request Received', 'Mike Johnson has requested 5 days annual leave (15–19 Apr 2024).', '/contractor/holidays', 0, '2024-03-20 09:01:00');
    insertNotif.run(contractorId, 'holiday', 'Holiday Request Received', 'Sarah Williams has requested 5 days annual leave (6–10 May 2024).', '/contractor/holidays', 0, '2024-03-18 11:01:00');
    insertNotif.run(contractorId, 'holiday', 'Holiday Request Received', 'Tom Roberts has requested 5 days annual leave (3–7 Jun 2024).', '/contractor/holidays', 0, '2024-03-19 09:31:00');
    insertNotif.run(contractorId, 'timesheet', 'Timesheets Ready for Review', '3 timesheets submitted for week starting 18 Mar 2024 — awaiting review.', '/contractor/timesheets', 0, '2024-03-22 18:01:00');
    insertNotif.run(contractorId, 'compliance', 'Compliance Reminder', 'Smith Electrical Ltd public liability insurance expires in 30 days.', '/contractor/subcontractors', 0, '2024-03-15 08:00:00');

    // Mark all demo accounts as email verified
    db.prepare("UPDATE users SET email_verified = 1 WHERE email LIKE '%@getclearclaim.co.uk'").run();
    console.log('[ClearClaim] Rich demo data seeded successfully.');
    console.log('[ClearClaim] Logins: contractor@getclearclaim.co.uk / demo123');
    console.log('[ClearClaim]         sub1/sub2/sub3@getclearclaim.co.uk / demo123');
    console.log('[ClearClaim]         emp1/emp2/emp3@getclearclaim.co.uk / demo123');
  }

  // Always ensure demo passwords are correct (safe to re-run after deploy)
  const demoHash = bcrypt.hashSync('demo123', 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE email LIKE '%@getclearclaim.co.uk'").run(demoHash);
  console.log('[ClearClaim] Demo passwords verified/reset.');

  db.close();
  console.log('[ClearClaim] Startup complete.');
} catch (e) {
  console.error('[ClearClaim] Startup error:', e.message);
  console.error('[ClearClaim] Stack:', e.stack);
  console.error('[ClearClaim] Node version:', process.version);
  console.error('[ClearClaim] Platform:', process.platform, process.arch);
  console.error('[ClearClaim] CWD:', process.cwd());
  // Don't exit — let Next.js start anyway
}
// Tue Apr  7 20:21:17 BST 2026
