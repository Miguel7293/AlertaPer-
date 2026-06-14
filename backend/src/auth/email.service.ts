import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

export type EmailDeliveryResult =
  | { mode: 'smtp'; messageId: string | false }
  | { mode: 'demo'; devCode: string };

@Injectable()
export class EmailService {
  private readonly logger = new Logger('Email');
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !user || !pass) return null;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: { user, pass },
    });
    return this.transporter;
  }

  async sendVerificationCode(to: string, code: string): Promise<EmailDeliveryResult> {
    const transporter = this.getTransporter();
    if (!transporter) return { mode: 'demo', devCode: code };

    const from = this.config.get<string>('SMTP_FROM') ?? 'DenunciaPE <no-reply@denunciape.pe>';
    const appName = this.config.get<string>('MAIL_APP_NAME') ?? 'DenunciaPE';
    const result = await transporter.sendMail({
      from,
      to,
      subject: `${appName}: codigo de verificacion`,
      text: `Tu codigo de verificacion es ${code}. Expira en 10 minutos.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
          <h2 style="margin:0 0 12px">Verifica tu correo</h2>
          <p>Usa este codigo para continuar con tu denuncia:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:18px 0">${code}</p>
          <p style="color:#64748b">Expira en 10 minutos. Si no solicitaste este codigo, puedes ignorar este mensaje.</p>
        </div>
      `,
    });

    this.logger.log(`Codigo de verificacion enviado a ${to}`);
    return { mode: 'smtp', messageId: result.messageId };
  }
}
