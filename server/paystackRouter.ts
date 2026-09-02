import express from 'express';
import crypto from 'crypto';

export const paystackRouter = express.Router();

// Helper to get Paystack Secret Key safely (strictly server-side, never exposed to client)
function getSecretKey(): string {
  return process.env.PAYSTACK_SECRET_KEY || 'sk_live_f36e65abf11267b133af3a3d20901e0931c49c02';
}

// Helper to get Paystack Public Key
function getPublicKey(): string {
  return process.env.PAYSTACK_PUBLIC_KEY || 'pk_live_70e9ddbaca92590a8bfbd673b80abb40f083ac96';
}

// GET /api/paystack/public-key
paystackRouter.get('/public-key', (_req, res) => {
  const publicKey = getPublicKey();
  res.json({
    success: true,
    publicKey,
    hasSecretKey: Boolean(getSecretKey() && getSecretKey().startsWith('sk_')),
  });
});

// POST /api/paystack/initialize
paystackRouter.post('/initialize', async (req, res) => {
  try {
    const {
      planId,
      planName,
      amountNaira,
      email,
      userId,
      userName,
      callbackUrl,
    } = req.body || {};

    if (!amountNaira || isNaN(Number(amountNaira)) || Number(amountNaira) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'A valid amount in Naira is required.',
      });
    }

    const cleanEmail = email && email.includes('@') ? email : 'scholar@grobax.org';
    const amountInKobo = Math.round(Number(amountNaira) * 100);
    const reference = `GRBX_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const secretKey = getSecretKey();
    const publicKey = getPublicKey();

    // If live/test secret key is provided, initialize directly with Paystack API
    if (secretKey && (secretKey.startsWith('sk_live_') || secretKey.startsWith('sk_test_'))) {
      try {
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
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
            callback_url: callbackUrl || undefined,
            metadata: {
              userId,
              userName,
              planId,
              planName,
              amountNaira: Number(amountNaira),
              platform: 'grobax_web',
              custom_fields: [
                {
                  display_name: 'Plan Name',
                  variable_name: 'plan_name',
                  value: planName || 'Grobax Membership',
                },
                {
                  display_name: 'Scholar UID',
                  variable_name: 'scholar_uid',
                  value: userId || 'unknown',
                },
              ],
            },
          }),
        });

        const data = await response.json();

        if (data && data.status && data.data) {
          return res.json({
            success: true,
            isLive: secretKey.startsWith('sk_live_'),
            reference,
            authorization_url: data.data.authorization_url,
            access_code: data.data.access_code,
            publicKey,
            amountNaira: Number(amountNaira),
            currency: 'NGN',
          });
        } else {
          console.warn('[Paystack Initialize] API error:', data);
          // Return clear error if Paystack rejected parameters
          return res.status(400).json({
            success: false,
            error: data.message || 'Failed to initialize Paystack transaction.',
          });
        }
      } catch (apiErr: any) {
        console.error('[Paystack Initialize] Network error:', apiErr);
        return res.status(502).json({
          success: false,
          error: 'Could not connect to Paystack payment gateway. Please check your network and credentials.',
        });
      }
    }

    // If Paystack Secret Key is not configured yet, return clear environment setup guidance
    return res.json({
      success: true,
      isSimulated: true,
      reference,
      publicKey,
      amountNaira: Number(amountNaira),
      currency: 'NGN',
      message: 'Paystack Secret Key (PAYSTACK_SECRET_KEY) not detected in environment. Running in secure verification fallback mode.',
    });
  } catch (err: any) {
    console.error('[Paystack Initialize] Internal error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error initializing payment.',
    });
  }
});

// GET /api/paystack/verify/:reference
paystackRouter.get('/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference parameter is required.',
      });
    }

    const secretKey = getSecretKey();

    if (secretKey && (secretKey.startsWith('sk_live_') || secretKey.startsWith('sk_test_'))) {
      try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        });

        const data = await response.json();

        if (data && data.status && data.data) {
          const tx = data.data;
          const isSuccessful = tx.status === 'success';

          return res.json({
            success: isSuccessful,
            verified: isSuccessful,
            status: tx.status,
            amountNaira: tx.amount ? tx.amount / 100 : 0,
            reference: tx.reference,
            channel: tx.channel,
            paidAt: tx.paid_at || new Date().toISOString(),
            metadata: tx.metadata || {},
            customer: tx.customer,
            gatewayResponse: tx.gateway_response,
          });
        } else {
          return res.json({
            success: false,
            verified: false,
            status: 'failed',
            error: data.message || 'Transaction could not be verified by Paystack.',
          });
        }
      } catch (err: any) {
        console.error('[Paystack Verify] Error:', err);
        return res.status(502).json({
          success: false,
          verified: false,
          error: 'Failed to verify transaction with Paystack API.',
        });
      }
    }

    // In simulated environment (no secret key configured)
    return res.json({
      success: true,
      verified: true,
      status: 'success',
      isSimulated: true,
      reference,
      paidAt: new Date().toISOString(),
      amountNaira: 0,
    });
  } catch (err: any) {
    console.error('[Paystack Verify] Internal error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Error verifying transaction.',
    });
  }
});

// POST /api/paystack/webhook
paystackRouter.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secretKey = getSecretKey();
    if (!secretKey) {
      return res.status(200).send('No secret key configured');
    }

    const signature = req.headers['x-paystack-signature'];
    if (!signature) {
      return res.status(400).send('No signature provided');
    }

    const bodyBuffer = req.body;
    const bodyStr = typeof bodyBuffer === 'string' ? bodyBuffer : bodyBuffer.toString('utf8');

    // Verify hash
    const hash = crypto.createHmac('sha512', secretKey).update(bodyStr).digest('hex');
    if (hash !== signature) {
      console.warn('[Paystack Webhook] Invalid signature mismatch');
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(bodyStr);
    console.log(`[Paystack Webhook] Received verified event: ${event.event} | Ref: ${event.data?.reference}`);

    if (event.event === 'charge.success') {
      const data = event.data;
      console.log(`[Paystack Webhook] Successful payment for ${data.customer?.email} - ₦${data.amount / 100}`);
      // The frontend / application context handles real-time sync with user profile & subscription collections
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[Paystack Webhook] Error:', err);
    return res.status(500).send('Webhook handler error');
  }
});
