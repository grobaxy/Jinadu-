import React from 'react';
import { UserEquippedBadge } from '../../types';
import { Sparkles, Shield, Crown, Award, User } from 'lucide-react';

interface UserBadgeItemProps {
  name: string;
  verified?: boolean;
  isPremium?: boolean;
  isVip?: boolean;
  membershipTier?: string;
  subscriptionExpiry?: string;
  institution?: string;
  department?: string;
  showInstitution?: boolean;
  equippedBadge?: UserEquippedBadge;
  role?: string;
  isStaffOrAdmin?: boolean;
  isCommunityManager?: boolean;
  className?: string;
  badgeClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * Twitter / X - style verified blue checkmark icon
 */
export const TwitterVerifiedBadge: React.FC<{ className?: string; title?: string }> = ({
  className = 'w-4 h-4',
  title = 'Verified Grobaax Scholar',
}) => (
  <span className="inline-flex items-center shrink-0" title={title}>
    <svg
      viewBox="0 0 24 24"
      aria-label="Verified account"
      className={`${className} text-[#1d9bf0] fill-[#1d9bf0] drop-shadow-xs`}
    >
      <g>
        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238.65 1.273 2.02 2.148 3.6 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.83 4.29l-4.22-4.22 1.41-1.41 2.81 2.81 6.54-6.54 1.41 1.41-7.95 7.95z" />
      </g>
    </svg>
  </span>
);

/**
 * Package Badge with sleek VIP / Premium / Free styling
 */
export const PremiumPackageBadge: React.FC<{
  tier?: string;
  isVip?: boolean;
  className?: string;
}> = ({ tier = 'PREMIUM', isVip: explicitVip, className = '' }) => {
  const upper = (tier || '').toUpperCase();
  const isVip = explicitVip || upper.includes('VIP') || upper.includes('TITAN') || upper.includes('ANNUAL');
  const isFree = upper.includes('FREE') || upper === 'BASIC';
  const isStarter = upper.includes('STARTER');
  const isPro = upper.includes('PRO') || upper.includes('CHAMPION');

  if (isVip) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 border border-amber-300 ring-1 ring-amber-400/50 ${className}`}
        title={`Active VIP Scholar Package: ${tier}`}
      >
        <Crown className="w-2.5 h-2.5 text-slate-950 fill-amber-950 shrink-0" />
        <span className="truncate">VIP SCHOLAR</span>
      </span>
    );
  }

  if (isFree) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 ${className}`}
        title="Free Scholar Account"
      >
        <User className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400 shrink-0" />
        <span className="truncate">FREE SCHOLAR</span>
      </span>
    );
  }

  const label = isStarter
    ? 'STARTER SCHOLAR'
    : isPro
    ? 'PRO SCHOLAR'
    : 'PREMIUM SCHOLAR';

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-xs bg-gradient-to-r from-blue-900 to-indigo-900 text-blue-200 border border-blue-600/70 dark:bg-gradient-to-r dark:from-blue-950 dark:to-indigo-900 dark:text-blue-100 dark:border-blue-500/60 ${className}`}
      title={`Active Premium Package: ${tier}`}
    >
      <Sparkles className="w-2.5 h-2.5 text-cyan-300 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
};

/**
 * Universal Scholar Tier Badge identifying Free, Premium, and VIP users
 */
export const ScholarTierBadge = PremiumPackageBadge;

export const UserBadgeItem: React.FC<UserBadgeItemProps> = ({
  name,
  verified = false,
  isPremium = false,
  isVip = false,
  membershipTier,
  subscriptionExpiry,
  institution,
  department,
  showInstitution = false,
  equippedBadge,
  role,
  isStaffOrAdmin = false,
  isCommunityManager = false,
  className = '',
  badgeClassName = '',
  size = 'md',
}) => {
  const isCm =
    isCommunityManager ||
    role === 'community_manager' ||
    name.toLowerCase().includes('community manager');

  const isStaff =
    isStaffOrAdmin ||
    role === 'admin' ||
    role === 'super_admin' ||
    name.toLowerCase().includes('admin') ||
    name.toLowerCase().includes('staff');

  const isExpired = subscriptionExpiry
    ? new Date(subscriptionExpiry).getTime() <= Date.now()
    : false;

  const rawTierUpper = (membershipTier || '').toUpperCase();
  const isVipUser =
    Boolean(isVip) ||
    rawTierUpper.includes('VIP') ||
    rawTierUpper.includes('TITAN') ||
    rawTierUpper.includes('ANNUAL');

  const hasPremium =
    !isExpired &&
    (isVipUser ||
      Boolean(isPremium) ||
      Boolean(
        membershipTier &&
        !membershipTier.toLowerCase().includes('free') &&
        membershipTier.trim().length > 0
      ) ||
      isCm ||
      isStaff);

  const textSizeClass =
    size === 'xs'
      ? 'text-xs'
      : size === 'sm'
      ? 'text-xs sm:text-sm'
      : size === 'lg'
      ? 'text-base sm:text-lg'
      : 'text-sm font-bold';

  const badgeIconSize = size === 'xs' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  // If user has not upgraded their plan and is not staff/CM, do not render badges
  if (!hasPremium) {
    return (
      <div className={`inline-flex flex-col ${className}`}>
        <div className="inline-flex items-center gap-1.5 flex-wrap">
          <span className={`font-bold text-slate-900 dark:text-slate-100 ${textSizeClass}`}>
            {name}
          </span>
        </div>

        {/* Institution Line if requested */}
        {showInstitution && (institution || department) && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
            {institution || 'Grobaax Scholar'}
            {department ? ` • ${department}` : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        <span
          className={`font-black ${
            isCm
              ? 'text-amber-500 dark:text-amber-400'
              : isStaff
              ? 'text-blue-900 dark:text-blue-300'
              : isVipUser
              ? 'text-amber-600 dark:text-amber-300'
              : 'text-slate-900 dark:text-slate-100'
          } ${textSizeClass}`}
        >
          {name}
        </span>

        {/* Twitter-style Verified Blue Badge for upgraded users (both VIP and Premium) & staff */}
        {(verified || hasPremium || isVipUser) && (
          <TwitterVerifiedBadge
            className={badgeIconSize}
            title={isVipUser ? 'VIP Verified Grobaax Scholar' : 'Verified Grobaax Scholar'}
          />
        )}

        {/* Distinctive Package Badge: VIP vs Premium */}
        <PremiumPackageBadge
          tier={membershipTier || (isVipUser ? 'VIP SCHOLAR' : isStaff || isCm ? 'VIP SCHOLAR' : 'PREMIUM')}
          isVip={isVipUser}
        />

        {/* Custom Equipped Badge if equipped */}
        {equippedBadge && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md border ${
              equippedBadge.color || 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            } ${badgeClassName}`}
            title={`Equipped Title: ${equippedBadge.title}`}
          >
            <span>{equippedBadge.icon}</span>
            <span className="hidden sm:inline-block max-w-[80px] truncate">
              {equippedBadge.title}
            </span>
          </span>
        )}

        {/* Community Manager / Staff badges */}
        {isCm ? (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-xs">
            <Shield className="w-3 h-3 text-amber-500" />
            <span>Community Manager</span>
          </span>
        ) : isStaff ? (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-950 text-blue-200 border border-blue-700/50 flex items-center gap-1">
            <span>Staff / Admin</span>
          </span>
        ) : null}
      </div>

      {/* Institution Line if requested */}
      {showInstitution && (institution || department) && (
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
          {institution || 'Grobaax Scholar'}
          {department ? ` • ${department}` : ''}
        </span>
      )}
    </div>
  );
};

