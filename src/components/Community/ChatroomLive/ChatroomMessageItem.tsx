import React from 'react';
import {
  ChatroomLiveMessage,
} from '../../../types';
import {
  Reply,
  Trash2,
  VolumeX,
  Shield,
  Building2,
  Trophy,
  Sparkles,
  HelpCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { UserBadgeItem } from '../../ui/UserBadgeItem';

interface ChatroomMessageItemProps {
  message: ChatroomLiveMessage;
  currentUserId?: string;
  isManagerOrAdmin?: boolean;
  hasRepliedToQuestion?: boolean;
  onReply?: (message: ChatroomLiveMessage) => void;
  onDelete?: (messageId: string) => void;
  onMuteUser?: (userId: string, userName: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

const COMMON_EMOJIS = ['🔥', '❤️', '👏', '👍', '⚡', '💯'];

export const ChatroomMessageItem: React.FC<ChatroomMessageItemProps> = ({
  message,
  currentUserId,
  isManagerOrAdmin,
  hasRepliedToQuestion,
  onReply,
  onDelete,
  onMuteUser,
  onReact,
}) => {
  if (message.isDeleted) {
    return (
      <div className="py-1 px-4 text-xs italic text-slate-400 dark:text-slate-500 bg-slate-100/40 dark:bg-slate-900/30 rounded-lg">
        [Message deleted]
      </div>
    );
  }

  const isSelf = currentUserId === message.userId;
  const isCommunityManager =
    message.userName.toLowerCase().includes('manager') ||
    message.institution?.toLowerCase().includes('management') ||
    message.userName.toLowerCase().includes('community manager');

  const isStaffOrAdmin =
    isCommunityManager ||
    message.userName.toLowerCase().includes('support') ||
    message.userName.toLowerCase().includes('staff') ||
    message.userName.toLowerCase().includes('admin') ||
    message.userId.includes('admin') ||
    message.userId.includes('barns');

  const hasPremium =
    Boolean(message.isPremium) ||
    Boolean(
      (message as any).membershipTier &&
        !(message as any).membershipTier.toLowerCase().includes('free')
    );

  const formattedTime = (() => {
    try {
      if (typeof message.timestamp === 'number') {
        return new Date(message.timestamp).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        });
      }
      return 'Just now';
    } catch {
      return 'Just now';
    }
  })();

  const reactions = message.reactions || {};

  return (
    <div
      id={`chat-msg-${message.id}`}
      className="group relative flex flex-col px-2 sm:px-3 py-1.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
    >
      {/* Discord-style Curved Reply Header */}
      {message.replyTo && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-6 pb-1 relative">
          {/* L-shaped curved connector line */}
          <div className="absolute left-3 top-2 w-3 h-2.5 border-l-2 border-t-2 border-slate-300 dark:border-slate-600 rounded-tl-lg" />
          <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
            @{message.replyTo.userName}
          </span>
          <span className="truncate max-w-[240px] sm:max-w-md text-[11px] text-slate-500 dark:text-slate-400">
            {message.replyTo.messageSnippet}
          </span>
        </div>
      )}

      {/* Main Message Row */}
      <div className="flex gap-3 items-start">
        {/* User Avatar */}
        <div className="relative shrink-0 pt-0.5">
          <img
            src={
              message.userAvatar ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            }
            alt={message.userName}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-1 ${
              isStaffOrAdmin
                ? 'ring-amber-500 shadow-xs'
                : 'ring-slate-200 dark:ring-slate-700'
            }`}
          />
        </div>

        {/* Message Content Body */}
        <div className="flex-1 min-w-0">
          {/* Top Line: Username & Twitter-style verified badge & Premium badge & Role Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <UserBadgeItem
              name={message.userName}
              verified={hasPremium || isStaffOrAdmin || (message as any).verified}
              isPremium={hasPremium}
              membershipTier={(message as any).membershipTier || (isStaffOrAdmin ? 'VIP SCHOLAR' : hasPremium ? 'PREMIUM' : undefined)}
              equippedBadge={(message as any).equippedBadge}
              role={(message as any).role}
              isStaffOrAdmin={isStaffOrAdmin}
              isCommunityManager={isCommunityManager}
              size="sm"
            />

            {/* Timestamp */}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-auto sm:ml-0">
              {formattedTime}
            </span>
          </div>

          {/* Subline: School / University & Department */}
          {message.institution && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">
                {message.institution}
                {message.department ? ` • ${message.department}` : ''}
              </span>
            </div>
          )}

          {/* Message Content: Question Challenge Card vs Announcement vs Normal */}
          {message.type === 'question' ? (
            <div className="mt-2 p-3.5 bg-gradient-to-br from-blue-950/80 via-indigo-950/80 to-slate-900 border-2 border-amber-400/60 rounded-2xl text-white shadow-lg space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/10">
                <div className="flex items-center gap-1.5 font-black text-xs text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>LIVE Q&A CHALLENGE #{message.competitionRef?.questionNumber || 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-xs">
                    <Trophy className="w-3 h-3" />
                    +{message.competitionRef?.gpRewardPerWinner || 50} GP each
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 font-bold text-[10px] border border-blue-400/30">
                    First {message.competitionRef?.winnerCountLimit || 5} scholars
                  </span>
                </div>
              </div>

              <div className="text-sm sm:text-base font-bold text-white leading-snug">
                {message.competitionRef?.questionText || message.messageText}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-blue-200/80 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-300" />
                  Type your answer in the chat
                </span>

                {hasRepliedToQuestion ? (
                  <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Answer Submitted (1 Attempt Allowed)</span>
                  </div>
                ) : onReply ? (
                  <button
                    onClick={() => onReply(message)}
                    className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1 shadow-md active:scale-95"
                  >
                    <Reply className="w-3.5 h-3.5 -scale-x-100" />
                    <span>Reply to Answer</span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : message.type === 'announcement' ? (
            <div className="mt-1 p-2.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-amber-100 leading-relaxed font-medium">
              {message.messageText}
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed break-words font-normal whitespace-pre-wrap mt-1">
              {message.messageText}
            </div>
          )}

          {/* Reactions Row + Inline Quick Reply / React Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {/* Existing Reactions */}
            {Object.entries(reactions).map(([emoji, count]) => {
              const numericCount = Number(count);
              if (!numericCount || numericCount <= 0) return null;
              return (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact && onReact(message.id, emoji);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer transition active:scale-90 select-none"
                >
                  <span className="transform active:scale-125 transition-transform">{emoji}</span>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">{numericCount}</span>
                </button>
              );
            })}

            {/* Quick Emoji Reaction Buttons */}
            <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition">
              {COMMON_EMOJIS.slice(0, 3).map(emoji => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact && onReact(message.id, emoji);
                  }}
                  title={`React ${emoji}`}
                  className="text-xs px-1 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition cursor-pointer active:scale-125 select-none"
                >
                  {emoji}
                </button>
              ))}

              {/* Quick Reply Button */}
              {onReply && (
                <button
                  onClick={() => onReply(message)}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition cursor-pointer font-medium"
                  title="Reply to message"
                >
                  <Reply className="w-3 h-3 -scale-x-100" />
                  <span>Reply</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar on Hover (Discord style) */}
      <div className="absolute right-3 top-1 hidden group-hover:flex items-center gap-0.5 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md z-10">
        {/* Quick Emoji Reaction */}
        {COMMON_EMOJIS.slice(0, 3).map(emoji => (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onReact && onReact(message.id, emoji);
            }}
            title={`React with ${emoji}`}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm cursor-pointer transition active:scale-125 select-none"
          >
            {emoji}
          </button>
        ))}

        {/* Reply */}
        {onReply && (
          <button
            onClick={() => onReply(message)}
            title="Reply"
            className="p-1.5 text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            <Reply className="w-3.5 h-3.5 -scale-x-100" />
          </button>
        )}

        {/* Mute User */}
        {isManagerOrAdmin && !isSelf && onMuteUser && (
          <button
            onClick={() => onMuteUser(message.userId, message.userName)}
            title="Mute User"
            className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            <VolumeX className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete */}
        {(isManagerOrAdmin || isSelf) && onDelete && (
          <button
            onClick={() => onDelete(message.id)}
            title="Delete Message"
            className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
