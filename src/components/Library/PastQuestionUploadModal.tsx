import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Building,
  GraduationCap,
  Layers,
  Calendar,
  Trash2,
  Plus,
  Loader2,
  Info,
} from 'lucide-react';
import {
  INSTITUTION_CATEGORIES,
  ACADEMIC_CURRICULUM_DATA,
  getAllCurriculumCourses,
  InstitutionCategory,
} from '../../data/libraryAcademicData';
import { NIGERIAN_INSTITUTIONS } from '../../data/nigerianInstitutions';
import {
  submitPastQuestion,
  checkUserWeeklyUploadLimit,
  checkDuplicatePastQuestion,
  generateCompositeKey,
  fetchPastQuestionSettings,
} from '../../lib/pastQuestionsService';

interface PastQuestionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  currentUser: {
    uid: string;
    username?: string;
    fullName?: string;
    email?: string;
    institution?: string;
    faculty?: string;
    department?: string;
    level?: string;
  } | null;
  existingQuestions?: any[];
}

export const PastQuestionUploadModal: React.FC<PastQuestionUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  currentUser,
  existingQuestions = [],
}) => {
  // Form State
  const [selectedCategory, setSelectedCategory] = useState<InstitutionCategory>('University');
  const [institutionName, setInstitutionName] = useState<string>('');
  const [institutionId, setInstitutionId] = useState<string>('');
  const [facultyName, setFacultyName] = useState<string>('');
  const [departmentName, setDepartmentName] = useState<string>('');
  const [level, setLevel] = useState<string>('200 Level (Sophomore)');
  const [semester, setSemester] = useState<'1st Semester' | '2nd Semester'>('1st Semester');
  const [academicSession, setAcademicSession] = useState<string>('2023/2024');
  const [examType, setExamType] = useState<string>('Main Examination');
  const [courseCode, setCourseCode] = useState<string>('');
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [lecturerName, setLecturerName] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Files state
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; name: string; type: string }[]>([]);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Status & Validation
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [gpRewardAmount, setGpRewardAmount] = useState<number>(50);
  const [weeklyUploadCheck, setWeeklyUploadCheck] = useState<{
    canUpload: boolean;
    weekUploadCount: number;
    maxUploadsPerWeek: number;
    remainingUploads: number;
  }>({ canUpload: true, weekUploadCount: 0, maxUploadsPerWeek: 1, remainingUploads: 1 });

  // Autocomplete suggestions
  const [courseSuggestions, setCourseSuggestions] = useState<{ code: string; title: string }[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Suggested sessions quick pills
  const SESSION_OPTIONS = [
    '2024/2025',
    '2023/2024',
    '2022/2023',
    '2021/2022',
    '2020/2021',
    '2019/2020',
    '2018/2019',
    '2017/2018',
  ];

  // Available levels for current category
  const activeCategoryMeta = INSTITUTION_CATEGORIES.find((c) => c.id === selectedCategory) || INSTITUTION_CATEGORIES[0];

  // Available faculties for current category
  const categoryFaculties = ACADEMIC_CURRICULUM_DATA.filter((f) => f.category === selectedCategory);

  // Selected faculty object
  const activeFacultyObj = categoryFaculties.find((f) => f.faculty === facultyName) || categoryFaculties[0];
  const availableDepartments = activeFacultyObj ? activeFacultyObj.departments : [];

  // Initialize and auto-assign from user academic profile on modal open
  useEffect(() => {
    if (isOpen && currentUser) {
      setError(null);
      setSuccessMessage(null);
      setDuplicateWarning(null);

      // Fetch settings
      fetchPastQuestionSettings().then((s) => {
        setGpRewardAmount(s.uploadGpReward || 50);
      });

      // Verify weekly upload limit
      checkUserWeeklyUploadLimit(currentUser.uid).then((res) => {
        setWeeklyUploadCheck(res);
      });

      // 1. Automatically assign School / Institution
      const userInst = currentUser.institution?.trim() || '';
      if (userInst) {
        setInstitutionName(userInst);
        setInstitutionId(userInst.toLowerCase().replace(/[^a-z0-9]/g, ''));

        // Auto-assign category
        const lower = userInst.toLowerCase();
        if (lower.includes('polytechnic') || lower.includes('poly')) {
          setSelectedCategory('Polytechnic');
        } else if (lower.includes('college of education')) {
          setSelectedCategory('College of Education');
        } else if (lower.includes('monotechnic')) {
          setSelectedCategory('Monotechnic');
        } else {
          setSelectedCategory('University');
        }
      } else {
        const defaultInst = NIGERIAN_INSTITUTIONS[0]?.name || 'University of Lagos (UNILAG)';
        setInstitutionName(defaultInst);
        setInstitutionId('unilag');
      }

      // 2. Automatically assign Faculty
      if (currentUser.faculty?.trim()) {
        setFacultyName(currentUser.faculty.trim());
      } else if (categoryFaculties.length > 0) {
        setFacultyName(categoryFaculties[0].faculty);
      }

      // 3. Automatically assign Department
      if (currentUser.department?.trim()) {
        setDepartmentName(currentUser.department.trim());
      } else if (categoryFaculties.length > 0 && categoryFaculties[0].departments.length > 0) {
        setDepartmentName(categoryFaculties[0].departments[0].name);
      }

      // 4. Automatically assign Level
      if (currentUser.level?.trim()) {
        setLevel(currentUser.level.trim());
      } else if (activeCategoryMeta.levels.length > 0) {
        setLevel(activeCategoryMeta.levels[0]);
      }
    }
  }, [isOpen, currentUser]);

  // Update faculties/departments when category changes
  const handleCategoryChange = (cat: InstitutionCategory) => {
    setSelectedCategory(cat);
    const catFacs = ACADEMIC_CURRICULUM_DATA.filter((f) => f.category === cat);
    if (catFacs.length > 0) {
      setFacultyName(catFacs[0].faculty);
      if (catFacs[0].departments.length > 0) {
        setDepartmentName(catFacs[0].departments[0].name);
      }
    }
    const catMeta = INSTITUTION_CATEGORIES.find((c) => c.id === cat);
    if (catMeta && catMeta.levels.length > 0) {
      setLevel(catMeta.levels[0]);
    }
  };

  // Update departments when faculty changes
  const handleFacultyChange = (facName: string) => {
    setFacultyName(facName);
    const facObj = categoryFaculties.find((f) => f.faculty === facName);
    if (facObj && facObj.departments.length > 0) {
      setDepartmentName(facObj.departments[0].name);
    }
  };

  // Course autocompletion filter
  useEffect(() => {
    if (courseCode.trim().length >= 2) {
      const all = getAllCurriculumCourses(selectedCategory);
      const matches = all
        .filter((c) => c.code.toLowerCase().includes(courseCode.toLowerCase().trim()))
        .slice(0, 5)
        .map((c) => ({ code: c.code, title: c.title }));
      setCourseSuggestions(matches);
    } else {
      setCourseSuggestions([]);
    }
  }, [courseCode, selectedCategory]);

  // Check duplicate when academic fields change: Any user cannot upload the same past question for that session
  useEffect(() => {
    const cleanCourse = courseCode.trim().toUpperCase().replace(/\s+/g, '');
    const cleanSession = academicSession.trim().replace(/\s+/g, '');

    if (cleanCourse.length >= 2 && cleanSession.length >= 4) {
      // 1. Instant check against in-memory approved past questions
      if (existingQuestions && existingQuestions.length > 0) {
        const foundLocal = existingQuestions.find((q: any) => {
          if (q.status === 'rejected') return false;
          const qCourse = (q.courseCode || '').toUpperCase().replace(/\s+/g, '');
          const qSession = (q.academicSession || '').replace(/\s+/g, '');
          const qInst = (q.institutionName || q.institutionId || '').toLowerCase();
          const curInst = (institutionName || institutionId || '').toLowerCase();
          const isInstMatch = !curInst || !qInst || qInst.includes(curInst) || curInst.includes(qInst);
          return qCourse === cleanCourse && qSession === cleanSession && isInstMatch;
        });

        if (foundLocal) {
          setDuplicateWarning(
            `⚠️ A past question for ${cleanCourse} has already been uploaded for the ${academicSession.trim()} session! Duplicate past questions for the same session are not allowed. Please enter another session (e.g. previous year) to upload.`
          );
          return;
        }
      }

      // 2. Async check against Firestore
      const compositeKey = generateCompositeKey(
        institutionId || institutionName,
        departmentName,
        level,
        cleanCourse,
        academicSession.trim(),
        semester
      );

      checkDuplicatePastQuestion(compositeKey, {
        institutionId: institutionId || institutionName,
        courseCode: cleanCourse,
        academicSession: academicSession.trim(),
        departmentName,
      }).then((res) => {
        if (res.isDuplicate) {
          setDuplicateWarning(
            res.message ||
              `⚠️ A past question for ${cleanCourse} (${academicSession.trim()}) already exists in the system. Please input another session to contribute.`
          );
        } else {
          setDuplicateWarning(null);
        }
      });
    } else {
      setDuplicateWarning(null);
    }
  }, [institutionId, institutionName, departmentName, level, courseCode, academicSession, semester, existingQuestions]);

  // File handling
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} exceeds the 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setUploadedFiles((prev) => [
            ...prev,
            {
              url: result,
              name: file.name,
              type: file.type.includes('pdf') ? 'pdf' : 'image',
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('You must be signed in to contribute past questions.');
      return;
    }

    if (!weeklyUploadCheck.canUpload) {
      setError(`Weekly upload limit reached (${weeklyUploadCheck.maxUploadsPerWeek} upload/week). You can submit another past question next week!`);
      return;
    }

    if (!institutionName.trim()) {
      setError('Please provide the institution / school name.');
      return;
    }

    if (!departmentName.trim()) {
      setError('Please provide the academic department.');
      return;
    }

    if (!academicSession.trim()) {
      setError('Please fill in the academic session (e.g., 2023/2024).');
      return;
    }

    if (!courseCode.trim()) {
      setError('Please enter a valid course code (e.g., CSC 201).');
      return;
    }

    if (!courseTitle.trim()) {
      setError('Please enter the course title.');
      return;
    }

    if (uploadedFiles.length === 0) {
      setError('Please upload at least one page image or PDF of the past examination question.');
      return;
    }

    if (duplicateWarning) {
      setError(`Cannot upload duplicate past question for session ${academicSession}. Please input another session to contribute.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const primaryFile = uploadedFiles[0];
      const allUrls = uploadedFiles.map((f) => f.url);

      const res = await submitPastQuestion({
        institutionId: institutionId || institutionName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        institutionName: institutionName.trim(),
        institutionCategory: selectedCategory,
        facultyName: facultyName.trim(),
        departmentName: departmentName.trim(),
        level: level.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        courseTitle: courseTitle.trim(),
        academicSession: academicSession.trim(),
        semester,
        examType,
        fileUrl: primaryFile.url,
        fileUrls: allUrls,
        fileName: primaryFile.name,
        fileType: primaryFile.type as 'image' | 'pdf',
        pagesCount: allUrls.length,
        description,
        lecturerName,
        uploadedBy: currentUser.uid,
        uploadedByName: currentUser.fullName || currentUser.username || 'Scholar Contributor',
        uploadedByEmail: currentUser.email || '',
        userProfile: currentUser,
      });

      if (!res.success) {
        setError(res.error || 'Failed to submit past question.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        `Past question uploaded successfully! Our academic moderators will review it. You will receive +${gpRewardAmount} GP once verified!`
      );
      setIsLoading(false);

      setTimeout(() => {
        onUploadSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('Error submitting past question:', err);
      setError(err?.message || 'Network error occurred while submitting.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="past-question-upload-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/30">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Upload Examination Past Question</h2>
                <p className="text-xs text-slate-300">
                  Contribute verified Nigerian past questions & earn{' '}
                  <span className="text-amber-400 font-bold">+{gpRewardAmount} GP</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Weekly Limit & Reward Banner */}
          <div className="px-6 py-2.5 bg-blue-50/80 dark:bg-slate-800/80 border-b border-blue-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-blue-950 dark:text-blue-200 font-medium">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>
                Weekly Limit:{' '}
                <strong className={weeklyUploadCheck.canUpload ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                  {weeklyUploadCheck.remainingUploads} upload{weeklyUploadCheck.remainingUploads === 1 ? '' : 's'} remaining this week
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 font-semibold">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Verified Contribution Bounty: +{gpRewardAmount} GP</span>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Duplicate Warning */}
            {duplicateWarning && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            {/* 1. Category Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                1. Institution Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INSTITUTION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="block truncate">{cat.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Institution, Faculty, Department */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Institution */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Institution / School <span className="text-rose-500">*</span></span>
                  {currentUser?.institution && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Auto-assigned</span>
                  )}
                </label>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => {
                    setInstitutionName(e.target.value);
                    setInstitutionId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                  }}
                  list="institutions-datalist"
                  placeholder="e.g. University of Lagos (UNILAG)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <datalist id="institutions-datalist">
                  {NIGERIAN_INSTITUTIONS.map((inst) => (
                    <option key={inst.id} value={inst.name} />
                  ))}
                </datalist>
              </div>

              {/* Faculty */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{activeCategoryMeta.facultyNomenclature} <span className="text-rose-500">*</span></span>
                  {currentUser?.faculty && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Auto-assigned</span>
                  )}
                </label>
                <input
                  type="text"
                  value={facultyName}
                  onChange={(e) => handleFacultyChange(e.target.value)}
                  list="faculties-datalist"
                  placeholder="e.g. Faculty of Science"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <datalist id="faculties-datalist">
                  {categoryFaculties.map((f) => (
                    <option key={f.faculty} value={f.faculty} />
                  ))}
                </datalist>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Department <span className="text-rose-500">*</span></span>
                  {currentUser?.department && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Auto-assigned</span>
                  )}
                </label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  list="departments-datalist"
                  placeholder="e.g. Computer Science"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <datalist id="departments-datalist">
                  {availableDepartments.map((d) => (
                    <option key={d.name} value={d.name} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* 3. Level, Session, Semester, Exam Type */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Academic Level</span>
                  {currentUser?.level && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Auto-assigned</span>
                  )}
                </label>
                <input
                  type="text"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  list="levels-datalist"
                  placeholder="e.g. 200 Level"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <datalist id="levels-datalist">
                  {activeCategoryMeta.levels.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Academic Session - Direct input by user with quick suggestions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Academic Session <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Fill session</span>
                </label>
                <input
                  type="text"
                  value={academicSession}
                  onChange={(e) => setAcademicSession(e.target.value)}
                  placeholder="e.g. 2023/2024"
                  className={`w-full px-3 py-2 text-xs rounded-xl border font-semibold ${
                    duplicateWarning
                      ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500 bg-white dark:bg-slate-800'
                  } text-slate-900 dark:text-slate-100 focus:ring-2`}
                  required
                />
                {/* Quick session buttons */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {SESSION_OPTIONS.map((sess) => (
                    <button
                      key={sess}
                      type="button"
                      onClick={() => setAcademicSession(sess)}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-medium border transition-colors ${
                        academicSession.trim() === sess
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sess}
                    </button>
                  ))}
                </div>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                </select>
              </div>

              {/* Exam Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Exam Type</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Main Examination">Main Examination</option>
                  <option value="Mid-Semester / Test">Mid-Semester / Test</option>
                  <option value="Resit / Supplementary">Resit / Supplementary</option>
                </select>
              </div>
            </div>

            {/* 4. Course Code & Title with Autocomplete */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Course Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CSC 201"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
                {courseSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                    {courseSuggestions.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => {
                          setCourseCode(s.code);
                          setCourseTitle(s.title);
                          setCourseSuggestions([]);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-blue-50 dark:hover:bg-slate-700/60 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        <strong className="text-blue-600 dark:text-blue-400">{s.code}</strong>
                        <span className="text-slate-500 dark:text-slate-400 truncate ml-2 text-[11px]">{s.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Course Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Programming I"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
              </div>
            </div>

            {/* 5. Lecturer & Optional Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Course Lecturer / Examiner (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. O. A. Adebayo"
                  value={lecturerName}
                  onChange={(e) => setLecturerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Extra Notes / Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Answer any 4 questions out of 6"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>

            {/* 6. File Upload Dropzone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                2. Upload Examination Question Pages (Images or PDF) <span className="text-rose-500">*</span>
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  handleFileSelect(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isDragOver
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Drag & drop examination question photos or PDF here
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Supports PNG, JPG, JPEG, WEBP, or PDF (Max 10MB total). Multi-page papers supported!
                </p>

                <label className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  Browse Files
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Uploaded Page Thumbnails */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl border border-slate-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-800 flex items-center gap-2 overflow-hidden shadow-2xs"
                    >
                      {file.type === 'pdf' ? (
                        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      ) : (
                        <img
                          src={file.url}
                          alt={`Page ${idx + 1}`}
                          className="w-10 h-10 object-cover rounded-lg shrink-0 bg-slate-100 dark:bg-slate-700"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">Page {idx + 1}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{file.name}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Remove page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading || !weeklyUploadCheck.canUpload || !!duplicateWarning}
                id="submit-pq-upload-btn"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-xs font-bold shadow-md transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : duplicateWarning ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Choose Another Session
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Submit for Verification (+{gpRewardAmount} GP)
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
