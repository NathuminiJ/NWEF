function env(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devFallback;
}

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const config = {
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  appName: process.env.APP_NAME ?? 'NWEF Online Application Portal',
  otpSecret: env('OTP_SECRET', 'dev-only-otp-secret-change-me'),
  sessionSecret: env('SESSION_SECRET', 'dev-only-session-secret-change-me'),
  auditSecret: env('AUDIT_SECRET', 'dev-only-audit-secret-change-me'),
  pdpaEncryptionKey: env('PDPA_ENCRYPTION_KEY', 'ZGV2LW9ubHktMzItYnl0ZS1rZXktY2hhbmdlLW1lISE='),
  storage: {
    driver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 's3',
    localDir: process.env.LOCAL_STORAGE_DIR ?? '.storage',
    bucket: process.env.S3_BUCKET ?? 'nwef-documents',
    region: process.env.S3_REGION ?? 'ap-southeast-1',
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  },
  otp: {
    driver: (process.env.OTP_DRIVER ?? 'console') as 'console' | 'twilio',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
    length: 6,
    ttlMinutes: 10,
    maxRequestsPerWindow: 3,
    requestWindowMinutes: 15,
    maxVerifyAttempts: 5,
  },
  business: {
    screeningTurnaroundDays: numberEnv('SCREENING_TURNAVEROUND_DAYS', 10),
    slaWarningDays: numberEnv('SLA_WARNING_DAYS', 2),
    minRecommendationScore: numberEnv('MIN_PANEL_SCORE_FOR_RECOMMENDATION', 3.5),
    currency: process.env.CURRENCY ?? 'LKR',
  },
  pdf: {
    logoPath: process.env.AWARD_LETTER_LOGO_PATH,
    signatoryName: process.env.AWARD_SIGNATORY_NAME ?? 'Chairman, NWEF Trust Board',
  },
  upload: {
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  cookieName: 'nwef_session',
} as const;
