import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EventDetailsModal } from './EventDetailsModal';
import {
  PlatformEventItem,
  PlatformEventCategory,
  PLATFORM_EVENT_CATEGORIES,
  OFFICIAL_EVENT_HOST,
} from '../../types';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import {
  Trophy,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Sparkles,
  Clock,
  Search,
  ShoppingBag,
  GraduationCap,
  Flame,
  Award,
  Zap,
} from 'lucide-react';

export const HomeTab: React.FC = () => {
  const { setActiveTab, events: contextEvents, markSectionAsRead } = useApp();

  // Clear home notification badge when user views Home tab
  useEffect(() => {
    if (markSectionAsRead) {
      markSectionAsRead('home');
    }
  }, [markSectionAsRead]);

  // Use platform events from global AppContext to eliminate redundant Firestore listeners
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<PlatformEventItem | null>(null);
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>('All');
  const platformEvents = (contextEvents as any as PlatformEventItem[]) || [];
  const isLoadingEvents = false;

  // Display platform events (Published events for users)
  const sourceEvents = platformEvents.length > 0 ? platformEvents : (contextEvents as any) || [];
  const publishedEvents = sourceEvents.filter((ev: PlatformEventItem) => ev.status === 'Published');

  const filteredEvents = publishedEvents.filter((ev: PlatformEventItem) => {
    if (eventCategoryFilter === 'All') return true;
    return ev.category === eventCategoryFilter;
  });

  const getCategoryBadgeColor = (cat: PlatformEventCategory) => {
    switch (cat) {
      case 'academic_olympiad':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'chatroom_live':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'campus_hackathon':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'others':
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div id="grobax-home-tab" className="pb-24 pt-4 space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* ======================================================== */}
      {/* 1. PROFESSIONAL GROBAAX WELCOME & PILLARS INTRO SECTION */}
      {/* ======================================================== */}
      <section
        id="home-welcome-section"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 text-white p-6 sm:p-8 lg:p-10 shadow-xl border border-blue-900/40"
      >
        {/* Subtle background flare */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
              <span>Campus Academic Hub</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-white">
              Welcome to Grobaax
            </h1>

            <p className="text-xs sm:text-sm lg:text-base text-slate-300 max-w-3xl leading-relaxed font-medium">
              Grobaax is an education-focused platform where students discover useful academic information, test knowledge through <strong>Daily Ultimate Search</strong>, and connect with fellow scholars via the <strong>Campus Mini Mart & Skills Listing</strong>.
            </p>
          </div>

          {/* Three Core Pillars Quick Action / Highlight Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Daily Ultimate Search Pillar */}
            <div
              onClick={() => setActiveTab('daily_qa')}
              className="p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm sm:text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                      Daily Ultimate Search
                    </h2>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/30">
                      LIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Participate in daily real-time search queries and challenge questions to boost your knowledge and earn GP points.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-blue-300">
                <span>Enter Daily Ultimate Search</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Mini Mart & Skills Listing Pillar */}
            <div
              onClick={() => setActiveTab('community')}
              className="p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Mini Mart & Skills Listing
                    </h2>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black border border-emerald-500/30">
                      MARKET
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Buy, sell campus essentials, textbooks, gadgets, and list student freelance services safely in your institution.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-emerald-300">
                <span>Explore Mini Mart</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. ADMIN-CREATED EVENTS SECTION (REAL-TIME FIRESTORE) */}
      {/* ======================================================== */}
      <section id="admin-created-events-section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Official Campus Events</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[9px] font-black border border-blue-500/20">
                  REAL-TIME
                </span>
              </h2>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Official tournaments, academic olympiads & verified campus competitions created by administrators
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setEventCategoryFilter('All')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                eventCategoryFilter === 'All'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Events
            </button>
            {PLATFORM_EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setEventCategoryFilter(cat.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  eventCategoryFilter === cat.id
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.shortLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        {isLoadingEvents ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            Loading official events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            No published events found right now. Check back soon for new official tournaments and academic events!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredEvents.map((ev: PlatformEventItem) => {
              const catObj = PLATFORM_EVENT_CATEGORIES.find((c) => c.id === ev.category);
              const catLabel = catObj?.label || ev.category;
              const hasPrize = Boolean(ev.prizeReward && ev.prizeReward.trim() !== '' && ev.prizeReward.trim() !== '0');

              return (
                <Card
                  key={ev.id}
                  id={`home-event-card-${ev.id}`}
                  className="p-0 overflow-hidden transition-all hover:border-blue-500/40 hover:shadow-md flex flex-col justify-between group"
                >
                  {/* Card Cover Image */}
                  <div
                    className="relative h-36 w-full bg-slate-950 overflow-hidden cursor-pointer"
                    onClick={() => setSelectedEventForDetails(ev)}
                  >
                    <img
                      src={
                        ev.imageUrl ||
                        ev.image ||
                        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80'
                      }
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                    {/* Category & Status Overlay */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${getCategoryBadgeColor(
                          ev.category
                        )} bg-slate-950/80`}
                      >
                        {catObj?.shortLabel || catLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-md">
                        Official Event
                      </span>
                    </div>

                    {/* Event Title */}
                    <div className="absolute bottom-2.5 left-3 right-3">
                      <h3 className="text-sm font-black text-white leading-tight drop-shadow-sm line-clamp-1">
                        {ev.title}
                      </h3>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between text-xs">
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>
                          Hosted by{' '}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {ev.host || OFFICIAL_EVENT_HOST}
                          </strong>
                        </span>
                      </p>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Date Window
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {ev.startDate && ev.endDate ? `${ev.startDate} to ${ev.endDate}` : ev.date || 'Active Event'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-500" /> Time & Audience
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {ev.eventTime || ev.time || '18:00 UTC'} • All Users
                          </span>
                        </div>

                        {/* Reward field ONLY rendered if configured */}
                        {hasPrize && (
                          <div className="flex items-center justify-between text-xs pt-0.5 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Reward
                            </span>
                            <span className="font-black text-amber-600 dark:text-amber-400">
                              {ev.prizeReward}
                            </span>
                          </div>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {/* View Event Button */}
                    <Button
                      id={`view-event-btn-${ev.id}`}
                      variant="primary"
                      size="sm"
                      className="w-full justify-center mt-1"
                      onClick={() => setSelectedEventForDetails(ev)}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      View Event Details
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* EVENT DETAILS MODAL OVERLAY */}
      {selectedEventForDetails && (
        <EventDetailsModal
          event={selectedEventForDetails}
          onClose={() => setSelectedEventForDetails(null)}
        />
      )}
    </div>
  );
};
