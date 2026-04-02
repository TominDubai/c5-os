import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface BOQItem {
  item_code: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export async function generateBOQPdf(projectId: string): Promise<string> {
  // 1. Fetch Project and Items
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(*),
      items:project_items(
        id,
        item_code,
        description,
        quantity,
        unit,
        unit_price,
        total_price
      )
    `)
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    throw new Error(`Failed to fetch project: ${projectError?.message}`);
  }

  // 2. Create PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 40;
  const margin = 40;
  const colWidths = {
    code: 60,
    description: 240,
    qty: 50,
    unit: 50,
    unitPrice: 70,
    total: 70
  };

  // Header Section
  page.drawText('BILL OF QUANTITIES (BOQ)', { x: margin, y, size: 18, font: boldFont });
  y -= 30;

  page.drawText(`Project: ${project.name}`, { x: margin, y, size: 12, font: boldFont });
  y -= 18;
  
  page.drawText(`Client: ${project.client?.name || 'N/A'}`, { x: margin, y, size: 11, font });
  y -= 18;
  
  page.drawText(`Address: ${project.site_address || 'N/A'}`, { x: margin, y, size: 11, font });
  y -= 18;
  
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: margin, y, size: 11, font });
  y -= 28;

  // Table Header
  const headerY = y;
  page.drawText('Code', { x: margin, y, size: 10, font: boldFont });
  page.drawText('Description', { x: margin + colWidths.code, y, size: 10, font: boldFont });
  page.drawText('Qty', { x: margin + colWidths.code + colWidths.description, y, size: 10, font: boldFont });
  page.drawText('Unit', { x: margin + colWidths.code + colWidths.description + colWidths.qty, y, size: 10, font: boldFont });
  page.drawText('Unit Price', { x: margin + colWidths.code + colWidths.description + colWidths.qty + colWidths.unit, y, size: 10, font: boldFont });
  page.drawText('Total', { x: margin + colWidths.code + colWidths.description + colWidths.qty + colWidths.unit + colWidths.unitPrice, y, size: 10, font: boldFont });
  
  y -= 2;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 15;

  // Table Rows
  const items: BOQItem[] = project.items || [];
  let grandTotal = 0;
  const rowHeight = 25;

  for (const item of items) {
    // Check if we need a new page
    if (y < 60) {
      const newPage = pdfDoc.addPage([595, 842]);
      y = height - 40;
    }

    const itemTotal = item.total_price || 0;
    grandTotal += itemTotal;

    // Wrap description if needed
    const descParts = wrapText(item.description || 'Item', font, 9, colWidths.description - 5);
    const itemY = y;

    // Draw code
    page.drawText(item.item_code || '', { x: margin, y, size: 9, font });

    // Draw description (may wrap)
    let descY = itemY;
    for (const part of descParts) {
      page.drawText(part, { x: margin + colWidths.code + 5, y: descY, size: 9, font });
      descY -= 11;
    }

    // Draw quantity, unit, prices on first line
    page.drawText(item.quantity?.toString() || '0', { 
      x: margin + colWidths.code + colWidths.description, 
      y: itemY, 
      size: 9, 
      font 
    });

    page.drawText(item.unit || '', { 
      x: margin + colWidths.code + colWidths.description + colWidths.qty, 
      y: itemY, 
      size: 9, 
      font 
    });

    page.drawText(`$${(item.unit_price || 0).toFixed(2)}`, { 
      x: margin + colWidths.code + colWidths.description + colWidths.qty + colWidths.unit, 
      y: itemY, 
      size: 9, 
      font 
    });

    page.drawText(`$${itemTotal.toFixed(2)}`, { 
      x: margin + colWidths.code + colWidths.description + colWidths.qty + colWidths.unit + colWidths.unitPrice, 
      y: itemY, 
      size: 9, 
      font: boldFont 
    });

    y -= rowHeight;
  }

  // Total Line
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 18;

  page.drawText('TOTAL PROJECT VALUE:', { 
    x: margin + colWidths.code + colWidths.description + colWidths.qty + colWidths.unit, 
    y, 
    size: 11, 
    font: boldFont 
  });
  page.drawText(`$${grandTotal.toFixed(2)}`, { 
    x: margin + colWidths.code + colWidths.description + colWidths.qty + colWidths.unit + colWidths.unitPrice, 
    y, 
    size: 11, 
    font: boldFont 
  });

  // Footer / Signature Area
  y -= 60;
  page.drawText('Client Approval:', { x: margin, y, size: 11, font: boldFont });
  y -= 5;
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + 200, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawText('_______________________', { x: margin, y: y - 2, size: 10, font });

  // Add invisible anchor for DocuSign
  page.drawText('BOQSignHere', { 
    x: margin + 50, 
    y: y - 15, 
    size: 8, 
    font, 
    color: rgb(1, 1, 1) // Invisible
  });

  // Serialize to Base64
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString('base64');
}

/**
 * Helper function to wrap text to fit within a width
 */
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    // Rough estimate: average char width is about 0.5 * fontSize
    const estimatedWidth = testLine.length * fontSize * 0.5;
    
    if (estimatedWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
