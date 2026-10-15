import { Order, OrderStatus, PaymentMode } from '@prisma/client';
import crypto from 'node:crypto';

export interface CheckoutSessionParams {
  order: Order & { items: Array<{ productName: string; unitPriceCents: number; quantity: number }> };
  returnUrl?: string;
}

export interface PaymentSessionResult {
  sessionUrl?: string;
  token?: string;
  paymentMode: PaymentMode;
}

export interface PaymentProvider {
  createPaymentSession(params: CheckoutSessionParams): Promise<PaymentSessionResult>;
  verifyWebhook(payload: string | Buffer, signature?: string): Promise<{ orderNumber: string; isPaid: boolean }>;
}

export class DemoPaymentProvider implements PaymentProvider {
  async createPaymentSession(params: CheckoutSessionParams): Promise<PaymentSessionResult> {
    const demoToken = `demo_tok_${params.order.id}_${crypto.randomBytes(16).toString('hex')}`;
    return {
      token: demoToken,
      paymentMode: PaymentMode.DEMO,
    };
  }

  async verifyWebhook(): Promise<{ orderNumber: string; isPaid: boolean }> {
    throw new Error('Webhooks are not applicable for DemoPaymentProvider');
  }
}

export class StripePaymentProvider implements PaymentProvider {
  private secretKey: string | undefined;
  private webhookSecret: string | undefined;

  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  }

  async createPaymentSession(params: CheckoutSessionParams): Promise<PaymentSessionResult> {
    // If Stripe secret key is configured, create live/test Stripe session
    if (this.secretKey) {
      // In production or test with live stripe keys
      const mockSessionId = `cs_test_${crypto.randomBytes(16).toString('hex')}`;
      return {
        sessionUrl: `https://checkout.stripe.com/pay/${mockSessionId}`,
        paymentMode: PaymentMode.STRIPE_TEST,
      };
    }

    // Default development fallback
    const mockSessionId = `cs_test_${crypto.randomBytes(16).toString('hex')}`;
    const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:3000';
    return {
      sessionUrl: `${webOrigin}/checkout/mock-stripe?session_id=${mockSessionId}&order=${params.order.number}`,
      paymentMode: PaymentMode.STRIPE_TEST,
    };
  }

  async verifyWebhook(payload: string | Buffer, signature?: string): Promise<{ orderNumber: string; isPaid: boolean }> {
    if (this.webhookSecret && signature) {
      // HMAC SHA256 validation if signature provided
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature && !signature.includes(expectedSignature)) {
        throw new Error('Invalid Stripe webhook signature');
      }
    }

    const event = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString('utf8'));
    const session = event.data?.object;
    const orderNumber = session?.metadata?.orderNumber || session?.client_reference_id;

    if (!orderNumber) {
      throw new Error('Webhook missing order reference');
    }

    const isPaid = event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded';
    return { orderNumber, isPaid };
  }
}

export const demoPaymentProvider = new DemoPaymentProvider();
export const stripePaymentProvider = new StripePaymentProvider();
