import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function generateDrawingApprovalPdf(projectId: string): Promise<string> {
  // 1. Fetch Project and Drawings
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(*),
      drawings:drawing_requirements(*)
    `)
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    throw new Error(`Failed to fetch project: ${projectError?.message}`);
  }

  // 2. Create PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 40;
  const margin = 40;

  // Header
  page.drawText('SHOP DRAWINGS FOR APPROVAL', { x: margin, y, size: 18, font: boldFont });
  y -= 30;

  page.drawText(`Project: ${project.name}`, { x: margin, y, size: 12, font: boldFont });
  y -= 18;
  
  page.drawText(`Client: ${project.client?.name || 'N/A'}`, { x: margin, y, size: 11, font });
  y -= 18;
  
  page.drawText(`Address: ${project.site_address || 'N/A'}`, { x: margin, y, size: 11, font });
  y -= 18;
  
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: margin, y, size: 11, font });
  y -= 28;

  page.drawText('The following drawings require your approval before we proceed to production:', 
    { x: margin, y, size: 11, font });
  y -= 24;

  // Drawings List
  const drawings = project.drawings || [];
  const rowHeight = 35;

  for (let i = 0; i < drawings.length; i++) {
    const drawing = drawings[i];

    // Check page break
    if (y < 100) {
      const newPage = pdfDoc.addPage([595, 842]);
      y = height - 40;
    }

    // Drawing number and title
    page.drawText(`${i + 1}. ${drawing.drawing_number || `DRW-${i + 1}`}: ${drawing.title || 'Drawing'}`, 
      { x: margin, y, size: 11, font: boldFont });
    y -= 18;

    // Details
    const details = [
      `Type: ${drawing.type_code || 'N/A'}`,
      `Location: Floor ${drawing.floor_code || 'N/A'}, Room ${drawing.room_code || 'N/A'}`,
      `Status: ${drawing.status || 'Pending'}`,
      `Due: ${drawing.due_date ? new Date(drawing.due_date).toLocaleDateString() : 'N/A'}`
    ];

    for (const detail of details) {
      page.drawText(detail, { x: margin + 15, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 12;
    }

    // Checkbox
    page.drawRectangle({
      x: margin,
      y: y - 20,
      width: 12,
      height: 12,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    page.drawText('Approved', { x: margin + 20, y: y - 18, size: 9, font });

    y -= 30;
  }

  // Signature section
  y -= 20;
  page.drawText('Client Signoff', { x: margin, y, size: 12, font: boldFont });
  y -= 5;
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + 250, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawText('_______________________________', { x: margin, y: y - 2, size: 10, font });

  y -= 25;
  page.drawText(`Date: ________________`, { x: margin, y, size: 10, font });

  // Add invisible anchor for DocuSign
  page.drawText('DrawingApprovalSignHere', { 
    x: margin + 50, 
    y: y - 40, 
    size: 8, 
    font, 
    color: rgb(1, 1, 1) // Invisible
  });

  // Serialize to Base64
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString('base64');
}
