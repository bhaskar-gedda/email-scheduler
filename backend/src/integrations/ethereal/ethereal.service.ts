import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../config/env';
import { logger } from '../../config/logger';

export interface SendEmailParams {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
  clientMessageId?: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | null;
}

export class EtherealService {
  private fallbackTransporter: Transporter | null = null;

  /**
   * Initializes or gets the fallback test transporter if individual sender SMTP is omitted.
   */
  private async getFallbackTransporter(): Promise<Transporter> {
    if (this.fallbackTransporter) {
      return this.fallbackTransporter;
    }

    let user = config.ETHEREAL_USER;
    let pass = config.ETHEREAL_PASSWORD;

    // If no credentials in env, automatically generate an Ethereal test account
    if (!user || !pass) {
      logger.info('Generating automatic Ethereal test account credentials...');
      const testAccount = await nodemailer.createTestAccount();
      user = testAccount.user;
      pass = testAccount.pass;
      logger.info(
        { user, host: testAccount.smtp.host },
        'Ethereal test account created successfully'
      );
    }

    this.fallbackTransporter = nodemailer.createTransport({
      host: config.ETHEREAL_HOST || 'smtp.ethereal.email',
      port: config.ETHEREAL_PORT || 587,
      secure: config.ETHEREAL_SECURE,
      auth: { user, pass },
    });

    return this.fallbackTransporter;
  }

  /**
   * Sends an email via Nodemailer using either sender-specific SMTP or the Ethereal fallback.
   */
  public async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    let transporter: Transporter;

    if (params.smtpHost && params.smtpUser && params.smtpPassword) {
      transporter = nodemailer.createTransport({
        host: params.smtpHost,
        port: params.smtpPort || 587,
        secure: params.smtpPort === 465,
        auth: {
          user: params.smtpUser,
          pass: params.smtpPassword,
        },
      });
    } else {
      transporter = await this.getFallbackTransporter();
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${params.fromName}" <${params.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: params.body.replace(/\n/g, '<br/>'),
    };

    if (params.clientMessageId) {
      mailOptions.messageId = params.clientMessageId;
    }

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    logger.info(
      {
        to: params.to,
        from: params.fromEmail,
        messageId: info.messageId,
        previewUrl,
      },
      'Email successfully sent via Ethereal SMTP'
    );

    return {
      messageId: info.messageId,
      previewUrl: previewUrl ? String(previewUrl) : null,
    };
  }
}

export const etherealService = new EtherealService();
