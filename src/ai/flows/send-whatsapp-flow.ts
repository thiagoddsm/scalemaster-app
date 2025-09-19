
'use server';
/**
 * @fileOverview A Genkit flow for sending schedule notification WhatsApp messages to volunteers.
 */

import twilio from 'twilio';
import type { NotificationRequest, Volunteer } from '@/lib/types';
import { format } from 'date-fns';

function generateWhatsAppBody(volunteerName: string, assignments: any[], scheduleTitle: string): string {
    const assignmentsText = assignments.map(a => 
      `*${format(new Date(a.date + 'T00:00:00'), 'dd/MM')} (${a.dayOfWeek})* - ${a.evento} às ${a.time} na área de *${a.area}*`
    ).join('\n');

    return `Olá, ${volunteerName}! 👋\n\nSua escala de serviço para *${scheduleTitle}* foi confirmada. Obrigado por sua dedicação!\n\n*Seus agendamentos:*\n${assignmentsText}\n\nSe tiver qualquer impedimento, por favor, entre em contato com a liderança do seu ministério.\n\nDeus abençoe!\n_Enviado por ScaleMaster_`;
}

export async function notifyVolunteersByWhatsApp(req: NotificationRequest): Promise<{ success: boolean; error?: string, sentCount: number }> {
  const { schedule, volunteers, events, secrets } = req;

  if (!secrets.TWILIO_ACCOUNT_SID || !secrets.TWILIO_AUTH_TOKEN || !secrets.TWILIO_WHATSAPP_NUMBER) {
    return { success: false, error: 'As credenciais do Twilio (SID, Token e Número) devem ser preenchidas nas configurações.', sentCount: 0 };
  }

  const client = twilio(secrets.TWILIO_ACCOUNT_SID, secrets.TWILIO_AUTH_TOKEN);

  const volunteersToNotify = volunteers.filter(v => 
      v.phone && schedule.data.scheduleData.some(day => 
          day.assignments.some(a => a.voluntario_alocado === v.name)
      )
  );

  if (volunteersToNotify.length === 0) {
      return { success: false, error: 'Nenhum voluntário com telefone cadastrado foi encontrado nesta escala.', sentCount: 0 };
  }

  let sentCount = 0;
  for (const volunteer of volunteersToNotify) {
      const volunteerAssignments: any[] = [];
      schedule.data.scheduleData.forEach(day => {
          day.assignments.forEach(a => {
              if (a.voluntario_alocado === volunteer.name) {
                  const eventDetails = events.find(e => e.name === a.evento);
                  volunteerAssignments.push({
                      date: day.date,
                      dayOfWeek: day.dayOfWeek,
                      evento: a.evento,
                      area: a.area,
                      time: eventDetails?.time || '',
                  });
              }
          });
      });

      if (volunteerAssignments.length > 0 && volunteer.phone) {
          const body = generateWhatsAppBody(volunteer.name, volunteerAssignments, schedule.title);
          
          try {
            await client.messages.create({
                body: body,
                from: secrets.TWILIO_WHATSAPP_NUMBER,
                to: `whatsapp:+${volunteer.phone.replace(/\D/g, '')}` // Ensure phone is only digits
            });
            sentCount++;
          } catch (error: any) {
            console.error(`Failed to send to ${volunteer.name}:`, error.message);
            // We continue trying to send to others
          }
      }
  }

  if (sentCount === 0 && volunteersToNotify.length > 0) {
     return { success: false, error: 'Não foi possível enviar nenhuma mensagem. Verifique as credenciais do Twilio e os números dos voluntários.', sentCount: 0 };
  }

  return { success: true, sentCount };
}
