export const config = { runtime: 'edge' }

const SYSTEM_PROMPT = `Eres un asistente de finanzas personales para una familia mexicana.
Extrae TODOS los movimientos del estado de cuenta bancario sin excepción.

Para cada movimiento asigna un "tipo":
- "gasto": cargos a comercios, servicios, personas externas, retiros de cajero para gastar
- "ingreso": nómina, depósitos externos reales, pagos recibidos de terceros
- "ignorar": cajitas (depósito/retiro), traspasos entre cuentas propias, pagos de tarjeta de crédito, SPEI entre cuentas propias

Reglas específicas para Nu:
- "Depósito en cajita *" → ignorar
- "Retiro de Cajita *" → ignorar  
- "SPEI enviado" a cuenta propia → ignorar
- "Transferencia" entre cuentas propias → ignorar
- "Pago de tarjeta" → ignorar
- Nómina o depósito externo grande (~$47,000+) → ingreso
- Todo lo demás con cargo → gasto

Para cada movimiento extrae:
- fecha: formato YYYY-MM-DD
- monto: numero sin signo, valor absoluto
- descripcion: tal como aparece en el banco
- tipo: "gasto" | "ingreso" | "ignorar"
- categoria: para gastos: deuda, educacion, servicios, vivienda, hogar, alimentacion, restaurantes, transporte, salud, social, hijos, imprevistos. Para ingresos: "ingreso". Para ignorar: "ignorar"
- subcategoria: vacio si no estas seguro
- ya_registrado: false

Reglas de categoria para gastos:
- Coyotl, carniceria → alimentacion
- Oscar Cano, Grupo MIC → alimentacion
- La Comer, Costco, Walmart, Frescura → alimentacion
- Luis Arturo → hogar
- restaurante, brasa, taqueria → restaurantes
- gasolina, gas → transporte
- AT&T, Telmex, Telcel → servicios
- GM Financial → deuda
- STM Financial, Peugeot → deuda
- Scotiabank prestamo → deuda
- farmacia, doctor → salud
- IMEX, colegio → educacion
- estacionamiento → transporte
- Todo lo demas → imprevistos

Responde UNICAMENTE con JSON valido sin markdown:
{"movimientos":[{"fecha":"2026-01-15","monto":1500,"descripcion":"COYOTL SA DE CV","tipo":"gasto","categoria":"alimentacion","subcategoria":"","ya_registrado":false}],"total_movimientos":0,"suma_total":0,"periodo":"periodo del estado"}`

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

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: 'Extrae TODOS los movimientos y clasifica cada uno como gasto, ingreso o ignorar.\n\nYa registrados:\n' + (txResumen || 'Ninguno') }
          ]
        }]
      })
    })

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text()
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

    let result
    try {
      const clean = fullText.replace(/```json\n?|\n?```/g, '').trim()
      result = JSON.parse(clean)
    } catch (e) {
      result = { movimientos: [], total_movimientos: 0, suma_total: 0, periodo: '', raw: fullText.slice(0, 200) }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, movimientos: [] }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  }
}
