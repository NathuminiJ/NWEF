import { Prisma } from '@prisma/client';
import { config } from './config';

async function sendTwilio(to: string, body: string): Promise<void> {
  const { twilioAccountSid, twilioAuthToken, twilioFromNumber } = config.otp;
  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
    console.error('[notifications] Twilio is not configured');
    return;
  }
  const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: twilioFromNumber, Body: body }),
    },
  );
  if (!response.ok) console.error('[notifications] SMS delivery failed', response.status);
}

export async function sendOtpCode(identifier: string, code: string): Promise<void> {
  const message = `${code} is your NWEF portal verification code. It expires in ${config.otp.ttlMinutes} minutes. Do not share it.`;
  if (config.otp.driver === 'console') {
    // eslint-disable-next-line no-console
    console.info(`[OTP] ${identifier}: ${code}`);
    return;
  }
  await sendTwilio(identifier, message);
}

export async function deliverNotification(
  userId: string,
  template: string,
  payload: Record<string, unknown>,
  channels: Array<'SMS' | 'EMAIL' | 'IN_APP'> = ['IN_APP'],
): Promise<void> {
  const { prisma } = await import('./db');
  for (const channel of channels) {
    const record = await prisma.notification.create({
      data: { userId, channel, template, payload: payload as Prisma.InputJsonValue },
    });
    if (channel === 'SMS' && typeof payload.phone === 'string' && typeof payload.message === 'string') {
      await sendTwilio(payload.phone, payload.message);
    }
    await prisma.notification.update({
      where: { id: record.id },
      data: { status: channel === 'IN_APP' || config.otp.driver === 'twilio' ? 'SENT' : 'PENDING', sentAt: new Date() },
    });
  }
}
