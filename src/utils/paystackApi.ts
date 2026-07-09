import BaseAPI from "./baseApi";
import config from "../config";

export interface InitializePaymentArgs {
  amount: number;
  email: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

export interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    id?: number;
    domain?: string;
    status: string;
    reference: string;
    amount: number;
    gateway_response?: string;
    paid_at?: string;
    created_at?: string;
    channel?: string;
    currency?: string;
    metadata?: Record<string, any>;
    customer?: {
      email: string;
    };
  };
}

export class PaystackAPI extends BaseAPI {
  constructor() {
    super(config.paystackBaseUrl || "https://api.paystack.co");
  }

  private getHeaders(): RequestInit["headers"] {
    return {
      Authorization: `Bearer ${config.paystackSecretKey}`,
    };
  }

  public async initializePayment(
    args: InitializePaymentArgs
  ): Promise<InitializePaymentResponse> {
    return this.post<InitializePaymentResponse>("/transaction/initialize", args, undefined, {
      headers: this.getHeaders(),
    });
  }

  public async verifyPayment(
    reference: string
  ): Promise<VerifyPaymentResponse> {
    return this.get<VerifyPaymentResponse>(`/transaction/verify/${encodeURIComponent(reference)}`, undefined, {
      headers: this.getHeaders(),
    });
  }
}

export const paystackAPI = new PaystackAPI();
export default paystackAPI;
