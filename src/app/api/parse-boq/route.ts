import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Use pdf-parse for reliable text extraction
    const pdfParse = (await import('pdf-parse')).default
    const pdfData = await pdfParse(buffer)
    const pdfText = pdfData.text

    console.log(`PDF text length: ${pdfText.length}`)

    if (!pdfText.trim()) {
      return NextResponse.json({ error: 'Could not extract text from PDF. The PDF may be image-based.' }, { status: 400 })
    }

    // Limit to avoid token limits
    const truncatedText = pdfText.slice(0, 40000)

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `Extract ALL line items from this BOQ/quote document. Return ONLY a valid JSON array with no other text, no explanation, no markdown.

Each item must follow this exact format:
[{"description":"item name","size":"","unit":"NO.","quantity":1,"unit_price":0}]

Rules:
- unit_price is the price per unit
- unit must be one of: NO., SQM, LM, SET, LOT
- size is dimensions string or empty string ""
- Skip section headers, totals, subtotals
- Return [] if no items found

BOQ document:
${truncatedText}`,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'
    console.log(`Claude response length: ${responseText.length}`)
    console.log(`Claude response preview: ${responseText.slice(0, 200)}`)

    // Strip markdown if present
    let cleanJson = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    // Find JSON array
    const startIdx = cleanJson.indexOf('[')
    const endIdx = cleanJson.lastIndexOf(']')

    if (startIdx === -1 || endIdx === -1) {
      console.log('No JSON array found in response')
      return NextResponse.json({ items: [], pageCount: pdfData.numpages, totalChunks: 1 })
    }

    cleanJson = cleanJson.slice(startIdx, endIdx + 1)

    let items: any[] = []
    try {
      items = JSON.parse(cleanJson)
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr)
      // Try fixing common issues
      try {
        const fixed = cleanJson
          .replace(/,\s*]/g, ']')
          .replace(/,\s*}/g, '}')
        items = JSON.parse(fixed)
      } catch {
        return NextResponse.json({ items: [], pageCount: pdfData.numpages, totalChunks: 1 })
      }
    }

    // Deduplicate by description
    const seen = new Set<string>()
    const uniqueItems = items.filter((item: any) => {
      const key = item.description?.toLowerCase().trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })

    console.log(`Returning ${uniqueItems.length} items`)

    return NextResponse.json({
      items: uniqueItems,
      pageCount: pdfData.numpages,
      totalChunks: 1,
    })
  } catch (error: any) {
    console.error('PDF parse error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to parse PDF' },
      { status: 500 }
    )
  }
}
