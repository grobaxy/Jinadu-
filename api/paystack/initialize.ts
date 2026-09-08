import { initPaystackTransactionCore } from '../../server/paystackCore';

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
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

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
