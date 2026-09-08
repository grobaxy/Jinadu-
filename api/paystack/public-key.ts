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
