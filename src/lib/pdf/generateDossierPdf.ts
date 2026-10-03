import { jsPDF } from 'jspdf';
import { AnalyzeResponse } from '../../types/api';

export function generateDossierPdf(data: AnalyzeResponse): void {
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
  let pageNum = 1;

  const drawHeader = (page: number) => {
    doc.setFillColor(11, 24, 19); // #0b1813
    doc.rect(margin, 10, contentWidth, 13, 'F');

    doc.setDrawColor(200, 164, 93); // #c8a45d
    doc.setLineWidth(0.8);
    doc.line(margin, 23, margin + contentWidth, 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(223, 190, 123);
    doc.text('IP-SAKTI SAHAYAK', margin + 4, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(245, 241, 231);
    doc.text('Statutory Regulatory & Intellectual Property Dossier', margin + 48, 18);

    doc.setFontSize(7.5);
    doc.setTextColor(200, 164, 93);
    doc.text(`ID: ${data.request_id}`, margin + contentWidth - 4, 18, { align: 'right' });
  };

  const drawFooter = (page: number) => {
    doc.setDrawColor(28, 62, 50);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 13, margin + contentWidth, pageHeight - 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 120, 115);
    doc.text(
      'Section 3(p) Patents Act 1970 • Biological Diversity Act 2002 • Official Technical Assessment',
      margin,
      pageHeight - 8.5
    );

    doc.text(`Page ${page}`, margin + contentWidth, pageHeight - 8.5, { align: 'right' });
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 18) {
      drawFooter(pageNum);
      doc.addPage();
      pageNum++;
      drawHeader(pageNum);
      currentY = 30;
    }
  };

  // --- PAGE 1 ---
  drawHeader(1);
  currentY = 30;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(11, 24, 19);
  doc.text('Ayurvedic Patent & Regulatory Intelligence Dossier', margin, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 85, 80);
  doc.text('Formally classified statutory guidance, claim-evidence graph, and procedural roadmap.', margin, currentY);
  currentY += 7;

  // Subject query
  const questionText = data.original_request?.question || 'Ayurvedic Regulatory Guidance Subject Matter';

  // Metadata Card
  doc.setFillColor(248, 246, 240);
  doc.setDrawColor(200, 164, 93);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(140, 100, 30);
  doc.text('SUBJECT QUERY:', margin + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 25, 20);
  const qLines = doc.splitTextToSize(`"${questionText}"`, contentWidth - 8);
  doc.text(qLines, margin + 4, currentY + 10.5);

  const metaRowY = currentY + 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 70, 65);
  doc.text('Jurisdiction:', margin + 4, metaRowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(11, 24, 19);
  doc.text(data.classification.jurisdiction, margin + 22, metaRowY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 70, 65);
  doc.text('Domain:', margin + 55, metaRowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(11, 24, 19);
  doc.text(data.classification.domain, margin + 68, metaRowY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 70, 65);
  doc.text('Confidence:', margin + 115, metaRowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 120, 70);
  doc.text(`${Math.round(data.classification.confidence * 100)}% Verified`, margin + 134, metaRowY);

  currentY += 38;

  // --- SECTION 1: EXECUTIVE STATUTORY SUMMARY ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(11, 24, 19);
  doc.text('1. EXECUTIVE STATUTORY SUMMARY', margin, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 40, 35);
  const summaryLines = doc.splitTextToSize(data.answer.summary, contentWidth);
  doc.text(summaryLines, margin, currentY);
  currentY += summaryLines.length * 4.2 + 4;

  // Warnings / Critical Objections
  const warningsList = data.answer.warnings || data.warnings || [];
  if (warningsList.length > 0) {
    checkPageBreak(25);
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(0.3);
    const risksText = warningsList.map((r) => `• ${r}`).join('\n');
    const riskLines = doc.splitTextToSize(risksText, contentWidth - 8);
    const riskBoxHeight = 8 + riskLines.length * 3.8;

    doc.roundedRect(margin, currentY, contentWidth, riskBoxHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    doc.text('CRITICAL STATUTORY WARNINGS & OBJECTIONS:', margin + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(50, 20, 20);
    doc.text(riskLines, margin + 4, currentY + 9.5);
    currentY += riskBoxHeight + 5;
  }

  // --- SECTION 2: CLAIMS ASSESSMENT & STATUTORY GROUNDS ---
  if (data.claims && data.claims.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(11, 24, 19);
    doc.text('2. CLAIMS ASSESSMENT & STATUTORY STATUS', margin, currentY);
    currentY += 5;

    data.claims.forEach((claim, idx) => {
      const claimLines = doc.splitTextToSize(`Claim ${idx + 1} [${claim.id}]: "${claim.claim_text}"`, contentWidth - 10);
      const impactLines = claim.impact_summary ? doc.splitTextToSize(`Statutory Impact: ${claim.impact_summary}`, contentWidth - 10) : [];
      const boxHeight = 10 + (claimLines.length + impactLines.length) * 3.6;

      checkPageBreak(boxHeight);

      doc.setFillColor(250, 250, 248);
      doc.setDrawColor(200, 164, 93);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, currentY, contentWidth, boxHeight, 1.2, 1.2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(11, 24, 19);
      doc.text(claimLines, margin + 4, currentY + 5);

      if (impactLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(60, 75, 70);
        doc.text(impactLines, margin + 4, currentY + 5 + claimLines.length * 3.6 + 1);
      }

      // Status pill on right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      if (claim.status === 'valid') {
        doc.setTextColor(20, 120, 60);
      } else if (claim.status === 'conditional') {
        doc.setTextColor(160, 100, 20);
      } else {
        doc.setTextColor(180, 30, 30);
      }
      doc.text(`[${claim.status.toUpperCase()}]`, margin + contentWidth - 4, currentY + 5, { align: 'right' });

      currentY += boxHeight + 3;
    });
  }

  // --- SECTION 3: CITATIONS & STATUTORY AUTHORITIES ---
  if (data.citations && data.citations.length > 0) {
    checkPageBreak(30);
    currentY += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(11, 24, 19);
    doc.text('3. CITATIONS & STATUTORY AUTHORITIES', margin, currentY);
    currentY += 5;

    data.citations.forEach((cit, idx) => {
      const citHeight = 10;
      checkPageBreak(citHeight);

      doc.setFillColor(248, 248, 246);
      doc.setDrawColor(210, 215, 210);
      doc.setLineWidth(0.2);
      doc.rect(margin, currentY, contentWidth, citHeight, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(20, 30, 25);
      doc.text(`${idx + 1}. [${cit.id}] ${cit.document_title}`, margin + 3, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(80, 95, 90);
      doc.text(
        `Authority: ${cit.authority_name} | Gazette/Ref: ${cit.gazette_or_reg_number} | Status: ${cit.verification_status}`,
        margin + 3,
        currentY + 8
      );

      currentY += citHeight + 2;
    });
  }

  // --- SECTION 4: PROCEDURAL ROADMAP (NEXT STEPS) ---
  if (data.next_steps && data.next_steps.length > 0) {
    checkPageBreak(30);
    currentY += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(11, 24, 19);
    doc.text('4. PROCEDURAL STATUTORY ROADMAP (NEXT STEPS)', margin, currentY);
    currentY += 5;

    data.next_steps.forEach((step) => {
      const actLines = doc.splitTextToSize(`Step ${step.step_number}: ${step.action}`, contentWidth - 45);
      const guideLines = step.guidance_note ? doc.splitTextToSize(step.guidance_note, contentWidth - 10) : [];
      const stepHeight = 10 + (actLines.length + guideLines.length) * 3.4;

      checkPageBreak(stepHeight);

      doc.setFillColor(252, 251, 248);
      doc.setDrawColor(200, 164, 93);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, currentY, contentWidth, stepHeight, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 25, 20);
      doc.text(actLines, margin + 4, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(140, 90, 20);
      doc.text(`Authority: ${step.authority_to_approach}  •  ${step.timeline}`, margin + contentWidth - 4, currentY + 4.5, { align: 'right' });

      if (guideLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(60, 70, 65);
        doc.text(guideLines, margin + 4, currentY + 4.5 + actLines.length * 3.4);
      }

      currentY += stepHeight + 2.5;
    });
  }

  drawFooter(pageNum);

  doc.save(`IP-SAKTI-Dossier-${data.request_id}.pdf`);
}
