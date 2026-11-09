export function sendVerificationEmailServer(
  toEmail: string,
  toName: string,
  code: string
): Promise<{ sent: boolean; error?: string }>;
