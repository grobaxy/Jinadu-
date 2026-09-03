import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CreditCard,
  Building2,
  PhoneCall,
  CheckCircle2,
  Lock,
  X,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
  Mail,
  ExternalLink,
  Sparkles,
  CheckCheck,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { SubscriptionPlan } from '../../types';
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  createPaystackTransferAccount,
  loadPaystackInlineScript,
  PaystackTransferAccountResponse,
} from '../../lib/paystackService';

interface PaystackGatewayModalProps {
  plan: SubscriptionPlan;
  userEmail: string;
  userId: string;
  userName: string;
  onSuccess: (reference: string) => Promise<void> | void;
  onClose: () => void;
}

export const PaystackGatewayModal: React.FC<PaystackGatewayModalProps> = ({
  plan,
  userEmail,
  userId,
  userName,
  onSuccess,
  onClose,
}) => {
  // Channels: 'transfer' (default & recommended for Nigeria), 'card', 'ussd'
  const [activeChannel, setActiveChannel] = useState<'transfer' | 'card' | 'ussd'>('transfer');
  const [email, setEmail] = useState(userEmail || 'scholar@grobax.org');
  const [reference, setReference] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [publicKey, setPublicKey] = useState('');

  // Keep email in sync with user's registered account email
  useEffect(() => {
    if (userEmail && userEmail.includes('@')) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  // Loading & Processing states
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGeneratingAccount, setIsGeneratingAccount] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLaunchingPopup, setIsLaunchingPopup] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedUssd, setCopiedUssd] = useState(false);

  // Real Dedicated Bank Transfer Account from Paystack API
  const [transferAccount, setTransferAccount] = useState<PaystackTransferAccountResponse | null>(null);

  // Step state: 'checkout' | 'verifying' | 'success'
  const [paymentStep, setPaymentStep] = useState<'checkout' | 'verifying' | 'success'>('checkout');

  // Transfer countdown timer (30 mins = 1800s)
  const [timeLeft, setTimeLeft] = useState(1800);

  // USSD Bank Selection
  const [selectedUssdBank, setSelectedUssdBank] = useState('gtb');

  // Polling ref to control background status checks
  const isPollingRef = useRef(true);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop polling helper
  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Fetch real Paystack transfer account
  const fetchLiveTransferAccount = useCallback(async () => {
    setIsGeneratingAccount(true);
    setErrorMsg('');

    try {
      const res = await createPaystackTransferAccount({
        planId: plan.planId,
        planName: plan.name,
        amountNaira: plan.priceNaira,
        email: email && email.includes('@') ? email.trim() : 'scholar@grobax.org',
        userId: userId || 'scholar',
        userName: userName || 'Scholar',
      });

      if (res.success && res.accountNumber) {
        setTransferAccount(res);
        if (res.reference) {
          setReference(res.reference);
        }
        if (res.authorization_url) {
          setAuthUrl(res.authorization_url);
        }
      } else if (res.authorization_url) {
        // Fallback checkout URL
        setAuthUrl(res.authorization_url);
        if (res.reference) {
          setReference(res.reference);
        }
      } else {
        setErrorMsg(res.error || 'Could not retrieve transfer account from Paystack. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with Paystack payment gateway.');
    } finally {
      setIsGeneratingAccount(false);
    }
  }, [plan.planId, plan.name, plan.priceNaira, email, userId, userName]);

  // Initialize transaction and load Paystack script on mount
  useEffect(() => {
    let isMounted = true;
    isPollingRef.current = true;

    async function init() {
      setIsInitializing(true);
      setErrorMsg('');

      // Preload inline script
      loadPaystackInlineScript().catch(() => {});

      try {
        const initRes = await initializePaystackTransaction({
          planId: plan.planId,
          planName: plan.name,
          amountNaira: plan.priceNaira,
          email: email && email.includes('@') ? email.trim() : 'scholar@grobax.org',
          userId: userId || 'scholar',
          userName: userName || 'Scholar',
        });

        if (isMounted) {
          if (initRes.success && initRes.reference) {
            setReference(initRes.reference);
            if (initRes.authorization_url) {
              setAuthUrl(initRes.authorization_url);
            }
            if (initRes.publicKey) {
              setPublicKey(initRes.publicKey);
            }
            try {
              localStorage.setItem('grobax_pending_paystack_sub', JSON.stringify({
                reference: initRes.reference,
                plan,
                userId,
                timestamp: Date.now(),
              }));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Initialization notice:', err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }

      // Automatically generate live transfer account
      if (isMounted) {
        fetchLiveTransferAccount();
      }
    }

    init();

    return () => {
      isMounted = false;
      stopPolling();
    };
  }, [plan.planId, plan.priceNaira, fetchLiveTransferAccount, stopPolling]);

  // Background Verification Polling: automatically checks every 3.5 seconds
  useEffect(() => {
    if (!reference || paymentStep === 'success') return;

    const interval = setInterval(async () => {
      if (!isPollingRef.current) return;

      try {
        const verifyRes = await verifyPaystackTransaction(reference);
        if (verifyRes && (verifyRes.verified || verifyRes.status === 'success')) {
          stopPolling();
          setPaymentStep('success');
          try {
            localStorage.removeItem('grobax_pending_paystack_sub');
          } catch {}
          try {
            await onSuccess(reference);
          } catch (onErr) {
            console.warn('onSuccess activation notice:', onErr);
          }
        }
      } catch {
        // Polling checks silently fail without blocking UI
      }
    }, 3500);

    pollTimerRef.current = interval;

    return () => {
      clearInterval(interval);
    };
  }, [reference, paymentStep, onSuccess, stopPolling]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || paymentStep === 'success') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, paymentStep]);

  // Manual check payment status
  const handleManualVerify = async () => {
    if (!reference) return;
    setIsVerifying(true);
    setErrorMsg('');

    try {
      const verifyRes = await verifyPaystackTransaction(reference);

      if (verifyRes && (verifyRes.verified || verifyRes.status === 'success')) {
        stopPolling();
        setPaymentStep('success');
        try {
          localStorage.removeItem('grobax_pending_paystack_sub');
        } catch {}
        try {
          await onSuccess(reference);
        } catch (onErr) {
          console.warn('onSuccess activation notice:', onErr);
        }
      } else if (verifyRes.isPending || verifyRes.status === 'ongoing' || verifyRes.status === 'pending_bank_transfer') {
        setErrorMsg('We are still waiting to receive the deposit from your bank. Bank transfers typically reflect in 10–60 seconds. We are continuing to check automatically in the background.');
      } else {
        setErrorMsg('Transfer could not be confirmed yet. Please verify that you transferred the exact amount to the account displayed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification connection check failed. Please check your internet connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Launch Card Payment via Paystack's official secure inline popup or redirect
  const handleLaunchCardCheckout = async () => {
    setIsLaunchingPopup(true);
    setErrorMsg('');

    try {
      const scriptReady = await loadPaystackInlineScript();

      if (scriptReady && (window as any).PaystackPop && publicKey) {
        const handler = (window as any).PaystackPop.setup({
          key: publicKey,
          email: email && email.includes('@') ? email.trim() : 'scholar@grobax.org',
          amount: Math.round(plan.priceNaira * 100),
          currency: 'NGN',
          ref: reference,
          channels: ['card', 'bank', 'bank_transfer', 'ussd', 'qr'],
          metadata: {
            planId: plan.planId,
            planName: plan.name,
            amountNaira: plan.priceNaira,
            userId,
            userName,
          },
          callback: async (response: any) => {
            const finalRef = response?.reference || response?.trxref || reference;
            stopPolling();
            setPaymentStep('success');
            setIsVerifying(false);
            try {
              localStorage.removeItem('grobax_pending_paystack_sub');
            } catch {}
            try {
              await onSuccess(finalRef);
            } catch (actErr) {
              console.warn('Subscription activation notice:', actErr);
            }
            // Perform background verification check asynchronously
            verifyPaystackTransaction(finalRef).catch(() => {});
          },
          onClose: () => {
            setIsLaunchingPopup(false);
          },
        });

        handler.openIframe();
        setIsLaunchingPopup(false);
        return;
      }

      // If iframe / popup is restricted or script failed, open hosted checkout
      if (authUrl) {
        window.open(authUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Initialize and open
        const initRes = await initializePaystackTransaction({
          planId: plan.planId,
          planName: plan.name,
          amountNaira: plan.priceNaira,
          email: email && email.includes('@') ? email.trim() : 'scholar@grobax.org',
          userId: userId || 'scholar',
          userName: userName || 'Scholar',
        });
        if (initRes.authorization_url) {
          setAuthUrl(initRes.authorization_url);
          window.open(initRes.authorization_url, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err: any) {
      console.warn('Card popup launcher error, opening hosted window:', err);
      if (authUrl) {
        window.open(authUrl, '_blank', 'noopener,noreferrer');
      } else {
        setErrorMsg('Could not open Paystack popup. Please use Bank Transfer or click the Web Checkout button.');
      }
    } finally {
      setIsLaunchingPopup(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const ussdCodes: Record<string, { name: string; code: string }> = {
    gtb: { name: 'GTBank', code: `*737*50*${plan.priceNaira}#` },
    zenith: { name: 'Zenith Bank', code: `*966*${plan.priceNaira}#` },
    access: { name: 'Access Bank', code: `*901*${plan.priceNaira}#` },
    uba: { name: 'UBA', code: `*919*${plan.priceNaira}#` },
    firstbank: { name: 'First Bank', code: `*894*${plan.priceNaira}#` },
    stanbic: { name: 'Stanbic IBTC', code: `*909*${plan.priceNaira}#` },
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-[#021024] rounded-3xl max-w-md w-full border border-blue-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Paystack Official Header */}
        <div className="bg-[#011b33] text-white p-5 relative border-b border-blue-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            {/* Brand Logo & Verification Badge */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#00C3F7] flex items-center justify-center font-black text-[#011b33] text-sm shadow-md shadow-cyan-500/20">
                P
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm tracking-tight text-white">
                    paystack
                  </span>
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Gateway
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Grobax Academic Network</p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isVerifying}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              title="Close payment window"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Amount & Plan Banner */}
          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Subscription Upgrade:</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{plan.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">
                  {plan.durationValue} {plan.durationUnit}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-medium">Total Payable:</div>
              <div className="text-xl font-black text-[#00C3F7]">
                ₦{plan.priceNaira.toLocaleString()}.00
              </div>
            </div>
          </div>
        </div>

        {/* Payment Channels Navigation */}
        {paymentStep === 'checkout' && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#03152c]">
            <button
              type="button"
              onClick={() => {
                setActiveChannel('transfer');
                setErrorMsg('');
              }}
              className={`flex-1 py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 transition border-b-2 cursor-pointer ${
                activeChannel === 'transfer'
                  ? 'border-[#00C3F7] text-[#00C3F7] bg-blue-50/60 dark:bg-blue-950/40'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Bank Transfer</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
                Instant
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveChannel('card');
                setErrorMsg('');
              }}
              className={`flex-1 py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 transition border-b-2 cursor-pointer ${
                activeChannel === 'card'
                  ? 'border-[#00C3F7] text-[#00C3F7] bg-blue-50/60 dark:bg-blue-950/40'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Card</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveChannel('ussd');
                setErrorMsg('');
              }}
              className={`flex-1 py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 transition border-b-2 cursor-pointer ${
                activeChannel === 'ussd'
                  ? 'border-[#00C3F7] text-[#00C3F7] bg-blue-50/60 dark:bg-blue-950/40'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>USSD</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Error Message banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* SUCCESS STEP */}
          {paymentStep === 'success' ? (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCheck className="w-8 h-8 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Payment Verified Successfully!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your academic subscription upgrade to <strong>{plan.name}</strong> is now being activated.
                </p>
                {reference && (
                  <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                    Ref: {reference}
                  </p>
                )}
              </div>
            </div>
          ) : activeChannel === 'transfer' ? (
            /* CHANNEL 1: REAL BANK TRANSFER (LIVE PAYSTACK DEDICATED ACCOUNT) */
            <div className="space-y-4">
              {isGeneratingAccount ? (
                <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <RefreshCw className="w-7 h-7 text-[#00C3F7] animate-spin mx-auto" />
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Generating Live Dedicated Paystack Account...
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Connecting to Paystack banking network to create your unique payment NUBAN.
                  </p>
                </div>
              ) : transferAccount && transferAccount.accountNumber ? (
                <div className="space-y-3">
                  {/* Account Box */}
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/90 to-blue-100/40 dark:from-slate-900 dark:to-[#021833] border border-blue-200 dark:border-blue-900/60 space-y-3.5 shadow-sm">
                    {/* Amount to transfer */}
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200/60 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Amount to transfer:
                      </span>
                      <div className="flex items-center gap-2">
                        <strong className="text-base font-black text-slate-900 dark:text-white">
                          ₦{plan.priceNaira.toLocaleString()}.00
                        </strong>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(plan.priceNaira.toString());
                            setCopiedAmount(true);
                            setTimeout(() => setCopiedAmount(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-[#00C3F7] text-[10px] font-bold flex items-center gap-1 transition"
                          title="Copy amount"
                        >
                          {copiedAmount ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedAmount ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Bank Name */}
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Destination Bank
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {transferAccount.bankName || 'Paystack-Titan / Titan Trust Bank'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Live NUBAN
                        </span>
                      </div>
                    </div>

                    {/* Account Number */}
                    <div className="p-3 rounded-xl bg-white dark:bg-[#03152c] border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          Account Number
                        </div>
                        <div className="text-xl font-black font-mono tracking-widest text-[#00C3F7] mt-0.5">
                          {transferAccount.accountNumber}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (transferAccount?.accountNumber) {
                            navigator.clipboard.writeText(transferAccount.accountNumber);
                            setCopiedAccount(true);
                            setTimeout(() => setCopiedAccount(false), 2000);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#00C3F7] hover:bg-[#00a8d6] text-[#011b33] text-xs font-black shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedAccount ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Account</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Account Name */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 font-medium">Beneficiary Name:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {transferAccount.accountName || 'PAYSTACK CHECKOUT'}
                      </span>
                    </div>

                    {/* Expiry & Auto-detection indicator */}
                    <div className="pt-2 border-t border-blue-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Valid for:</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formattedTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Auto-detects transfer</span>
                      </div>
                    </div>
                  </div>

                  {/* Search Guide Tip */}
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#00C3F7]" />
                      <span>How to transfer on your banking app:</span>
                    </div>
                    <p className="leading-relaxed">
                      On <strong>OPay, PalmPay, Kuda, GTBank, Zenith, Access, Moniepoint, FirstBank</strong>, etc., search for <strong>"Paystack-Titan"</strong> or <strong>"Titan Trust Bank"</strong> and input account number <strong>{transferAccount.accountNumber}</strong>.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleManualVerify}
                      disabled={isVerifying}
                      className="w-full py-3.5 rounded-xl bg-[#00C3F7] hover:bg-[#00a8d6] text-[#011b33] text-xs font-black shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Checking Payment Status with Paystack...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>I Have Sent ₦{plan.priceNaira.toLocaleString()} (Verify Now)</span>
                        </>
                      )}
                    </button>

                    {authUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(authUrl, '_blank', 'noopener,noreferrer')}
                        className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Official Paystack Web Checkout</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Fallback if direct account couldn't be generated */
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 text-[#00C3F7] mx-auto flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Paystack Bank Transfer Gateway
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Open Paystack's official secure checkout window to view your dedicated bank transfer account or complete payment.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (authUrl) {
                          window.open(authUrl, '_blank', 'noopener,noreferrer');
                        } else {
                          handleLaunchCardCheckout();
                        }
                      }}
                      className="w-full py-3.5 rounded-xl bg-[#00C3F7] hover:bg-[#00a8d6] text-[#011b33] text-xs font-black shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Paystack Checkout</span>
                    </button>
                    <button
                      type="button"
                      onClick={fetchLiveTransferAccount}
                      className="text-xs text-[#00C3F7] hover:underline font-semibold"
                    >
                      Retry Generating Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : activeChannel === 'card' ? (
            /* CHANNEL 2: DEBIT / CREDIT CARD (PAYSTACK SECURE CHECKOUT) */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-[#021b33] text-white border border-blue-900/50 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Paystack Secure Card Checkout
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-[#00C3F7] border border-blue-500/30">
                    PCI-DSS Level 1
                  </span>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed">
                  Pay securely using any Nigerian or international bank card. Supports <strong>Mastercard, Visa, and Verve</strong> with 3D-Secure bank OTP verification.
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total charge:</span>
                  <span className="font-black text-base text-[#00C3F7]">
                    ₦{plan.priceNaira.toLocaleString()}.00
                  </span>
                </div>
              </div>

              {/* Verified Billing Email */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#00C3F7]" />
                    <span>Billing & OTP Email</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold border border-emerald-500/20">
                    Linked
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                  {email}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Transaction receipt will be dispatched to this email automatically upon completion.
                </p>
              </div>

              {/* Card Launch Button */}
              <button
                type="button"
                onClick={handleLaunchCardCheckout}
                disabled={isLaunchingPopup || isVerifying}
                className="w-full py-4 rounded-xl bg-[#00C3F7] hover:bg-[#00a8d6] text-[#011b33] text-xs font-black shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                {isLaunchingPopup ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Opening Paystack Secure Checkout...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay ₦{plan.priceNaira.toLocaleString()}.00 with Card</span>
                  </>
                )}
              </button>

              {/* Fallback Hosted Link */}
              {authUrl && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => window.open(authUrl, '_blank', 'noopener,noreferrer')}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#00C3F7] inline-flex items-center gap-1 transition"
                  >
                    <span>Prefer Paystack's full browser window?</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* CHANNEL 3: USSD PAYMENT */
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Choose Your Bank:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ussdCodes).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedUssdBank(key)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                        selectedUssdBank === key
                          ? 'border-[#00C3F7] bg-blue-50/80 dark:bg-blue-950/40 text-[#00C3F7] ring-1 ring-[#00C3F7]'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generated USSD Code */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-center">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Dial this USSD code on your registered mobile number:
                </div>
                <div className="text-lg font-mono font-black tracking-wider text-[#00C3F7]">
                  {ussdCodes[selectedUssdBank]?.code || `*737*50*${plan.priceNaira}#`}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(ussdCodes[selectedUssdBank]?.code || '');
                    setCopiedUssd(true);
                    setTimeout(() => setCopiedUssd(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-[#00C3F7] text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedUssd ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUssd ? 'USSD Code Copied' : 'Copy USSD Code'}</span>
                </button>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleManualVerify}
                  disabled={isVerifying}
                  className="w-full py-3.5 rounded-xl bg-[#00C3F7] hover:bg-[#00a8d6] text-[#011b33] text-xs font-black shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                >
                  {isVerifying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>I Have Completed the USSD Transfer</span>
                </button>

                {authUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(authUrl, '_blank', 'noopener,noreferrer')}
                    className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Paystack USSD Screen</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Paystack Security Footer */}
        <div className="p-3 bg-slate-100 dark:bg-[#01162b] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-bit SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300">
            <span>Secured by</span>
            <span className="text-[#00C3F7]">paystack</span>
          </div>
        </div>
      </div>
    </div>
  );
};
