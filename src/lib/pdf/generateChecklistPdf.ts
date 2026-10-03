import { jsPDF } from 'jspdf';
import { ChecklistItem } from '../../types/api';

interface GeneratePdfOptions {
  items: ChecklistItem[];
  requestId: string;
  question: string;
}

export function generateChecklistPdf({ items, requestId, question }: GeneratePdfOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  const completedCount = items.filter(
    (i) => i.status === 'completed' || i.status === 'verified'
  ).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  // Helper for adding header to any page
  const drawPageHeader = (pageNum: number) => {
    // Header top bar
    doc.setFillColor(11, 24, 19); // #0b1813
    doc.rect(margin, 10, contentWidth, 14, 'F');

    // Gold accent line under header
    doc.setDrawColor(200, 164, 93); // #c8a45d
    doc.setLineWidth(0.8);
    doc.line(margin, 24, margin + contentWidth, 24);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(223, 190, 123); // #dfbe7b
    doc.text('IP-SAKTI SAHAYAK', margin + 4, 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(245, 241, 231);
    doc.text('Statutory Pre-Filing Regulatory Compliance Dossier', margin + 50, 19);

    doc.setFontSize(8);
    doc.setTextColor(200, 164, 93);
    doc.text(`ID: ${requestId}`, margin + contentWidth - 4, 19, { align: 'right' });
  };

  // Helper for adding footer to any page
  const drawPageFooter = (pageNum: number, totalPagesPlaceholder = '') => {
    doc.setDrawColor(28, 62, 50); // #1c3e32
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 14, margin + contentWidth, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 130, 125);
    doc.text(
      'Grounded in Patents Act, 1970 § 3(p) & Biological Diversity Act, 2002 • Confidential Technical Assessment',
      margin,
      pageHeight - 9
    );

    doc.text(
      `Page ${pageNum}${totalPagesPlaceholder}`,
      margin + contentWidth,
      pageHeight - 9,
      { align: 'right' }
    );
  };

  // --- PAGE 1: COVER & SUMMARY HEADER ---
  drawPageHeader(1);
  currentY = 32;

  // Title section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(11, 24, 19);
  doc.text('Actionable Pre-Filing Compliance Checklist', margin, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 95, 90);
  doc.text('Official statutory verification checklist for Ayurvedic patent & regulatory clearance.', margin, currentY);
  currentY += 8;

  // Metadata Card Box
  doc.setFillColor(248, 246, 240); // Soft ivory tint
  doc.setDrawColor(200, 164, 93);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(140, 100, 30);
  doc.text('QUERY / SUBJECT MATTER:', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(20, 30, 25);
  const splitQuestion = doc.splitTextToSize(`"${question}"`, contentWidth - 8);
  doc.text(splitQuestion, margin + 4, currentY + 11);

  // Status and Readiness Row inside card
  const metaRowY = currentY + 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(60, 70, 65);
  doc.text(`Dossier ID:`, margin + 4, metaRowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(11, 24, 19);
  doc.text(requestId, margin + 22, metaRowY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 70, 65);
  doc.text(`Readiness Status:`, margin + 65, metaRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(progressPercent === 100 ? 20 : 160, progressPercent === 100 ? 140 : 100, 40);
  doc.text(`${progressPercent}% (${completedCount}/${items.length} items validated)`, margin + 92, metaRowY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 70, 65);
  doc.text(`Date Generated:`, margin + 140, metaRowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(11, 24, 19);
  const nowStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  doc.text(nowStr, margin + 165, metaRowY);

  currentY += 34;

  // --- CHECKLIST ITEMS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(11, 24, 19);
  doc.text('STATUTORY REQUIREMENTS & EVIDENCE VALIDATION', margin, currentY);
  currentY += 5;

  let pageNum = 1;

  items.forEach((item, index) => {
    // Estimate card height: title + desc lines + refs + forms
    const titleText = `${index + 1}. [${item.id}] ${item.title}`;
    const descLines = doc.splitTextToSize(item.description, contentWidth - 12);
    const estimatedHeight = 22 + descLines.length * 3.8 + (item.required_documentation?.length ? 6 : 0);

    // Check if new page needed
    if (currentY + estimatedHeight > pageHeight - 20) {
      drawPageFooter(pageNum);
      doc.addPage();
      pageNum++;
      drawPageHeader(pageNum);
      currentY = 32;
    }

    const isDone = item.status === 'completed' || item.status === 'verified';

    // Item container background
    doc.setFillColor(isDone ? 242 : 252, isDone ? 248 : 250, isDone ? 245 : 246);
    doc.setDrawColor(isDone ? 45 : 210, isDone ? 180 : 170, isDone ? 150 : 130);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, currentY, contentWidth, estimatedHeight, 1.5, 1.5, 'FD');

    // Checkbox indicator
    doc.setDrawColor(isDone ? 20 : 150, isDone ? 130 : 150, isDone ? 100 : 150);
    doc.setFillColor(isDone ? 20 : 255, isDone ? 130 : 255, isDone ? 100 : 255);
    doc.roundedRect(margin + 3, currentY + 3.5, 4, 4, 0.5, 0.5, isDone ? 'FD' : 'D');
    if (isDone) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('✓', margin + 3.8, currentY + 6.6);
    }

    // Item Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 30, 25);
    doc.text(titleText, margin + 9, currentY + 6.5);

    // Status / Priority badge on right
    doc.setFontSize(7.5);
    if (item.priority === 'CRITICAL') {
      doc.setTextColor(180, 30, 30);
    } else if (item.priority === 'HIGH') {
      doc.setTextColor(180, 90, 20);
    } else {
      doc.setTextColor(30, 110, 80);
    }
    doc.text(`[${item.priority}]  ${item.status.toUpperCase()}`, margin + contentWidth - 4, currentY + 6.5, { align: 'right' });

    // Item Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 60, 55);
    doc.text(descLines, margin + 9, currentY + 11);

    let metaY = currentY + 11 + descLines.length * 3.8;

    // Evidence References & Deadline
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(140, 100, 30);
    doc.text('Evidence Ref:', margin + 9, metaY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 80, 65);
    doc.text(item.evidence_references.join(', '), margin + 28, metaY);

    if (item.statutory_deadline) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(170, 70, 20);
      doc.text(`Deadline: ${item.statutory_deadline}`, margin + contentWidth - 4, metaY, { align: 'right' });
    }

    // Required Documentation
    if (item.required_documentation && item.required_documentation.length > 0) {
      metaY += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(70, 80, 75);
      doc.text('Required Docs / Forms:', margin + 9, metaY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 30, 25);
      doc.text(item.required_documentation.join(' • '), margin + 42, metaY);
    }

    currentY += estimatedHeight + 3.5;
  });

  // Disclaimer block on the last page if space permits, or new page
  if (currentY + 22 > pageHeight - 20) {
    drawPageFooter(pageNum);
    doc.addPage();
    pageNum++;
    drawPageHeader(pageNum);
    currentY = 32;
  }

  // Statutory Disclaimer Note
  doc.setFillColor(245, 243, 237);
  doc.setDrawColor(200, 164, 93);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY + 2, contentWidth, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 100, 30);
  doc.text('STATUTORY COMPLIANCE & LEGAL NOTICE:', margin + 3, currentY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 90, 85);
  const disclaimer = 'This dossier provides structured statutory intelligence under Section 3(p) of the Patents Act, 1970 and Section 6 of the Biological Diversity Act, 2002. It serves as actionable procedural guidance before formal filing with the Indian Patent Office (IPO) and National Biodiversity Authority (NBA).';
  doc.text(doc.splitTextToSize(disclaimer, contentWidth - 6), margin + 3, currentY + 10.5);

  // Draw final footer
  drawPageFooter(pageNum);

  // Save / Trigger Download
  const filename = `IP-SAKTI-Dossier-${requestId}-Checklist.pdf`;
  doc.save(filename);
}
