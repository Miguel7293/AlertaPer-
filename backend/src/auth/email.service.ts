import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

export type EmailDeliveryResult =
  | { mode: 'resend'; messageId: string }
  | { mode: 'smtp'; messageId: string | false }
  | { mode: 'demo'; devCode: string };

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger('Email');
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    if (this.hasResendConfig()) {
      this.logger.log('Resend API configurada para el envío de correos');
      return;
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      const message = 'SMTP no configurado: faltan SMTP_HOST, SMTP_USER o SMTP_PASS';
      if (this.isDemoAllowed()) this.logger.warn(`${message}. Se usará el modo demostración local.`);
      else this.logger.error(message);
      return;
    }

    try {
      await transporter.verify();
      this.logger.log('SMTP configurado y accesible');
    } catch (error) {
      this.logger.error(
        `SMTP configurado, pero la conexión o autenticación falló: ${this.errorMessage(error)}`,
      );
    }
  }

  private value(key: string): string {
    return this.config.get<string>(key)?.trim() ?? '';
  }

  private isProduction(): boolean {
    return this.value('NODE_ENV').toLowerCase() === 'production';
  }

  private isDemoAllowed(): boolean {
    return !this.isProduction() && this.value('ALLOW_DEMO_EMAIL').toLowerCase() === 'true';
  }

  private hasResendConfig(): boolean {
    return Boolean(this.value('RESEND_API_KEY') && this.value('RESEND_FROM'));
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'error desconocido';
  }

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const host = this.value('SMTP_HOST');
    const configuredPort = this.value('SMTP_PORT');
    const port = Number(configuredPort || 587);
    const user = this.value('SMTP_USER');
    // Gmail displays app passwords in groups; remove those visual separators.
    const pass = this.value('SMTP_PASS').replace(/\s+/g, '');

    if (!host || !user || !pass || !Number.isInteger(port) || port <= 0) return null;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.value('SMTP_SECURE').toLowerCase() === 'true',
      auth: { user, pass },
    });
    return this.transporter;
  }

  async sendVerificationCode(to: string, code: string): Promise<EmailDeliveryResult> {
    if (this.hasResendConfig()) return this.sendWithResend(to, code);

    const transporter = this.getTransporter();
    if (!transporter) {
      if (this.isDemoAllowed()) return { mode: 'demo', devCode: code };
      throw new ServiceUnavailableException(
        'El servicio de correo no está disponible. Intenta nuevamente en unos minutos.',
      );
    }

    const from = this.value('SMTP_FROM') || 'DenunciaPE <no-reply@denunciape.pe>';
    const appName = this.value('MAIL_APP_NAME') || 'DenunciaPE';
    let result;
    try {
      result = await transporter.sendMail({
        from,
        to,
        subject: `${appName}: código de verificación`,
        text: `Tu código de verificación es ${code}. Expira en 10 minutos.`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
            <h2 style="margin:0 0 12px">Verifica tu correo</h2>
            <p>Usa este código para continuar con tu denuncia:</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:18px 0">${code}</p>
            <p style="color:#64748b">Expira en 10 minutos. Si no solicitaste este código, puedes ignorar este mensaje.</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`No se pudo enviar el correo: ${this.errorMessage(error)}`);
      throw new ServiceUnavailableException(
        'No pudimos enviar el código de verificación. Intenta nuevamente en unos minutos.',
      );
    }

    this.logger.log(`Codigo de verificacion enviado a ${to}`);
    return { mode: 'smtp', messageId: result.messageId };
  }

  private async sendWithResend(to: string, code: string): Promise<EmailDeliveryResult> {
    const appName = this.value('MAIL_APP_NAME') || 'DenunciaPE';
    let response: Response;

    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.value('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.value('RESEND_FROM'),
          to: [to],
          subject: `${appName}: código de verificación`,
          text: `Tu código de verificación es ${code}. Expira en 10 minutos.`,
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
              <h2 style="margin:0 0 12px">Verifica tu correo</h2>
              <p>Usa este código para continuar con tu denuncia:</p>
              <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:18px 0">${code}</p>
              <p style="color:#64748b">Expira en 10 minutos. Si no solicitaste este código, puedes ignorar este mensaje.</p>
            </div>
          `,
        }),
      });
    } catch (error) {
      this.logger.error(`No se pudo conectar con Resend: ${this.errorMessage(error)}`);
      throw new ServiceUnavailableException(
        'No pudimos enviar el código de verificación. Intenta nuevamente en unos minutos.',
      );
    }

    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };
    if (!response.ok || !payload.id) {
      this.logger.error(
        `Resend rechazó el correo (${response.status}): ${payload.message ?? payload.name ?? 'sin detalle'}`,
      );
      throw new ServiceUnavailableException(
        'No pudimos enviar el código de verificación. Revisa la dirección e intenta nuevamente.',
      );
    }

    this.logger.log(`Código de verificación enviado a ${to} mediante Resend`);
    return { mode: 'resend', messageId: payload.id };
  }
}
