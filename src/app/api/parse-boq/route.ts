import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

async function parsePdfText(buffer: Buffer): Promise<string> {
  const PDFParser = (await import('pdf2json')).default
  return new Promise((resolve, reject) => {
    const parser = new PDFParser()
    parser.on('pdfParser_dataReady', (data: any) => {
      try {
        const text = data.Pages?.map((page: any) =>
          page.Texts?.map((t: any) =>
            t.R?.map((r: any) => decodeURIComponent(r.T)).join('')
          ).join(' ')
        ).join('\n') || ''
        resolve(text)
      } catch {
        resolve('')
      }
    })
    parser.on('pdfParser_dataError', reject)
    parser.parseBuffer(buffer)
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const pdfText = await parsePdfText(buffer)

    if (!pdfText.trim()) {
      return NextResponse.json({ items: [], pageCount: 0, totalChunks: 0 })
    }

    // Limit text to avoid token limits
    const truncatedText = pdfText.slice(0, 40000)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `Extract ALL line items from this BOQ/quote document. Return ONLY a valid JSON array with no other text.

Format each item as: {"description":"item name","size":"dimensions or empty string","unit":"NO.","quantity":1,"unit_price":0}

Rules:
- Extract EVERY item you can find
- unit_price is the price per unit (not total)
- quantity is the number of units
- unit must be one of: NO., SQM, LM, SET, LOT
- size should be dimensions if visible (e.g. "2400x600mm") or empty string
- Skip section headers, totals, and subtotals

Return ONLY the JSON array:

${truncatedText}`,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]'

    // Extract JSON array from response
    let cleanJson = responseText.trim()
    cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '')

    const match = cleanJson.match(/\[\s*[\s\S]*\]/)
    if (!match) {
      return NextResponse.json({ items: [], pageCount: 0, totalChunks: 1 })
    }

    let items: any[] = []
    try {
      items = JSON.parse(match[0])
    } catch {
      // Try fixing common JSON issues
      const fixed = match[0]
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}')
        .replace(/'/g, '"')
      items = JSON.parse(fixed)
    }

    // Deduplicate by description
    const seen = new Set<string>()
    const uniqueItems = items.filter((item: any) => {
      const key = item.description?.toLowerCase().trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({
      items: uniqueItems,
      pageCount: 0,
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
