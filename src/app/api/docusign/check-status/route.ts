import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnvelopeStatus } from '@/lib/docusign/client';
import { convertQuoteToProject } from '@/lib/projects/convert-quote';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { quoteId } = await req.json();
    if (!quoteId) return NextResponse.json({ error: 'Missing quoteId' }, { status: 400 });

    const { data: quote } = await supabase
      .from('quotes')
      .select('id, quote_number, docusign_envelope_id, docusign_status')
      .eq('id', quoteId)
      .single();

    if (!quote?.docusign_envelope_id) {
      return NextResponse.json({ error: 'No envelope found for this quote' }, { status: 404 });
    }

    // Fetch current status from DocuSign
    const envelope = await getEnvelopeStatus(quote.docusign_envelope_id);
    const newStatus = envelope.status?.toLowerCase();

    // Update quote
    await supabase
      .from('quotes')
      .update({ docusign_status: newStatus })
      .eq('id', quoteId);

    // If completed and not already converted, trigger project conversion
    if (newStatus === 'completed' && quote.docusign_status !== 'completed') {
      await convertQuoteToProject(quoteId);
    }

    return NextResponse.json({ status: newStatus });
  } catch (error: any) {
    console.error('check-status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
