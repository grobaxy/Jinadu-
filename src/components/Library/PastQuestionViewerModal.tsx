import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building,
  GraduationCap,
  Calendar,
  Layers,
  Sparkles,
  Lock,
  UserCheck,
} from 'lucide-react';
import { PastQuestion } from '../../types';

interface PastQuestionViewerModalProps {
  question: PastQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    uid?: string;
    username?: string;
    fullName?: string;
    email?: string;
    tier?: string;
  } | null;
}

export const PastQuestionViewerModal: React.FC<PastQuestionViewerModalProps> = ({
  question,
  isOpen,
  onClose,
  currentUser,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pages array
  const pages: string[] = question?.fileUrls && question.fileUrls.length > 0
    ? question.fileUrls
    : question?.fileUrl
    ? [question.fileUrl]
    : [];

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(0);
      setZoomLevel(1);
      setRotation(0);
      // Disable body scroll when modal open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, question]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' && currentPage < pages.length - 1) {
        setCurrentPage((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentPage > 0) {
        setCurrentPage((prev) => prev - 1);
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel((prev) => Math.min(prev + 0.25, 3));
      } else if (e.key === '-') {
        setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, pages.length, isFullscreen, onClose]);

  if (!isOpen || !question) return null;

  const activePageUrl = pages[currentPage] || '';
  const isPdf = question.fileType === 'pdf' || (question.fileName && question.fileName.toLowerCase().endsWith('.pdf'));

  const userIdentifier = currentUser?.username || currentUser?.fullName || currentUser?.email || 'Scholar';
  const userUidPart = currentUser?.uid ? currentUser.uid.slice(0, 8) : 'GUEST';

  return (
    <AnimatePresence>
      <div
        id="past-question-viewer-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 select-none"
        onContextMenu={(e) => e.preventDefault()} // Security: disable right-click context menu
      >
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className={`flex flex-col bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl overflow-hidden ${
            isFullscreen ? 'fixed inset-0 rounded-none z-50' : 'w-full max-w-5xl h-[92vh]'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                    {question.courseCode}: {question.courseTitle}
                  </h2>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <UserCheck className="w-3 h-3 mr-1" />
                    Verified Past Question
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {question.institutionName} • {question.academicSession} • {question.semester} • {question.level}
                </p>
              </div>
            </div>

            {/* Viewer Controls */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Desktop & Mobile Zoom Controls */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                  title="Zoom Out (-)"
                  aria-label="Zoom Out"
                  id="pq-zoom-out-btn"
                  className="p-1.5 rounded-md hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] sm:text-xs font-mono text-slate-300 px-1 sm:px-2 min-w-[38px] sm:min-w-[48px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                  title="Zoom In (+)"
                  aria-label="Zoom In"
                  id="pq-zoom-in-btn"
                  className="p-1.5 rounded-md hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* Rotate Control */}
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate 90°"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Fullscreen Control */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                className="hidden sm:inline-flex p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                id="close-pq-viewer-btn"
                title="Close Viewer (Esc)"
                className="p-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-colors ml-0.5 sm:ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Security Notice Pill */}
          <div className="bg-slate-900/90 px-4 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Protected Academic Record — In-App Viewer Mode Only (Downloading Disabled)
            </span>
            <span className="hidden sm:inline-block font-mono text-[10px] text-slate-500">
              Security Token: GRBX-{userUidPart}-{question.courseCode.replace(/[^a-zA-Z0-9]/g, '')}
            </span>
          </div>

          {/* Main Viewer Canvas */}
          <div className="relative flex-1 bg-slate-950 overflow-auto flex items-center justify-center p-4 sm:p-6 min-h-0">
            {/* Watermark Diagonal Overlay (Prevents screen-grabs from being misused) */}
            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden opacity-15">
              <div className="transform -rotate-25 text-center select-none">
                <p className="text-xl sm:text-2xl font-black tracking-widest text-slate-300 uppercase whitespace-nowrap">
                  GROBAAX ACADEMIC VAULT
                </p>
                <p className="text-xs sm:text-sm font-semibold tracking-wider text-slate-400 mt-1">
                  PREVIEW LICENSED TO: @{userIdentifier} • UID: {userUidPart}
                </p>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                  AUTHENTICATED NIGERIAN TERTIARY CURRICULUM ARCHIVE
                </p>
              </div>
            </div>

            {/* Document Content View */}
            {activePageUrl ? (
              <div
                className="relative z-10 transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                {isPdf && activePageUrl.startsWith('data:application/pdf') ? (
                  <iframe
                    src={`${activePageUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    title="Past Question PDF"
                    className="w-[800px] h-[650px] rounded-lg border border-slate-800 bg-white shadow-2xl"
                  />
                ) : (
                  <img
                    src={activePageUrl}
                    alt={`${question.courseCode} Page ${currentPage + 1}`}
                    onDragStart={(e) => e.preventDefault()} // Prevent drag save
                    onContextMenu={(e) => e.preventDefault()} // Prevent right-click save
                    className="max-h-[70vh] w-auto object-contain rounded-lg border border-slate-800 shadow-2xl pointer-events-none select-none bg-slate-900"
                  />
                )}
              </div>
            ) : (
              <div className="text-center p-8 text-slate-500">
                <p className="text-sm">Past question document is loading or not available.</p>
              </div>
            )}
            {/* Mobile Bottom-Right Quick Zoom Overlay */}
            <div className="sm:hidden absolute bottom-3 right-3 z-30 flex items-center bg-slate-900/90 backdrop-blur-md rounded-xl p-1 border border-slate-700/80 shadow-lg gap-1">
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                title="Zoom Out"
                className="p-2 rounded-lg bg-slate-800 text-slate-200 active:bg-slate-700"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setRotation(0);
                }}
                title="Reset Zoom"
                className="px-2 py-1 text-[10px] font-mono font-bold text-blue-400 bg-slate-800/80 rounded-md"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                title="Zoom In"
                className="p-2 rounded-lg bg-slate-800 text-slate-200 active:bg-slate-700"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Footer Bar / Pagination Controls */}
          <div className="px-4 sm:px-6 py-3 bg-slate-900 border-t border-slate-800 shrink-0 flex flex-wrap items-center justify-between gap-3">
            {/* Academic Session & Faculty Details */}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">{question.examType || 'Main Exam'}</span>
              <span>•</span>
              <span>{question.facultyName}</span>
              {question.lecturerName ? (
                <>
                  <span>•</span>
                  <span>Lecturer: {question.lecturerName}</span>
                </>
              ) : null}
            </div>

            {/* Page Navigator */}
            {pages.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
                  title="Previous Page (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-semibold text-slate-300 px-2">
                  Page {currentPage + 1} of {pages.length}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
                  disabled={currentPage === pages.length - 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
                  title="Next Page (Right Arrow)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Contributor Credit */}
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>Contributed by:</span>
              <span className="font-semibold text-indigo-400">{question.uploadedByName || 'Scholar'}</span>
              {question.gpAwarded ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold text-[11px] ml-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  +{question.gpAwarded} GP
                </span>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
