import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEnvelope } from '@/lib/docusign/client';
import { generateQuotePdf } from '@/lib/pdf/generate-quote';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { quoteId, signerEmail, signerName } = body

    if (!quoteId || !signerEmail || !signerName) {
      return NextResponse.json({ error: 'Missing required fields: quoteId, signerEmail, signerName' }, { status: 400 });
    }

    // Check DocuSign env vars are set
    if (!process.env.DOCUSIGN_INTEGRATION_KEY || !process.env.DOCUSIGN_USER_ID || !process.env.DOCUSIGN_ACCOUNT_ID) {
      return NextResponse.json({ error: 'DocuSign is not configured. Set DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID and DOCUSIGN_ACCOUNT_ID in your .env.local' }, { status: 500 });
    }

    // 1. Generate PDF
    let pdfBase64: string
    try {
      pdfBase64 = await generateQuotePdf(quoteId)
    } catch (pdfErr: any) {
      console.error('PDF generation failed:', pdfErr)
      return NextResponse.json({ error: `PDF generation failed: ${pdfErr.message}` }, { status: 500 })
    }

    // 2. Send DocuSign envelope via REST API
    let envelopeId: string
    try {
      envelopeId = await sendEnvelope({
        signerEmail,
        signerName,
        docBase64: pdfBase64,
        docName: `Quote_${quoteId}.pdf`,
        docExtension: 'pdf',
        emailSubject: 'Please sign your quote from C5 OS',
        webhookUrl: process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/docusign/webhook`
          : undefined,
      })
    } catch (dsErr: any) {
      console.error('DocuSign send failed:', dsErr)
      return NextResponse.json({ error: `DocuSign error: ${dsErr.message}` }, { status: 500 })
    }

    // 3. Update Database
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        docusign_envelope_id: envelopeId,
        docusign_status: 'sent'
      })
      .eq('id', quoteId);

    if (updateError) {
      console.error('Failed to update quote status:', updateError);
    }

    return NextResponse.json({ 
      success: true, 
      envelopeId,
      status: 'sent' 
    });

  } catch (error: any) {
    console.error('Unhandled error in send-quote route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
