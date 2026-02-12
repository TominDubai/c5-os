import { NextRequest, NextResponse } from 'next/server'
import pdf from 'pdf-parse'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Extract text from PDF
    const pdfData = await pdf(buffer)
    const pdfText = pdfData.text

    // Use Ollama (local LLM) to parse the BOQ items
    const prompt = `You are a BOQ (Bill of Quantity) parser for a joinery company. Extract line items from the provided quote/BOQ text.

For each item, extract:
- description: The item name and details
- size: Dimensions in mm (WxHxD format if available)
- unit: The unit type (NO., SQM, LM, SET, LOT)
- quantity: The quantity (number)
- unit_price: The unit price in AED (number only, no currency symbol)

Return a JSON array of items. Example:
[
  {
    "description": "Base cabinet with soft close drawers",
    "size": "600 x 900 x 550",
    "unit": "NO.",
    "quantity": 2,
    "unit_price": 1500
  }
]

If you can't find certain fields, use reasonable defaults:
- size: "" (empty string)
- unit: "NO."
- quantity: 1

Only return the JSON array, no other text or markdown formatting.

Parse the BOQ items from this quote:

${pdfText}`

    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:8b',
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
        }
      }),
    })

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text()
      throw new Error(`Ollama error: ${errorText}`)
    }

    const ollamaData = await ollamaResponse.json()
    const responseText = ollamaData.response || '[]'
    
    // Parse the JSON response
    let items = []
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanJson = responseText.trim()
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.slice(7)
      }
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.slice(3)
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.slice(0, -3)
      }
      items = JSON.parse(cleanJson.trim())
    } catch (parseError) {
      console.error('Failed to parse LLM response:', responseText)
      return NextResponse.json({ 
        error: 'Failed to parse BOQ items',
        rawText: pdfText.slice(0, 2000),
        llmResponse: responseText.slice(0, 1000)
      }, { status: 422 })
    }

    return NextResponse.json({ 
      items,
      pageCount: pdfData.numpages,
      rawTextPreview: pdfText.slice(0, 500)
    })

  } catch (error: any) {
    console.error('PDF parse error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to parse PDF' 
    }, { status: 500 })
  }
}
