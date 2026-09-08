import crypto from 'crypto';

function getSecretKey(): string {
  const envKey = process.env.PAYSTACK_SECRET_KEY;
  if (envKey && envKey !== 'sk_live_5cbc6fe7efd4cbbda704ad5450f38b31a81ae80d' && envKey.startsWith('sk_')) {
    return envKey;
  }
  return 'sk_live_f36e65abf11267b133af3a3d20901e0931c49c02';
}

function getPublicKey(): string {
  const envPub = process.env.PAYSTACK_PUBLIC_KEY;
  if (envPub && envPub !== 'pk_live_deaacb75c134e2c4a921c2674e65d4319d4b1fa4' && envPub.startsWith('pk_')) {
    return envPub;
  }
  return 'pk_live_70e9ddbaca92590a8bfbd673b80abb40f083ac96';
}

async function safePaystackFetch(url: string, options: any = {}): Promise<any> {
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
    let data: any = null;
    let isJson = false;
    if (rawText && rawText.trim().length > 0) {
      try {
        data = JSON.parse(rawText);
        isJson = true;
      } catch {
        isJson = false;
      }
    }
    return { ok: response.ok, status: response.status, data, rawText, isJson };
  } catch (err: any) {
    return { ok: false, status: 0, data: null, rawText: err?.message || 'Network communication error', isJson: false };
  }
}

async function initPaystackTransactionCore(body: any, originHeader?: string, refererHeader?: string) {
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
            },
          }),
        }
      );

      if (!isJson) {
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

async function parseRequestBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
  }
  if (req.method === 'GET' || req.method === 'OPTIONS') return {};
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = await parseRequestBody(req);
    const origin = req.headers?.origin || '';
    const referer = req.headers?.referer || '';
    const result = await initPaystackTransactionCore(body, origin, referer);

    return res.status(result.statusCode).json(result.body);
  } catch (err: any) {
    console.error('[Vercel Paystack Initialize] Handler error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Server error initializing payment',
    });
  }
}
