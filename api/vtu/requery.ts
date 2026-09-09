// Standalone Vercel Serverless Function: /api/vtu/requery
// Queries Pairgate API for status of an existing transaction

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { transactionId } = body || {};
  if (!transactionId) {
    return res.status(400).json({ success: false, message: 'Transaction ID is required for requery' });
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

  try {
    const providerRes = await fetch(`${baseUrl}/transaction/query?reference=${encodeURIComponent(transactionId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const raw = await providerRes.json().catch(() => null);

    return res.status(200).json({
      success: true,
      transactionId,
      status: raw?.data?.status || 'UNKNOWN',
      providerData: raw,
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      transactionId,
      status: 'UNKNOWN',
      message: err?.message || 'Error querying provider status',
    });
  }
}
