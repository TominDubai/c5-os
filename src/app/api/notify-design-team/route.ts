import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { projectId, projectName, itemCount, designDueDate, designerEmail } = await request.json()
    
    if (!designerEmail) {
      return NextResponse.json({ error: 'No email provided' }, { status: 400 })
    }
    
    // TODO: Connect to email service (Resend, SendGrid, etc.)
    // For now, just log it
    console.log('📧 Design Team Notification:')
    console.log('  To:', designerEmail)
    console.log('  Project:', projectName)
    console.log('  Items:', itemCount)
    console.log('  Due:', designDueDate || 'Not set')
    console.log('  Link:', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/projects/${projectId}`)
    
    // Example with Resend (uncomment and add RESEND_API_KEY to .env.local):
    /*
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'C5 OS <noreply@concept5.ae>',
      to: designerEmail,
      subject: `New Project for Design: ${projectName}`,
      html: `
        <h2>New Project Ready for Design</h2>
        <p><strong>Project:</strong> ${projectName}</p>
        <p><strong>Items:</strong> ${itemCount} items awaiting drawings</p>
        <p><strong>Due Date:</strong> ${designDueDate || 'Not specified'}</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}">View Project in C5 OS</a></p>
      `
    })
    */
    
    return NextResponse.json({ 
      success: true, 
      message: 'Notification logged (email service not configured yet)' 
    })
    
  } catch (error: any) {
    console.error('Email notification error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
