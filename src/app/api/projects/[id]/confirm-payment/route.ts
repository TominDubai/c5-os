import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { paymentMethod, paymentReference } = await req.json()

  // Find the deposit invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id')
    .eq('project_id', projectId)
    .eq('invoice_type', 'deposit')
    .single()

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: 'Deposit invoice not found' }, { status: 404 })
  }

  // Mark invoice as paid
  const { error: invoiceUpdateError } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod || null,
      payment_reference: paymentReference || null,
    })
    .eq('id', invoice.id)

  if (invoiceUpdateError) {
    return NextResponse.json({ error: invoiceUpdateError.message }, { status: 500 })
  }

  // Advance project to design_pending
  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({
      status: 'design_pending',
      deposit_paid: true,
      deposit_paid_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  if (projectUpdateError) {
    return NextResponse.json({ error: projectUpdateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
