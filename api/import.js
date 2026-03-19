export const config = { runtime: 'edge' }

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
    const { image, transactions } = await req.json()

    // Resumen de transacciones existentes para detectar duplicados
    const txExistentes = transactions.slice(0, 100).map(t =>
      `${t.descripcion || ''} $${t.monto} ${(t.timestamp || t.createdAt)?.slice(0, 10)}`
    ).join('\n')

    const systemPrompt = `Eres un asistente de finanzas personales para una familia mexicana.
Extrae TODOS los movimientos de cargo/débito (gastos) del estado de cuenta bancario en la imagen.
NO incluyas abonos, depósitos ni movimientos de entrada de dinero.

Para cada movimiento extrae:
- fecha: en formato YYYY-MM-DD si es posible, o DD/MM si no hay año
- monto: número sin signo, solo el valor absoluto
- descripcion: descripción del comercio/concepto tal como aparece en el banco
- categoria: asigna la categoría más apropiada de esta lista exacta:
  deuda, educacion, servicios, vivienda, hogar, alimentacion, restaurantes, transporte, salud, social, hijos, imprevistos
- subcategoria: deja vacío "" si no estás seguro

Reglas de autoasignación de categoría:
- Coyotl, carnicería → alimentacion
- Oscar Cano, Grupo MIC → alimentacion  
- La Comer, Costco, Walmart, Frescura → alimentacion
- Luis Arturo → hogar
- restaurante, brasa, taquería, comida → restaurantes
- gasolina, gas, estación → transporte
- AT&T, Telmex, Telcel → servicios
- Claude, PlayStation, Microsoft, Netflix → servicios
- GM Financial → deuda
- STM Financial, Peugeot → deuda
- Scotiabank préstamo → deuda
- farmacia, doctor, consulta → salud
- colegio, escuela, IMEX → educacion
- estacionamiento, parking → transporte
- Todo lo demás → imprevistos

Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "movimientos": [
    {
      "fecha": "2026-01-15",
      "monto": 1500,
      "descripcion": "COYOTL SA DE CV",
      "categoria": "alimentacion",
      "subcategoria": "coyotl",
      "ya_registrado": false
    }
  ],
  "total_movimientos": 0,
  "suma_total": 0,
  "periodo": "descripción del período del estado de cuenta"
}`

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
        max_tokens: 4000,
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
              text: `Extrae TODOS los movimientos de gasto del estado de cuenta.

Transacciones ya registradas en la app (para marcar duplicados):
${txExistentes || 'Ninguna aún'}

Marca "ya_registrado: true" si el movimiento ya aparece en la lista de arriba (mismo monto y descripción similar).`
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
      parsed = { movimientos: [], total_movimientos: 0, suma_total: 0, periodo: '' }
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
