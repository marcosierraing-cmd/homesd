export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { image, transactions } = await req.json()

    const txResumen = transactions.slice(0, 50).map(t =>
      `${t.descripcion || ''} $${t.monto} ${t.timestamp?.slice(0,10)}`
    ).join('\n')

    const systemPrompt = `Eres un asistente de conciliación bancaria para una familia mexicana.
Recibirás una imagen de movimientos bancarios y una lista de gastos ya registrados.
Tu tarea es cruzar ambas listas y determinar cuáles coinciden y cuáles no.

Responde ÚNICAMENTE con JSON válido con esta estructura:
{
  "movimientos_banco": [{"descripcion": "...", "monto": 000, "fecha": "DD/MM"}],
  "conciliados": [{"descripcion": "...", "monto": 000}],
  "fugas": [{"descripcion": "...", "monto": 000, "fecha": "DD/MM"}],
  "pendientes": [{"descripcion": "...", "monto": 000}]
}

conciliados: movimientos del banco que YA están registrados en la lista de gastos
fugas: movimientos del banco que NO están registrados (no tienen ticket)
pendientes: gastos registrados que NO aparecen en el banco (fueron en efectivo o pendientes)`

    const isBase64 = image?.startsWith('data:')
    const mediaType = isBase64 ? image.split(';')[0].split(':')[1] : 'image/jpeg'
    const imageData = isBase64 ? image.split(',')[1] : image

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageData }
            },
            {
              type: 'text',
              text: `Gastos ya registrados en la app:\n${txResumen}\n\nConcilia contra los movimientos del banco en la imagen.`
            }
          ]
        }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'

    let parsed
    try {
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { movimientos_banco: [], conciliados: [], fugas: [], pendientes: [] }
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
