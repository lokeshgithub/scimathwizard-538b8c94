import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { StoredReport } from '@/services/reportService';

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

const formatName = (name: string) =>
  name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

interface AggregatedData {
  totalQuestions: number;
  totalCorrect: number;
  overallAccuracy: number;
  totalTimeSeconds: number;
  avgTimePerQuestion: number;
  totalStars: number;
  bestStreak: number;
  sessionsCount: number;
  topicSummary: Record<string, { attempted: number; correct: number; accuracy: number; avgTime: number }>;
  strengths: string[];
  weaknesses: string[];
}

/**
 * Export aggregated report data (from /report page) to PDF.
 * Works with stored DB reports so users can always re-download.
 */
export const exportAggregatedReportToPdf = (
  aggregated: AggregatedData,
  subject: string,
  studentName?: string,
  filterLabel?: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 0;

  // ── Header banner ──
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 50, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('📊 Performance Report', margin, 22);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.text(dateStr, margin, 34);

  if (studentName) {
    doc.text(`Student: ${studentName}`, margin, 44);
  }
  if (filterLabel) {
    const filterX = studentName
      ? pageWidth - margin - doc.getTextWidth(filterLabel)
      : margin;
    const filterY = studentName ? 44 : 44;
    doc.text(filterLabel, filterX, filterY);
  }

  y = 58;

  // ── Quick Stats Row ──
  const statsData = [
    { label: 'Questions', value: `${aggregated.totalQuestions}` },
    { label: 'Accuracy', value: `${Math.round(aggregated.overallAccuracy * 100)}%` },
    { label: 'Avg Time', value: formatTime(aggregated.avgTimePerQuestion) },
    { label: 'Stars', value: `${aggregated.totalStars}` },
    { label: 'Sessions', value: `${aggregated.sessionsCount}` },
  ];

  const statWidth = (pageWidth - margin * 2) / statsData.length;
  statsData.forEach((s, i) => {
    const x = margin + i * statWidth;
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(x + 1, y, statWidth - 2, 24, 2, 2, 'F');
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(s.value, x + statWidth / 2, y + 11, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(s.label, x + statWidth / 2, y + 20, { align: 'center' });
  });

  y += 32;

  // ── Performance Grade ──
  const acc = aggregated.overallAccuracy;
  let grade = 'Needs Practice';
  let gradeColor: [number, number, number] = [239, 68, 68];
  if (acc >= 0.9) { grade = 'Excellent!'; gradeColor = [34, 197, 94]; }
  else if (acc >= 0.8) { grade = 'Great Job!'; gradeColor = [34, 197, 94]; }
  else if (acc >= 0.7) { grade = 'Good Progress'; gradeColor = [245, 158, 11]; }
  else if (acc >= 0.6) { grade = 'Keep Practicing'; gradeColor = [245, 158, 11]; }

  doc.setFillColor(...gradeColor);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Performance: ${grade}`, pageWidth / 2, y + 11, { align: 'center' });

  y += 24;
  doc.setTextColor(30, 30, 30);

  // ── Topic Performance Table ──
  const topicEntries = Object.entries(aggregated.topicSummary).sort(
    (a, b) => b[1].accuracy - a[1].accuracy
  );

  if (topicEntries.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Topic Performance', margin, y);
    y += 3;

    const topicRows = topicEntries.map(([topic, d]) => {
      const pct = Math.round(d.accuracy * 100);
      const status = pct >= 80 ? '💪 Strong' : pct >= 60 ? '➡️ Average' : '📚 Practice';
      return [formatName(topic), `${d.attempted}`, `${d.correct}`, `${pct}%`, formatTime(d.avgTime), status];
    });

    autoTable(doc, {
      startY: y,
      head: [['Topic', 'Questions', 'Correct', 'Accuracy', 'Avg Time', 'Status']],
      body: topicRows,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 9 },
      bodyStyles: { halign: 'center', fontSize: 9 },
      columnStyles: { 0: { halign: 'left' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Strengths & Weaknesses ──
  if (aggregated.strengths.length > 0 || aggregated.weaknesses.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Analysis', margin, y);
    y += 10;

    const boxWidth = (pageWidth - margin * 2 - 10) / 2;

    if (aggregated.strengths.length > 0) {
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(margin, y - 3, boxWidth, 36, 2, 2, 'F');
      doc.setTextColor(22, 101, 52);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('💪 Strengths', margin + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const text = aggregated.strengths.map(formatName).join(', ');
      const lines = doc.splitTextToSize(text, boxWidth - 8);
      doc.text(lines, margin + 4, y + 15);
    }

    if (aggregated.weaknesses.length > 0) {
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(margin + boxWidth + 10, y - 3, boxWidth, 36, 2, 2, 'F');
      doc.setTextColor(153, 27, 27);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('📚 Areas to Improve', margin + boxWidth + 14, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const text = aggregated.weaknesses.map(formatName).join(', ');
      const lines = doc.splitTextToSize(text, boxWidth - 8);
      doc.text(lines, margin + boxWidth + 14, y + 15);
    }

    y += 44;
  }

  // ── Summary stats ──
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Time: ${formatTime(aggregated.totalTimeSeconds)}`, margin, y);
  doc.text(`Best Streak: ${aggregated.bestStreak}`, margin + 80, y);
  doc.text(`Total Stars: ${aggregated.totalStars} ⭐`, margin + 140, y);

  // ── Footer on all pages ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Generated by Magic Mastery Quiz  •  Performance Report',
      pageWidth / 2, footerY, { align: 'center' }
    );
  }

  const subjectLabel = subject === 'all' ? 'all-subjects' : subject;
  const fileName = `performance-report-${subjectLabel}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
