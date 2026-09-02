import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  CampusMembership,
  CampusConnectionRequest,
  CampusStudentCard,
  InstitutionCategory,
} from '../../../types';
import {
  getCampusMembership,
  fetchCampusStudents,
  subscribeCampusConnections,
  sendCampusChatRequest,
  respondCampusChatRequest,
  getSecureWhatsAppLink,
} from '../../../lib/campusService';
import {
  getFacultiesByCategory,
  getDepartmentsByFaculty,
} from '../../../data/academicStructureData';
import { CampusJoinScreen } from './CampusJoinScreen';
import { CampusStudentRow } from './CampusStudentRow';
import { CampusConnectionsView } from './CampusConnectionsView';
import { CampusEditWhatsAppModal } from './CampusEditWhatsAppModal';
import {
  GraduationCap,
  Building2,
  BookOpen,
  Users,
  Search,
  ChevronRight,
  ArrowLeft,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FolderTree,
} from 'lucide-react';

export const CampusView: React.FC = () => {
  const { currentUser } = useApp();

  // 1. Membership State
  const [membership, setMembership] = useState<CampusMembership | null>(null);
  const [isCheckingMembership, setIsCheckingMembership] = useState(true);
  const [isEditWhatsAppOpen, setIsEditWhatsAppOpen] = useState(false);

  // 2. Navigation State within Campus
  const [activeView, setActiveView] = useState<'directory' | 'connections'>('directory');
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  // 3. Search & Directory State
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<CampusStudentCard[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 4. Real-time Connection Requests State
  const [connections, setConnections] = useState<{
    received: CampusConnectionRequest[];
    sent: CampusConnectionRequest[];
    accepted: CampusConnectionRequest[];
  }>({
    received: [],
    sent: [],
    accepted: [],
  });

  // User's Academic Details
  const institutionName = useMemo(() => {
    return (
      currentUser.institution ||
      currentUser.institutionName ||
      currentUser.academicProfile?.institutionName ||
      'University of Lagos'
    );
  }, [currentUser]);

  const institutionCategory: InstitutionCategory = useMemo(() => {
    return (
      currentUser.institutionCategory ||
      currentUser.academicProfile?.institutionCategory ||
      'University'
    );
  }, [currentUser]);

  const facultiesList = useMemo(() => {
    return getFacultiesByCategory(institutionCategory);
  }, [institutionCategory]);

  const departmentsList = useMemo(() => {
    if (!selectedFaculty) return [];
    return getDepartmentsByFaculty(institutionCategory, selectedFaculty);
  }, [institutionCategory, selectedFaculty]);

  // Show temporary toast feedback
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  // 1. Initial Membership Fetch
  useEffect(() => {
    let isMounted = true;

    async function checkUserMembership() {
      if (!currentUser?.id) {
        setIsCheckingMembership(false);
        return;
      }
      setIsCheckingMembership(true);
      try {
        const mem = await getCampusMembership(currentUser.id);
        if (isMounted) {
          setMembership(mem);
        }
      } catch (err) {
        console.warn('Campus membership fetch note:', err);
      } finally {
        if (isMounted) {
          setIsCheckingMembership(false);
        }
      }
    }

    checkUserMembership();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // 2. Real-time Connection Listener
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubscribe = subscribeCampusConnections(currentUser.id, (data) => {
      setConnections(data);
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  // 3. Load Students for selected department or search
  const loadStudents = async () => {
    if (!institutionName) return;
    setIsLoadingStudents(true);
    try {
      const list = await fetchCampusStudents({
        institution: institutionName,
        faculty: selectedFaculty || undefined,
        department: selectedDepartment || undefined,
        search: searchQuery.trim() || undefined,
        currentUserId: currentUser.id,
      });
      setStudents(list);
    } catch (err) {
      console.warn('Error loading campus students:', err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (membership) {
      loadStudents();
    }
  }, [institutionName, selectedFaculty, selectedDepartment, searchQuery, membership]);

  // Handle Joining Campus
  const handleJoinedCampus = (whatsappNumber: string) => {
    setMembership({
      id: currentUser.id,
      userId: currentUser.id,
      institution: institutionName,
      institutionCategory,
      faculty: currentUser.faculty || currentUser.academicProfile?.facultyName || '',
      department: currentUser.department || currentUser.academicProfile?.departmentName || '',
      level: currentUser.level || currentUser.academicProfile?.level || '100 Level',
      whatsappNumber,
      whatsappVerified: true,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    });
    showToast('🎉 Welcome to GROBAX Campus! Your profile is verified.');
  };

  // Handle Send Chat Request
  const handleSendRequest = async (student: CampusStudentCard) => {
    const res = await sendCampusChatRequest(currentUser, student);
    if (res.success) {
      showToast(res.message || 'Connection request sent successfully!');
      // Update local student status immediately
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, connectionStatus: 'pending_sent' } : s))
      );
    } else {
      showToast(res.error || 'Failed to send request.', 'error');
    }
  };

  // Handle Accept Request
  const handleAcceptRequest = async (requestId: string, student: CampusStudentCard) => {
    const res = await respondCampusChatRequest(requestId, currentUser.id, 'ACCEPT');
    if (res.success) {
      showToast(res.message || 'Connection accepted! You can now chat on WhatsApp.');
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, connectionStatus: 'accepted' } : s))
      );
    } else {
      showToast(res.error || 'Failed to accept connection.', 'error');
    }
  };

  // Handle Reject Request
  const handleRejectRequest = async (requestId: string, student: CampusStudentCard) => {
    const res = await respondCampusChatRequest(requestId, currentUser.id, 'REJECT');
    if (res.success) {
      showToast(res.message || 'Connection request declined.');
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, connectionStatus: 'none' } : s))
      );
    } else {
      showToast(res.error || 'Failed to decline request.', 'error');
    }
  };

  // Handle Open WhatsApp Flow
  const handleOpenWhatsAppByStudent = async (student: CampusStudentCard) => {
    const res = await getSecureWhatsAppLink(currentUser.id, student.id, student.requestId);
    if (res.success && res.whatsappUrl) {
      window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
    } else {
      showToast(res.error || 'Unable to open WhatsApp chat.', 'error');
    }
  };

  const handleOpenWhatsAppByRequest = async (targetUserId: string, targetName: string, requestId: string) => {
    const res = await getSecureWhatsAppLink(currentUser.id, targetUserId, requestId);
    if (res.success && res.whatsappUrl) {
      window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
    } else {
      showToast(res.error || 'Unable to open WhatsApp chat.', 'error');
    }
  };

  // Loading State
  if (isCheckingMembership) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Connecting to GROBAX Campus...
        </p>
      </div>
    );
  }

  // If user hasn't joined campus yet, show join screen
  if (!membership) {
    return (
      <CampusJoinScreen
        currentUser={currentUser}
        onJoined={handleJoinedCampus}
      />
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-bold animate-in slide-in-from-top-4 duration-200 border ${
            feedbackToast.type === 'success'
              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* 1. TOP INSTITUTION HEADER & PROFILE BANNER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-blue-600 dark:text-blue-400" /> CAMPUS DISCOVERY
              </span>
              <span className="text-xs font-semibold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {institutionCategory}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{institutionName.toUpperCase()}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Discover and connect with registered students from your institution.
            </p>
          </div>

          {/* User Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="campus-edit-whatsapp-btn"
              type="button"
              onClick={() => setIsEditWhatsAppOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{membership.whatsappNumber || 'WhatsApp'}</span>
            </button>

            <button
              id="campus-refresh-btn"
              type="button"
              onClick={loadStudents}
              disabled={isLoadingStudents}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStudents ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* View Switcher: Directory vs Connections */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            id="campus-tab-directory"
            type="button"
            onClick={() => setActiveView('directory')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'directory'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Academic Directory</span>
          </button>

          <button
            id="campus-tab-connections"
            type="button"
            onClick={() => setActiveView('connections')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'connections'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>My Connections</span>
            {connections.received.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {connections.received.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      {activeView === 'connections' ? (
        <CampusConnectionsView
          received={connections.received}
          sent={connections.sent}
          accepted={connections.accepted}
          onAccept={async (reqId, req) => {
            // Optimistic update
            setConnections((prev) => {
              const targetReq = prev.received.find((r) => r.id === reqId) || req;
              const updatedReq: CampusConnectionRequest = {
                ...targetReq,
                id: reqId,
                status: 'ACCEPTED',
                respondedAt: new Date().toISOString(),
              };
              return {
                ...prev,
                received: prev.received.filter((r) => r.id !== reqId && r.id !== targetReq.id),
                accepted: [updatedReq, ...prev.accepted.filter((r) => r.id !== reqId && r.id !== targetReq.id)],
              };
            });

            // Update student card connection status in directory
            setStudents((prev) =>
              prev.map((s) => (s.id === req?.senderId || s.requestId === reqId ? { ...s, connectionStatus: 'accepted' } : s))
            );

            const res = await respondCampusChatRequest(reqId, currentUser.id, 'ACCEPT');
            if (res.success) {
              showToast(res.message || 'Connection accepted! You can now chat on WhatsApp.');
            } else {
              showToast(res.error || 'Failed to accept.', 'error');
            }
          }}
          onReject={async (reqId, req) => {
            // Optimistic update
            setConnections((prev) => ({
              ...prev,
              received: prev.received.filter((r) => r.id !== reqId && r.id !== req?.id),
            }));

            setStudents((prev) =>
              prev.map((s) => (s.id === req?.senderId || s.requestId === reqId ? { ...s, connectionStatus: 'none' } : s))
            );

            const res = await respondCampusChatRequest(reqId, currentUser.id, 'REJECT');
            if (res.success) {
              showToast(res.message || 'Connection declined.');
            } else {
              showToast(res.error || 'Failed to decline.', 'error');
            }
          }}
          onOpenWhatsApp={handleOpenWhatsAppByRequest}
          currentUserId={currentUser.id}
          students={students}
        />
      ) : (
        <div className="space-y-4">
          {/* Breadcrumbs & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSelectedFaculty(null);
                  setSelectedDepartment(null);
                }}
                className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer ${
                  !selectedFaculty ? 'text-blue-600 dark:text-blue-400 font-black' : ''
                }`}
              >
                All Faculties
              </button>

              {selectedFaculty && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setSelectedDepartment(null)}
                    className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer ${
                      !selectedDepartment ? 'text-blue-600 dark:text-blue-400 font-black' : ''
                    }`}
                  >
                    {selectedFaculty}
                  </button>
                </>
              )}

              {selectedDepartment && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-blue-600 dark:text-blue-400 font-black truncate max-w-[160px]">
                    {selectedDepartment}
                  </span>
                </>
              )}
            </div>

            {/* Instant Search Bar */}
            <div className="relative min-w-[200px] sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search scholars or dept..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* VIEW LEVEL 1: ALL FACULTIES (when no faculty or search query) */}
          {!selectedFaculty && !searchQuery && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Faculties in {institutionName}</span>
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {facultiesList.length} Faculties
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {facultiesList.map((fac) => (
                  <button
                    key={fac.id || fac.name}
                    type="button"
                    onClick={() => setSelectedFaculty(fac.name)}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md transition-all text-left group cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:scale-110 transition-transform">
                        {fac.icon || '🏛️'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {fac.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {fac.departments.length} Academic Departments
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* VIEW LEVEL 2: DEPARTMENTS IN SELECTED FACULTY */}
          {selectedFaculty && !selectedDepartment && !searchQuery && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFaculty(null)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    {selectedFaculty}
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {departmentsList.length} Departments
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {departmentsList.map((deptName) => (
                  <button
                    key={deptName}
                    type="button"
                    onClick={() => setSelectedDepartment(deptName)}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md transition-all text-left group cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {deptName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>Browse Scholars</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* VIEW LEVEL 3: STUDENT DIRECTORY (Department or Search Results) */}
          {(selectedDepartment || searchQuery) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedDepartment && (
                    <button
                      type="button"
                      onClick={() => setSelectedDepartment(null)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 truncate">
                    {searchQuery ? `Search Results for "${searchQuery}"` : selectedDepartment}
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500 shrink-0">
                  {students.length} Scholars Found
                </span>
              </div>

              {isLoadingStudents ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Loading scholars...
                  </p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      No Registered Scholars Found
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      {searchQuery
                        ? 'Try searching with a different name, faculty, or department keyword.'
                        : `Be the first scholar in ${selectedDepartment || 'this department'} to connect on GROBAX Campus!`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {students.map((student) => (
                    <CampusStudentRow
                      key={student.id}
                      student={student}
                      onSendRequest={handleSendRequest}
                      onAcceptRequest={handleAcceptRequest}
                      onRejectRequest={handleRejectRequest}
                      onOpenWhatsApp={handleOpenWhatsAppByStudent}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. EDIT WHATSAPP NUMBER MODAL */}
      <CampusEditWhatsAppModal
        userId={currentUser.id}
        currentNumber={membership.whatsappNumber}
        isOpen={isEditWhatsAppOpen}
        onClose={() => setIsEditWhatsAppOpen(false)}
        onUpdated={(newNumber) => {
          setMembership((prev) => (prev ? { ...prev, whatsappNumber: newNumber } : null));
          showToast('WhatsApp number updated successfully!');
        }}
      />
    </div>
  );
};
