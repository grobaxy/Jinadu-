import { verifyPaystackRefCore } from '../../server/paystackCore';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawRef = (req.query?.reference || req.query?.slug || req.query?.ref || '') as string;
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
