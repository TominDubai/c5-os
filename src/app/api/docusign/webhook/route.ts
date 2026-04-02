import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseStringPromise } from 'xml2js';
import { convertQuoteToProject } from '@/lib/projects/convert-quote';
import { downloadSignedDocument } from '@/lib/docusign/client';

async function saveSignedDocument(
  envelopeId: string,
  folderName: string,
  fileName: string,
  relatedType: string,
  relatedId: string
): Promise<void> {
  // Save the signed PDF into project-documents storage bucket
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const pdfBuffer = await downloadSignedDocument(envelopeId);
    const storagePath = `signed/${folderName.toLowerCase().replace(/ /g, '-')}/${envelopeId}-${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('project-documents')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      console.error(`[DocuSign Webhook] Storage upload failed: ${uploadError.message}`);
      return;
    }

    // Record in project_documents if relatedType is project
    if (relatedType === 'project') {
      await supabase.from('project_documents').insert({
        project_id: relatedId,
        file_name: fileName,
        file_path: storagePath,
        file_size: pdfBuffer.length,
        mime_type: 'application/pdf',
        category: relatedType === 'project' ? 'contract' : 'drawing',
        description: `Signed via DocuSign (envelope ${envelopeId})`,
      });
    }

    console.log(`[DocuSign Webhook] Saved signed document: ${storagePath}`);
  } catch (err: any) {
    console.error(`[DocuSign Webhook] Failed to save signed document: ${err.message}`);
  }
}

interface DocuSignWebhookPayload {
  envelopeId: string;
  status: string;
  recipientEmail?: string;
  recipientName?: string;
  signerEmail?: string;
  signerName?: string;
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const rawBody = await req.text();
    let envelopeId: string | null = null;
    let status: string | null = null;
    let signerEmail: string | null = null;
    let signerName: string | null = null;

    // Parse payload (JSON or XML)
    if (rawBody.trim().startsWith('{')) {
      // JSON format
      const payload = JSON.parse(rawBody);
      envelopeId = payload.envelopeId || payload.data?.envelopeId;
      status = payload.status || payload.data?.status;
      signerEmail = payload.recipientEmail || payload.signerEmail || payload.data?.recipientEmail;
      signerName = payload.recipientName || payload.signerName || payload.data?.recipientName;
    } else {
      // XML format (DocuSign Connect)
      const xml = await parseStringPromise(rawBody, { explicitArray: false });
      const envInfo = xml.DocuSignEnvelopeInformation || xml.EnvelopeStatus;
      const envStatus = envInfo?.EnvelopeStatus || envInfo;
      
      if (envStatus) {
        envelopeId = envStatus.EnvelopeID;
        status = envStatus.Status;
        
        // Try to extract signer info from recipients
        if (envStatus.RecipientStatuses?.RecipientStatus) {
          const recipient = envStatus.RecipientStatuses.RecipientStatus;
          signerEmail = recipient.Email || recipient.email;
          signerName = recipient.UserName || recipient.userName;
        }
      }
    }

    console.log(`[DocuSign Webhook] Envelope: ${envelopeId}, Status: ${status}, Signer: ${signerEmail}`);

    if (!envelopeId || !status) {
      console.warn('[DocuSign Webhook] Invalid payload - missing envelope ID or status');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 1. Check if this is a BOQ envelope
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('boq_docusign_envelope_id', envelopeId)
      .single();

    if (project) {
      console.log(`[DocuSign Webhook] BOQ envelope for project ${project.id}`);
      
      // Update BOQ status
      const updateData: any = {
        boq_docusign_status: status.toLowerCase()
      };
      
      if (status === 'completed' || status === 'Completed') {
        updateData.boq_signed_at = new Date().toISOString();
        updateData.boq_signed_by_email = signerEmail;
      }
      
      await supabase
        .from('projects')
        .update(updateData)
        .eq('id', project.id);

      // Log event
      await supabase
        .from('docusign_events')
        .insert([{
          envelope_id: envelopeId,
          document_type: 'boq',
          document_id: project.id,
          event_type: status.toLowerCase(),
          envelope_status: status,
          signer_email: signerEmail,
          signer_name: signerName
        }]);

      // If BOQ completed, save signed document and trigger deposit invoice
      if (status === 'completed' || status === 'Completed') {
        await saveSignedDocument(envelopeId, 'Signed BOQs', `BOQ-${project.id}.pdf`, 'project', project.id);
        console.log(`[DocuSign Webhook] BOQ signed for project ${project.id} - triggering deposit invoice`);
        
        // Create 30% deposit invoice
        const depositAmount = (project.contract_value || 0) * 0.30;
        const { error: invoiceError } = await supabase
          .from('invoices')
          .insert([{
            project_id: project.id,
            invoice_type: 'deposit',
            amount: depositAmount,
            percentage: 30,
            status: 'sent',
            description: `30% Deposit for ${project.name}`
          }]);

        if (invoiceError) {
          console.error(`[DocuSign Webhook] Failed to create deposit invoice: ${invoiceError.message}`);
        } else {
          console.log(`[DocuSign Webhook] Deposit invoice created for project ${project.id}`);
        }
      }

      return NextResponse.json({ 
        success: true, 
        type: 'boq',
        message: 'BOQ status updated'
      });
    }

    // 2. Check if this is a drawing approval envelope
    const { data: drawing, error: drawingError } = await supabase
      .from('drawing_requirements')
      .select('*')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (drawing) {
      console.log(`[DocuSign Webhook] Drawing envelope for drawing ${drawing.id}`);
      
      // Update drawing status
      const updateData: any = {
        docusign_status: status.toLowerCase()
      };
      
      if (status === 'completed' || status === 'Completed') {
        updateData.status = 'approved'; // Update drawing status to approved
        updateData.approved_by_docusign_at = new Date().toISOString();
        updateData.approved_by_docusign_email = signerEmail;
      }
      
      await supabase
        .from('drawing_requirements')
        .update(updateData)
        .eq('id', drawing.id);

      // Log event
      await supabase
        .from('docusign_events')
        .insert([{
          envelope_id: envelopeId,
          document_type: 'drawing',
          document_id: drawing.id,
          event_type: status.toLowerCase(),
          envelope_status: status,
          signer_email: signerEmail,
          signer_name: signerName
        }]);

      // If drawing approved, save signed document and update to sent_to_production
      if (status === 'completed' || status === 'Completed') {
        await saveSignedDocument(envelopeId, 'Signed Drawings', `Drawing-${drawing.id}.pdf`, 'drawing', drawing.id);
        console.log(`[DocuSign Webhook] Drawing approved - releasing to production`);
        
        await supabase
          .from('drawing_requirements')
          .update({
            status: 'sent_to_production',
            released_to_production_at: new Date().toISOString()
          })
          .eq('id', drawing.id);
      }

      return NextResponse.json({ 
        success: true, 
        type: 'drawing',
        message: 'Drawing status updated'
      });
    }

    // 3. Check if this is a quote envelope (legacy support)
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (quote) {
      console.log(`[DocuSign Webhook] Quote envelope for quote ${quote.id}`);
      
      // Update quote status
      await supabase
        .from('quotes')
        .update({ docusign_status: status.toLowerCase() })
        .eq('id', quote.id);

      // Log event
      await supabase
        .from('docusign_events')
        .insert([{
          envelope_id: envelopeId,
          document_type: 'quote',
          document_id: quote.id,
          event_type: status.toLowerCase(),
          envelope_status: status,
          signer_email: signerEmail,
          signer_name: signerName
        }]);

      // If completed, save signed document and convert to project
      if (status === 'completed' || status === 'Completed') {
        await saveSignedDocument(envelopeId, 'Signed Quotes', `Quote-${quote.quote_number}.pdf`, 'quote', quote.id);
        console.log(`[DocuSign Webhook] Quote signed - converting to project`);
        await convertQuoteToProject(quote.id);
      }

      return NextResponse.json({ 
        success: true, 
        type: 'quote',
        message: 'Quote status updated'
      });
    }

    // 4. If no match found
    console.warn(`[DocuSign Webhook] No matching document found for envelope ${envelopeId}`);
    return NextResponse.json({ 
      success: false, 
      error: 'No matching document found' 
    }, { status: 404 });

  } catch (error: any) {
    console.error('[DocuSign Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
