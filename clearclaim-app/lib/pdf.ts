import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFile } from 'fs/promises';
import path from 'path';

interface JobLine {
  job_code: string;
  area: string;
  description: string;
  line_value: number;
}

interface InvoiceData {
  invoice_number: string;
  description: string;
  amount: number;
  vat_amount: number;
  cis_rate: number;
  cis_amount: number;
  retention_rate?: number;
  retention_amount?: number;
  retention_released?: number;
  application_number?: number;
  cumulative_value?: number;
  previous_certified?: number;
  this_application?: number;
  reviewed_at: string | null;
  submitted_at: string;
  subcontractor_name: string;
  subcontractor_company: string;
  subcontractor_email: string;
  contractor_name: string;
  contractor_company: string;
  contractor_logo_path?: string | null;
}

function fmt(n: number): string {
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function generateInvoicePDF(invoice: InvoiceData, jobLines: JobLine[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // A4 page
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const navy = rgb(0.063, 0.145, 0.329); // #10254E
  const white = rgb(1, 1, 1);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const darkGray = rgb(0.3, 0.3, 0.3);
  const midGray = rgb(0.5, 0.5, 0.5);
  const green = rgb(0.13, 0.55, 0.13);
  const red = rgb(0.8, 0.1, 0.1);

  const margin = 50;
  let y = height - 40;

  // ─── HEADER BANNER ───────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: navy });

  // Embed contractor logo if available
  let logoEmbedded = false;
  if (invoice.contractor_logo_path) {
    try {
      const logoAbsPath = path.join(process.cwd(), 'public', invoice.contractor_logo_path.replace(/^\//, ''));
      const logoBytes = await readFile(logoAbsPath);
      const logoType = invoice.contractor_logo_path.toLowerCase();
      let embeddedLogo;
      if (logoType.endsWith('.png')) {
        embeddedLogo = await pdfDoc.embedPng(logoBytes);
      } else {
        embeddedLogo = await pdfDoc.embedJpg(logoBytes);
      }
      const logoDims = embeddedLogo.scaleToFit(100, 50);
      page.drawImage(embeddedLogo, {
        x: margin,
        y: height - 20 - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
      logoEmbedded = true;
    } catch {
      // logo load failed — fall back to text
    }
  }

  if (!logoEmbedded) {
    page.drawText('ClearClaim', {
      x: margin,
      y: height - 45,
      size: 22,
      font: fontBold,
      color: white,
    });

    page.drawText('Construction Payment Management', {
      x: margin,
      y: height - 65,
      size: 9,
      font: fontReg,
      color: rgb(0.6, 0.75, 0.95),
    });
  }

  page.drawText('PAYMENT CERTIFICATE', {
    x: width - margin - 190,
    y: height - 42,
    size: 16,
    font: fontBold,
    color: white,
  });

  page.drawText(`Certificate No: ${invoice.invoice_number}`, {
    x: width - margin - 190,
    y: height - 62,
    size: 9,
    font: fontReg,
    color: rgb(0.7, 0.85, 1),
  });

  const approvedDate = invoice.reviewed_at
    ? new Date(invoice.reviewed_at).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  page.drawText(`Date Approved: ${approvedDate}`, {
    x: width - margin - 190,
    y: height - 76,
    size: 9,
    font: fontReg,
    color: rgb(0.7, 0.85, 1),
  });

  y = height - 120;

  // ─── PARTIES ─────────────────────────────────────────────────────────────
  const colW = (width - margin * 2 - 20) / 2;

  // Contractor box
  page.drawRectangle({ x: margin, y: y - 80, width: colW, height: 90, color: lightGray });
  page.drawText('CONTRACTOR', { x: margin + 10, y: y - 10, size: 8, font: fontBold, color: midGray });
  page.drawText(invoice.contractor_company || invoice.contractor_name, {
    x: margin + 10, y: y - 28, size: 11, font: fontBold, color: navy,
  });
  page.drawText(invoice.contractor_name, {
    x: margin + 10, y: y - 44, size: 9, font: fontReg, color: darkGray,
  });

  // Subcontractor box
  const col2x = margin + colW + 20;
  page.drawRectangle({ x: col2x, y: y - 80, width: colW, height: 90, color: lightGray });
  page.drawText('SUBCONTRACTOR', { x: col2x + 10, y: y - 10, size: 8, font: fontBold, color: midGray });
  page.drawText(invoice.subcontractor_company || invoice.subcontractor_name, {
    x: col2x + 10, y: y - 28, size: 11, font: fontBold, color: navy,
  });
  page.drawText(invoice.subcontractor_name, {
    x: col2x + 10, y: y - 44, size: 9, font: fontReg, color: darkGray,
  });
  page.drawText(invoice.subcontractor_email, {
    x: col2x + 10, y: y - 58, size: 8, font: fontReg, color: midGray,
  });

  y = y - 100;

  // ─── JOB LINES TABLE ─────────────────────────────────────────────────────
  const tableW = width - margin * 2;
  const colWidths = [90, 90, 220, 90];
  const headers = ['Job Code', 'Area', 'Description', 'Value'];

  // Table header row
  page.drawRectangle({ x: margin, y: y - 22, width: tableW, height: 22, color: navy });

  let cx = margin;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: cx + 6,
      y: y - 15,
      size: 8,
      font: fontBold,
      color: white,
    });
    cx += colWidths[i];
  }
  y -= 22;

  // Job line rows
  for (let idx = 0; idx < jobLines.length; idx++) {
    const line = jobLines[idx];
    const rowH = 20;
    const bg = idx % 2 === 0 ? white : lightGray;

    page.drawRectangle({ x: margin, y: y - rowH, width: tableW, height: rowH, color: bg });

    // Vertical dividers
    cx = margin;
    for (let i = 0; i < colWidths.length - 1; i++) {
      cx += colWidths[i];
      page.drawLine({
        start: { x: cx, y: y },
        end: { x: cx, y: y - rowH },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
    }

    cx = margin;
    const desc = line.description.length > 38 ? line.description.slice(0, 35) + '...' : line.description;
    const vals = [line.job_code, line.area, desc, `£${fmt(line.line_value)}`];

    for (let i = 0; i < vals.length; i++) {
      const isLast = i === vals.length - 1;
      page.drawText(vals[i] || '', {
        x: isLast ? cx + colWidths[i] - 6 - (fontReg.widthOfTextAtSize(vals[i] || '', 8)) : cx + 6,
        y: y - 13,
        size: 8,
        font: fontReg,
        color: darkGray,
      });
      cx += colWidths[i];
    }
    y -= rowH;

    // Bottom border per row
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + tableW, y },
      thickness: 0.3,
      color: rgb(0.85, 0.85, 0.85),
    });
  }

  // Table outer border
  page.drawRectangle({
    x: margin, y, width: tableW, height: (height - 120 - 100 - 22) - y,
    borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5,
    color: rgb(1, 1, 1),
    opacity: 0,
  });

  y -= 20;

  // ─── FINANCIAL SUMMARY ───────────────────────────────────────────────────
  const gross = invoice.amount;
  const vat = invoice.vat_amount;
  const cis = invoice.cis_amount || 0;
  const retentionHeld = (invoice.retention_amount || 0) - (invoice.retention_released || 0);
  const net = gross + vat - cis - retentionHeld;

  const summaryX = width - margin - 220;
  const summaryW = 220;

  page.drawText('FINANCIAL SUMMARY', {
    x: summaryX, y, size: 9, font: fontBold, color: navy,
  });
  y -= 18;

  const drawRow = (label: string, value: string, bold = false, color = darkGray, valColor = darkGray) => {
    page.drawText(label, { x: summaryX, y, size: 9, font: bold ? fontBold : fontReg, color });
    const valW = (bold ? fontBold : fontReg).widthOfTextAtSize(value, 9);
    page.drawText(value, { x: summaryX + summaryW - valW, y, size: 9, font: bold ? fontBold : fontReg, color: valColor });
    y -= 16;
  };

  page.drawLine({ start: { x: summaryX, y: y + 12 }, end: { x: summaryX + summaryW, y: y + 12 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });

  // Application number header
  if (invoice.application_number) {
    page.drawText(`Application for Payment No. ${invoice.application_number}`, {
      x: summaryX, y: y + 16, size: 8, font: fontBold, color: navy,
    });
    y -= 6;
  }

  drawRow('Gross Amount (ex VAT):', `£${fmt(gross)}`);
  drawRow(`VAT (20%):`, `£${fmt(vat)}`);
  if (cis > 0) {
    drawRow(`CIS Deduction (${invoice.cis_rate}%):`, `-£${fmt(cis)}`, false, red, red);
  }
  if (retentionHeld > 0) {
    drawRow(`Retention (${invoice.retention_rate || 5}%):`, `-£${fmt(retentionHeld)}`, false, rgb(0.6, 0.4, 0.0), rgb(0.6, 0.4, 0.0));
  }

  page.drawLine({ start: { x: summaryX, y: y + 12 }, end: { x: summaryX + summaryW, y: y + 12 }, thickness: 1, color: navy });
  y -= 4;

  // Net payment
  page.drawRectangle({ x: summaryX - 6, y: y - 4, width: summaryW + 12, height: 22, color: navy });
  const netLabel = 'Net Payment Due:';
  const netValue = `£${fmt(net)}`;
  page.drawText(netLabel, { x: summaryX, y: y + 4, size: 10, font: fontBold, color: white });
  const netW = fontBold.widthOfTextAtSize(netValue, 10);
  page.drawText(netValue, { x: summaryX + summaryW - netW, y: y + 4, size: 10, font: fontBold, color: white });
  y -= 30;

  // ─── DESCRIPTION ─────────────────────────────────────────────────────────
  if (invoice.description) {
    page.drawText('Application Summary:', { x: margin, y, size: 8, font: fontBold, color: midGray });
    y -= 14;
    const desc = invoice.description.length > 120 ? invoice.description.slice(0, 117) + '...' : invoice.description;
    page.drawText(desc, { x: margin, y, size: 8, font: fontReg, color: darkGray });
    y -= 20;
  }

  // ─── FOOTER ──────────────────────────────────────────────────────────────
  const footerY = 60;

  page.drawLine({
    start: { x: margin, y: footerY + 40 },
    end: { x: width - margin, y: footerY + 40 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText('This certificate was approved via ClearClaim', {
    x: margin, y: footerY + 25, size: 8, font: fontReg, color: midGray,
  });
  page.drawText(`Approval date: ${approvedDate}`, {
    x: margin, y: footerY + 10, size: 8, font: fontReg, color: midGray,
  });
  page.drawText(`Reference: ${invoice.invoice_number}`, {
    x: width - margin - 160, y: footerY + 10, size: 8, font: fontReg, color: midGray,
  });
  page.drawText('getclearclaim.co.uk', {
    x: width - margin - 70, y: footerY + 25, size: 8, font: fontBold, color: navy,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
