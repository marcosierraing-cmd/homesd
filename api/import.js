export const config = { runtime: 'edge' }

const SYSTEM_PROMPT = `Eres un asistente de finanzas personales para una familia mexicana.
Extrae TODOS los movimientos de cargo/debito (gastos) del estado de cuenta bancario.
NO incluyas abonos, depositos ni movimientos de entrada de dinero.

Para cada movimiento extrae:
- fecha: formato YYYY-MM-DD
- monto: numero sin signo
- descripcion: tal como aparece en el banco
- categoria: una de: deuda, educacion, servicios, vivienda, hogar, alimentacion, restaurantes, transporte, salud, social, hijos, imprevistos
- subcategoria: vacio si no estas seguro
- ya_registrado: false

Responde UNICAMENTE con JSON valido sin markdown:
{"movimientos":[{"fecha":"2026-01-15","monto":1500,"descripcion":"COYOTL SA DE CV","categoria":"alimentacion","subcategoria":"coyotl","ya_registrado":false}],"total_movimientos":0,"suma_total":0,"periodo":"periodo del estado"}`

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: 'API key no configurada' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.json()
    const { image, transactions } = body

    const isPDF = image && image.startsWith('data:application/pdf')
    const mediaType = isPDF ? 'application/pdf' : ((image && image.split(';')[0].split(':')[1]) || 'image/jpeg')
    const base64Data = image ? image.split(',')[1] : ''

    const txResumen = (transactions || []).slice(0, 50).map(t =>
      (t.descripcion || '') + ' $' + t.monto + ' ' + ((t.timestamp || t.createdAt || '').slice(0, 10))
    ).join('\n')

    const contentBlock = isPDF ? {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64Data }
    } : {
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: base64Data }
    }

    const requestBody = {
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          { type: 'text', text: 'Extrae TODOS los movimientos de gasto.\n\nYa registrados:\n' + (txResumen || 'Ninguno') }
        ]
      }]
    }

    console.log('[import] isPDF:', isPDF, 'mediaType:', mediaType, 'base64 length:', base64Data ? base64Data.length : 0)

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text()
      console.log('[import] Anthropic error:', errText)
      return new Response(JSON.stringify({ error: errText, movimientos: [] }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      })
    }

    const reader = anthropicResp.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.type === 'text_delta') {
              fullText += parsed.delta.text
            }
          } catch (_e) {}
        }
      }
    }

    console.log('[import] fullText length:', fullText.length, 'preview:', fullText.slice(0, 200))

    let result
    try {
      const clean = fullText.replace(/```json\n?|\n?```/g, '').trim()
      result = JSON.parse(clean)
    } catch (e) {
      console.log('[import] parse error:', e.message, 'text:', fullText.slice(0, 500))
      result = { movimientos: [], total_movimientos: 0, suma_total: 0, periodo: '', raw: fullText.slice(0, 500) }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    console.log('[import] catch error:', err.message)
    return new Response(JSON.stringify({ error: err.message, movimientos: [] }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  }
}
