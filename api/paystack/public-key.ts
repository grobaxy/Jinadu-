import { getPublicKey, getSecretKey } from '../../server/paystackCore';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const publicKey = getPublicKey();
  const secretKey = getSecretKey();

  return res.status(200).json({
    success: true,
    publicKey,
    hasSecretKey: Boolean(secretKey && secretKey.startsWith('sk_')),
  });
}
