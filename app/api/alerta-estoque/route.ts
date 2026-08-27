import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      produtoNome,
      tamanho,
      cor,
      saldoAtual,
      estoqueAlerta,
      estoqueMinimo,
      clienteId,
      matricula,
      tipoAlerta, // 'ALERTA' ou 'CRITICO'
    } = body;

    const emailDestino = 'atendimento@acaouniformes.com.br';
    const eCritico = tipoAlerta === 'CRITICO';

    const assunto = `${eCritico ? '🚨 [ESTOQUE MÍNIMO CRÍTICO]' : '⚠️ [AVISO DE SEGURANÇA]'}: ${clienteId} — ${produtoNome}`;

    const mensagemHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: ${eCritico ? '#dc2626' : '#d97706'}; border-bottom: 2px solid #eee; pb: 8px;">
          ${eCritico ? 'Alerta Crítico de Estoque Mínimo' : 'Aviso Preventivo de Segurança'}
        </h2>
        <p>A Ação Uniformes recebeu um novo gatilho automático de controle de estoque:</p>
        
        <table style="width: 100%; text-align: left; border-collapse: collapse; margin-top: 15px;">
          <tr><td style="padding: 6px 0;"><strong>Cliente:</strong></td><td>${clienteId}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Uniforme:</strong></td><td>${produtoNome}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Grade / Cor:</strong></td><td>${tamanho || 'N/A'} / ${cor || 'N/A'}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Saldo Atual no Pátio:</strong></td><td style="color: red; font-weight: bold;">${saldoAtual} un.</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Limite de Alerta:</strong></td><td>${estoqueAlerta} un.</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Estoque Mínimo Definido:</strong></td><td>${estoqueMinimo} un.</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Última Retirada (Matrícula):</strong></td><td>${matricula}</td></tr>
        </table>

        <div style="margin-top: 25px; padding: 15px; background-color: #f8fafc; border-left: 4px solid #2563eb;">
          <strong>Ação Comercial Recomendada:</strong><br />
          Acessar o balanço do cliente <strong>${clienteId}</strong> na plataforma Ação Estoque e enviar cotação de atualização do lote de uniformes.
        </div>
      </div>
    `;

    // Exemplo de envio via provedor de e-mail (Resend, SendGrid ou SMTP)
    /*
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Ação Estoque Sistema <alertas@acaouniformes.com.br>',
        to: [emailDestino],
        subject: assunto,
        html: mensagemHtml,
      }),
    });
    */

    console.log(`[E-mail Silencioso Enviado para ${emailDestino}]:`, assunto);
    return NextResponse.json({ success: true, message: 'Alerta enviado para a Ação Uniformes' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}