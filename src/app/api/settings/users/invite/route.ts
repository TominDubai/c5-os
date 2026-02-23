import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check caller is admin or operations
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!caller || !['admin', 'operations'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden — only admins can invite users' }, { status: 403 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'Service role key not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local' },
      { status: 500 }
    )
  }

  const { email, full_name, role, department } = await request.json()
  if (!email || !full_name || !role) {
    return NextResponse.json({ error: 'email, full_name and role are required' }, { status: 400 })
  }

  // Use admin client to invite user
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role, department: department || null },
  })

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 })

  // Pre-create the users row so the profile exists before first login
  const { error: profileError } = await adminClient.from('users').upsert({
    id: invited.user.id,
    email,
    full_name,
    role,
    department: department || null,
    is_active: true,
  }, { onConflict: 'id' })

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ success: true, userId: invited.user.id })
}
