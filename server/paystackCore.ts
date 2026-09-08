import crypto from 'crypto';
import { activateUserSubscriptionInFirestore } from '../src/lib/firebase';

// Helper to get Paystack Secret Key safely (strictly server-side, never exposed to client)
export function getSecretKey(): string {
  const envKey = process.env.PAYSTACK_SECRET_KEY;
  if (envKey && envKey !== 'sk_live_5cbc6fe7efd4cbbda704ad5450f38b31a81ae80d' && envKey.startsWith('sk_')) {
    return envKey;
  }
  return 'sk_live_f36e65abf11267b133af3a3d20901e0931c49c02';
}

// Helper to get Paystack Public Key
export function getPublicKey(): string {
  const envPub = process.env.PAYSTACK_PUBLIC_KEY;
  if (envPub && envPub !== 'pk_live_deaacb75c134e2c4a921c2674e65d4319d4b1fa4' && envPub.startsWith('pk_')) {
    return envPub;
  }
  return 'pk_live_70e9ddbaca92590a8bfbd673b80abb40f083ac96';
}

export interface SafePaystackResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  rawText: string;
  isJson: boolean;
}

// Resilient fetch helper that handles non-JSON / HTML / Cloudflare error responses safely without SyntaxError
export async function safePaystackFetch<T = any>(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<SafePaystackResult<T>> {
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Grobaax/1.0 (Academic Network; Node.js)',
        ...(options.headers || {}),
      },
      body: options.body,
    });

    const rawText = await response.text();
    let data: T | null = null;
    let isJson = false;

    if (rawText && rawText.trim().length > 0) {
      try {
        data = JSON.parse(rawText);
        isJson = true;
      } catch {
        isJson = false;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      rawText,
      isJson,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      rawText: err?.message || 'Network communication error',
      isJson: false,
    };
  }
}

// Core initialization logic
export async function initPaystackTransactionCore(
  body: any,
  originHeader?: string,
  refererHeader?: string
) {
  const {
    planId,
    planName,
    amountNaira,
    email,
    userId,
    userName,
    callbackUrl,
  } = body || {};

  if (!amountNaira || isNaN(Number(amountNaira)) || Number(amountNaira) <= 0) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'A valid amount in Naira is required.',
      },
    };
  }

  const cleanEmail = email && email.includes('@') ? email.trim() : 'scholar@grobaax.org';
  const amountInKobo = Math.round(Number(amountNaira) * 100);
  const reference = `GRBX_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const secretKey = getSecretKey();
  const publicKey = getPublicKey();

  let resolvedCallback = callbackUrl;
  if (!resolvedCallback) {
    try {
      const clientOrigin = originHeader || (refererHeader ? new URL(refererHeader).origin : '');
      if (clientOrigin) {
        resolvedCallback = `${clientOrigin}/?reference=${reference}&planId=${encodeURIComponent(planId || '')}`;
      }
    } catch {}
  }

  if (secretKey && (secretKey.startsWith('sk_live_') || secretKey.startsWith('sk_test_'))) {
    try {
      const { status, data, rawText, isJson } = await safePaystackFetch(
        'https://api.paystack.co/transaction/initialize',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: cleanEmail,
            amount: amountInKobo,
            reference,
            currency: 'NGN',
            callback_url: resolvedCallback || undefined,
            channels: ['card', 'bank', 'bank_transfer', 'ussd', 'qr', 'mobile_money'],
            metadata: {
              userId: userId || 'scholar',
              scholar_uid: userId || 'scholar',
              userName: userName || 'Scholar',
              userEmail: cleanEmail,
              planId: planId || 'premium_1m',
              planName: planName || 'Premium',
              amountNaira: Number(amountNaira),
              platform: 'grobax_web',
              timestamp: Date.now(),
              custom_fields: [
                {
                  display_name: 'Plan Name',
                  variable_name: 'plan_name',
                  value: planName || 'Premium',
                },
                {
                  display_name: 'Scholar UID',
                  variable_name: 'scholar_uid',
                  value: userId || 'unknown',
                },
              ],
            },
          }),
        }
      );

      if (!isJson) {
        console.warn(`[Paystack Initialize] Non-JSON body (HTTP ${status}):`, rawText.slice(0, 150));
        return {
          statusCode: 502,
          body: {
            success: false,
            error: `Paystack API returned an unexpected response (HTTP ${status}). Please check network status and retry.`,
          },
        };
      }

      if (data && data.status && data.data) {
        return {
          statusCode: 200,
          body: {
            success: true,
            isLive: secretKey.startsWith('sk_live_'),
            reference,
            authorization_url: data.data.authorization_url,
            access_code: data.data.access_code,
            publicKey,
            amountNaira: Number(amountNaira),
            currency: 'NGN',
          },
        };
      } else {
        return {
          statusCode: 400,
          body: {
            success: false,
            error: data?.message || 'Failed to initialize Paystack transaction.',
          },
        };
      }
    } catch (apiErr: any) {
      console.error('[Paystack Initialize] Network error:', apiErr);
      return {
        statusCode: 502,
        body: {
          success: false,
          error: 'Could not connect to Paystack payment gateway. Please check your network.',
        },
      };
    }
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      isSimulated: true,
      reference,
      publicKey,
      amountNaira: Number(amountNaira),
      currency: 'NGN',
      message: 'Running in fallback mode.',
    },
  };
}

// Core charge-transfer logic
export async function chargeTransferCore(body: any) {
  const {
    planId,
    planName,
    amountNaira,
    email,
    userId,
    userName,
  } = body || {};

  if (!amountNaira || isNaN(Number(amountNaira)) || Number(amountNaira) <= 0) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'A valid amount in Naira is required.',
      },
    };
  }

  const cleanEmail = email && email.includes('@') ? email.trim().toLowerCase() : 'scholar@grobaax.org';
  const amountInKobo = Math.round(Number(amountNaira) * 100);
  const reference = `GRBX_TRF_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const secretKey = getSecretKey();

  if (!secretKey || (!secretKey.startsWith('sk_live_') && !secretKey.startsWith('sk_test_'))) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Paystack live secret key is not configured in server environment.',
      },
    };
  }

  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  try {
    const chargeResult = await safePaystackFetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        amount: amountInKobo,
        reference,
        currency: 'NGN',
        bank_transfer: {
          account_expires_at: expiresAt,
        },
        metadata: {
          userId: userId || 'scholar',
          scholar_uid: userId || 'scholar',
          userName: userName || 'Scholar',
          userEmail: cleanEmail,
          planId: planId || 'premium_1m',
          planName: planName || 'Premium',
          amountNaira: Number(amountNaira),
          platform: 'grobax_web',
          timestamp: Date.now(),
        },
      }),
    });

    const chargeData = chargeResult.data;

    if (chargeData && chargeData.status && chargeData.data) {
      const d = chargeData.data;
      const bankName = d.bank?.name || (d.bank?.slug === 'titan-paystack' ? 'Titan Trust Bank' : 'Paystack-Titan');
      const accountNumber = d.account_number;

      if (accountNumber) {
        return {
          statusCode: 200,
          body: {
            success: true,
            reference,
            accountNumber,
            accountName: d.account_name || 'Grobaax / Paystack',
            bankName,
            bankSlug: d.bank?.slug || 'titan-trust',
            amountNaira: Number(amountNaira),
            expiresAt: d.account_expires_at || expiresAt,
            displayText: `Transfer exactly ₦${Number(amountNaira).toLocaleString()} to ${bankName} account ${accountNumber}`,
            status: d.status,
          },
        };
      }
    }

    // Fallback to initialize
    const initResult = await safePaystackFetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        amount: amountInKobo,
        reference,
        currency: 'NGN',
        channels: ['bank_transfer', 'card', 'bank', 'ussd'],
        metadata: {
          userId: userId || 'scholar',
          userName: userName || 'Scholar',
          userEmail: cleanEmail,
          planId: planId || 'premium_1m',
          planName: planName || 'Premium',
          amountNaira: Number(amountNaira),
          platform: 'grobax_web',
          timestamp: Date.now(),
        },
      }),
    });

    const initData = initResult.data;
    if (initData && initData.status && initData.data) {
      return {
        statusCode: 200,
        body: {
          success: true,
          reference,
          authorization_url: initData.data.authorization_url,
          access_code: initData.data.access_code,
          amountNaira: Number(amountNaira),
          fallbackCheckout: true,
        },
      };
    }

    return {
      statusCode: 400,
      body: {
        success: false,
        error: initData?.message || 'Could not generate transfer account from Paystack.',
      },
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: {
        success: false,
        error: err.message || 'Error creating transfer account.',
      },
    };
  }
}

// Core verification logic
export async function verifyPaystackRefCore(rawRef: string) {
  if (!rawRef || rawRef === 'undefined' || rawRef === 'null') {
    return {
      statusCode: 400,
      body: {
        success: false,
        verified: false,
        status: 'failed',
        error: 'Payment reference parameter is required.',
      },
    };
  }

  const reference = rawRef.trim();
  const secretKey = getSecretKey();

  if (secretKey && (secretKey.startsWith('sk_live_') || secretKey.startsWith('sk_test_'))) {
    try {
      const { status, data, rawText, isJson } = await safePaystackFetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );

      if (!isJson) {
        console.warn(`[Paystack Verify] Non-JSON response (HTTP ${status}):`, rawText.slice(0, 120));
        return {
          statusCode: 200,
          body: {
            success: false,
            verified: false,
            status: 'failed',
            error: `Paystack API returned an unexpected response (HTTP ${status}). Please retry in a few moments.`,
          },
        };
      }

      if (data && data.status && data.data) {
        const tx = data.data;
        const isSuccessful = tx.status === 'success';
        const isPending = tx.status === 'ongoing' || tx.status === 'pending_bank_transfer' || tx.status === 'pending';

        let activationResult: any = null;
        if (isSuccessful) {
          try {
            activationResult = await activateUserSubscriptionInFirestore({
              reference: tx.reference,
              userId: tx.metadata?.userId || tx.metadata?.scholar_uid || '',
              userEmail: tx.customer?.email || '',
              userName: tx.metadata?.userName || '',
              planId: tx.metadata?.planId,
              planName: tx.metadata?.planName,
              amountNaira: tx.amount ? tx.amount / 100 : 0,
              channel: tx.channel || 'paystack',
            });
          } catch (fireErr) {
            console.warn('[Paystack Verify] Firestore activation notice:', fireErr);
          }
        }

        return {
          statusCode: 200,
          body: {
            success: isSuccessful,
            verified: isSuccessful,
            isPending,
            status: tx.status,
            reference: tx.reference,
            amountNaira: tx.amount ? tx.amount / 100 : 0,
            currency: tx.currency,
            paidAt: tx.paid_at,
            channel: tx.channel,
            planId: tx.metadata?.planId,
            planName: tx.metadata?.planName,
            customer: tx.customer,
            gatewayResponse: tx.gateway_response,
            activation: activationResult,
          },
        };
      } else {
        return {
          statusCode: 200,
          body: {
            success: false,
            verified: false,
            status: 'failed',
            error: data?.message || 'Transaction verification could not be confirmed.',
          },
        };
      }
    } catch (apiErr: any) {
      return {
        statusCode: 502,
        body: {
          success: false,
          verified: false,
          status: 'failed',
          error: 'Could not connect to Paystack for verification.',
        },
      };
    }
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      verified: true,
      status: 'success',
      isSimulated: true,
      reference,
      paidAt: new Date().toISOString(),
      amountNaira: 0,
      planId: reference.startsWith('plan_') ? reference : undefined,
    },
  };
}
