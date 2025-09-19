
'use server';
/**
 * @fileOverview A Genkit flow for sending schedule notification emails to volunteers.
 */

import nodemailer from 'nodemailer';
import type { NotificationRequest } from '@/lib/types';
import type { Volunteer, Event } from '@/lib/types';

interface Assignment {
  date: string;
  dayOfWeek: string;
  evento: string;
  area: string;
}

function generateHtmlBody(volunteerName: string, assignments: Assignment[], scheduleTitle: string): string {
    const assignmentsHtml = assignments.map(a => `
        <tr style="border-bottom: 1px solid #dddddd; text-align: left;">
            <td style="padding: 12px;">${new Date(a.date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })} (${a.dayOfWeek})</td>
            <td style="padding: 12px;">${a.evento}</td>
            <td style="padding: 12px;">${a.area}</td>
        </tr>
    `).join('');

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #0056b3;">Olá, ${volunteerName}!</h2>
          <p>Sua escala de serviço para <strong>${scheduleTitle}</strong> foi confirmada. Muito obrigado pelo seu compromisso e dedicação!</p>
          <p>Aqui estão os seus agendamentos:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead style="background-color: #f2f2f2;">
              <tr>
                <th style="padding: 12px; text-align: left;">Data</th>
                <th style="padding: 12px; text-align: left;">Evento</th>
                <th style="padding: 12px; text-align: left;">Área</th>
              </tr>
            </thead>
            <tbody>
              ${assignmentsHtml}
            </tbody>
          </table>
          <p style="margin-top: 20px;">
            Se você tiver qualquer impedimento ou precisar de mais informações, por favor, entre em contato com a liderança do seu ministério.
          </p>
          <p>Deus abençoe!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.9em; color: #777;">Este é um e-mail automático enviado pelo sistema ScaleMaster.</p>
        </div>
      </div>
    `;
}


export async function notifyVolunteersByEmail(req: NotificationRequest): Promise<{ success: boolean; error?: string, sentCount: number }> {
  const { schedule, volunteers, secrets } = req;

  if (!secrets.EMAIL_USER || !secrets.EMAIL_FROM || !secrets.EMAIL_PASS) {
    return { success: false, error: 'Usuário, senha/chave e remetente do e-mail devem ser preenchidos nas configurações.', sentCount: 0 };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: secrets.EMAIL_USER,
        pass: secrets.EMAIL_PASS, // Should be an App Password
      },
    });

    const volunteersToNotify = volunteers.filter(v => 
        v.email && schedule.data.scheduleData.some(day => 
            day.assignments.some(a => a.voluntario_alocado === v.name)
        )
    );
    
    if (volunteersToNotify.length === 0) {
        return { success: false, error: 'Nenhum voluntário com e-mail cadastrado foi encontrado nesta escala.', sentCount: 0 };
    }

    let sentCount = 0;
    for (const volunteer of volunteersToNotify) {
        const volunteerAssignments: Assignment[] = [];
        schedule.data.scheduleData.forEach(day => {
            day.assignments.forEach(a => {
                if (a.voluntario_alocado === volunteer.name) {
                    volunteerAssignments.push({
                        date: day.date,
                        dayOfWeek: day.dayOfWeek,
                        evento: a.evento,
                        area: a.area,
                    });
                }
            });
        });

        if (volunteerAssignments.length > 0 && volunteer.email) {
            const htmlBody = generateHtmlBody(volunteer.name, volunteerAssignments, schedule.title);
            
            await transporter.sendMail({
                from: `ScaleMaster <${secrets.EMAIL_FROM}>`,
                to: volunteer.email,
                subject: `Sua Escala de Serviço - ${schedule.title}`,
                html: htmlBody,
            });
            sentCount++;
        }
    }

    return { success: true, sentCount };
  } catch (error: any) {
    console.error('Nodemailer Error:', error);
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
        errorMessage = "Falha na autenticação. Verifique se o usuário e a 'Senha de Aplicativo' estão corretos. Detalhe: " + error.message;
    } else if (error.code === 'ENOTFOUND' || error.code === 'EBADNAME') {
        errorMessage = "Não foi possível encontrar o servidor de e-mail (DNS). Detalhe: " + error.message;
    }
    return { success: false, error: `Falha ao enviar e-mails: ${errorMessage}`, sentCount: 0 };
  }
}
