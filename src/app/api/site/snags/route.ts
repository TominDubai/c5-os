import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { project_id, project_item_id, description, severity, location } = await request.json()
  if (!project_id || !description) {
    return NextResponse.json({ error: 'project_id and description are required' }, { status: 400 })
  }

  // Generate snag number
  const { count } = await supabase
    .from('snags')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project_id)

  const snagNumber = `SNG-${String((count || 0) + 1).padStart(3, '0')}`

  const { data: snag, error } = await supabase.from('snags').insert({
    project_id,
    project_item_id: project_item_id || null,
    snag_number: snagNumber,
    description,
    severity: severity || 'minor',
    location: location || null,
    status: 'open',
    reported_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, snag })
}
