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

async function verifyPaystackRefCore(rawRef: string) {
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
            activation: { success: isSuccessful },
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

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let rawRef = (req.query?.reference || req.query?.slug || req.query?.ref || '') as string;
    if (!rawRef && req.url) {
      const match = req.url.match(/\/verify\/([^?]+)/);
      if (match && match[1]) {
        rawRef = decodeURIComponent(match[1]);
      }
    }
    const result = await verifyPaystackRefCore(rawRef);
    return res.status(result.statusCode).json(result.body);
  } catch (err: any) {
    console.error('[Vercel Paystack Verify] Handler error:', err);
    return res.status(500).json({
      success: false,
      verified: false,
      error: err?.message || 'Server error verifying payment',
    });
  }
}
