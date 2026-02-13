import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

// Lazy load pdf-parse to avoid test file issue
let pdfParse: any = null
async function getPdfParser() {
  if (!pdfParse) {
    pdfParse = (await import('pdf-parse')).default
  }
  return pdfParse
}

async function extractItemsFromText(text: string, chunkNum: number = 1): Promise<any[]> {
  const prompt = `Extract ALL line items from this BOQ/quote text. Return ONLY a valid JSON array.

Format: [{"description":"item name","size":"","unit":"NO.","quantity":1,"unit_price":0}]

Rules:
- Extract EVERY item you can find
- unit_price should be the total price for that line item
- If quantity not clear, use 1
- unit: NO., SQM, LM, SET, or LOT

Return ONLY the JSON array:

${text}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 180000) // 3 min timeout

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:8b',
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 8192, // More output tokens
          num_ctx: 8192, // More context
        }
      }),
      signal: controller.signal,
    })
    
    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`Ollama error: ${await response.text()}`)
    }

    const data = await response.json()
    const responseText = data.response || '[]'
    
    console.log(`Chunk ${chunkNum} response length: ${responseText.length}`)
    
    // Try to extract JSON array from response
    let cleanJson = responseText.trim()
    
    // Remove markdown code blocks
    cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    
    // Find JSON array - be more lenient
    const match = cleanJson.match(/\[\s*\{[\s\S]*\}\s*\]/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch (e) {
        // Try to fix common JSON issues
        let fixed = match[0]
          .replace(/,\s*]/g, ']') // trailing comma
          .replace(/,\s*}/g, '}') // trailing comma in object
          .replace(/'/g, '"') // single quotes
        return JSON.parse(fixed)
      }
    }
    
    return []
  } catch (e: any) {
    clearTimeout(timeout)
    if (e.name === 'AbortError') {
      console.error(`Chunk ${chunkNum} timed out`)
    }
    throw e
  }
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

    const pdf = await getPdfParser()
    const pdfData = await pdf(buffer)
    const pdfText = pdfData.text

    // Process in chunks if text is very long
    const chunkSize = 6000 // Smaller chunks for better accuracy
    const allItems: any[] = []
    
    console.log(`PDF text length: ${pdfText.length} chars`)
    
    if (pdfText.length <= chunkSize) {
      // Single chunk
      const items = await extractItemsFromText(pdfText, 1)
      allItems.push(...items)
    } else {
      // Multiple chunks - split by pages or sections
      const chunks: string[] = []
      let currentChunk = ''
      const lines = pdfText.split('\n')
      
      for (const line of lines) {
        if (currentChunk.length + line.length > chunkSize) {
          if (currentChunk) chunks.push(currentChunk)
          currentChunk = line
        } else {
          currentChunk += '\n' + line
        }
      }
      if (currentChunk) chunks.push(currentChunk)
      
      console.log(`Processing ${chunks.length} chunks (${chunkSize} chars each)...`)
      
      // Process each chunk sequentially
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`)
        try {
          const items = await extractItemsFromText(chunks[i], i + 1)
          console.log(`Chunk ${i + 1} returned ${items.length} items`)
          allItems.push(...items)
        } catch (e: any) {
          console.error(`Error processing chunk ${i + 1}:`, e.message || e)
        }
      }
    }

    // Deduplicate by description
    const seen = new Set<string>()
    const uniqueItems = allItems.filter(item => {
      const key = item.description?.toLowerCase().trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })

    console.log(`Extracted ${uniqueItems.length} unique items`)

    return NextResponse.json({ 
      items: uniqueItems,
      pageCount: pdfData.numpages,
      totalChunks: Math.ceil(pdfText.length / chunkSize),
      rawTextPreview: pdfText.slice(0, 500)
    })

  } catch (error: any) {
    console.error('PDF parse error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to parse PDF' 
    }, { status: 500 })
  }
}
