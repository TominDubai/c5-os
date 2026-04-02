import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEnvelope } from '@/lib/docusign/client';
import { generateDrawingApprovalPdf } from '@/lib/pdf/generate-drawing-approval';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * POST /api/docusign/send-drawings
 * 
 * Send shop drawings to client for approval via DocuSign
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

    // 2. Check if drawings exist and are ready
    const { data: drawings, error: drawingsError } = await supabase
      .from('drawing_requirements')
      .select('*')
      .eq('project_id', projectId);

    if (drawingsError || !drawings || drawings.length === 0) {
      return NextResponse.json({ 
        error: 'No shop drawings found for this project' 
      }, { status: 400 });
    }

    // 3. Check if already sent to this client
    const sentDrawings = drawings.filter(d => d.docusign_envelope_id && d.docusign_status === 'sent');
    if (sentDrawings.length > 0) {
      return NextResponse.json({ 
        error: `Some drawings already sent (${sentDrawings.length}/${drawings.length})` 
      }, { status: 400 });
    }

    // 4. Generate PDF
    const pdfBase64 = await generateDrawingApprovalPdf(projectId);

    // 5. Send DocuSign envelope
    const envelopeId = await sendEnvelope({
      signerEmail,
      signerName,
      docBase64: pdfBase64,
      docName: `Drawings_${project.id.slice(0, 8)}.pdf`,
      docExtension: 'pdf',
      emailSubject: `Shop Drawings for ${project.name} - Please Review & Approve`
    });

    // 6. Update all drawing requirements with envelope reference
    const { error: updateError } = await supabase
      .from('drawing_requirements')
      .update({
        docusign_envelope_id: envelopeId,
        docusign_status: 'sent'
      })
      .eq('project_id', projectId);

    if (updateError) {
      console.error('Failed to update drawings with envelope ID:', updateError);
    }

    // 7. Log event
    await supabase
      .from('docusign_events')
      .insert([{
        envelope_id: envelopeId,
        document_type: 'drawing',
        document_id: projectId,
        event_type: 'sent',
        envelope_status: 'sent',
        signer_email: signerEmail,
        signer_name: signerName,
        payload: { drawing_count: drawings.length }
      }]);

    return NextResponse.json({ 
      success: true, 
      envelopeId,
      status: 'sent',
      drawingCount: drawings.length,
      message: `${drawings.length} drawing(s) sent to ${signerEmail} for approval`
    });

  } catch (error: any) {
    console.error('Error sending drawings via DocuSign:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
