// Standalone Vercel Serverless Function: /api/vtu/settings
// Public settings for Telecom Airtime & Data recharges

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    success: true,
    settings: {
      airtimeEnabled: true,
      dataEnabled: true,
      mtnEnabled: true,
      airtelEnabled: true,
      gloEnabled: true,
      nineMobileEnabled: true,
      gpToNgnRate: 1.0,
      minAirtimeNGN: 50,
      maxAirtimeNGN: 50000,
      minDataNGN: 100,
      maxDataNGN: 50000,
      providerEnvironment: 'live',
      provider: 'pairgate',
    },
  });
}
