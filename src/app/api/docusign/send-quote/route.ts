import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEnvelope } from '@/lib/docusign/client';
import { generateQuotePdf } from '@/lib/pdf/generate-quote';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Consider switching to service role key if auth allows
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { quoteId, signerEmail, signerName } = await req.json();

    if (!quoteId || !signerEmail || !signerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Generate PDF
    const pdfBase64 = await generateQuotePdf(quoteId);

    // 2. Send DocuSign envelope via REST API
    const envelopeId = await sendEnvelope({
      signerEmail,
      signerName,
      docBase64: pdfBase64,
      docName: `Quote_${quoteId}.pdf`,
      docExtension: 'pdf',
      emailSubject: 'Please sign your quote from C5 OS'
    });

    // 5. Update Database
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        docusign_envelope_id: envelopeId,
        docusign_status: 'sent'
      })
      .eq('id', quoteId);

    if (updateError) {
      console.error('Failed to update quote status:', updateError);
      // We don't rollback DocuSign here, just log error. Ideally retry or queue.
    }

    return NextResponse.json({ 
      success: true, 
      envelopeId,
      status: 'sent' 
    });

  } catch (error: any) {
    console.error('Error sending quote via DocuSign:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
