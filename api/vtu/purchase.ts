// Standalone Vercel Serverless Function: /api/vtu/purchase
// Handles Airtime & Data purchases with Pairgate VTU Gateway

function getApiKey(): string {
  const envKey =
    process.env.PAIRGATE_API_KEY ||
    process.env.PAYINGRATE_API_KEY ||
    process.env.VTU_API_KEY;
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return 'PG_live_HK8oBfwCCfsTyIyMhcdCSNgpfDzXdPwdpJRq74iJUZ7M3';
}

function getBaseUrl(): string {
  const envUrl =
    process.env.PAIRGATE_BASE_URL ||
    process.env.PAYINGRATE_BASE_URL ||
    process.env.VTU_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, '').trim();
  }
  return 'https://pairgate.com/api/v1';
}

function cleanNigerianPhone(phone: string): { isValid: boolean; formattedNumber: string; error?: string } {
  if (!phone) return { isValid: false, formattedNumber: '', error: 'Phone number is required' };
  let cleaned = phone.replace(/[\s\-\(\)]/g, '').trim();

  if (cleaned.startsWith('+234')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('234') && cleaned.length === 13) {
    cleaned = '0' + cleaned.substring(3);
  }

  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }

  if (!/^\d{11}$/.test(cleaned)) {
    return {
      isValid: false,
      formattedNumber: cleaned,
      error: `Invalid Nigerian phone number length (${cleaned.length} digits). Must be 11 digits starting with 0.`,
    };
  }

  const validPrefixes = [
    '0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916', // MTN
    '0802', '0808', '0708', '0812', '0701', '0902', '0901', '0907', '0912', // Airtel
    '0805', '0807', '0705', '0815', '0811', '0905', '0915', // Glo
    '0809', '0817', '0818', '0909', '0908', // 9mobile
  ];

  const prefix4 = cleaned.substring(0, 4);
  if (!validPrefixes.includes(prefix4)) {
    return {
      isValid: false,
      formattedNumber: cleaned,
      error: `Unrecognized Nigerian telecom prefix (${prefix4}). Please verify your phone number.`,
    };
  }

  return { isValid: true, formattedNumber: cleaned };
}

function extractErrorMessage(raw: any, fallback: string): string {
  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;
  if (raw.message && typeof raw.message === 'string') return raw.message;
  if (raw.error && typeof raw.error === 'string') return raw.error;
  if (raw.msg && typeof raw.msg === 'string') return raw.msg;
  if (raw.detail && typeof raw.detail === 'string') return raw.detail;
  if (raw.data?.message && typeof raw.data.message === 'string') return raw.data.message;
  if (raw.errors) {
    if (typeof raw.errors === 'string') return raw.errors;
    if (Array.isArray(raw.errors)) return raw.errors.join(', ');
    if (typeof raw.errors === 'object') {
      const vals = Object.values(raw.errors).flat();
      return vals.map(v => String(v)).join('; ');
    }
  }
  return fallback;
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const {
      userId,
      userName = 'Scholar',
      userEmail = '',
      userAvatar = '',
      serviceType = 'airtime',
      network,
      phoneNumber,
      amountNGN,
      gpAmount,
      productCode,
      productName,
      idempotencyKey,
    } = body || {};

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (!network || !phoneNumber || !amountNGN || !gpAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required purchase parameters (network, phoneNumber, amountNGN, gpAmount)',
      });
    }

    // Phone validation
    const phoneCheck = cleanNigerianPhone(phoneNumber);
    if (!phoneCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.error || 'Invalid Nigerian phone number',
      });
    }

    const numAmount = Number(amountNGN);
    const numGp = Number(gpAmount);
    const normalizedPhone = phoneCheck.formattedNumber;
    const normalizedNet = String(network).toUpperCase();
    const transactionId = `GBX_VTU_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();

    // 1. Verify VTU Provider Balance first
    try {
      const balanceRes = await fetch(`${baseUrl}/wallet/balance`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json().catch(() => null);
        const currentBalance = balanceData?.data?.balance;
        if (typeof currentBalance === 'number' && currentBalance < numAmount) {
          return res.status(400).json({
            success: false,
            status: 'FAILED',
            message: `VTU provider wallet balance (₦${currentBalance.toLocaleString()}) is currently insufficient for this ₦${numAmount.toLocaleString()} recharge. Please contact admin to replenish the gateway wallet.`,
          });
        }
      }
    } catch (balErr) {
      console.warn('Pairgate balance check notice:', balErr);
      // Non-fatal, continue with purchase attempt
    }

    // 2. Dispatch to Pairgate API
    let endpoint = '';
    let payload: Record<string, any> = {};

    if (serviceType === 'airtime') {
      endpoint = `${baseUrl}/airtime/purchase`;
      payload = {
        provider_id: normalizedNet.toLowerCase(),
        amount: numAmount,
        recipient: normalizedPhone,
        reference: transactionId,
      };
    } else {
      endpoint = `${baseUrl}/data/purchase`;
      payload = {
        provider_id: normalizedNet.toLowerCase(),
        plan_id: String(productCode || ''),
        recipient: normalizedPhone,
        reference: transactionId,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const providerRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const raw = await providerRes.json().catch(() => null);

    const transactionRecord = {
      id: transactionId,
      transactionId,
      userId,
      userName,
      userEmail,
      userAvatar,
      serviceType,
      phoneNumber: normalizedPhone,
      network: normalizedNet,
      productCode,
      productName: productName || (serviceType === 'airtime' ? `${normalizedNet} ₦${numAmount} Airtime` : `${normalizedNet} Mobile Data`),
      amountNGN: numAmount,
      gpAmount: numGp,
      status: 'PENDING',
      provider: 'pairgate',
      providerTransactionId: raw?.data?.transaction_id || raw?.data?.id || raw?.data?.reference || `PG_${Date.now()}`,
      idempotencyKey: idempotencyKey || transactionId,
      refundStatus: 'NONE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (providerRes.ok && (raw?.code === 200 || raw?.status === 'success' || raw?.status === true)) {
      transactionRecord.status = 'SUCCESS';
      const successMsg = raw?.message || raw?.data?.message || `₦${numAmount.toLocaleString()} ${serviceType === 'airtime' ? 'Airtime' : 'Data'} successfully delivered to ${normalizedPhone} (${normalizedNet})!`;
      return res.status(200).json({
        success: true,
        status: 'SUCCESS',
        transaction: transactionRecord,
        message: successMsg,
        rawResponse: raw,
      });
    } else if (raw?.status === 'pending' || raw?.status === 'processing') {
      transactionRecord.status = 'PENDING';
      return res.status(200).json({
        success: true,
        status: 'PENDING',
        transaction: transactionRecord,
        message: raw?.message || 'Transaction submitted to telecom operator and is currently processing.',
        rawResponse: raw,
      });
    } else {
      const errorMsg = extractErrorMessage(raw, 'Telecom operator could not fulfill recharge order.');
      transactionRecord.status = 'FAILED';
      return res.status(400).json({
        success: false,
        status: 'FAILED',
        transaction: transactionRecord,
        message: errorMsg,
        rawResponse: raw,
      });
    }
  } catch (err: any) {
    console.error('VTU purchase handler error:', err);
    return res.status(500).json({
      success: false,
      status: 'FAILED',
      message: err?.name === 'AbortError'
        ? 'Telecom operator gateway timed out. Please try again shortly.'
        : (err?.message || 'Internal server error while processing recharge transaction.'),
    });
  }
}
