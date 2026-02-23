import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Consider switching to service role key if RLS blocks
const supabase = createClient(supabaseUrl, supabaseKey);

export async function convertQuoteToProject(quoteId: string, projectName?: string) {
  // 1. Fetch Quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*, client:clients(*)')
    .eq('id', quoteId)
    .single();

  if (quoteError || !quote) {
    throw new Error(`Failed to fetch quote: ${quoteError?.message}`);
  }

  // Determine Project Name
  const finalProjectName = projectName || 
    (quote.client?.name ? `${quote.client.name} Project` : `Project from Quote ${quote.quote_reference || quote.id.slice(0, 8)}`);

  // 2. Create Project (awaiting_deposit)
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert([{
      quote_id: quoteId,
      client_id: quote.client_id,
      name: finalProjectName,
      site_address: quote.site_address, // Assuming quote has this or we fallback
      contract_value: quote.total,
      status: 'awaiting_deposit',
      start_date: new Date().toISOString().split('T')[0],
      deposit_paid: false,
      items_generated: false,
    }])
    .select()
    .single();

  if (projectError || !project) {
    throw new Error(`Failed to create project: ${projectError?.message}`);
  }

  // 3. Create Deposit Invoice (30%)
  const depositAmount = (quote.total || 0) * 0.30;
  
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert([{
      project_id: project.id,
      invoice_type: 'deposit',
      amount: depositAmount,
      percentage: 30,
      status: 'draft', // Or 'sent' if we want to auto-send it
    }])
    .select()
    .single();

  if (invoiceError || !invoice) {
    throw new Error(`Failed to create deposit invoice: ${invoiceError?.message}`);
  }

  // 4. Link Invoice to Project
  await supabase
    .from('projects')
    .update({ deposit_invoice_id: invoice.id })
    .eq('id', project.id);

  // 5. Update Quote Status
  await supabase
    .from('quotes')
    .update({ 
      status: 'converted', 
      updated_at: new Date().toISOString(),
      docusign_status: 'completed' // Mark as signed/completed via DocuSign flow
    })
    .eq('id', quoteId);

  // 6. Update Enquiry Status if linked
  if (quote.enquiry_id) {
    await supabase
      .from('enquiries')
      .update({ status: 'won', updated_at: new Date().toISOString() })
      .eq('id', quote.enquiry_id);
  }

  return { project, invoice };
}
