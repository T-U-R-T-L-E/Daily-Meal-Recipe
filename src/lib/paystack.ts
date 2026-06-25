import { faultTolerantFetch } from './api';

export interface PaystackInitResponse {
  status: 'success' | 'failed';
  authorization_url?: string;
  access_code?: string;
  reference?: string;
  error?: string;
  message?: string;
}

export interface PaystackVerifyResponse {
  status: 'success' | 'failed';
  reference?: string;
  amount?: number;
  currency?: string;
  error?: string;
  message?: string;
  data?: any;
}

/**
 * Initiates a Paystack secure transaction by invoking the backend gateway proxy endpoint.
 * This ensures the Paystack Secret Key is kept safe on the server environment.
 */
export async function initiatePaystackTransaction(
  email: string,
  amount: number,
  currency: string,
  idempotencyKey: string,
  callbackUrl?: string
): Promise<PaystackInitResponse> {
  try {
    const response = await faultTolerantFetch('/api/paystack/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        email,
        amount,
        currency,
        idempotencyKey,
        callbackUrl: callbackUrl || window.location.origin + '/subscription'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errText);
      } catch (e) {
        // Response is not JSON
      }
      throw new Error(parsedErr?.error || parsedErr?.message || `HTTP ${response.status}: Failed to initialize transaction.`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('[Paystack Init Helper Error]:', error);
    return {
      status: 'failed',
      error: error.message || 'Network connection failed during transaction initialization.'
    };
  }
}

/**
 * Client-side verification helper. Calls the secure backend proxy after the
 * payment flow completes to verify the transaction status.
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  try {
    const response = await faultTolerantFetch('/api/paystack/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reference })
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errText);
      } catch (e) {
        // Response is not JSON
      }
      throw new Error(parsedErr?.error || parsedErr?.message || `HTTP ${response.status}: Failed to verify transaction.`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('[Paystack Verify Helper Error]:', error);
    return {
      status: 'failed',
      error: error.message || 'Network connection failed during transaction verification.'
    };
  }
}
