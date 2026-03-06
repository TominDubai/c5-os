import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnvelopeStatus } from '@/lib/docusign/client';
import { convertQuoteToProject } from '@/lib/projects/convert-quote';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find all quotes awaiting signature
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, quote_number, docusign_envelope_id, docusign_status')
    .eq('docusign_status', 'sent')
    .not('docusign_envelope_id', 'is', null);

  if (!quotes || quotes.length === 0) {
    return NextResponse.json({ message: 'No pending envelopes', checked: 0 });
  }

  let updated = 0;

  for (const quote of quotes) {
    try {
      const envelope = await getEnvelopeStatus(quote.docusign_envelope_id);
      const newStatus = envelope.status?.toLowerCase();

      if (newStatus && newStatus !== quote.docusign_status) {
        await supabase
          .from('quotes')
          .update({ docusign_status: newStatus })
          .eq('id', quote.id);

        if (newStatus === 'completed') {
          await convertQuoteToProject(quote.id);
        }

        updated++;
        console.log(`[Cron] Quote ${quote.quote_number}: ${quote.docusign_status} → ${newStatus}`);
      }
    } catch (err: any) {
      console.error(`[Cron] Failed to check quote ${quote.id}:`, err.message);
    }
  }

  return NextResponse.json({ checked: quotes.length, updated });
}
