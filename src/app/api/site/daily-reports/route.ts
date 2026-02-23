import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { project_id, report_date, work_completed, issues, attendance_count, weather } = await request.json()
  if (!project_id || !report_date) {
    return NextResponse.json({ error: 'project_id and report_date are required' }, { status: 400 })
  }

  const { data: report, error } = await supabase.from('daily_reports').upsert({
    project_id,
    report_date,
    work_completed: work_completed || null,
    issues: issues || null,
    attendance_count: attendance_count ? parseInt(attendance_count) : null,
    weather: weather || null,
    submitted_by: user.id,
  }, { onConflict: 'project_id,report_date,submitted_by' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, report })
}
