import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseStringPromise } from 'xml2js';
import { convertQuoteToProject } from '@/lib/projects/convert-quote';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let payload;
    let envelopeId;
    let status;

    // Determine format: JSON or XML
    if (rawBody.trim().startsWith('{')) {
      // Assume JSON
      payload = JSON.parse(rawBody);
      // DocuSign Connect JSON structure varies, but typically:
      envelopeId = payload.envelopeId || payload.data?.envelopeId;
      status = payload.status || payload.data?.status;
    } else {
      // Assume XML (Default DocuSign Connect)
      const xml = await parseStringPromise(rawBody, { explicitArray: false });
      // Typical XML path: DocuSignEnvelopeInformation -> EnvelopeStatus -> EnvelopeID
      const envInfo = xml.DocuSignEnvelopeInformation || xml.EnvelopeStatus;
      const envStatus = envInfo?.EnvelopeStatus || envInfo;
      
      if (envStatus) {
        envelopeId = envStatus.EnvelopeID;
        status = envStatus.Status;
      }
    }

    console.log(`DocuSign Webhook: Envelope ${envelopeId}, Status ${status}`);

    if (!envelopeId || !status) {
      console.warn('DocuSign Webhook: Could not parse envelope ID or status');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Update Quote status
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (quoteError || !quote) {
      console.error(`DocuSign Webhook: Quote not found for envelope ${envelopeId}`);
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Update DocuSign status on quote
    await supabase
      .from('quotes')
      .update({ docusign_status: status })
      .eq('id', quote.id);

    // If completed (signed), trigger conversion
    if (status === 'completed' || status === 'Completed') {
      console.log(`DocuSign Webhook: Converting quote ${quote.id} to project...`);
      await convertQuoteToProject(quote.id);
      console.log(`DocuSign Webhook: Successfully converted quote ${quote.id}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DocuSign Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
