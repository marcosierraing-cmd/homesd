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
    const { image, tipo } = await req.json()

    const systemPrompt = `Eres un asistente de finanzas personales para una familia mexicana.
Tu tarea es extraer información de imágenes de tickets de compra o movimientos bancarios.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "monto": número_sin_símbolo,
  "descripcion": "nombre_del_comercio_o_concepto",
  "comercio": "nombre_corto_del_comercio",
  "fecha": "DD/MM/YYYY o null",
  "categoria_sugerida": "una de: deuda|educacion|servicios|vivienda|hogar|alimentacion|restaurantes|transporte|salud|social|hijos|imprevistos",
  "confianza": "alta|media|baja"
}

Para movimientos bancarios: extrae el monto, el comercio o beneficiario, y la fecha.
Para tickets de compra: extrae el total, el nombre del establecimiento y la fecha.
Si no puedes leer algo con certeza, pon null.
No agregues explicaciones, solo el JSON.`

    const isBase64 = image.startsWith('data:')
    const mediaType = isBase64
      ? image.split(';')[0].split(':')[1]
      : 'image/jpeg'
    const imageData = isBase64
      ? image.split(',')[1]
      : image

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
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
              text: tipo === 'movimiento'
                ? 'Extrae la información de este movimiento bancario.'
                : 'Extrae la información de este ticket de compra.'
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: 'Claude API error', detail: err }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'

    let parsed
    try {
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { monto: null, descripcion: text, comercio: null, fecha: null, confianza: 'baja' }
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
