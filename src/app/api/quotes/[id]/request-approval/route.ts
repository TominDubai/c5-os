import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch quote details for notification message
  const { data: quote } = await supabase
    .from('quotes')
    .select('quote_number, title, clients(name)')
    .eq('id', id)
    .single()

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  // Set approval status to pending
  await supabase
    .from('quotes')
    .update({
      approval_status: 'pending',
      approval_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Fetch all admin/operations users with their emails from auth
  const { data: approvers } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('role', ['admin', 'operations'])
    .eq('is_active', true)

  if (approvers && approvers.length > 0) {
    const clientName = (quote.clients as any)?.name || 'Client'
    const quoteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://c5-os.vercel.app'}/quotes/${id}`

    // Insert in-app notifications
    const notifications = approvers.map((approver) => ({
      user_id: approver.id,
      title: 'Quote Approval Required',
      message: `${quote.quote_number} for ${clientName} is awaiting your approval.`,
      type: 'quote_approval_request',
      entity_type: 'quote',
      entity_id: id,
      link_url: `/quotes/${id}`,
    }))
    await supabase.from('notifications').insert(notifications)

    // Send email notifications
    const approverEmails = approvers
      .map((a) => a.email)
      .filter(Boolean) as string[]

    if (approverEmails.length > 0) {
      await sendEmail({
        to: approverEmails,
        subject: `Quote Approval Required — ${quote.quote_number}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1d4ed8;">Quote Approval Required</h2>
            <p>A quote has been submitted for your approval:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px; color: #6b7280;">Quote Number</td>
                <td style="padding: 8px; font-weight: 600;">${quote.quote_number}</td>
              </tr>
              <tr style="background: #f9fafb;">
                <td style="padding: 8px; color: #6b7280;">Client</td>
                <td style="padding: 8px;">${clientName}</td>
              </tr>
              ${quote.title ? `
              <tr>
                <td style="padding: 8px; color: #6b7280;">Title</td>
                <td style="padding: 8px;">${quote.title}</td>
              </tr>` : ''}
            </table>
            <a href="${quoteUrl}" style="
              display: inline-block;
              background: #1d4ed8;
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              margin-top: 8px;
            ">
              Review &amp; Approve Quote
            </a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
              Concept 5 OS — Internal notification
            </p>
          </div>
        `,
      }).catch((err) => {
        console.error('Failed to send approval email:', err)
      })
    }
  }

  return NextResponse.json({ ok: true })
}
