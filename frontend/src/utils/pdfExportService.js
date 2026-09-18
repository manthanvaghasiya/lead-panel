import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Webiox Master PDF Dossier & Data Recovery Service
 * Generates a high-resolution, executive-grade multi-page PDF containing all CRM data.
 */
export function exportMasterCrmPdf(contacts = [], stats = null) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const nowStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  // ==========================================
  // 1. COVER / HEADER SECTION
  // ==========================================
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setFillColor(79, 70, 229); // indigo-600 accent bar
  doc.rect(0, 42, pageWidth, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('WEBIOX DIGITAL SOLUTION', 14, 16);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(199, 210, 254); // indigo-200
  doc.text('CRM & Partner Network — Master Recovery Dossier', 14, 24);

  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Generated: ${nowStr} (IST) | Total Records: ${contacts.length}`, 14, 33);
  doc.text('CONFIDENTIAL • SYSTEM BACKUP ARCHIVE', pageWidth - 14, 33, { align: 'right' });

  let currentY = 52;

  // ==========================================
  // 2. EXECUTIVE KPI DASHBOARD
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Executive Pipeline Summary', 14, currentY);
  currentY += 4;

  const meetingCount = contacts.filter(c => c.status === 'Meeting Scheduled' || c.meetingDate).length;
  const partneredCount = contacts.filter(c => c.status === 'Closed / Partnered').length;
  const inChatCount = contacts.filter(c => c.status === 'In Conversation' || c.status === 'Connected').length;

  autoTable(doc, {
    startY: currentY,
    head: [['Total Network', 'Meetings Scheduled', 'Deals / Active Partners', 'In LinkedIn Conversation']],
    body: [[
      String(contacts.length),
      String(meetingCount),
      String(partneredCount),
      String(inChatCount)
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 27, 75], // indigo-950
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 12,
      fontStyle: 'bold',
      textColor: [30, 41, 59],
      halign: 'center'
    },
    styles: { cellPadding: 3.5 }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // ==========================================
  // 3. MASTER CONTACT DIRECTORY TABLE
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Master Contact Directory', 14, currentY);
  currentY += 4;

  const directoryRows = contacts.map((c, idx) => {
    const meetDateStr = c.meetingDate 
      ? new Date(c.meetingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : (c.status === 'Meeting Scheduled' ? 'Scheduled' : '—');

    return [
      String(idx + 1),
      c.name || '—',
      (c.position || '—').slice(0, 32),
      c.location || 'Surat, India',
      c.status || '—',
      c.priority || 'Warm',
      c.mobile ? `+91 ${c.mobile}` : '—',
      c.commission || '15%–20%',
      meetDateStr
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Name', 'Role / Headline', 'Location', 'Status', 'Priority', 'Mobile', 'Commission', 'Meeting']],
    body: directoryRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 22 },
      7: { cellWidth: 18 },
      8: { cellWidth: 20 }
    }
  });

  // ==========================================
  // 4. DETAILED CONTACT DOSSIERS
  // ==========================================
  doc.addPage();
  currentY = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Detailed Lead & Partner Dossiers', 14, currentY);
  currentY += 6;

  contacts.forEach((contact, idx) => {
    // Check if we have enough room for contact header, else add new page
    if (currentY > pageHeight - 65) {
      doc.addPage();
      currentY = 20;
    }

    // Contact Card Container
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(14, currentY, pageWidth - 28, 12, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. ${contact.name}`, 18, currentY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`[${contact.status || 'In Conversation'} | ${contact.priority || 'Warm'} | ${contact.reason || 'Partnership'}]`, 70, currentY + 8);

    currentY += 15;

    // Contact Meta Details
    const metaData = [
      ['Position / Headline', contact.position || 'N/A'],
      ['Company & Location', `${contact.company || 'N/A'} • ${contact.location || 'Surat, Gujarat, India'}`],
      ['Contact Channels', `Mobile: ${contact.mobile ? '+91 ' + contact.mobile : 'None'} | Email: ${contact.email || 'None'}`],
      ['LinkedIn URL', contact.linkedinUrl || 'N/A'],
      ['Commission & Terms', `${contact.commission || '15%–20%'} — ${contact.dealTerms || 'Standard Webiox Referral Milestone Payout'}`],
      ['Technical Skills', (contact.skills && contact.skills.length > 0) ? contact.skills.join(', ') : 'N/A'],
      ['Scheduled Meeting', contact.meetingDate 
        ? `${new Date(contact.meetingDate).toLocaleString('en-IN')} | Platform: ${contact.meetingLink || 'Google Meet'}`
        : (contact.meetingLink ? `Link: ${contact.meetingLink}` : 'None scheduled')]
    ];

    autoTable(doc, {
      startY: currentY,
      body: metaData,
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 38, textColor: [71, 85, 105] },
        1: { cellWidth: pageWidth - 66 }
      }
    });

    currentY = doc.lastAutoTable.finalY + 3;

    // Strategic Notes / Executive Summary
    if (contact.summary || contact.notes) {
      const summaryText = contact.notes || contact.summary || '';
      autoTable(doc, {
        startY: currentY,
        head: [['Strategic Notes & Scoping']],
        body: [[summaryText]],
        theme: 'grid',
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [51, 65, 85],
          fontSize: 8,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          textColor: [51, 65, 85]
        }
      });
      currentY = doc.lastAutoTable.finalY + 3;
    }

    // Conversation History Log
    if (contact.conversationLog && contact.conversationLog.length > 0) {
      const logRows = contact.conversationLog.map(msg => [
        msg.timestamp || '—',
        `${msg.sender || 'Unknown'} (${msg.channel || 'LinkedIn'})`,
        msg.message || '—'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Time / Date', 'Sender & Channel', 'Message Transcript']],
        body: logRows,
        theme: 'striped',
        headStyles: {
          fillColor: [224, 231, 255], // indigo-100
          textColor: [49, 46, 129], // indigo-900
          fontSize: 7.5,
          fontStyle: 'bold',
          cellPadding: 1.8
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 1.8,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 40, fontStyle: 'bold' },
          2: { cellWidth: pageWidth - 94 }
        }
      });

      currentY = doc.lastAutoTable.finalY + 8;
    } else {
      currentY += 5;
    }
  });

  // ==========================================
  // 5. PAGE NUMBERING & FOOTERS
  // ==========================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);

    doc.text('Webiox Digital Solution • Confidential CRM Recovery Archive', 14, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  }

  // Save the generated PDF
  const filename = `webiox_crm_master_recovery_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}
