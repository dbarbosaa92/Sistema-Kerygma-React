import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record

    const emailBody = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="background: #1a2744; padding: 20px 24px; border-radius: 10px 10px 0 0;">
          <h2 style="color: #c8a96e; margin: 0; font-size: 18px;">Novo interesse de matrícula</h2>
          <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0; font-size: 13px;">Seminário Kerygma</p>
        </div>
        <div style="background: #fff; border: 1px solid #e0ddd8; border-top: none; padding: 24px; border-radius: 0 0 10px 10px;">
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="color: #888; padding: 8px 0; border-bottom: 1px solid #f0ede8;">Nome</td>
              <td style="color: #1a2744; font-weight: 500; padding: 8px 0; border-bottom: 1px solid #f0ede8; text-align: right;">${record.nome}</td>
            </tr>
            <tr>
              <td style="color: #888; padding: 8px 0; border-bottom: 1px solid #f0ede8;">WhatsApp</td>
              <td style="color: #1a2744; font-weight: 500; padding: 8px 0; border-bottom: 1px solid #f0ede8; text-align: right;">${record.whatsapp}</td>
            </tr>
            <tr>
              <td style="color: #888; padding: 8px 0;">Data</td>
              <td style="color: #1a2744; font-weight: 500; padding: 8px 0; text-align: right;">${new Date(record.criado_em).toLocaleString('pt-BR')}</td>
            </tr>
          </table>
          <a href="https://wa.me/55${record.whatsapp.replace(/\D/g,'')}"
            style="display: block; margin-top: 20px; background: #1a2744; color: #c8a96e; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
            Responder no WhatsApp
          </a>
        </div>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('re_adHxpm6X_6SU7toMfRBsSNwP7NjuuFGr9')}`
      },
      body: JSON.stringify({
        from: 'Kerygma <noreply@seudominio.com>',
        to: ['kerygma.ministerial@gmail.com'],
        subject: `Novo interesse de matrícula — ${record.nome}`,
        html: emailBody
      })
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
