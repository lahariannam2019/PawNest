export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailProvider {
  send(options: MailOptions): Promise<void>;
}

export class ConsoleMailProvider implements MailProvider {
  async send(options: MailOptions): Promise<void> {
    console.log('--------------------------------------------------');
    console.log(`[DEV EMAIL] To: ${options.to}`);
    console.log(`[DEV EMAIL] Subject: ${options.subject}`);
    console.log(`[DEV EMAIL] Body:\n${options.text}`);
    console.log('--------------------------------------------------');
  }
}

export const mailProvider: MailProvider = new ConsoleMailProvider();
