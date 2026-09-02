import React from 'react';
import { UserEquippedBadge } from '../../types';
import { Sparkles, Shield, Crown, Award } from 'lucide-react';

interface UserBadgeItemProps {
  name: string;
  verified?: boolean;
  isPremium?: boolean;
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
  title = 'Verified Grobax Scholar',
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
 * Premium Package Badge with sleek Dark Blue / Gold styling
 */
export const PremiumPackageBadge: React.FC<{
  tier?: string;
  className?: string;
}> = ({ tier = 'PREMIUM', className = '' }) => {
  const isVip = tier.toUpperCase().includes('VIP') || tier.toUpperCase().includes('TITAN');
  const isStarter = tier.toUpperCase().includes('STARTER');

  const label = isVip
    ? 'VIP SCHOLAR'
    : isStarter
    ? 'STARTER SCHOLAR'
    : tier.toUpperCase().includes('PRO')
    ? 'PRO SCHOLAR'
    : 'PREMIUM';

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-xs ${
        isVip
          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border border-amber-400/40'
          : 'bg-blue-950 text-blue-300 border border-blue-700/60 dark:bg-blue-900/90 dark:text-blue-200'
      } ${className}`}
      title={`Active Package: ${tier}`}
    >
      {isVip ? (
        <Crown className="w-2.5 h-2.5 text-slate-950 shrink-0" />
      ) : (
        <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
};

export const UserBadgeItem: React.FC<UserBadgeItemProps> = ({
  name,
  verified = false,
  isPremium = false,
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

  const hasPremium =
    !isExpired &&
    (Boolean(isPremium) ||
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
            {institution || 'Grobax Scholar'}
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
              : 'text-slate-900 dark:text-slate-100'
          } ${textSizeClass}`}
        >
          {name}
        </span>

        {/* Twitter-style Verified Blue Badge for upgraded users / staff */}
        {(verified || hasPremium) && <TwitterVerifiedBadge className={badgeIconSize} />}

        {/* Premium Package Badge */}
        <PremiumPackageBadge
          tier={membershipTier || (isStaff || isCm ? 'VIP SCHOLAR' : 'PREMIUM')}
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
          {institution || 'Grobax Scholar'}
          {department ? ` • ${department}` : ''}
        </span>
      )}
    </div>
  );
};

