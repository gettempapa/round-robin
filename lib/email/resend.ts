import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'meetings@roundrobin.app';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'RoundRobin';

interface SendMeetingReminderParams {
  to: string;
  contactName: string;
  userName: string;
  userEmail: string;
  meetingTime: Date;
  duration: number;
  conferenceLink?: string | null;
  meetingTypeName?: string | null;
  customSubject?: string;
}

export async function sendMeetingReminder({
  to,
  contactName,
  userName,
  userEmail,
  meetingTime,
  duration,
  conferenceLink,
  meetingTypeName,
  customSubject,
}: SendMeetingReminderParams) {
  const formattedDate = meetingTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = meetingTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const subject = customSubject || `Reminder: Your meeting with ${userName} is coming up`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meeting Reminder</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Meeting Reminder</h1>
      </div>

      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; margin-top: 0;">Hi ${contactName},</p>

        <p style="font-size: 16px;">This is a friendly reminder about your upcoming meeting:</p>

        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
          ${meetingTypeName ? `<p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">${meetingTypeName}</p>` : ''}
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${formattedTime}</p>
          <p style="margin: 0 0 10px 0;"><strong>Duration:</strong> ${duration} minutes</p>
          <p style="margin: 0;"><strong>With:</strong> ${userName}</p>
        </div>

        ${conferenceLink ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${conferenceLink}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Join Meeting
          </a>
        </div>
        ` : ''}

        <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
          If you need to reschedule, please contact ${userName} at ${userEmail}.
        </p>
      </div>

      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">Sent by RoundRobin</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Meeting Reminder

Hi ${contactName},

This is a friendly reminder about your upcoming meeting:

${meetingTypeName ? `Type: ${meetingTypeName}\n` : ''}Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${duration} minutes
With: ${userName}

${conferenceLink ? `Join the meeting: ${conferenceLink}\n` : ''}

If you need to reschedule, please contact ${userName} at ${userEmail}.

---
Sent by RoundRobin
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

interface SendMeetingConfirmationParams {
  to: string;
  contactName: string;
  userName: string;
  userEmail: string;
  meetingTime: Date;
  duration: number;
  conferenceLink?: string | null;
  meetingTypeName?: string | null;
}

export async function sendMeetingConfirmation({
  to,
  contactName,
  userName,
  userEmail,
  meetingTime,
  duration,
  conferenceLink,
  meetingTypeName,
}: SendMeetingConfirmationParams) {
  const formattedDate = meetingTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = meetingTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const subject = `Meeting Confirmed: ${meetingTypeName || 'Meeting'} with ${userName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meeting Confirmed</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Meeting Confirmed!</h1>
      </div>

      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; margin-top: 0;">Hi ${contactName},</p>

        <p style="font-size: 16px;">Your meeting has been scheduled successfully!</p>

        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
          ${meetingTypeName ? `<p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">${meetingTypeName}</p>` : ''}
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${formattedTime}</p>
          <p style="margin: 0 0 10px 0;"><strong>Duration:</strong> ${duration} minutes</p>
          <p style="margin: 0;"><strong>With:</strong> ${userName}</p>
        </div>

        ${conferenceLink ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${conferenceLink}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Add to Calendar
          </a>
        </div>
        <p style="text-align: center; font-size: 14px; color: #6b7280;">
          Meeting link: <a href="${conferenceLink}" style="color: #667eea;">${conferenceLink}</a>
        </p>
        ` : ''}

        <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
          A calendar invitation has been sent to your email. If you need to reschedule, please contact ${userName} at ${userEmail}.
        </p>
      </div>

      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">Sent by RoundRobin</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
