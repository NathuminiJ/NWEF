import PDFDocument from 'pdfkit';
import { config } from './config';
import { formatMoney } from './utils';

export interface AwardLetterInput {
  referenceNo: string;
  guardianName: string;
  childName: string;
  school: string;
  amount: string | number;
  currency?: string;
  issuedAt?: Date;
  acceptedBy?: string;
}

/** Generates the official award letter as a PDF buffer. */
export function generateAwardLetter(input: AwardLetterInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const issuedAt = input.issuedAt ?? new Date();
    doc.fontSize(18).text(config.appName, { align: 'center' });
    doc.moveDown(0.5).fontSize(10).text('Eng. Nahil Wijesuriya Endowment Fund', { align: 'center' });
    doc.moveTo(56, doc.y + 12).lineTo(539, doc.y + 12).stroke();
    doc.moveDown(1.5);

    doc.fontSize(11).text(issuedAt.toDateString());
    doc.text(`Reference: ${input.referenceNo}`);
    doc.moveDown(1);
    doc.text(`Dear ${input.guardianName},`);
    doc.moveDown(1);
    doc.text(
      `The Trust Board is pleased to offer a scholarship award for ${input.childName} of ${input.school}. ` +
        `The approved award is ${formatMoney(input.amount, input.currency ?? config.business.currency)}, ` +
        'payable in instalments against Trinity College fee invoices subject to the Fund regulations and annual renewal.',
    );
    doc.moveDown(1);
    doc.text('Please sign and upload this letter in the portal to accept the award. Acceptance must be completed before payments commence.');
    doc.moveDown(2);
    doc.text(config.pdf.signatoryName);
    doc.text('For and on behalf of the NWEF Trust Board');
    if (input.acceptedBy) {
      doc.moveDown(2).text(`Accepted electronically by: ${input.acceptedBy}`);
    }
    doc.end();
  });
}
