import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEnvelope } from '@/lib/docusign/client';
import { generateBOQPdf } from '@/lib/pdf/generate-boq';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * POST /api/docusign/send-boq
 * 
 * Send BOQ to client for deposit approval via DocuSign
 * 
 * Body:
 *   - projectId: UUID of project
 *   - signerEmail: Client email
 *   - signerName: Client name
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, signerEmail, signerName } = await req.json();

    if (!projectId || !signerEmail || !signerName) {
      return NextResponse.json({ 
        error: 'Missing required fields: projectId, signerEmail, signerName' 
      }, { status: 400 });
    }

    // 1. Fetch Project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 2. Check if BOQ already sent
    if (project.boq_docusign_envelope_id) {
      return NextResponse.json({ 
        error: 'BOQ already sent to client. Status: ' + project.boq_docusign_status 
      }, { status: 400 });
    }

    // 3. Generate PDF
    const pdfBase64 = await generateBOQPdf(projectId);

    // 4. Send DocuSign envelope
    const envelopeId = await sendEnvelope({
      signerEmail,
      signerName,
      docBase64: pdfBase64,
      docName: `BOQ_${project.id.slice(0, 8)}.pdf`,
      docExtension: 'pdf',
      emailSubject: `Bill of Quantities for ${project.name} - Please Review & Sign`
    });

    // 5. Update Project with Envelope ID
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        boq_docusign_envelope_id: envelopeId,
        boq_docusign_status: 'sent'
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update project with envelope ID:', updateError);
    }

    // 6. Log event
    await supabase
      .from('docusign_events')
      .insert([{
        envelope_id: envelopeId,
        document_type: 'boq',
        document_id: projectId,
        event_type: 'sent',
        envelope_status: 'sent',
        signer_email: signerEmail,
        signer_name: signerName
      }]);

    return NextResponse.json({ 
      success: true, 
      envelopeId,
      status: 'sent',
      message: `BOQ sent to ${signerEmail} for approval`
    });

  } catch (error: any) {
    console.error('Error sending BOQ via DocuSign:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
