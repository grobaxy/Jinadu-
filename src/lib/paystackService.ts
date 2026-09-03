// Paystack Client Integration Service
// Communicates strictly with Grobax backend API endpoints (/api/paystack/*)
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

// Generate real live bank transfer account via Paystack Charge API
export async function createPaystackTransferAccount(params: {
  planId: string;
  planName: string;
  amountNaira: number;
  email: string;
  userId: string;
  userName: string;
}): Promise<PaystackTransferAccountResponse> {
  try {
    const res = await fetch('/api/paystack/charge-transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Could not connect to payment server to generate transfer account.',
    };
  }
}

// Initialize payment transaction on backend
export async function initializePaystackTransaction(params: {
  planId: string;
  planName: string;
  amountNaira: number;
  email: string;
  userId: string;
  userName: string;
}): Promise<PaystackInitResponse> {
  try {
    const res = await fetch('/api/paystack/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Could not connect to payment server.',
    };
  }
}

// Verify transaction on backend
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  try {
    const res = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      verified: false,
      status: 'error',
      error: err.message || 'Verification connection failed.',
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
        email: params.email && params.email.includes('@') ? params.email : 'scholar@grobax.org',
        amount: Math.round(params.amountNaira * 100),
        currency: 'NGN',
        ref: reference,
        callback: async function (response: any) {
          const verifyResult = await verifyPaystackTransaction(response.reference || reference);
          if (verifyResult.verified) {
            await params.onSuccess(response.reference || reference);
          } else {
            params.onError(verifyResult.error || 'Backend verification failed for transaction.');
          }
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
