import { createRequire } from 'node:module';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const require = createRequire(import.meta.url);
const arabicFont = path.join(
  path.dirname(require.resolve('dejavu-fonts-ttf/package.json')),
  'ttf',
  'DejaVuSans.ttf',
);

export type CertificatePdfInput = {
  studentName: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: Date;
  verificationUrl: string;
};

export const renderCertificatePdf = async (input: CertificatePdfInput): Promise<Buffer> => {
  const qr = await QRCode.toBuffer(input.verificationUrl, {
    type: 'png',
    width: 260,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#17324D', light: '#FFFFFF' },
  });
  const document = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
    info: { Title: `Certificate ${input.certificateNumber}`, Author: 'Educational Platform' },
  });
  const chunks: Buffer[] = [];
  document.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });
  const completed = new Promise<Buffer>((resolve, reject) => {
    document.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    document.on('error', reject);
  });

  const width = document.page.width;
  const height = document.page.height;
  document.rect(0, 0, width, height).fill('#F7F2E8');
  document
    .lineWidth(4)
    .strokeColor('#17324D')
    .rect(22, 22, width - 44, height - 44)
    .stroke();
  document
    .lineWidth(1)
    .strokeColor('#C99A3D')
    .rect(33, 33, width - 66, height - 66)
    .stroke();
  document.circle(width / 2, 86, 28).fill('#C99A3D');
  document
    .font('Helvetica-Bold')
    .fillColor('#FFFFFF')
    .fontSize(21)
    .text('EP', width / 2 - 18, 73, {
      width: 36,
      align: 'center',
    });
  document
    .fillColor('#17324D')
    .font('Helvetica-Bold')
    .fontSize(30)
    .text('CERTIFICATE OF COMPLETION', 80, 130, {
      width: width - 160,
      align: 'center',
    });
  document
    .fillColor('#617081')
    .font('Helvetica')
    .fontSize(13)
    .text('This certificate is proudly presented to', 80, 185, {
      width: width - 160,
      align: 'center',
    });
  document
    .font(arabicFont)
    .fillColor('#17324D')
    .fontSize(27)
    .text(input.studentName, 120, 225, {
      width: width - 240,
      align: 'center',
      features: ['rlig', 'calt', 'liga'],
    });
  document
    .moveTo(180, 270)
    .lineTo(width - 180, 270)
    .lineWidth(1)
    .strokeColor('#C99A3D')
    .stroke();
  document
    .font('Helvetica')
    .fillColor('#617081')
    .fontSize(13)
    .text('for successfully completing', 80, 294, {
      width: width - 160,
      align: 'center',
    });
  document
    .font(arabicFont)
    .fillColor('#17324D')
    .fontSize(22)
    .text(input.courseTitle, 130, 330, {
      width: width - 260,
      align: 'center',
      features: ['rlig', 'calt', 'liga'],
    });
  document
    .font('Helvetica')
    .fillColor('#617081')
    .fontSize(10)
    .text(
      `Issued ${input.issuedAt.toISOString().slice(0, 10)}  |  ${input.certificateNumber}`,
      100,
      405,
      { width: width - 200, align: 'center' },
    );
  document.image(qr, width - 142, height - 142, { width: 82, height: 82 });
  document
    .fillColor('#617081')
    .fontSize(7)
    .text('Scan to verify', width - 150, height - 55, {
      width: 98,
      align: 'center',
    });
  document.fontSize(8).text('Educational Platform', 60, height - 75, { width: 180 });
  document.end();
  return completed;
};
