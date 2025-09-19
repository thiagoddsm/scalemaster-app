
'use server';
/**
 * @fileOverview A Genkit flow for sending a single test WhatsApp message.
 */
import twilio from 'twilio';
import type { TestWhatsAppRequest } from '@/lib/types';


export async function sendTestWhatsApp(req: TestWhatsAppRequest): Promise<{ success: boolean; error?: string; }> {
  const { recipient, secrets } = req;

  if (!secrets.TWILIO_ACCOUNT_SID || !secrets.TWILIO_AUTH_TOKEN || !secrets.TWILIO_WHATSAPP_NUMBER) {
    return { success: false, error: 'As credenciais do Twilio (SID, Token e Número) devem ser preenchidas nas configurações.' };
  }
  
  const client = twilio(secrets.TWILIO_ACCOUNT_SID, secrets.TWILIO_AUTH_TOKEN);

  try {
    await client.messages.create({
       body: 'Sua integração com o WhatsApp via Twilio está funcionando corretamente! - ScaleMaster',
       from: secrets.TWILIO_WHATSAPP_NUMBER,
       to: `whatsapp:+${recipient.replace(/\D/g, '')}`
     });
    return { success: true };
  } catch (error: any) {
    console.error('Twilio Error:', error);
    let errorMessage = `Falha ao enviar mensagem: ${error.message}`;
    if (error.code === 21211) {
        errorMessage = `O número de telefone do destinatário (${recipient}) não parece ser válido. Verifique o formato, incluindo o código do país (ex: 5511999998888). Detalhe: ${error.message}`;
    } else if (error.code === 20003) {
        errorMessage = `Falha na autenticação com a Twilio. Verifique se o 'Account SID' e o 'Auth Token' estão corretos. Detalhe: ${error.message}`;
    } else if (error.code === 21608) {
        errorMessage = `O número de remetente do Twilio não foi verificado ou ainda não está habilitado para WhatsApp. Detalhe: ${error.message}`;
    } else if (error.code === 63018) {
        errorMessage = `Falha ao enviar mensagem. Pode ser que você precise aceitar os termos do WhatsApp ou que a janela de 24h para iniciar uma conversa tenha expirado. Envie uma mensagem para o número do Twilio a partir do seu WhatsApp para iniciar. Detalhe: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}
