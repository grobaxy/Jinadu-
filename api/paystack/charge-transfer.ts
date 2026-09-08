import crypto from 'crypto';

// Helper to get Paystack Secret Key safely
function getSecretKey(): string {
  const envKey = process.env.PAYSTACK_SECRET_KEY;
  if (envKey && envKey !== 'sk_live_5cbc6fe7efd4cbbda704ad5450f38b31a81ae80d' && envKey.startsWith('sk_')) {
    return envKey;
  }
  return 'sk_live_f36e65abf11267b133af3a3d20901e0931c49c02';
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

async function chargeTransferCore(body: any) {
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
        let authorization_url = '';
        try {
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
              channels: ['bank_transfer', 'card', 'bank', 'ussd', 'qr'],
              metadata: {
                userId: userId || 'scholar',
                userName: userName || 'Scholar',
                userEmail: cleanEmail,
                planId: planId || 'premium_1m',
                planName: planName || 'Premium',
                amountNaira: Number(amountNaira),
              },
            }),
          });
          if (initResult.data?.data?.authorization_url) {
            authorization_url = initResult.data.data.authorization_url;
          }
        } catch {}

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
            authorization_url,
            displayText: `Transfer exactly ₦${Number(amountNaira).toLocaleString()} to ${bankName} account ${accountNumber}`,
            status: d.status,
          },
        };
      }
    }

    // Fallback to initialize transaction
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
    const result = await chargeTransferCore(body);
    return res.status(result.statusCode).json(result.body);
  } catch (err: any) {
    console.error('[Vercel Paystack Charge Transfer] Handler error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Server error creating transfer account',
    });
  }
}
