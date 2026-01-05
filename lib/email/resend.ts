import nodemailer from 'nodemailer';

// Gmail SMTP configuration
// Requires: GMAIL_USER and GMAIL_APP_PASSWORD env vars
// To get an app password: Google Account > Security > 2-Step Verification > App passwords
const transporter = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  : null;

const FROM_EMAIL = process.env.GMAIL_USER || 'noreply@example.com';
const FROM_NAME = process.env.FROM_NAME || 'RoundRobin';

interface MeetingReminderParams {
  to: string;
  contactName: string;
  userName: string;
  meetingTime: Date;
  conferenceLink?: string | null;
  duration: number;
  meetingType?: string;
}

interface MeetingConfirmationParams {
  to: string;
  contactName: string;
  userName: string;
  userEmail: string;
  meetingTime: Date;
  conferenceLink?: string | null;
  duration: number;
  meetingType?: string;
}

export async function sendMeetingReminder(params: MeetingReminderParams) {
  if (!transporter) {
    console.log('Gmail not configured (GMAIL_USER/GMAIL_APP_PASSWORD), skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const { to, contactName, userName, meetingTime, conferenceLink, duration, meetingType } = params;

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

  const subject = `Reminder: Your meeting with ${userName} ${meetingType ? `- ${meetingType}` : ''}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Meeting Reminder</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${contactName},</p>

    <p>This is a friendly reminder about your upcoming meeting:</p>

    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">With:</td>
          <td style="padding: 8px 0; font-weight: 600;">${userName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Date:</td>
          <td style="padding: 8px 0; font-weight: 600;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Time:</td>
          <td style="padding: 8px 0; font-weight: 600;">${formattedTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Duration:</td>
          <td style="padding: 8px 0; font-weight: 600;">${duration} minutes</td>
        </tr>
        ${meetingType ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Type:</td>
          <td style="padding: 8px 0; font-weight: 600;">${meetingType}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${conferenceLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${conferenceLink}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Join Meeting</a>
    </div>
    ` : ''}

    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      If you need to reschedule or cancel, please reply to this email or contact us as soon as possible.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      This email was sent by RoundRobin scheduling system.
    </p>
  </div>
</body>
</html>
`;

  const text = `
Meeting Reminder

Hi ${contactName},

This is a friendly reminder about your upcoming meeting:

With: ${userName}
Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${duration} minutes
${meetingType ? `Type: ${meetingType}` : ''}

${conferenceLink ? `Join the meeting: ${conferenceLink}` : ''}

If you need to reschedule or cancel, please reply to this email or contact us as soon as possible.

---
This email was sent by RoundRobin scheduling system.
`;

  try {
    const info = await transporter.sendMail({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send reminder email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendMeetingConfirmation(params: MeetingConfirmationParams) {
  if (!transporter) {
    console.log('Gmail not configured (GMAIL_USER/GMAIL_APP_PASSWORD), skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const { to, contactName, userName, userEmail, meetingTime, conferenceLink, duration, meetingType } = params;

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

  const subject = `Meeting Confirmed: ${meetingType || 'Meeting'} with ${userName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Meeting Confirmed!</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi ${contactName},</p>

    <p>Your meeting has been confirmed. Here are the details:</p>

    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">With:</td>
          <td style="padding: 8px 0; font-weight: 600;">${userName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Email:</td>
          <td style="padding: 8px 0;">${userEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Date:</td>
          <td style="padding: 8px 0; font-weight: 600;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Time:</td>
          <td style="padding: 8px 0; font-weight: 600;">${formattedTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Duration:</td>
          <td style="padding: 8px 0; font-weight: 600;">${duration} minutes</td>
        </tr>
        ${meetingType ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Type:</td>
          <td style="padding: 8px 0; font-weight: 600;">${meetingType}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${conferenceLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${conferenceLink}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Add to Calendar</a>
    </div>
    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      Meeting link: <a href="${conferenceLink}" style="color: #667eea;">${conferenceLink}</a>
    </p>
    ` : ''}

    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      We'll send you a reminder before the meeting. If you need to reschedule or cancel, please reply to this email.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      This email was sent by RoundRobin scheduling system.
    </p>
  </div>
</body>
</html>
`;

  const text = `
Meeting Confirmed!

Hi ${contactName},

Your meeting has been confirmed. Here are the details:

With: ${userName}
Email: ${userEmail}
Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${duration} minutes
${meetingType ? `Type: ${meetingType}` : ''}

${conferenceLink ? `Meeting link: ${conferenceLink}` : ''}

We'll send you a reminder before the meeting. If you need to reschedule or cancel, please reply to this email.

---
This email was sent by RoundRobin scheduling system.
`;

  try {
    const info = await transporter.sendMail({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
