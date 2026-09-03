import React, { useState, useEffect, useRef } from 'react';
import { SubscriptionPlan, UserSubscriptionRecord, PRIMARY_SUPER_ADMIN_UID } from '../../types';
import { grobaxDataService } from '../../lib/dataAccess';
import { logManagerActivity } from '../../lib/adminPermissions';
import { useApp, DEFAULT_SUBSCRIPTION_PLANS } from '../../context/AppContext';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Check,
  Tag,
  Clock,
  Zap,
  ExternalLink,
} from 'lucide-react';

export function AdminSubscriptionsView() {
  const { userProfile } = useApp();

  const getInitialPlans = (): SubscriptionPlan[] => {
    try {
      const saved = localStorage.getItem('grobax_saved_subscription_plans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_SUBSCRIPTION_PLANS;
  };

  const [plans, setPlans] = useState<SubscriptionPlan[]>(getInitialPlans);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [quotaNotice, setQuotaNotice] = useState(false);
  const hasCheckedInitialSeed = useRef(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'subscribers'>('plans');

  // Form state
  const [formPlanId, setFormPlanId] = useState('');
  const [formName, setFormName] = useState('');
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formFullDesc, setFormFullDesc] = useState('');
  const [formPriceNaira, setFormPriceNaira] = useState<number>(1000);
  const [formDurationValue, setFormDurationValue] = useState<number>(30);
  const [formDurationUnit, setFormDurationUnit] = useState<'Days' | 'Months' | 'Years'>('Days');
  const [formBenefitsText, setFormBenefitsText] = useState('');
  const [formFeaturesText, setFormFeaturesText] = useState('');
  const [formBadgeLabel, setFormBadgeLabel] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formActive, setFormActive] = useState(true);
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync with subscriptionPlans collection via Grobax Data Access Layer
  useEffect(() => {
    const unsubscribePlans = grobaxDataService.subscribe<SubscriptionPlan>(
      'subscriptionPlans',
      { orderBy: [{ field: 'displayOrder', direction: 'asc' }] },
      (loadedPlans) => {
        if (loadedPlans.length === 0 && !hasCheckedInitialSeed.current) {
          hasCheckedInitialSeed.current = true;
          // Seed cloud only if collection is truly blank
          seedInitialPlans();
        } else if (loadedPlans.length > 0) {
          hasCheckedInitialSeed.current = true;
          setPlans(loadedPlans);
          setLoading(false);
          try {
            localStorage.setItem('grobax_saved_subscription_plans', JSON.stringify(loadedPlans));
          } catch {}
        } else {
          setLoading(false);
        }
      },
      (err) => {
        const isQuota =
          String(err?.message || err).includes('Quota exceeded') ||
          String(err?.message || err).includes('resource-exhausted') ||
          String(err?.message || err).includes('Free daily read units');
        if (isQuota) {
          setQuotaNotice(true);
        }
        console.warn('Subscription plans sync notice (using cached/default plans):', err);
        setPlans((prev) => (prev.length > 0 ? prev : getInitialPlans()));
        setLoading(false);
      }
    );

    // Sync user subscriptions
    const unsubscribeSubs = grobaxDataService.subscribe<UserSubscriptionRecord>(
      'userSubscriptions',
      { orderBy: [{ field: 'createdAt', direction: 'desc' }] },
      (loadedSubs) => {
        setUserSubscriptions(loadedSubs);
      },
      (err) => console.warn('User subscriptions snapshot notice:', err)
    );

    return () => {
      unsubscribePlans();
      unsubscribeSubs();
    };
  }, []);

  const seedInitialPlans = async () => {
    if (quotaNotice) return;
    setIsSeeding(true);
    const defaultPlans: Omit<SubscriptionPlan, 'id'>[] = [
      {
        planId: 'plan_basic_naira',
        name: 'Scholar Starter Plan',
        shortDescription: 'Essential premium academic privileges & competition access',
        fullDescription: 'Essential premium plan for scholars wanting daily ultimate search, withdrawal eligibility, AI library handouts, and minimart listings.',
        priceNaira: 1000,
        currency: 'NGN',
        durationValue: 30,
        durationUnit: 'Days',
        benefits: [
          'Daily Ultimate Search — 15 Responses',
          'Withdrawal Eligibility — Available',
          'AI Library — 5 Handout Generations',
          'Campus Minimart Products Listing (3 / Day)',
          'No Grobax Pop-up Upgrade Ads',
          'Profile Verification Badge — Available',
          'Premium Badge — Available',
        ],
        features: ['30 Days Validity', '15 Daily Searches', '5 AI Handouts/Day', '3 Minimart Listings/Day', 'No Pop-up Ads', 'Premium Badge'],
        badgeLabel: 'POPULAR',
        featured: false,
        active: true,
        displayOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        planId: 'plan_pro_naira',
        name: 'Champions Pro Scholar',
        shortDescription: 'Enhanced privileges, 2x GP boost & exclusive arena access',
        fullDescription: 'Designed for high-performing scholars competing in the Institutional Champions League and Global Ultimate Search.',
        priceNaira: 2500,
        currency: 'NGN',
        durationValue: 30,
        durationUnit: 'Days',
        benefits: [
          'Daily Ultimate Search — 15 Responses',
          'Withdrawal Eligibility — Available',
          'AI Library — 5 Handout Generations',
          'Campus Minimart Products Listing (3 / Day)',
          'No Grobax Pop-up Upgrade Ads',
          '2x GP Reward Multiplier on all Competitions',
          'Profile Badge & Premium Badge — Available',
          'Priority Live Match Queue & Arena Access',
        ],
        features: ['30 Days Validity', '15 Daily Searches', '2x GP Multiplier', '5 AI Handouts/Day', '3 Minimart Listings/Day', 'Premium Badge'],
        badgeLabel: 'RECOMMENDED',
        featured: true,
        active: true,
        displayOrder: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        planId: 'plan_titan_naira',
        name: 'Grobax Titan Annual VIP',
        shortDescription: 'Ultimate academic VIP access for 1 Full Year',
        fullDescription: 'Comprehensive annual subscription for institution representatives and top scholars with full VIP status, 20 searches, unlimited handouts, 6 listings/day, and maximum rewards.',
        priceNaira: 25000,
        currency: 'NGN',
        durationValue: 365,
        durationUnit: 'Days',
        benefits: [
          'Daily Ultimate Search — 20 Responses',
          'Withdrawal Eligibility — Available (Zero Processing Fees)',
          'AI Library — Unlimited Handouts Generation',
          'Campus Minimart Products Listing (6 / Day)',
          'No Grobax Pop-up Upgrade Ads',
          'Profile Badge & VIP Gold Crown Badge — Available',
          '3x GP Reward Multiplier across all League & GUS Rounds',
          'Instant Representative Fast-Track Review',
        ],
        features: ['365 Days Validity', '20 Daily Searches', 'Unlimited AI Handouts', '6 Minimart Listings/Day', '3x GP Multiplier', 'Gold VIP Crown'],
        badgeLabel: 'VIP ANNUAL',
        featured: false,
        active: true,
        displayOrder: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    try {
      for (const p of defaultPlans) {
        await grobaxDataService.create('subscriptionPlans', p, p.planId);
      }
    } catch (err: any) {
      const isQuota =
        String(err?.message || err).includes('Quota exceeded') ||
        String(err?.message || err).includes('resource-exhausted') ||
        String(err?.message || err).includes('Free daily read units');
      if (isQuota) {
        setQuotaNotice(true);
      }
      console.warn('Initial cloud subscription plans seed notice:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleOpenAddModal = () => {
    setSelectedPlan(null);
    setFormPlanId(`plan_${Date.now()}`);
    setFormName('');
    setFormShortDesc('');
    setFormFullDesc('');
    setFormPriceNaira(1000);
    setFormDurationValue(30);
    setFormDurationUnit('Days');
    setFormBenefitsText('');
    setFormFeaturesText('');
    setFormBadgeLabel('');
    setFormFeatured(false);
    setFormActive(true);
    setFormDisplayOrder(plans.length + 1);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setFormPlanId(plan.planId);
    setFormName(plan.name);
    setFormShortDesc(plan.shortDescription);
    setFormFullDesc(plan.fullDescription);
    setFormPriceNaira(plan.priceNaira);
    setFormDurationValue(plan.durationValue);
    setFormDurationUnit(plan.durationUnit);
    setFormBenefitsText(plan.benefits.join('\n'));
    setFormFeaturesText(plan.features.join('\n'));
    setFormBadgeLabel(plan.badgeLabel || '');
    setFormFeatured(plan.featured);
    setFormActive(plan.active);
    setFormDisplayOrder(plan.displayOrder);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setMessage({ type: 'error', text: 'Plan Name is required.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const benefitsArray = formBenefitsText
      .split('\n')
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    const featuresArray = formFeaturesText
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const planData: Omit<SubscriptionPlan, 'id'> = {
      planId: formPlanId.trim() || `plan_${Date.now()}`,
      name: formName.trim(),
      shortDescription: formShortDesc.trim(),
      fullDescription: formFullDesc.trim(),
      priceNaira: Number(formPriceNaira) || 0,
      currency: 'NGN',
      durationValue: Number(formDurationValue) || 30,
      durationUnit: formDurationUnit,
      benefits: benefitsArray,
      features: featuresArray,
      badgeLabel: formBadgeLabel.trim(),
      featured: formFeatured,
      active: formActive,
      displayOrder: Number(formDisplayOrder) || 1,
      createdAt: selectedPlan ? selectedPlan.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await grobaxDataService.create('subscriptionPlans', planData, planData.planId);

      await logManagerActivity({
        managerUid: userProfile?.id || PRIMARY_SUPER_ADMIN_UID,
        managerName: userProfile?.name || 'Super Admin',
        managerEmail: userProfile?.username || 'admin@grobax.app',
        role: userProfile?.role || 'SUPER_ADMIN',
        action: selectedPlan ? 'EDIT_SUBSCRIPTION_PLAN' : 'CREATE_SUBSCRIPTION_PLAN',
        target: 'subscriptionPlans',
        targetId: planData.planId,
        previousValue: selectedPlan || null,
        newValue: planData,
      });

      setMessage({
        type: 'success',
        text: selectedPlan ? 'Plan updated successfully! Synchronized with User App.' : 'New subscription plan created successfully!',
      });
      setIsModalOpen(false);
    } catch (err: any) {
      console.warn('Notice saving subscription plan:', err);
      const isQuota =
        String(err?.message || err).includes('Quota exceeded') ||
        String(err?.message || err).includes('resource-exhausted') ||
        String(err?.message || err).includes('Free daily read units');
      if (isQuota) {
        setQuotaNotice(true);
      }
      // Update local state and localStorage cache so admin experience isn't blocked
      setPlans((prev) => {
        const idx = prev.findIndex((p) => p.planId === planData.planId);
        const updated = idx >= 0 ? [...prev.slice(0, idx), planData, ...prev.slice(idx + 1)] : [...prev, planData];
        try {
          localStorage.setItem('grobax_saved_subscription_plans', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setMessage({
        type: isQuota ? 'success' : 'error',
        text: isQuota
          ? 'Plan saved locally in cached storage. Cloud write will synchronize once the daily Firestore quota resets.'
          : (err.message || 'Failed to save subscription plan.'),
      });
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePlanActive = async (plan: SubscriptionPlan) => {
    // Update local state immediately
    setPlans((prev) => {
      const updated = prev.map((p) => (p.planId === plan.planId ? { ...p, active: !p.active } : p));
      try {
        localStorage.setItem('grobax_saved_subscription_plans', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await grobaxDataService.update('subscriptionPlans', plan.planId, {
        active: !plan.active,
        updatedAt: new Date().toISOString(),
      });

      await logManagerActivity({
        managerUid: userProfile?.id || PRIMARY_SUPER_ADMIN_UID,
        managerName: userProfile?.name || 'Super Admin',
        managerEmail: userProfile?.username || 'admin@grobax.app',
        role: userProfile?.role || 'SUPER_ADMIN',
        action: plan.active ? 'DEACTIVATE_SUBSCRIPTION_PLAN' : 'ACTIVATE_SUBSCRIPTION_PLAN',
        target: 'subscriptionPlans',
        targetId: plan.planId,
        previousValue: { active: plan.active },
        newValue: { active: !plan.active },
      });
    } catch (err: any) {
      const isQuota =
        String(err?.message || err).includes('Quota exceeded') ||
        String(err?.message || err).includes('resource-exhausted') ||
        String(err?.message || err).includes('Free daily read units');
      if (isQuota) {
        setQuotaNotice(true);
      }
      console.warn('Notice toggling plan active status:', err);
    }
  };

  const handleDeletePlan = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan);
  };

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    setIsDeletingPlan(true);

    // Remove locally so UI reflects action
    setPlans((prev) => {
      const updated = prev.filter((p) => p.planId !== planToDelete.planId);
      try {
        localStorage.setItem('grobax_saved_subscription_plans', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await grobaxDataService.delete('subscriptionPlans', planToDelete.planId);

      await logManagerActivity({
        managerUid: userProfile?.id || PRIMARY_SUPER_ADMIN_UID,
        managerName: userProfile?.name || 'Super Admin',
        managerEmail: userProfile?.username || 'admin@grobax.app',
        role: userProfile?.role || 'SUPER_ADMIN',
        action: 'DELETE_SUBSCRIPTION_PLAN',
        target: 'subscriptionPlans',
        targetId: planToDelete.planId,
        previousValue: planToDelete,
        newValue: null,
      });

      setMessage({
        type: 'success',
        text: `Plan "${planToDelete.name}" deleted successfully. Changes synced to User App.`,
      });
      setPlanToDelete(null);
    } catch (err: any) {
      const isQuota =
        String(err?.message || err).includes('Quota exceeded') ||
        String(err?.message || err).includes('resource-exhausted') ||
        String(err?.message || err).includes('Free daily read units');
      if (isQuota) {
        setQuotaNotice(true);
        setMessage({
          type: 'success',
          text: `Plan "${planToDelete.name}" deleted locally in cached storage. Cloud database will synchronize after quota reset.`,
        });
      } else {
        console.warn('Notice deleting plan:', err);
        setMessage({ type: 'error', text: err.message || 'Failed to delete plan.' });
      }
      setPlanToDelete(null);
    } finally {
      setIsDeletingPlan(false);
    }
  };

  const filteredPlans = plans.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.planId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 text-white shadow-xl border border-blue-500/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wider">
                Grobax Monetization & Plans
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Currency: ₦ (Naira)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-blue-400" />
              Subscription & Plan Management
            </h1>
            <p className="text-blue-200 text-sm mt-1 max-w-2xl">
              Authoritative source for all Grobax user subscription plans. Changes made here synchronize live to the user-facing Upgrade Plan page in real time.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create New Plan
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-blue-500/20">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'plans'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-blue-300 hover:text-white hover:bg-blue-900/40'
            }`}
          >
            Subscription Plans ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'subscribers'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-blue-300 hover:text-white hover:bg-blue-900/40'
            }`}
          >
            Active Subscribers ({userSubscriptions.length})
          </button>
        </div>
      </div>

      {quotaNotice && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-amber-900 dark:text-amber-100">
                Firestore Free-Tier Daily Read Quota Reached
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 max-w-2xl leading-relaxed">
                The database hit the daily Spark free read unit limit. Grobax has automatically switched to high-speed cached subscription plans so user checkouts and privileges continue smoothly. Quotas reset automatically at midnight PT.
              </p>
            </div>
          </div>
          <a
            href="https://console.firebase.google.com/project/gen-lang-client-0808281932/firestore/databases/ai-studio-grbxbox-f5f6e3af-7b8c-4cb3-b0be-448c38423a10/data?openUpgradeDialog=true"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-sm"
          >
            <span>Firebase Console / Upgrade</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* PLANS TAB */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search plans by name, ID or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Active Plans
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Inactive/Draft Plans
              </span>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Synchronizing subscription plans from Firebase...
              </p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Tag className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No subscription plans found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No plans match your search filter. Create a new subscription plan to display it on the User App.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition"
              >
                Create Plan Now
              </button>
            </div>
          ) : (
            /* Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl transition-all duration-200 overflow-hidden bg-white dark:bg-slate-900 border ${
                    plan.featured
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xl'
                      : 'border-slate-200 dark:border-slate-800 shadow-md'
                  }`}
                >
                  {/* Top Badge */}
                  {plan.badgeLabel && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-600 text-white shadow-sm">
                        {plan.badgeLabel}
                      </span>
                    </div>
                  )}

                  <div className="p-6 border-b border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center space-x-2 mb-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          plan.active ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-400'
                        }`}
                      ></span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        ID: {plan.planId}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[32px]">
                      {plan.shortDescription || 'No description provided.'}
                    </p>

                    <div className="mt-4 flex items-baseline space-x-1">
                      <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                        ₦{plan.priceNaira.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        / {plan.durationValue} {plan.durationUnit}
                      </span>
                    </div>
                  </div>

                  {/* Benefits & Features */}
                  <div className="p-6 flex-1 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Plan Benefits
                      </h4>
                      <ul className="space-y-2">
                        {plan.benefits.slice(0, 5).map((benefit, idx) => (
                          <li key={idx} className="flex items-start text-xs text-slate-700 dark:text-slate-300">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mr-2 mt-0.5" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {plan.features.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-wrap gap-1.5">
                          {plan.features.map((feat, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => handleTogglePlanActive(plan)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        plan.active
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                      }`}
                    >
                      {plan.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {plan.active ? 'Active' : 'Inactive'}
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(plan)}
                        className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition"
                        title="Edit Plan"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan)}
                        className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 hover:bg-rose-100 transition"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBSCRIBERS TAB */}
      {activeTab === 'subscribers' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              User Active Subscriptions ({userSubscriptions.length})
            </h3>
            <span className="text-xs text-slate-500">
              Live subscription history snapshot
            </span>
          </div>

          {userSubscriptions.length === 0 ? (
            <div className="p-12 text-center">
              <Zap className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No active user subscriptions yet</p>
              <p className="text-xs text-slate-500 mt-1">
                When users upgrade their plans on the Grobax App, their records will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Plan Snapshot</th>
                    <th className="p-3.5">Price Paid (₦)</th>
                    <th className="p-3.5">Start Date</th>
                    <th className="p-3.5">Expiry Date</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {userSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-medium">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{sub.userName}</div>
                          <div className="text-[10px] text-slate-400">{sub.userEmail || sub.userId}</div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {sub.planNameSnapshot}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold">₦{sub.priceSnapshot.toLocaleString()}</td>
                      <td className="p-3.5">{new Date(sub.startDate).toLocaleDateString()}</td>
                      <td className="p-3.5">{new Date(sub.expiryDate).toLocaleDateString()}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl my-8 overflow-hidden">
            <div className="p-6 bg-blue-950 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  {selectedPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Set plan pricing in Nigerian Naira (₦) & customize features for Grobax users.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Plan ID (Unique) *
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(selectedPlan)}
                    value={formPlanId}
                    onChange={(e) => setFormPlanId(e.target.value)}
                    placeholder="e.g. plan_pro_naira"
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Champions Pro Scholar"
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Price in Naira (₦) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600">
                      ₦
                    </span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={100}
                      value={formPriceNaira}
                      onChange={(e) => setFormPriceNaira(Number(e.target.value))}
                      placeholder="2500"
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration Value & Unit *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      required
                      min={1}
                      value={formDurationValue}
                      onChange={(e) => setFormDurationValue(Number(e.target.value))}
                      className="w-24 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={formDurationUnit}
                      onChange={(e) => setFormDurationUnit(e.target.value as any)}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Days">Days</option>
                      <option value="Months">Months</option>
                      <option value="Years">Years</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Short Tagline / Summary
                </label>
                <input
                  type="text"
                  value={formShortDesc}
                  onChange={(e) => setFormShortDesc(e.target.value)}
                  placeholder="e.g. 2x GP multiplier & priority live match access"
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Detailed Description
                </label>
                <textarea
                  rows={2}
                  value={formFullDesc}
                  onChange={(e) => setFormFullDesc(e.target.value)}
                  placeholder="Describe who this plan is for..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Benefits List (One per line)
                </label>
                <textarea
                  rows={4}
                  value={formBenefitsText}
                  onChange={(e) => setFormBenefitsText(e.target.value)}
                  placeholder="2x GP Reward Multiplier&#10;Verified Profile Badge&#10;Direct Representative Entry"
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Badge Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={formBadgeLabel}
                    onChange={(e) => setFormBadgeLabel(e.target.value)}
                    placeholder="e.g. POPULAR, RECOMMENDED, BEST VALUE"
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Highlight as Featured Plan
                  </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Plan Active (Visible to Users)
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-60"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {selectedPlan ? 'Update Plan' : 'Save & Publish Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-rose-500/30 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Delete Subscription Plan?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This action removes the plan from User upgrades immediately.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Plan Name:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{planToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Plan ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{planToDelete.planId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Pricing:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ₦{planToDelete.priceNaira.toLocaleString()} / {planToDelete.durationValue} {planToDelete.durationUnit}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this plan? Active subscribers will retain their existing expiration dates, but new users will no longer be able to purchase or see this tier.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeletingPlan}
                onClick={() => setPlanToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPlan}
                onClick={handleConfirmDeletePlan}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isDeletingPlan ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeletingPlan ? 'Deleting...' : 'Delete Plan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
