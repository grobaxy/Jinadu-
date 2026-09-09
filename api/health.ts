export default function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    service: 'Grobaax API Gateway',
    paystack: {
      hasSecretKey: Boolean(process.env.PAYSTACK_SECRET_KEY || 'sk_live_f36e65abf11267b133af3a3d20901e0931c49c02'),
      hasPublicKey: Boolean(process.env.PAYSTACK_PUBLIC_KEY || 'pk_live_70e9ddbaca92590a8bfbd673b80abb40f083ac96'),
    },
  });
}
