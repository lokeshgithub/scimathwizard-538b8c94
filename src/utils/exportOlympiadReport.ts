import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OlympiadQuestionResult } from '@/hooks/useOlympiadTest';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

const getExamTypeLabel = (type: string) => {
  switch (type) {
    case 'foundation': return 'Foundation Olympiad';
    case 'regional': return 'Regional Olympiad';
    case 'national': return 'National Olympiad';
    default: return 'Olympiad Test';
  }
};

interface OlympiadReportData {
  results: {
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    totalTimeSeconds: number;
    avgTimePerQuestion: number;
    byDifficulty: {
      easy: { correct: number; total: number };
      medium: { correct: number; total: number };
      hard: { correct: number; total: number };
    };
    byTopic: Record<string, { correct: number; total: number }>;
    rank: string;
    medal: string;
    medalEmoji: string;
    examType: string;
  };
  questionResults?: OlympiadQuestionResult[];
  studentName?: string;
  subject?: string;
}

// Medal/rank banner colors
const rankColors: Record<string, [number, number, number]> = {
  Gold: [212, 175, 55],
  Silver: [148, 163, 184],
  Bronze: [205, 127, 50],
  Merit: [99, 102, 241],
  Participant: [107, 114, 128],
};

export const exportOlympiadResultsToPdf = (data: OlympiadReportData) => {
  const { results, questionResults, studentName, subject } = data;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 0;

  const bannerColor = rankColors[results.medal] || [99, 102, 241];

  // ── Header banner ──
  doc.setFillColor(...bannerColor);
  doc.rect(0, 0, pageWidth, 55, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(`${results.medalEmoji}  ${results.rank}`, margin, 24);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(getExamTypeLabel(results.examType), margin, 36);

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.setFontSize(10);
  doc.text(dateStr, margin, 47);

  if (studentName) {
    doc.text(`Student: ${studentName}`, pageWidth - margin - doc.getTextWidth(`Student: ${studentName}`), 47);
  }

  y = 65;

  // ── Score Summary ──
  const statsData = [
    { label: 'Score', value: `${results.correctAnswers}/${results.totalQuestions}` },
    { label: 'Accuracy', value: `${results.accuracy}%` },
    { label: 'Total Time', value: formatTime(results.totalTimeSeconds) },
    { label: 'Avg/Question', value: `${results.avgTimePerQuestion}s` },
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

  y += 34;

  // ── Performance by Difficulty ──
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance by Difficulty', margin, y);
  y += 3;

  const diffRows = (['easy', 'medium', 'hard'] as const).map(d => {
    const dd = results.byDifficulty[d];
    const pct = dd.total > 0 ? Math.round((dd.correct / dd.total) * 100) : 0;
    return [d.charAt(0).toUpperCase() + d.slice(1), `${dd.correct}/${dd.total}`, `${pct}%`];
  });

  autoTable(doc, {
    startY: y,
    head: [['Difficulty', 'Correct', 'Accuracy']],
    body: diffRows,
    margin: { left: margin, right: margin },
    headStyles: { fillColor: bannerColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 10 },
    bodyStyles: { halign: 'center', fontSize: 10 },
    columnStyles: { 0: { halign: 'left' } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // ── Performance by Topic ──
  const topicEntries = Object.entries(results.byTopic).sort((a, b) => {
    const pctA = a[1].total > 0 ? a[1].correct / a[1].total : 0;
    const pctB = b[1].total > 0 ? b[1].correct / b[1].total : 0;
    return pctB - pctA;
  });

  if (topicEntries.length > 0) {
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance by Topic', margin, y);
    y += 3;

    const topicRows = topicEntries.map(([topic, d]) => {
      const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
      const status = pct >= 70 ? '✓ Strong' : pct >= 40 ? '→ Average' : '⚠ Weak';
      return [topic.replace(/_/g, ' '), `${d.correct}/${d.total}`, `${pct}%`, status];
    });

    autoTable(doc, {
      startY: y,
      head: [['Topic', 'Correct', 'Accuracy', 'Status']],
      body: topicRows,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: bannerColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 9 },
      bodyStyles: { halign: 'center', fontSize: 9 },
      columnStyles: { 0: { halign: 'left' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Question-by-Question Review ──
  if (questionResults && questionResults.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Question Paper Review', margin, y);
    y += 3;

    const qRows = questionResults.map((qr, i) => [
      `${i + 1}`,
      qr.question.question.length > 60 ? qr.question.question.substring(0, 57) + '...' : qr.question.question,
      qr.difficulty.charAt(0).toUpperCase() + qr.difficulty.slice(1),
      String.fromCharCode(65 + qr.selectedAnswer),
      String.fromCharCode(65 + qr.correctAnswer),
      qr.isCorrect ? '✓' : '✗',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Question', 'Difficulty', 'Your Ans', 'Correct', 'Result']],
      body: qRows,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: bannerColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 8 },
      bodyStyles: { halign: 'center', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { halign: 'left', cellWidth: 80 },
        5: { cellWidth: 14 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === '✓') {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
  }

  // ── Footer ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Generated by SciMath Wizard  •  Olympiad Test Report',
      pageWidth / 2, footerY, { align: 'center' }
    );
  }

  // Save
  const examLabel = results.examType || 'olympiad';
  const fileName = `olympiad-${examLabel}-${subject || 'test'}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
