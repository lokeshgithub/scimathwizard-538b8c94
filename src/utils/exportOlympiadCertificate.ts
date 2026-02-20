import jsPDF from 'jspdf';

export interface OlympiadCertificateData {
  studentName: string;
  medal: string;       // "Gold" | "Silver"
  medalEmoji: string;
  rank: string;
  examType: string;
  subject: string;
  accuracy: number;
  correctAnswers: number;
  totalQuestions: number;
  date: Date;
}

const medalThemes: Record<string, { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number]; bg: [number, number, number] }> = {
  Gold: {
    primary: [180, 135, 25],
    secondary: [212, 175, 55],
    accent: [245, 215, 110],
    bg: [255, 252, 240],
  },
  Silver: {
    primary: [80, 90, 110],
    secondary: [148, 163, 184],
    accent: [200, 210, 225],
    bg: [248, 250, 255],
  },
};

const getExamTypeLabel = (type: string) => {
  switch (type) {
    case 'foundation': return 'Foundation Olympiad';
    case 'regional': return 'Regional Olympiad';
    case 'national': return 'National Olympiad';
    default: return 'Olympiad Test';
  }
};

export const exportOlympiadCertificateToPdf = (data: OlympiadCertificateData) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  const theme = medalThemes[data.medal] || medalThemes.Gold;

  // Background
  doc.setFillColor(...theme.bg);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer decorative border
  doc.setDrawColor(...theme.primary);
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Inner decorative border
  doc.setDrawColor(...theme.secondary);
  doc.setLineWidth(1);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  // Corner ornaments
  doc.setFillColor(...theme.secondary);
  doc.circle(30, 30, 8, 'F');
  doc.circle(pageWidth - 30, 30, 8, 'F');
  doc.circle(30, pageHeight - 30, 8, 'F');
  doc.circle(pageWidth - 30, pageHeight - 30, 8, 'F');

  // Small inner corner circles
  doc.setFillColor(...theme.accent);
  doc.circle(30, 30, 4, 'F');
  doc.circle(pageWidth - 30, 30, 4, 'F');
  doc.circle(30, pageHeight - 30, 4, 'F');
  doc.circle(pageWidth - 30, pageHeight - 30, 4, 'F');

  let yPos = 38;

  // Medal emoji
  doc.setFontSize(44);
  doc.text(data.medalEmoji, centerX, yPos, { align: 'center' });
  yPos += 16;

  // Title
  doc.setTextColor(...theme.primary);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('OLYMPIAD CERTIFICATE', centerX, yPos, { align: 'center' });
  yPos += 10;

  // Subtitle - medal rank
  doc.setTextColor(...theme.secondary);
  doc.setFontSize(18);
  doc.text(`${data.medal} Medal - ${data.rank}`, centerX, yPos, { align: 'center' });
  yPos += 14;

  // Decorative line
  doc.setDrawColor(...theme.primary);
  doc.setLineWidth(1);
  doc.line(centerX - 90, yPos, centerX + 90, yPos);
  yPos += 14;

  // "This is to certify that"
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('This is to certify that', centerX, yPos, { align: 'center' });
  yPos += 12;

  // Student name
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(data.studentName, centerX, yPos, { align: 'center' });
  yPos += 8;

  // Underline
  const nameWidth = doc.getTextWidth(data.studentName);
  doc.setDrawColor(...theme.secondary);
  doc.setLineWidth(0.5);
  doc.line(centerX - nameWidth / 2, yPos, centerX + nameWidth / 2, yPos);
  yPos += 12;

  // Achievement text
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('has been awarded the', centerX, yPos, { align: 'center' });
  yPos += 12;

  // Medal + Exam type
  doc.setTextColor(...theme.primary);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.medal} Medal - ${getExamTypeLabel(data.examType)}`, centerX, yPos, { align: 'center' });
  yPos += 10;

  // Subject
  doc.setTextColor(...theme.secondary);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(`in ${data.subject.charAt(0).toUpperCase() + data.subject.slice(1)}`, centerX, yPos, { align: 'center' });
  yPos += 12;

  // Score line
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(13);
  doc.text(
    `Score: ${data.correctAnswers}/${data.totalQuestions}  •  Accuracy: ${data.accuracy}%`,
    centerX, yPos, { align: 'center' }
  );
  yPos += 15;

  // Motivational message
  doc.setTextColor(...theme.primary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'italic');
  const message = data.medal === 'Gold'
    ? 'Outstanding performance! A true champion in the making!'
    : 'Excellent achievement! Keep striving for greatness!';
  doc.text(message, centerX, yPos, { align: 'center' });
  yPos += 14;

  // Date
  const dateStr = data.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Awarded on ${dateStr}`, centerX, yPos, { align: 'center' });

  // Footer
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(9);
  doc.text('SciMath Wizard - Olympiad Excellence Program', centerX, pageHeight - 25, { align: 'center' });
  doc.text('www.scimathwizard.com', centerX, pageHeight - 20, { align: 'center' });

  const fileName = `olympiad-certificate-${data.medal.toLowerCase()}-${data.subject}-${data.studentName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
