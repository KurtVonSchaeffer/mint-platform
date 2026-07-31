import PDFDocument from 'pdfkit';

interface CommissionEntry {
  clientName: string | null;
  commissionAmount: number | string;
  status: string;
  createdAt: string;
}

export async function buildCommissionStatementPDF(params: {
  agentName: string;
  monthName: string;
  commissions: CommissionEntry[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W      = doc.page.width;   // 595.28
    const H      = doc.page.height;  // 841.89
    const M      = 40;               // margin
    const CW     = W - M * 2;        // content width

    const NAVY   = '#0a1628';
    const GREEN  = '#34d399';
    const WHITE  = '#ffffff';
    const GRAY   = '#6b7280';
    const DARK   = '#111827';
    const BORDER = '#e5e7eb';
    const BG     = '#f9fafb';

    const fmt = (n: number) =>
      `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtDate = (s: string) =>
      new Date(s).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

    // ── Header band ─────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 95).fill(NAVY);

    // "Algo" in white
    doc.font('Helvetica-Bold').fontSize(26).fillColor(WHITE).text('Algo', M, 26, { continued: true });
    // "Lend" in green
    doc.fillColor(GREEN).text('Lend');

    // Subtitle
    doc.font('Helvetica').fontSize(8).fillColor(WHITE, 0.4)
       .text('MINT PLATFORMS (PTY) LTD', M, 59);

    // Right: label + month
    doc.font('Helvetica').fontSize(8).fillColor(WHITE, 0.4)
       .text('COMMISSION STATEMENT', M, 26, { width: CW, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(17).fillColor(WHITE)
       .text(params.monthName, M, 40, { width: CW, align: 'right' });

    // ── Agent strip ─────────────────────────────────────────────────────────
    const stripY = 107;
    doc.rect(M, stripY, CW, 38).fillAndStroke(BG, BORDER);

    doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK)
       .text(params.agentName, M + 12, stripY + 13);

    const genDate = new Date().toLocaleDateString('en-ZA', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    doc.font('Helvetica').fontSize(9).fillColor(GRAY)
       .text(`Generated ${genDate}`, M, stripY + 15, { width: CW - 12, align: 'right' });

    // ── Summary cards ────────────────────────────────────────────────────────
    const total     = params.commissions.reduce((s, c) => s + Number(c.commissionAmount ?? 0), 0);
    const paid      = params.commissions.filter(c => c.status === 'Paid').reduce((s, c) => s + Number(c.commissionAmount ?? 0), 0);
    const inPayroll = params.commissions.filter(c => c.status === 'Payroll Ready' || c.status === 'Pending Payroll').reduce((s, c) => s + Number(c.commissionAmount ?? 0), 0);

    const cardY = stripY + 50;
    const GAP   = 8;
    const cardW = (CW - GAP * 2) / 3;

    const drawCard = (x: number, bg: string, label: string, value: string, textColor: string) => {
      doc.rect(x, cardY, cardW, 56).fill(bg);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(textColor)
         .text(label, x + 10, cardY + 10, { width: cardW - 20 });
      doc.font('Helvetica-Bold').fontSize(15).fillColor(textColor)
         .text(value, x + 10, cardY + 24, { width: cardW - 20 });
    };

    drawCard(M,                        '#f3e8ff', 'EARNED THIS MONTH', fmt(total),     '#6d28d9');
    drawCard(M + cardW + GAP,          '#fef3c7', 'IN PAYROLL',         fmt(inPayroll), '#92400e');
    drawCard(M + (cardW + GAP) * 2,   '#d1fae5', 'PAID OUT',           fmt(paid),      '#065f46');

    // ── Commission table ─────────────────────────────────────────────────────
    const tableY = cardY + 68;
    const ROW_H  = 27;

    const COL_CLIENT = M + 8;
    const COL_DATE   = M + 250;
    const COL_STATUS = M + 350;
    const COL_AMOUNT = M + CW - 8;

    // Header row
    doc.rect(M, tableY, CW, 26).fill(NAVY);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(WHITE, 0.45);
    doc.text('CLIENT',     COL_CLIENT, tableY + 9);
    doc.text('DATE',       COL_DATE,   tableY + 9);
    doc.text('STATUS',     COL_STATUS, tableY + 9);
    doc.text('COMMISSION', M,          tableY + 9, { width: CW - 8, align: 'right' });

    // Data rows
    let rowY = tableY + 26;

    params.commissions.forEach((c, i) => {
      doc.rect(M, rowY, CW, ROW_H).fill(i % 2 === 0 ? WHITE : BG);

      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(DARK)
         .text(c.clientName ?? '—', COL_CLIENT, rowY + 8, { width: 190, ellipsis: true });

      doc.font('Helvetica').fontSize(9.5).fillColor(GRAY)
         .text(fmtDate(c.createdAt), COL_DATE, rowY + 9, { width: 90 });

      let statusColor = '#b45309';
      if (c.status === 'Paid')            statusColor = '#059669';
      else if (c.status === 'Payroll Ready')   statusColor = '#1d4ed8';
      else if (c.status === 'Pending Payroll') statusColor = '#7c3aed';

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(statusColor)
         .text(c.status, COL_STATUS, rowY + 9, { width: 100 });

      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(DARK)
         .text(fmt(Number(c.commissionAmount ?? 0)), M, rowY + 8, { width: CW - 8, align: 'right' });

      doc.moveTo(M, rowY + ROW_H).lineTo(M + CW, rowY + ROW_H)
         .strokeColor(BORDER).lineWidth(0.4).stroke();

      rowY += ROW_H;
    });

    // Total row
    doc.rect(M, rowY, CW, 38).fill(NAVY);
    const clientCount = params.commissions.length;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(WHITE, 0.45)
       .text(
         `${params.monthName.toUpperCase()} TOTAL  ·  ${clientCount} CLIENT${clientCount !== 1 ? 'S' : ''}`,
         COL_CLIENT, rowY + 13,
       );
    doc.font('Helvetica-Bold').fontSize(19).fillColor(GREEN)
       .text(fmt(total), M, rowY + 11, { width: CW - 8, align: 'right' });

    rowY += 38;

    // ── Policy note ──────────────────────────────────────────────────────────
    const noteY = rowY + 16;
    doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
       .text(
         'Commission is calculated at 25% of the client\'s once-off sign-up / implementation fee for each accepted quote. ' +
         'Commission crystallises once the client\'s first payment has been successfully collected.',
         M, noteY, { width: CW, lineGap: 2 },
       );

    // ── Footer band ──────────────────────────────────────────────────────────
    const footerY = H - 40;
    doc.rect(0, footerY, W, 40).fill(NAVY);
    doc.font('Helvetica').fontSize(7.5).fillColor(WHITE, 0.35)
       .text(
         'MINT Platforms (Pty) Ltd  ·  This is a confidential commission statement  ·  AlgoLend',
         M, footerY + 14, { width: CW, align: 'center' },
       );

    doc.end();
  });
}
