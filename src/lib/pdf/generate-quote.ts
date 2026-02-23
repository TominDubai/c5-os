import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for data fetching
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function generateQuotePdf(quoteId: string): Promise<string> {
  // 1. Fetch Quote Data
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select(`
      *,
      items:quote_items(*)
    `)
    .eq('id', quoteId)
    .single();

  if (quoteError || !quote) {
    throw new Error(`Failed to fetch quote: ${quoteError?.message}`);
  }

  // 2. Create PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;
  const margin = 50;

  // Header
  page.drawText('C5 OS - Quote Approval', { x: margin, y, size: 24, font: boldFont });
  y -= 40;

  page.drawText(`Quote Reference: ${quote.quote_reference || quote.id.slice(0, 8)}`, { x: margin, y, size: 12, font });
  y -= 20;
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: margin, y, size: 12, font });
  y -= 20;
  page.drawText(`Client: ${quote.client_name || 'N/A'}`, { x: margin, y, size: 12, font });
  y -= 40;

  // Items Table Header
  page.drawText('Description', { x: margin, y, size: 12, font: boldFont });
  page.drawText('Amount', { x: width - margin - 100, y, size: 12, font: boldFont });
  y -= 20;

  // Items
  let total = 0;
  for (const item of quote.items || []) {
    const description = item.description || 'Item';
    const amount = item.total_price || 0;
    total += amount;

    // Simple text wrapping or truncation for description
    const descText = description.length > 60 ? description.substring(0, 57) + '...' : description;

    page.drawText(descText, { x: margin, y, size: 10, font });
    page.drawText(`$${amount.toFixed(2)}`, { x: width - margin - 100, y, size: 10, font });
    y -= 20;
  }

  y -= 20;
  // Total
  page.drawText('Total:', { x: width - margin - 150, y, size: 14, font: boldFont });
  page.drawText(`$${total.toFixed(2)}`, { x: width - margin - 80, y, size: 14, font: boldFont });

  // Signature Area
  y -= 100;
  page.drawText('Signature:', { x: margin, y, size: 12, font: boldFont });
  page.drawLine({
    start: { x: margin + 80, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  
  // Add a hidden anchor for DocuSign placement
  // This text "SignHereAnchor" will be white (invisible) so DocuSign can find it
  page.drawText('SignHereAnchor', { 
    x: margin + 100, 
    y: y + 10, 
    size: 8, 
    font, 
    color: rgb(1, 1, 1) // White text on white background
  });

  // Serialize to Base64
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString('base64');
}
