import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEnvelope } from '@/lib/docusign/client';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function generateDrawingApprovalPdf(drawing: any, project: any, items: any[]): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let y = height - 50;

  const text = (t: string, x: number, yPos: number, size = 11, f = font, color = rgb(0, 0, 0)) =>
    page.drawText(t, { x, y: yPos, size, font: f, color });

  // Header bar
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.1, 0.3, 0.7) });
  text('CONCEPT 5 KITCHEN & WOOD INDUSTRIES', margin, height - 30, 14, bold, rgb(1, 1, 1));
  text('Shop Drawing Approval Request', margin, height - 55, 11, font, rgb(0.8, 0.9, 1));
  y = height - 110;

  // Drawing info block
  text('Drawing Number:', margin, y, 10, font, rgb(0.4, 0.4, 0.4));
  text(drawing.drawing_number || '—', margin + 130, y, 11, bold);
  y -= 20;

  text('Drawing Title:', margin, y, 10, font, rgb(0.4, 0.4, 0.4));
  text(drawing.title || '—', margin + 130, y, 11, bold);
  y -= 20;

  text('Project:', margin, y, 10, font, rgb(0.4, 0.4, 0.4));
  text(`${project.project_code} – ${project.name}`, margin + 130, y, 11, bold);
  y -= 20;

  text('Date Issued:', margin, y, 10, font, rgb(0.4, 0.4, 0.4));
  text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), margin + 130, y, 11, font);
  y -= 35;

  // Divider
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 25;

  // Instruction text
  text('Please review and sign below to approve the following scope of work for fabrication.', margin, y, 10, font, rgb(0.3, 0.3, 0.3));
  y -= 30;

  // Items table header
  page.drawRectangle({ x: margin, y: y - 5, width: width - margin * 2, height: 22, color: rgb(0.93, 0.95, 0.98) });
  text('Item Code', margin + 5, y + 4, 9, bold);
  text('Description', margin + 100, y + 4, 9, bold);
  text('Room', margin + 360, y + 4, 9, bold);
  text('Floor', margin + 430, y + 4, 9, bold);
  y -= 22;

  // Items
  for (const item of items.slice(0, 25)) {
    const pi = item.project_items || item;
    text(pi.item_code || '—', margin + 5, y, 9, font);
    const desc = (pi.description || '—').slice(0, 48);
    text(desc, margin + 100, y, 9, font);
    text(pi.room_code || '—', margin + 360, y, 9, font);
    text(pi.floor_code || '—', margin + 430, y, 9, font);
    y -= 16;
    if (y < 150) break;
  }

  if (items.length > 25) {
    y -= 5;
    text(`… and ${items.length - 25} more items`, margin + 5, y, 9, font, rgb(0.5, 0.5, 0.5));
    y -= 16;
  }

  // Signature block
  y = Math.min(y - 20, 180);
  page.drawLine({ start: { x: margin, y: y + 40 }, end: { x: width - margin, y: y + 40 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  text('By signing below, I confirm I have reviewed and approve the above drawings for production.', margin, y + 25, 9, font, rgb(0.4, 0.4, 0.4));

  page.drawLine({ start: { x: margin, y: y - 10 }, end: { x: margin + 200, y: y - 10 }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
  text('Client Signature', margin, y - 22, 8, font, rgb(0.5, 0.5, 0.5));

  page.drawLine({ start: { x: margin + 250, y: y - 10 }, end: { x: margin + 400, y: y - 10 }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
  text('Date', margin + 250, y - 22, 8, font, rgb(0.5, 0.5, 0.5));

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes).toString('base64');
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { drawingId, signerEmail, signerName } = body;

    if (!drawingId || !signerEmail || !signerName) {
      return NextResponse.json({ error: 'Missing required fields: drawingId, signerEmail, signerName' }, { status: 400 });
    }

    if (!process.env.DOCUSIGN_INTEGRATION_KEY || !process.env.DOCUSIGN_USER_ID || !process.env.DOCUSIGN_ACCOUNT_ID) {
      return NextResponse.json({ error: 'DocuSign is not configured' }, { status: 500 });
    }

    // 1. Fetch drawing + project + items
    const { data: drawing, error: drawingError } = await supabase
      .from('drawing_requirements')
      .select(`*, projects(id, project_code, name, clients(name, email))`)
      .eq('id', drawingId)
      .single();

    if (drawingError || !drawing) {
      return NextResponse.json({ error: 'Drawing not found' }, { status: 404 });
    }

    const { data: drawingItems } = await supabase
      .from('drawing_requirement_items')
      .select(`*, project_items(item_code, description, room_code, floor_code)`)
      .eq('drawing_requirement_id', drawingId);

    // 2. Generate approval PDF
    let pdfBase64: string;
    try {
      pdfBase64 = await generateDrawingApprovalPdf(drawing, drawing.projects, drawingItems || []);
    } catch (pdfErr: any) {
      return NextResponse.json({ error: `PDF generation failed: ${pdfErr.message}` }, { status: 500 });
    }

    // 3. Send DocuSign envelope
    let envelopeId: string;
    try {
      envelopeId = await sendEnvelope({
        signerEmail,
        signerName,
        docBase64: pdfBase64,
        docName: `Drawing_${drawing.drawing_number || drawingId}.pdf`,
        docExtension: 'pdf',
        emailSubject: `Please approve shop drawing: ${drawing.title} (${drawing.drawing_number})`,
        webhookUrl: process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/docusign/webhook`
          : undefined,
      });
    } catch (dsErr: any) {
      return NextResponse.json({ error: `DocuSign error: ${dsErr.message}` }, { status: 500 });
    }

    // 4. Update drawing with envelope ID and status
    await supabase
      .from('drawing_requirements')
      .update({
        docusign_envelope_id: envelopeId,
        docusign_status: 'sent',
        status: 'waiting_client_approval',
        updated_at: new Date().toISOString(),
      })
      .eq('id', drawingId);

    return NextResponse.json({ success: true, envelopeId });

  } catch (error: any) {
    console.error('Unhandled error in send-drawing route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
