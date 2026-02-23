import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_TRANSITIONS: Record<string, string> = {
  dispatched: 'on_site',
  on_site: 'installed',
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await request.json()

  // Fetch current item
  const { data: item } = await supabase
    .from('project_items')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  if (action === 'advance') {
    const nextStatus = VALID_TRANSITIONS[item.status]
    if (!nextStatus) {
      return NextResponse.json({ error: `Cannot advance from status: ${item.status}` }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    }

    if (nextStatus === 'on_site') updates.received_on_site_at = new Date().toISOString()
    if (nextStatus === 'installed') {
      updates.installed_at = new Date().toISOString()
      updates.installed_by = user.id
    }

    const { error } = await supabase.from('project_items').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, newStatus: nextStatus })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
