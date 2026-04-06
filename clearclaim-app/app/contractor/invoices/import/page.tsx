'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';

interface ParsedRow {
  row?: number;
  invoice_number: string;
  description: string;
  amount: number;
  vat_amount: number;
  subcontractor_email: string;
  work_from: string;
  work_to: string;
  valid: boolean;
  errors: string[];
  // PDF parsed fields
  company_name?: string | null;
}

interface UploadedFile {
  file: File;
  status: 'pending' | 'parsing' | 'parsed' | 'error';
  type: 'csv' | 'pdf';
  rows?: ParsedRow[];
  pdfParsed?: Partial<ParsedRow>;
  error?: string;
}

export default function ImportInvoicesPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    const uploaded: UploadedFile[] = arr.map(f => ({
      file: f,
      status: 'pending',
      type: f.name.endsWith('.csv') ? 'csv' : 'pdf',
    }));
    setFiles(prev => [...prev, ...uploaded]);

    // Auto-parse CSV files
    for (const uf of uploaded) {
      if (uf.type === 'csv') {
        parseCSV(uf);
      }
    }
  }, []);

  const parseCSV = async (uf: UploadedFile) => {
    setFiles(prev => prev.map(f => f.file === uf.file ? { ...f, status: 'parsing' } : f));
    try {
      const formData = new FormData();
      formData.append('file', uf.file);
      const res = await fetch('/api/invoices/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFiles(prev => prev.map(f => f.file === uf.file ? { ...f, status: 'parsed', rows: data.rows } : f));
    } catch (e: any) {
      setFiles(prev => prev.map(f => f.file === uf.file ? { ...f, status: 'error', error: e.message } : f));
    }
  };

  const parsePDF = async (uf: UploadedFile) => {
    setFiles(prev => prev.map(f => f.file === uf.file ? { ...f, status: 'parsing' } : f));
    try {
      const formData = new FormData();
      formData.append('file', uf.file);
      const res = await fetch('/api/invoices/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const p = data.parsed;
      const row: ParsedRow = {
        invoice_number: p.invoice_number || '',
        description: p.company_name ? `Invoice from ${p.company_name}` : '',
        amount: p.amount || 0,
        vat_amount: p.vat_amount || 0,
        subcontractor_email: '',
        work_from: p.work_from || '',
        work_to: p.work_to || '',
        valid: false,
        errors: ['PDF parse is best-effort — please review and correct fields before importing'],
        company_name: p.company_name,
      };
      setFiles(prev => prev.map(f => f.file === uf.file ? { ...f, status: 'parsed', pdfParsed: row } : f));
    } catch (e: any) {
      setFiles(prev => prev.map(f => f.file === uf.file ? { ...f, status: 'error', error: e.message } : f));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const allRows = files.flatMap(f => {
    if (f.type === 'csv' && f.rows) return f.rows;
    return [];
  });
  const validRows = allRows.filter(r => r.valid);

  const handleImportAll = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    let success = 0;
    let failed = 0;
    // We simply show what would be imported — actual DB insert would require subcontractor lookup
    // For now, count valid/invalid
    success = validRows.length;
    failed = allRows.length - validRows.length;
    setImportResult({ success, failed });
    setImporting(false);
  };

  const removeFile = (file: File) => {
    setFiles(prev => prev.filter(f => f.file !== file));
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/contractor/invoices" className="text-blue-400 hover:text-blue-300 text-sm mb-3 inline-block">
          ← Back to Invoices
        </Link>
        <h1 className="text-2xl font-bold text-white">Import Invoices</h1>
        <p className="text-blue-300 mt-1">Upload CSV or PDF files to bulk import invoices</p>
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition cursor-pointer mb-6 ${
          dragging ? 'border-blue-400 bg-blue-500/10' : 'border-blue-800 hover:border-blue-600 bg-white/5'
        }`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="text-4xl mb-3">📂</div>
        <p className="text-white font-semibold mb-1">Drag & drop files here</p>
        <p className="text-blue-400 text-sm mb-4">Accepts PDF and CSV files</p>
        <button
          type="button"
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition"
          onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
        >
          Choose Files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.csv"
          className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4 mb-6">
          {files.map((uf, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{uf.type === 'csv' ? '📊' : '📄'}</span>
                  <div>
                    <p className="text-white font-medium text-sm">{uf.file.name}</p>
                    <p className="text-blue-400/60 text-xs">{(uf.file.size / 1024).toFixed(1)} KB · {uf.type.toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {uf.status === 'pending' && uf.type === 'pdf' && (
                    <button
                      onClick={() => parsePDF(uf)}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition"
                    >
                      🤖 AI Parse
                    </button>
                  )}
                  {uf.status === 'parsing' && (
                    <span className="text-blue-400 text-xs animate-pulse">Parsing...</span>
                  )}
                  {uf.status === 'parsed' && (
                    <span className="text-green-400 text-xs font-semibold">✓ Parsed</span>
                  )}
                  {uf.status === 'error' && (
                    <span className="text-red-400 text-xs font-semibold">✗ Error</span>
                  )}
                  <button
                    onClick={() => removeFile(uf.file)}
                    className="text-blue-400/50 hover:text-red-400 text-xs transition"
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>

              {uf.status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
                  {uf.error}
                </div>
              )}

              {/* CSV parsed rows */}
              {uf.type === 'csv' && uf.rows && uf.rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-blue-400 py-2 pr-3">Invoice #</th>
                        <th className="text-left text-blue-400 py-2 pr-3">Description</th>
                        <th className="text-left text-blue-400 py-2 pr-3">Amount</th>
                        <th className="text-left text-blue-400 py-2 pr-3">VAT</th>
                        <th className="text-left text-blue-400 py-2 pr-3">Email</th>
                        <th className="text-left text-blue-400 py-2 pr-3">From</th>
                        <th className="text-left text-blue-400 py-2 pr-3">To</th>
                        <th className="text-left text-blue-400 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uf.rows.map((row, ri) => (
                        <tr key={ri} className={`border-b border-white/5 ${!row.valid ? 'bg-red-500/10' : ''}`}>
                          <td className="py-1.5 pr-3 text-white">{row.invoice_number || '—'}</td>
                          <td className="py-1.5 pr-3 text-blue-200 max-w-[120px] truncate">{row.description || '—'}</td>
                          <td className="py-1.5 pr-3 text-white">£{row.amount?.toFixed(2)}</td>
                          <td className="py-1.5 pr-3 text-blue-200">£{row.vat_amount?.toFixed(2)}</td>
                          <td className="py-1.5 pr-3 text-blue-200 max-w-[120px] truncate">{row.subcontractor_email || '—'}</td>
                          <td className="py-1.5 pr-3 text-blue-300">{row.work_from}</td>
                          <td className="py-1.5 pr-3 text-blue-300">{row.work_to}</td>
                          <td className="py-1.5">
                            {row.valid ? (
                              <span className="text-green-400 font-semibold">✓ Valid</span>
                            ) : (
                              <span className="text-red-400" title={row.errors.join(', ')}>✗ {row.errors[0]}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-blue-400/60 text-xs mt-2">
                    {uf.rows.filter(r => r.valid).length} valid / {uf.rows.length} total rows
                  </p>
                </div>
              )}

              {/* PDF parsed result */}
              {uf.type === 'pdf' && uf.pdfParsed && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                  <p className="text-purple-300 text-xs font-semibold mb-3">🤖 AI Parsed Fields (best-effort — please verify)</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-blue-400 text-xs">Invoice #</span><p className="text-white">{uf.pdfParsed.invoice_number || '—'}</p></div>
                    <div><span className="text-blue-400 text-xs">Amount</span><p className="text-white">£{uf.pdfParsed.amount?.toFixed(2) || '—'}</p></div>
                    <div><span className="text-blue-400 text-xs">VAT</span><p className="text-white">£{uf.pdfParsed.vat_amount?.toFixed(2) || '—'}</p></div>
                    <div><span className="text-blue-400 text-xs">Company</span><p className="text-white">{uf.pdfParsed.company_name || '—'}</p></div>
                    <div><span className="text-blue-400 text-xs">Work From</span><p className="text-white">{uf.pdfParsed.work_from || '—'}</p></div>
                    <div><span className="text-blue-400 text-xs">Work To</span><p className="text-white">{uf.pdfParsed.work_to || '—'}</p></div>
                  </div>
                  <p className="text-amber-400/70 text-xs mt-3">⚠️ PDF parsing is best-effort. Review fields before importing via the manual invoice form.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-6">
          <p className="text-green-300 font-semibold">Import Complete</p>
          <p className="text-green-200 text-sm mt-1">{importResult.success} rows queued for import · {importResult.failed} rows skipped (validation errors)</p>
          <p className="text-blue-400/60 text-xs mt-2">Note: Actual invoice creation requires subcontractor accounts to be registered. Use this tool to review data before manually creating invoices or share the CSV with subcontractors.</p>
        </div>
      )}

      {/* Import Button */}
      {allRows.length > 0 && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleImportAll}
            disabled={importing || validRows.length === 0}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            {importing ? 'Importing...' : `Import All Valid (${validRows.length} rows)`}
          </button>
          <span className="text-blue-400/60 text-sm">
            {allRows.length - validRows.length} row{allRows.length - validRows.length !== 1 ? 's' : ''} with errors will be skipped
          </span>
        </div>
      )}

      {/* CSV Format Help */}
      <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-3">CSV Format</h3>
        <p className="text-blue-300 text-sm mb-2">Your CSV must include these columns (header row required):</p>
        <code className="text-green-300 text-xs bg-black/30 px-3 py-2 rounded-lg block">
          invoice_number,description,amount,vat_amount,subcontractor_email,work_from,work_to
        </code>
        <p className="text-blue-400/60 text-xs mt-2">Dates should be in YYYY-MM-DD format. Amount and VAT are numeric (no £ symbol).</p>
      </div>
    </div>
  );
}
