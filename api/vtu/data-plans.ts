// Standalone Vercel Serverless Function: /api/vtu/data-plans
// Lists available data bundles for MTN, Airtel, Glo, 9mobile

const DATA_PLANS = [
  // MTN
  { id: 'mtn_500mb', network: 'MTN', serviceType: 'data', productCode: '303', productName: 'MTN 500MB (30 Days)', amountNGN: 140, dataVolume: '500MB', validity: '30 Days', category: 'SME', active: true },
  { id: 'mtn_1gb', network: 'MTN', serviceType: 'data', productCode: '304', productName: 'MTN 1GB (30 Days)', amountNGN: 270, dataVolume: '1GB', validity: '30 Days', category: 'SME', active: true },
  { id: 'mtn_2gb', network: 'MTN', serviceType: 'data', productCode: '305', productName: 'MTN 2GB (30 Days)', amountNGN: 540, dataVolume: '2GB', validity: '30 Days', category: 'SME', active: true },
  { id: 'mtn_3gb', network: 'MTN', serviceType: 'data', productCode: '306', productName: 'MTN 3GB (30 Days)', amountNGN: 810, dataVolume: '3GB', validity: '30 Days', category: 'SME', active: true },
  { id: 'mtn_5gb', network: 'MTN', serviceType: 'data', productCode: '307', productName: 'MTN 5GB (30 Days)', amountNGN: 1350, dataVolume: '5GB', validity: '30 Days', category: 'SME', active: true },
  { id: 'mtn_10gb', network: 'MTN', serviceType: 'data', productCode: '308', productName: 'MTN 10GB (30 Days)', amountNGN: 2700, dataVolume: '10GB', validity: '30 Days', category: 'SME', active: true },

  // AIRTEL
  { id: 'airtel_500mb', network: 'AIRTEL', serviceType: 'data', productCode: 'airtel_500mb', productName: 'Airtel 500MB (30 Days)', amountNGN: 150, dataVolume: '500MB', validity: '30 Days', category: 'Corporate Gifting', active: true },
  { id: 'airtel_1gb', network: 'AIRTEL', serviceType: 'data', productCode: 'airtel_1gb', productName: 'Airtel 1GB (30 Days)', amountNGN: 290, dataVolume: '1GB', validity: '30 Days', category: 'Corporate Gifting', active: true },
  { id: 'airtel_2gb', network: 'AIRTEL', serviceType: 'data', productCode: 'airtel_2gb', productName: 'Airtel 2GB (30 Days)', amountNGN: 580, dataVolume: '2GB', validity: '30 Days', category: 'Corporate Gifting', active: true },
  { id: 'airtel_5gb', network: 'AIRTEL', serviceType: 'data', productCode: 'airtel_5gb', productName: 'Airtel 5GB (30 Days)', amountNGN: 1450, dataVolume: '5GB', validity: '30 Days', category: 'Corporate Gifting', active: true },
  { id: 'airtel_10gb', network: 'AIRTEL', serviceType: 'data', productCode: 'airtel_10gb', productName: 'Airtel 10GB (30 Days)', amountNGN: 2900, dataVolume: '10GB', validity: '30 Days', category: 'Corporate Gifting', active: true },

  // GLO
  { id: 'glo_500mb', network: 'GLO', serviceType: 'data', productCode: 'glo_500mb', productName: 'Glo 500MB (30 Days)', amountNGN: 150, dataVolume: '500MB', validity: '30 Days', category: 'Corporate Gifting', active: true },
  { id: 'glo_1gb', network: 'GLO', serviceType: 'data', productCode: 'glo_1gb', productName: 'Glo 1GB (30 Days)', amountNGN: 280, dataVolume: '1GB', validity: '30 Days', category: 'Corporate Gifting', active: true },
  { id: 'glo_2gb', network: 'GLO', serviceType: 'data', productCode: 'glo_2gb', productName: 'Glo 2GB (30 Days)', amountNGN: 560, dataVolume: '2GB', validity: '30 Days', category: 'Corporate Gifting', active: true },
  { id: 'glo_3gb', network: 'GLO', serviceType: 'data', productCode: 'glo_3gb', productName: 'Glo 3GB (30 Days)', amountNGN: 840, dataVolume: '3GB', validity: '30 Days', category: 'Corporate Gifting', active: true },
  { id: 'glo_5gb', network: 'GLO', serviceType: 'data', productCode: 'glo_5gb', productName: 'Glo 5GB (30 Days)', amountNGN: 1400, dataVolume: '5GB', validity: '30 Days', category: 'Corporate Gifting', active: true },

  // 9MOBILE
  { id: '9mobile_500mb', network: '9MOBILE', serviceType: 'data', productCode: '9mobile_500mb', productName: '9mobile 500MB (30 Days)', amountNGN: 160, dataVolume: '500MB', validity: '30 Days', category: 'SME', active: true },
  { id: '9mobile_1gb', network: '9MOBILE', serviceType: 'data', productCode: '9mobile_1gb', productName: '9mobile 1GB (30 Days)', amountNGN: 300, dataVolume: '1GB', validity: '30 Days', category: 'SME', active: true },
  { id: '9mobile_2gb', network: '9MOBILE', serviceType: 'data', productCode: '9mobile_2gb', productName: '9mobile 2GB (30 Days)', amountNGN: 600, dataVolume: '2GB', validity: '30 Days', category: 'SME', active: true },
  { id: '9mobile_5gb', network: '9MOBILE', serviceType: 'data', productCode: '9mobile_5gb', productName: '9mobile 5GB (30 Days)', amountNGN: 1500, dataVolume: '5GB', validity: '30 Days', category: 'SME', active: true },
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { network } = req.query || {};
  let plans = DATA_PLANS;
  if (network && typeof network === 'string') {
    plans = plans.filter(p => p.network.toUpperCase() === network.toUpperCase());
  }

  return res.status(200).json({
    success: true,
    plans,
    count: plans.length,
  });
}
