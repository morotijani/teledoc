import axios from 'axios';

export interface InitiatePaymentParams {
  patientId: string;
  phoneNumber: string;
  amount: number;
  channel?: string; // 'mtn-gh' | 'vodafone-gh' | 'tigo-gh' | 'card'
  description?: string;
  clientReference: string;
}

export interface HubtelPaymentResponse {
  success: boolean;
  checkoutUrl?: string;
  transactionId?: string;
  clientReference: string;
  message?: string;
  raw?: any;
}

const HUBTEL_CLIENT_ID = process.env.HUBTEL_CLIENT_ID || '';
const HUBTEL_CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET || '';
const HUBTEL_MERCHANT_ACCOUNT_NUMBER = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || '2018899';
const HUBTEL_CALLBACK_URL = process.env.HUBTEL_CALLBACK_URL || 'http://localhost:5000/api/v1/webhooks/hubtel';

export class HubtelPaymentService {
  /**
   * Generates a Basic Auth header for Hubtel API
   */
  private static getAuthHeader(): string {
    const credentials = `${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  /**
   * Initiates a 10 GHS subscription payment checkout via Hubtel Merchant API
   */
  public static async initiateSubscriptionCheckout(
    params: InitiatePaymentParams
  ): Promise<HubtelPaymentResponse> {
    const payload = {
      totalAmount: params.amount,
      description: params.description || 'TeleDoc 1-Month Telehealth Subscription (10 GHS)',
      callbackUrl: HUBTEL_CALLBACK_URL,
      returnUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/subscription/success`,
      cancellationUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/subscription/cancel`,
      merchantAccountNumber: HUBTEL_MERCHANT_ACCOUNT_NUMBER,
      clientReference: params.clientReference,
      payee: {
        msisdn: params.phoneNumber,
      },
    };

    try {
      // In live environment with valid credentials, calls Hubtel Online Checkout API
      if (HUBTEL_CLIENT_ID && HUBTEL_CLIENT_SECRET && !HUBTEL_CLIENT_ID.includes('placeholder')) {
        const response = await axios.post(
          'https://api-checkout-v2.hubtel.com/v2/merchantaccount/merchants/' +
            HUBTEL_MERCHANT_ACCOUNT_NUMBER +
            '/postprocess',
          payload,
          {
            headers: {
              Authorization: this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
          }
        );

        return {
          success: true,
          checkoutUrl: response.data.data?.checkoutUrl,
          transactionId: response.data.data?.checkoutId,
          clientReference: params.clientReference,
          raw: response.data,
        };
      }

      // Simulation mode for sandbox / dev
      console.log('[Hubtel Dev Simulation] Initiating Checkout for:', params.clientReference, 'Amount:', params.amount);
      return {
        success: true,
        checkoutUrl: `https://payproxy.hubtel.com/mock-checkout/${params.clientReference}?amount=${params.amount}`,
        transactionId: `HUB_SIM_${Date.now()}`,
        clientReference: params.clientReference,
        message: 'Sandbox simulated checkout session created',
      };
    } catch (error: any) {
      console.error('[Hubtel Service] Error initiating checkout:', error?.response?.data || error.message);
      return {
        success: false,
        clientReference: params.clientReference,
        message: error?.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Verifies Hubtel transaction status
   */
  public static async verifyTransaction(clientReference: string): Promise<{
    status: 'PAID' | 'FAILED' | 'PENDING';
    transactionId?: string;
    amount?: number;
    raw?: any;
  }> {
    try {
      if (HUBTEL_CLIENT_ID && HUBTEL_CLIENT_SECRET && !HUBTEL_CLIENT_ID.includes('placeholder')) {
        const response = await axios.get(
          `https://api-checkout-v2.hubtel.com/v2/merchantaccount/merchants/${HUBTEL_MERCHANT_ACCOUNT_NUMBER}/status/${clientReference}`,
          {
            headers: {
              Authorization: this.getAuthHeader(),
            },
          }
        );

        const status = response.data.data?.status;
        return {
          status: status === 'Success' ? 'PAID' : status === 'Pending' ? 'PENDING' : 'FAILED',
          transactionId: response.data.data?.transactionId,
          amount: response.data.data?.amount,
          raw: response.data,
        };
      }

      // Dev mock verification
      return {
        status: 'PAID',
        transactionId: `MOCK_TXN_${clientReference}`,
        amount: 10.0,
      };
    } catch (error) {
      console.error('[Hubtel Service] Verification failed:', error);
      return { status: 'PENDING' };
    }
  }
}
