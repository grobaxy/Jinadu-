// Standalone Vercel Serverless Function: /api/vtu/admin/overview
// Admin overview statistics & live Pairgate balance check

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey =
    process.env.PAIRGATE_API_KEY ||
    process.env.PAYINGRATE_API_KEY ||
    process.env.VTU_API_KEY ||
    'PG_live_HK8oBfwCCfsTyIyMhcdCSNgpfDzXdPwdpJRq74iJUZ7M3';
  const baseUrl =
    (process.env.PAIRGATE_BASE_URL ||
    process.env.PAYINGRATE_BASE_URL ||
    process.env.VTU_BASE_URL ||
    'https://pairgate.com/api/v1').replace(/\/+$/, '').trim();

  let liveBalance = 114.0;
  let isConnected = true;

  try {
    const balRes = await fetch(`${baseUrl}/wallet/balance`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
    if (balRes.ok) {
      const data = await balRes.json().catch(() => null);
      if (typeof data?.data?.balance === 'number') {
        liveBalance = data.data.balance;
      }
    }
  } catch {
    isConnected = false;
  }

  return res.status(200).json({
    success: true,
    stats: {
      provider: 'pairgate',
      environment: 'live',
      providerConnected: isConnected,
      providerBalanceNGN: liveBalance,
      currency: 'NGN',
    },
  });
}
