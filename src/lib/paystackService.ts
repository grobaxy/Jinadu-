// Paystack Client Integration Service
// Communicates strictly with Grobaax backend API endpoints (/api/paystack/*)
// NEVER exposes Paystack Secret Key in browser

export interface PaystackInitResponse {
  success: boolean;
  reference?: string;
  authorization_url?: string;
  access_code?: string;
  publicKey?: string;
  isSimulated?: boolean;
  isLive?: boolean;
  error?: string;
}

export interface PaystackTransferAccountResponse {
  success: boolean;
  reference?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  bankSlug?: string;
  amountNaira?: number;
  expiresAt?: string;
  displayText?: string;
  status?: string;
  authorization_url?: string;
  fallbackCheckout?: boolean;
  error?: string;
}

export interface PaystackVerifyResponse {
  success: boolean;
  verified: boolean;
  status: string;
  amountNaira?: number;
  reference?: string;
  planId?: string;
  planName?: string;
  isPending?: boolean;
  gatewayResponse?: string;
  isSimulated?: boolean;
  error?: string;
}

// Load Paystack Inline JS library dynamically
export function loadPaystackInlineScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).PaystackPop) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Paystack Inline JS.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

// Helper to safely parse JSON from responses, avoiding 'Unexpected token A' when Vercel or proxies return plain text/HTML errors
async function safeParseResponse(res: Response, fallbackErrorMessage: string): Promise<any> {
  let text = '';
  try {
    text = await res.text();
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || fallbackErrorMessage,
    };
  }

  if (!text || text.trim() === '') {
    return {
      success: false,
      error: `Empty response from server (HTTP ${res.status})`,
    };
  }

  try {
    return JSON.parse(text);
  } catch (_parseErr) {
    // If response was plain text or HTML (such as Vercel's "A server error has occurred")
    if (text.includes('A server error') || text.includes('FUNCTION_INVOCATION_FAILED')) {
      return {
        success: false,
        error: 'Payment server is currently initializing on Vercel. You can still complete your payment securely via the Card or Web Checkout button below.',
        isVercelFunctionError: true,
      };
    }
    return {
      success: false,
      error: `Server error (${res.status}): ${text.slice(0, 120).trim()}`,
    };
  }
}

// Fallback Live Public Key for Grobaax Network
export const PAYSTACK_LIVE_PUBLIC_KEY = 'pk_live_70e9ddbaca92590a8bfbd673b80abb40f083ac96';

// Fetch public key from backend or fallback
export async function getPaystackPublicKey(): Promise<string> {
  try {
    const res = await fetch('/api/paystack/public-key');
    const data = await safeParseResponse(res, 'Unable to get public key');
    if (data && data.publicKey) {
      return data.publicKey;
    }
  } catch {
    // ignore
  }
  return PAYSTACK_LIVE_PUBLIC_KEY;
}

// Generate real live bank transfer account via Paystack Charge API
export async function createPaystackTransferAccount(params: {
  planId: string;
  planName: string;
  amountNaira: number;
  email: string;
  userId: string;
  userName: string;
}): Promise<PaystackTransferAccountResponse> {
  const endpoints = ['/api/paystack/charge-transfer', '/paystack/charge-transfer'];
  let lastError = '';

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(params),
      });

      if (res.ok || res.status === 400 || res.status === 500) {
        const data = await safeParseResponse(res, 'Could not connect to payment server to generate transfer account.');
        if (data && (data.success || data.accountNumber || data.authorization_url)) {
          return data;
        }
        if (data && data.error) {
          lastError = data.error;
        }
      }
    } catch (err: any) {
      lastError = err?.message || 'Network error';
    }
  }

  // If direct charge-transfer failed (e.g. during Vercel cold boot or proxy routing delay),
  // seamlessly fall back to transaction initialization so checkout is always available
  try {
    const initRes = await initializePaystackTransaction(params);
    if (initRes && initRes.success && initRes.authorization_url) {
      return {
        success: true,
        reference: initRes.reference,
        authorization_url: initRes.authorization_url,
        amountNaira: params.amountNaira,
        fallbackCheckout: true,
      };
    }
  } catch {}

  return {
    success: false,
    error: lastError || 'Could not connect to payment server to generate transfer account.',
  };
}

// Initialize payment transaction on backend
export async function initializePaystackTransaction(params: {
  planId: string;
  planName: string;
  amountNaira: number;
  email: string;
  userId: string;
  userName: string;
  callbackUrl?: string;
}): Promise<PaystackInitResponse> {
  const defaultCallback = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?planId=${encodeURIComponent(params.planId)}`
    : undefined;

  const payload = {
    ...params,
    callbackUrl: params.callbackUrl || defaultCallback,
  };

  const endpoints = ['/api/paystack/initialize', '/paystack/initialize'];
  let lastError = '';

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 400) {
        const data = await safeParseResponse(res, 'Could not connect to payment server.');
        if (data && (data.success || data.authorization_url || data.reference)) {
          return data;
        }
        if (data && data.error) {
          lastError = data.error;
        }
      }
    } catch (err: any) {
      lastError = err?.message || 'Network error';
    }
  }

  return {
    success: false,
    error: lastError || 'Could not connect to payment server.',
  };
}

// Verify transaction on backend
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  try {
    const res = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`);
    return await safeParseResponse(res, 'Verification connection failed.');
  } catch (err: any) {
    return {
      success: false,
      verified: false,
      status: 'error',
      error: err.message || 'Verification connection failed.',
    };
  }
}

// Check real-time payment sensor status
export async function checkPaymentSensorStatus(params: {
  reference?: string;
  email?: string;
  userId?: string;
}): Promise<PaystackVerifyResponse> {
  try {
    const query = new URLSearchParams();
    if (params.reference) query.set('reference', params.reference);
    if (params.email) query.set('email', params.email);
    if (params.userId) query.set('userId', params.userId);

    const res = await fetch(`/api/paystack/sensor-status?${query.toString()}`);
    return await safeParseResponse(res, 'Sensor query failed.');
  } catch (err: any) {
    return {
      success: false,
      verified: false,
      status: 'error',
      error: err.message || 'Sensor query failed.',
    };
  }
}

// Launch Paystack payment workflow
export async function processPaystackPayment(params: {
  planId: string;
  planName: string;
  amountNaira: number;
  email: string;
  userId: string;
  userName: string;
  onSuccess: (reference: string) => Promise<void> | void;
  onCancel: () => void;
  onError: (errorMessage: string) => void;
}): Promise<void> {
  // 1. Initialize via backend
  const initResult = await initializePaystackTransaction({
    planId: params.planId,
    planName: params.planName,
    amountNaira: params.amountNaira,
    email: params.email,
    userId: params.userId,
    userName: params.userName,
  });

  if (!initResult.success || !initResult.reference) {
    params.onError(initResult.error || 'Payment initialization failed.');
    return;
  }

  const reference = initResult.reference;

  // 2. If running in simulated mode or no public key, verify directly via backend
  if (initResult.isSimulated || !initResult.publicKey) {
    const verifyResult = await verifyPaystackTransaction(reference);
    if (verifyResult.verified) {
      await params.onSuccess(reference);
    } else {
      params.onError(verifyResult.error || 'Payment verification failed.');
    }
    return;
  }

  // 3. Load Paystack inline script
  const scriptLoaded = await loadPaystackInlineScript();

  if (scriptLoaded && (window as any).PaystackPop && initResult.publicKey) {
    try {
      const handler = (window as any).PaystackPop.setup({
        key: initResult.publicKey,
        email: params.email && params.email.includes('@') ? params.email : 'scholar@grobaax.org',
        amount: Math.round(params.amountNaira * 100),
        currency: 'NGN',
        ref: reference,
        callback: async function (response: any) {
          const finalRef = response?.reference || response?.trxref || reference;
          try {
            await params.onSuccess(finalRef);
          } catch (onErr) {
            console.warn('Subscription activation notice:', onErr);
          }
          // Perform backend verification check asynchronously
          verifyPaystackTransaction(finalRef).catch(() => {});
        },
        onClose: function () {
          params.onCancel();
        },
      });

      handler.openIframe();
    } catch (popupErr: any) {
      console.warn('Paystack popup setup error, falling back to authorization URL or verification:', popupErr);
      if (initResult.authorization_url) {
        window.location.href = initResult.authorization_url;
      } else {
        const verifyResult = await verifyPaystackTransaction(reference);
        if (verifyResult.verified) {
          await params.onSuccess(reference);
        } else {
          params.onError(verifyResult.error || 'Payment could not be verified.');
        }
      }
    }
  } else if (initResult.authorization_url) {
    window.location.href = initResult.authorization_url;
  } else {
    // Fallback verification
    const verifyResult = await verifyPaystackTransaction(reference);
    if (verifyResult.verified) {
      await params.onSuccess(reference);
    } else {
      params.onError(verifyResult.error || 'Payment verification failed.');
    }
  }
}
