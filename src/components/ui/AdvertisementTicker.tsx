import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, ArrowUpRight, X } from 'lucide-react';

export const AdvertisementTicker: React.FC = () => {
  const { sponsorshipCampaigns, activeTab } = useApp();
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Automatically restore ticker visibility and continuous scrolling when user switches to any navigation tab
  useEffect(() => {
    setIsVisible(true);
    setIsPaused(false);
  }, [activeTab]);

  // Hide sponsored ticker on Daily Ultimate Search alone (daily_qa / gus tab)
  if (!isVisible || activeTab === 'daily_qa' || activeTab === 'gus') return null;

  // Active ticker campaigns
  const activeTickerItems = sponsorshipCampaigns.filter(
    c => c.status === 'Active' && c.placement === 'Ticker'
  );

  const tickerList = activeTickerItems.length > 0 ? activeTickerItems : [
    {
      id: 'default_0',
      title: 'Grobaax Academic Network',
      sponsorName: 'Grobaax',
      logo: '🎓',
      text: 'Grobaax - An Academic Network that connect students together.',
      status: 'Active',
      priority: 'Top',
      destinationUrl: '#home',
    },
    {
      id: 'default_1',
      title: 'GUS Season 1 Registration Open',
      sponsorName: 'Grobaax Official',
      logo: '🏆',
      text: 'MTN presents Grobaax GUS Season 1 • GUS registration is open • Institutional League begins Friday',
      status: 'Active',
      priority: 'Top',
      destinationUrl: '#league',
    },
    {
      id: 'default_2',
      title: 'Airtel STEM Rewards',
      sponsorName: 'Airtel STEM',
      logo: '⚡',
      text: 'Earn double GP rewards in all Dome speed duels this weekend!',
      status: 'Active',
      priority: 'High',
      destinationUrl: '#arena',
    },
  ];

  // Repeat items to ensure smooth continuous 50% translation loop
  const repeatedItems = [
    ...tickerList,
    ...tickerList,
    ...tickerList,
    ...tickerList,
    ...tickerList,
    ...tickerList,
  ];

  return (
    <div
      className="relative z-30 w-full overflow-hidden bg-white/90 dark:bg-slate-950/90 text-slate-800 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800/80 py-1.5 px-3 flex items-center select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => {
        // Resume scrolling after brief pause on mobile touch
        setTimeout(() => setIsPaused(false), 800);
      }}
      onTouchCancel={() => setIsPaused(false)}
    >
      {/* Fixed Tag */}
      <div className="shrink-0 flex items-center gap-1 pr-2.5 font-black text-blue-600 dark:text-blue-400 border-r border-slate-300 dark:border-slate-800 mr-2 text-[10px] uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
        <span>SPONSOR TICKER</span>
      </div>

      {/* Ticker Content Marquee - RIGHT TO LEFT CONTINUOUS MOTION */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className={`animate-ticker-marquee items-center gap-6 whitespace-nowrap font-medium ${
            isPaused ? 'animate-ticker-paused' : ''
          }`}
        >
          {repeatedItems.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="inline-flex items-center gap-1.5 shrink-0 text-[11px] leading-none">
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <span>{item.logo}</span>
                <span>{item.sponsorName}</span>
              </span>
              <span className="text-slate-700 dark:text-slate-200 font-semibold">{item.text}</span>
              {('destinationUrl' in item) && item.destinationUrl && (
                <a
                  href={item.destinationUrl}
                  target={item.destinationUrl.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline font-bold ml-1 cursor-pointer"
                >
                  <span>{(item as any).ctaText || 'Learn More'}</span>
                  <ArrowUpRight className="w-2.5 h-2.5" />
                </a>
              )}
              <span className="text-slate-300 dark:text-slate-700 mx-1.5">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="shrink-0 pl-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        title="Dismiss Ticker"
        aria-label="Dismiss Ticker"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
