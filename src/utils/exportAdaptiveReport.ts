import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AdaptiveState, TopicPerformance, StudyRecommendation, SkillTier } from '@/types/adaptiveChallenge';

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

interface AdaptiveReportData {
  state: AdaptiveState;
  tier: SkillTier;
  accuracy: number;
  avgTime: number;
  duration: number;
  topicPerformances: TopicPerformance[];
  recommendations: StudyRecommendation[];
  percentile?: number | null;
  estimatedPercentile?: { percentile: number; message: string };
  studentName?: string;
}

export const exportAdaptiveResultsToPdf = (data: AdaptiveReportData) => {
  const {
    state, tier, accuracy, avgTime, duration,
    topicPerformances, recommendations,
    percentile, estimatedPercentile, studentName,
  } = data;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 0;

  // ── Header banner ──
  const tierColors: Record<string, [number, number, number]> = {
    beginner: [148, 163, 184],
    developing: [96, 165, 250],
    proficient: [52, 211, 153],
    advanced: [251, 191, 36],
    elite: [168, 85, 247],
    exceptional: [244, 63, 94],
    genius: [251, 191, 36],
  };
  const bannerColor = tierColors[tier.id] || [99, 102, 241];

  doc.setFillColor(...bannerColor);
  doc.rect(0, 0, pageWidth, 50, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Skill Assessment Report', margin, 22);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.text(dateStr, margin, 35);

  if (studentName) {
    doc.text(`Student: ${studentName}`, margin, 45);
  }

  y = 60;

  // ── Score & Tier ──
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 40, 3, 3, 'F');

  doc.setTextColor(...bannerColor);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text(`${state.finalScore}`, margin + 12, y + 27);

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text('out of 100', margin + 12, y + 35);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${tier.emoji}  ${tier.title}`, margin + 55, y + 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(tier.description, margin + 55, y + 28);

  // Percentile line
  const pctText = percentile != null
    ? `You scored better than ${percentile}% of students`
    : estimatedPercentile
      ? `Top ${100 - estimatedPercentile.percentile}% — ${estimatedPercentile.message}`
      : '';
  if (pctText) {
    doc.setTextColor(...bannerColor);
    doc.setFontSize(9);
    doc.text(pctText, margin + 55, y + 36);
  }

  y += 50;

  // ── Quick Stats Row ──
  const statsData = [
    { label: 'Accuracy', value: `${accuracy}%` },
    { label: 'Max Level', value: `L${state.highestLevelReached}` },
    { label: 'Avg Time', value: `${avgTime}s` },
    { label: 'Duration', value: `${duration}m` },
    { label: 'Questions', value: `${state.totalCorrect}/${state.totalQuestions}` },
  ];

  const statWidth = (pageWidth - margin * 2) / statsData.length;
  statsData.forEach((s, i) => {
    const x = margin + i * statWidth;
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(x + 1, y, statWidth - 2, 22, 2, 2, 'F');
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(s.value, x + statWidth / 2, y + 10, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(s.label, x + statWidth / 2, y + 18, { align: 'center' });
  });

  y += 30;

  // ── Topic Performance Table ──
  if (topicPerformances.length > 0) {
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Topic-wise Performance', margin, y);
    y += 3;

    const tableBody = topicPerformances.map(t => [
      t.topicName,
      `${t.correctAnswers}/${t.questionsAttempted}`,
      `${t.accuracy}%`,
      `${t.averageTime}s`,
      `L${t.lowestLevel}-L${t.highestLevel}`,
      t.isStrength ? '💪 Strong' : t.isWeakness ? '⚠️ Weak' : '➡️ Average',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Topic', 'Correct', 'Accuracy', 'Avg Time', 'Levels', 'Status']],
      body: tableBody,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: bannerColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9,
      },
      bodyStyles: { halign: 'center', fontSize: 9 },
      columnStyles: { 0: { halign: 'left' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Recommendations ──
  if (recommendations.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Personalized Recommendations', margin, y);
    y += 8;

    for (const rec of recommendations) {
      if (y > 255) { doc.addPage(); y = 20; }

      const bgColor: [number, number, number] =
        rec.priority === 'high' ? [254, 226, 226] :
        rec.priority === 'medium' ? [254, 243, 199] :
        [220, 252, 231];

      const textColor: [number, number, number] =
        rec.priority === 'high' ? [153, 27, 27] :
        rec.priority === 'medium' ? [146, 64, 14] :
        [22, 101, 52];

      doc.setFillColor(...bgColor);
      const recLines = doc.splitTextToSize(rec.message, pageWidth - margin * 2 - 10);
      const actionLines = rec.actionItems.map(a => `  •  ${a}`);
      const allActionText = actionLines.join('\n');
      const splitActions = doc.splitTextToSize(allActionText, pageWidth - margin * 2 - 15);
      const boxH = recLines.length * 5 + splitActions.length * 4.5 + 14;

      doc.roundedRect(margin, y - 3, pageWidth - margin * 2, boxH, 2, 2, 'F');

      doc.setTextColor(...textColor);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(recLines, margin + 5, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(splitActions, margin + 8, y + recLines.length * 5 + 8);

      y += boxH + 5;
    }
  }

  // ── What Your Score Means ──
  if (tier.capabilities.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('What Your Score Means', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    for (const cap of tier.capabilities) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(`✓  ${cap}`, margin + 3, y);
      y += 6;
    }
    y += 4;

    doc.setTextColor(...bannerColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const encLines = doc.splitTextToSize(tier.encouragement, pageWidth - margin * 2);
    doc.text(encLines, margin, y);
  }

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated by Magic Mastery Quiz  •  Skill Assessment Report', pageWidth / 2, footerY, { align: 'center' });

  // Save
  const fileName = `skill-assessment-${state.subject}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
