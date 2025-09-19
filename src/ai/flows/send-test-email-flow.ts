
'use server';
/**
 * @fileOverview A Genkit flow for sending a single test email.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { TestEmailRequestSchema } from '@/lib/types';
import type { TestEmailRequest } from '@/lib/types';

export async function sendTestEmail(req: TestEmailRequest): Promise<{ success: boolean; error?: string }> {
  const { recipient, secrets } = req;

  if (!secrets.EMAIL_USER || !secrets.EMAIL_FROM || !secrets.EMAIL_PASS) {
    return { success: false, error: 'Usuário, senha e remetente do e-mail devem ser preenchidos nas configurações.' };
  }

  try {
    // Create a transporter object using standard SMTP with App Password
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465, // Use 465 for SSL
      secure: true, // Use true for port 465
      auth: {
        user: secrets.EMAIL_USER,
        pass: secrets.EMAIL_PASS, // This MUST be an App Password, not your regular password
      },
    });
    
    // Send mail with defined transport object
    await transporter.sendMail({
      from: `ScaleMaster <${secrets.EMAIL_FROM}>`,
      to: recipient,
      subject: 'E-mail de Teste do ScaleMaster',
      text: 'Seu envio de e-mail está funcionando corretamente!',
      html: '<b>Seu envio de e-mail está funcionando corretamente!</b>',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Nodemailer Error:', error);
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
        errorMessage = "Falha na autenticação. Verifique se o usuário e a 'Senha de Aplicativo' estão corretos. Sua senha normal do Gmail não funcionará aqui. Detalhe: " + error.message;
    } else if (error.code === 'ENOTFOUND' || error.code === 'EBADNAME') {
        errorMessage = "Não foi possível encontrar o servidor de e-mail (DNS). Isso indica um problema de rede no ambiente do servidor. Detalhe: " + error.message;
    }
    return { success: false, error: `Falha ao enviar e-mail: ${errorMessage}` };
  }
}
