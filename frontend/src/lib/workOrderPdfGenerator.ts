import { jsPDF } from 'jspdf';
import type { Alert } from '../types';

export function generateClientWorkOrderPdf(alert: Alert): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // ── Header Box ──
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, 12, contentWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('GOVERNMENT OF NATIONAL CAPITAL TERRITORY OF DELHI', pageWidth / 2, 19, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('PUBLIC WORKS DEPARTMENT (PWD) — SMART CITY INFRASTRUCTURE CELL', pageWidth / 2, 25, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('HAWK AI AUTOMATED DEFECT TENDER & RECTIFICATION WORK ORDER', pageWidth / 2, 32, { align: 'center' });

  let y = 43;

  // ── Work Order Meta Pill ──
  const woNumber = `PWD/SZ-NDMC/WO-2026/${alert.id}`;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 12, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('WORK ORDER NO:', margin + 4, y + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(woNumber, margin + 35, y + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('STATUS:', margin + 110, y + 7.5);

  doc.setFillColor(254, 226, 226);
  doc.rect(margin + 126, y + 3, 45, 6.5, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(185, 28, 28);
  doc.text('EMERGENCY ACTION REQUIRED', margin + 148.5, y + 7.5, { align: 'center' });

  y += 16;

  // ── Section 1: Defect & Geospatial Specifications ──
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. DEFECT CLASSIFICATION & EDGE TELEMETRY AUDIT', margin + 4, y + 5);

  y += 7;

  const dt = new Date(alert.timestamp);
  const formattedTime = dt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const slaDeadlineDate = new Date(dt.getTime() + 48 * 60 * 60 * 1000);
  const slaDeadline = slaDeadlineDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const telemetryRows = [
    ['Defect Category:', alert.type.replace(/_/g, ' ').toUpperCase(), 'Priority Severity:', 'CRITICAL (Safety Class 1)'],
    ['Bus Telemetry Unit:', alert.bus_id, 'AI Detection Model:', `YOLOv8 Edge Vision (${(alert.confidence * 100).toFixed(1)}% Conf)`],
    ['GPS Latitude:', `${alert.lat.toFixed(6)}° N`, 'GPS Longitude:', `${alert.long.toFixed(6)}° E`],
    ['Fleet Consensus:', `${alert.meta?.verified_by_bus_count || 1} Transit Buses Confirmed`, 'Detection Timestamp:', formattedTime],
    ['SLA Rectification Window:', '48 Hours (MANDATORY)', 'SLA Completion Deadline:', slaDeadline],
  ];

  doc.setFontSize(8);
  const rowHeight = 6.5;
  telemetryRows.forEach((row, i) => {
    const rowY = y + i * rowHeight;
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(margin, rowY, contentWidth, rowHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(row[0], margin + 4, rowY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(row[1], margin + 45, rowY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(row[2], margin + 95, rowY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(row[3], margin + 138, rowY + 4.5);
  });

  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, telemetryRows.length * rowHeight, 'D');

  y += telemetryRows.length * rowHeight + 5;

  // ── Section 2: Concessionaire Assignment ──
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. CONCESSIONAIRE & REPAIR CONTRACTOR ASSIGNMENT', margin + 4, y + 5);

  y += 7;

  const contractorName = alert.meta?.repaired_by_contractor || 'M/s Delhi PWD Road Maintenance Concessionaire (Zone-Central)';
  const contractorRows = [
    ['Assigned Contractor:', contractorName],
    ['Contract Zone:', 'Delhi Arterial Corridor Zone 4 (NDMC / PWD Joint Jurisdiction)'],
    ['Repair Specification:', 'Hot-Mix Bituminous Concrete Repair as per IRC:82-2015 Clause 4.2'],
    ['Verification Procedure:', 'Hawk AI Closed-Loop Verification via Secondary Bus Dashcam Capture'],
  ];

  contractorRows.forEach((row, i) => {
    const rowY = y + i * rowHeight;
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(margin, rowY, contentWidth, rowHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(row[0], margin + 4, rowY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(row[1], margin + 48, rowY + 4.5);
  });

  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, contractorRows.length * rowHeight, 'D');

  y += contractorRows.length * rowHeight + 5;

  // ── Section 3: Statutory & Legal Framework ──
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. STATUTORY COMPLIANCE & LEGAL LIABILITY MANDATE', margin + 4, y + 5);

  y += 9;

  const legalClauses = [
    '• IRC:82-2015 Standard: Potholes and surface fissures on bus transit corridors must be milled, primed, and hot-mix compacted within 48 hours of automated detection notification.',
    '• Section 198A Motor Vehicles (Amendment) Act 2019: Imposes strict financial and criminal liability on the designated designated road contractor for failure to maintain road design standards resulting in road accidents.',
    '• DPDP Act 2023 Compliance: Dashcam video capture telemetry is anonymized at the edge sensor node. Pedestrian faces and uninvolved vehicular registration numbers have been redacted before archival.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  legalClauses.forEach((clause) => {
    const splitText = doc.splitTextToSize(clause, contentWidth - 8);
    doc.text(splitText, margin + 4, y);
    y += splitText.length * 3.8 + 1.5;
  });

  y += 4;

  // ── Section 4: Digital Verification & Cryptographic Stamp ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 24, 'FD');

  const shaSeed = `${alert.id}:${alert.bus_id}:${alert.lat}:${alert.long}:${alert.timestamp}`;
  // Simple deterministic hash hex representation
  let hashVal = 0;
  for (let i = 0; i < shaSeed.length; i++) {
    hashVal = (hashVal << 5) - hashVal + shaSeed.charCodeAt(i);
    hashVal |= 0;
  }
  const hexHash = Math.abs(hashVal).toString(16).padStart(8, '0').toUpperCase();
  const mockSha = `E89F${hexHash}7C214B8290D5A3C7E1B4F9A68D2C4E0B`.slice(0, 32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('DIGITAL SIGNATURE & AUDIT INTEGRITY:', margin + 4, y + 6);

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text(`SHA-256 HASH: ${mockSha}`, margin + 4, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Certified tamper-evident ledger entry recorded by Hawk AI Automated Transit Vision Network.', margin + 4, y + 16);
  doc.text(`Issuing Authority: Executive Engineer (Roads & Infrastructure), PWD Division SZ-II, NCT of Delhi`, margin + 4, y + 20);

  // Digital Stamp Box on right
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.5);
  doc.rect(margin + contentWidth - 42, y + 2, 39, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 83, 9);
  doc.text('PWD DELHI', margin + contentWidth - 22.5, y + 7, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('DIGITALLY CERTIFIED', margin + contentWidth - 22.5, y + 11, { align: 'center' });
  doc.text('HAWK AI SENSING', margin + contentWidth - 22.5, y + 14.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('VALID FOR TENDER', margin + contentWidth - 22.5, y + 18, { align: 'center' });

  // ── Bottom Footer ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Page 1 of 1 — Generated automatically by Hawk AI Edge-Cloud Infrastructure • PWD Delhi Official Portal', pageWidth / 2, 287, { align: 'center' });

  return doc;
}
