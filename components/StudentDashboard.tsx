import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Subject,
  StudentTab,
  SystemSettings,
  CreditPackage,
  WeeklyTest,
  Chapter,
  MCQItem,
  Challenge20,
  MCQResult,
  LucentNoteEntry,
} from "../types";
import {
  updateUserStatus,
  db,
  saveUserToLive,
  getChapterData,
  rtdb,
  saveAiInteraction,
  saveDemandRequest,
} from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ref, query, limitToLast, onValue } from "firebase/database";
import {
  getSubjectsList,
  DEFAULT_APP_FEATURES,
  ALL_APP_FEATURES,
  LEVEL_UNLOCKABLE_FEATURES,
  LEVEL_UP_CONFIG,
  APP_VERSION,
} from "../constants";
import { ALL_FEATURES } from "../utils/featureRegistry";
import { checkFeatureAccess } from "../utils/permissionUtils";
import { SubscriptionEngine } from "../utils/engines/subscriptionEngine";
import { RewardEngine } from "../utils/engines/rewardEngine";
import { Button } from "./ui/Button"; // Design System
import { getActiveChallenges } from "../services/questionBank";
import { generateDailyChallengeQuestions } from "../utils/challengeGenerator";
import { generateMorningInsight } from "../services/morningInsight";
import { LessonActionModal } from "./LessonActionModal";
import pLimit from "p-limit";
import { RedeemSection } from "./RedeemSection";
import { Store } from "./Store";
import { AppStore } from "./AppStore";
import {
  Globe,
  Layout,
  Gift,
  Cloud,
  Sparkles,
  Megaphone,
  Lock,
  BookOpen,
  AlertCircle,
  Edit,
  Settings,
  Play,
  Pause,
  RotateCcw,
  MessageCircle,
  Gamepad2,
  Timer,
  CreditCard,
  Send,
  CheckCircle,
  Mail,
  X,
  Check,
  Ban,
  Smartphone,
  Trophy,
  ShoppingBag,
  ArrowRight,
  Video,
  Youtube,
  Home,
  User as UserIcon,
  Book,
  BookOpenText,
  List,
  BarChart3,
  Award,
  Bell,
  Headphones,
  LifeBuoy,
  WifiOff,
  Zap,
  Star,
  Crown,
  History,
  ListChecks,
  Rocket,
  Ticket,
  TrendingUp,
  BrainCircuit,
  FileText,
  CheckSquare,
  Menu,
  LayoutGrid,
  Compass,
  User as UserIconOutline,
  MessageSquare,
  Bot,
  HelpCircle,
  Database,
  Activity,
  Download,
  Calendar,
  LogOut,
  Clock,
  ChevronRight,
  Volume2,
  Square,
  GraduationCap,
  Newspaper,
  PlusCircle,
} from "lucide-react";
import { speakText, stopSpeech } from "../utils/textToSpeech";
import { splitIntoTopics } from "../utils/notesSplitter";
import { SubjectSelection } from "./SubjectSelection";
import { BannerCarousel } from "./BannerCarousel";
import { ChapterSelection } from "./ChapterSelection"; // Imported for Video Flow
import { VideoPlaylistView } from "./VideoPlaylistView"; // Imported for Video Flow
import { AudioPlaylistView } from "./AudioPlaylistView"; // Imported for Audio Flow
import { PdfView } from "./PdfView"; // Imported for PDF Flow
import { McqView } from "./McqView"; // Imported for MCQ Flow
import { MiniPlayer } from "./MiniPlayer"; // Imported for Audio Flow
import { HistoryPage } from "./HistoryPage";
import TeacherStore from "./TeacherStore";
import { Leaderboard } from "./Leaderboard";
import { SpinWheel } from "./SpinWheel";
import { fetchChapters, generateCustomNotes } from "../services/groq"; // Needed for Video Flow
import { LoadingOverlay } from "./LoadingOverlay";
import { CreditConfirmationModal } from "./CreditConfirmationModal";
import { UserGuide } from "./UserGuide";
import { CustomAlert } from "./CustomDialogs";
import { LiveResultsFeed } from "./LiveResultsFeed";
// import { ChatHub } from './ChatHub';
import { UniversalInfoPage } from "./UniversalInfoPage";
import { UniversalChat } from "./UniversalChat";
import { ExpiryPopup } from "./ExpiryPopup";
import { SubscriptionHistory } from "./SubscriptionHistory";
import { SearchResult } from "../utils/syllabusSearch";
import { RevisionHub } from "./RevisionHub"; // NEW
import { AiHub } from "./AiHub"; // NEW: AI Hub
import { McqReviewHub } from "./McqReviewHub"; // NEW
import { UniversalVideoView } from "./UniversalVideoView"; // NEW
import { CustomBloggerPage } from "./CustomBloggerPage";
import { ReferralPopup } from "./ReferralPopup";
import { StudentAiAssistant } from "./StudentAiAssistant";
import { SpeakButton } from "./SpeakButton";
import { ChunkedNotesReader } from "./ChunkedNotesReader";
import { PerformanceGraph } from "./PerformanceGraph";
import { StudentSidebar } from "./StudentSidebar";
import { StudyGoalTimer } from "./StudyGoalTimer";
import { ExplorePage } from "./ExplorePage";
import { StudentHistoryModal } from "./StudentHistoryModal";
import { generateDailyRoutine } from "../utils/routineGenerator";
import { OfflineDownloads } from "./OfflineDownloads";
import { NotificationPrompt } from "./NotificationPrompt";
// @ts-ignore
import jsPDF from "jspdf";
// @ts-ignore
import html2canvas from "html2canvas";

interface Props {
  user: User;
  dailyStudySeconds: number; // Received from Global App
  onSubjectSelect: (subject: Subject) => void;
  onRedeemSuccess: (user: User) => void;
  settings?: SystemSettings; // New prop
  onStartWeeklyTest?: (test: WeeklyTest) => void;
  activeTab: StudentTab;
  onTabChange: (tab: StudentTab) => void;
  setFullScreen: (full: boolean) => void; // Passed from App
  onNavigate?: (view: "ADMIN_DASHBOARD") => void; // Added for Admin Switch
  isImpersonating?: boolean;
  onNavigateToChapter?: (
    chapterId: string,
    chapterTitle: string,
    subjectName: string,
    classLevel?: string,
  ) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: (v: boolean) => void;
  onLogout?: () => void;
  onRecoverData?: () => void;
}

const DashboardSectionWrapper = ({
  id,
  children,
  label,
  settings,
  isLayoutEditing,
  onToggleVisibility,
}: {
  id: string;
  children: React.ReactNode;
  label: string;
  settings?: SystemSettings;
  isLayoutEditing: boolean;
  onToggleVisibility: (id: string) => void;
}) => {
  const isVisible = settings?.dashboardLayout?.[id]?.visible !== false;

  if (!isVisible && !isLayoutEditing) return null;

  return (
    <div
      className={`relative ${isLayoutEditing ? "border-2 border-dashed border-yellow-400 p-2 rounded-xl mb-4 bg-yellow-50/10" : ""}`}
    >
      {isLayoutEditing && (
        <div className="absolute -top-3 left-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow z-50 flex items-center gap-2">
          <span>{label}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(id);
            }}
            className={`px-2 py-0.5 rounded text-xs ${isVisible ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
          >
            {isVisible ? "ON" : "OFF"}
          </button>
        </div>
      )}
      <div
        className={!isVisible ? "opacity-50 grayscale pointer-events-none" : ""}
      >
        {children}
      </div>
    </div>
  );
};

export const StudentDashboard: React.FC<Props> = ({
  user,
  dailyStudySeconds,
  onSubjectSelect,
  onRedeemSuccess,
  settings,
  onStartWeeklyTest,
  activeTab,
  onTabChange,
  setFullScreen,
  onNavigate,
  isImpersonating,
  onNavigateToChapter,
  isDarkMode,
  onToggleDarkMode,
  onLogout,
  onRecoverData,
}) => {
  const analysisLogs = JSON.parse(
    localStorage.getItem("nst_universal_analysis_logs") || "[]",
  );
  const isGameEnabled = settings?.isGameEnabled !== false;

  const handleTabChangeWrapper = (tab: any) => {
    if (tab === "OPEN_CATALOG_PREMIUM_NOTES") {
      setShowAllNotesCatalog("PREMIUM");
      onTabChange("AI_HUB");
      return;
    }
    if (tab === "OPEN_CATALOG_DEEP_DIVE") {
      setShowAllNotesCatalog("DEEP_DIVE");
      onTabChange("AI_HUB");
      return;
    }
    if (tab === "OPEN_CATALOG_VIDEO") {
      setShowAllNotesCatalog("VIDEO");
      onTabChange("AI_HUB");
      return;
    }
    if (tab === "OPEN_CATALOG_AUDIO") {
      setShowAllNotesCatalog("AUDIO");
      onTabChange("AI_HUB");
      return;
    }
    if (tab === "OPEN_CATALOG_MCQ") {
      setShowAllNotesCatalog("MCQ");
      onTabChange("AI_HUB");
      return;
    }
    onTabChange(tab);
  };

  const formatTimeGlobal = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getFeatureAccess = (featureId: string) => {
    if (!settings) return { hasAccess: true, isHidden: false };
    return checkFeatureAccess(featureId, user, settings);
  };

  const hasPermission = (featureId: string) => {
    return getFeatureAccess(featureId).hasAccess;
  };

  const [activeSessionClass, setActiveSessionClass] = useState<string | null>(
    null,
  );
  const [activeSessionBoard, setActiveSessionBoard] = useState<
    "CBSE" | "BSEB" | null
  >(null);
  const [showBoardPromptForClass, setShowBoardPromptForClass] = useState<
    string | null
  >(null);

  // --- TEACHER EXPIRY CHECK ---
  const [isTeacherLocked, setIsTeacherLocked] = useState(false);
  const [teacherUnlockCode, setTeacherUnlockCode] = useState("");

  useEffect(() => {
    if (user.role === "TEACHER" && user.teacherExpiryDate) {
      if (new Date(user.teacherExpiryDate).getTime() < Date.now()) {
        setIsTeacherLocked(true);
      } else {
        setIsTeacherLocked(false);
      }
    }
  }, [user.role, user.teacherExpiryDate]);

  // --- EXPIRY CHECK & AUTO DOWNGRADE ---
  useEffect(() => {
    if (user.isPremium && !SubscriptionEngine.isPremium(user)) {
      const updatedUser: User = {
        ...user,
        isPremium: false,
        subscriptionTier: "FREE",
        subscriptionLevel: undefined,
        subscriptionEndDate: undefined,
      };
      handleUserUpdate(updatedUser);
      showAlert(
        "Your subscription has expired. You are now on the Free Plan.",
        "ERROR",
        "Plan Expired",
      );
    }
  }, [user.isPremium, user.subscriptionEndDate]);

  // --- POPUP LOGIC (EXPIRY WARNING, UPSELL, AND EVENT) ---
  useEffect(() => {
    const checkPopups = () => {
      const now = Date.now();

      // 1. Expiry Warning
      if (
        settings?.popupConfigs?.isExpiryWarningEnabled &&
        user.isPremium &&
        user.subscriptionEndDate
      ) {
        const end = new Date(user.subscriptionEndDate).getTime();
        const diffHours = (end - now) / (1000 * 60 * 60);
        const threshold = settings.popupConfigs.expiryWarningHours || 24;
        if (diffHours > 0 && diffHours <= threshold) {
          const lastShown = parseInt(
            localStorage.getItem(`last_expiry_warn_${user.id}`) || "0",
          );
          const interval =
            (settings.popupConfigs.expiryWarningIntervalMinutes || 60) *
            60 *
            1000;
          if (now - lastShown > interval) {
            addAppNotification(
              "Expiry Warning",
              `⚠️ Your subscription expires in ${Math.ceil(diffHours)} hours! Renew now to keep uninterrupted access.`,
              "INFO",
            );
            localStorage.setItem(`last_expiry_warn_${user.id}`, now.toString());
            return; // Show one at a time
          }
        }
      }

      // 2. Upsell Promotion
      if (
        settings?.popupConfigs?.isUpsellEnabled &&
        user.subscriptionLevel !== "ULTRA"
      ) {
        const lastShown = parseInt(
          localStorage.getItem(`last_upsell_${user.id}`) || "0",
        );
        const interval =
          (settings.popupConfigs.upsellPopupIntervalMinutes || 120) * 60 * 1000;
        if (now - lastShown > interval) {
          const isFree = !user.isPremium;
          const msg = isFree
            ? "🚀 Upgrade to Premium to unlock Full Subject Notes, Ad-Free Videos, and AI tools!"
            : "💎 Go Ultra! Get unlimited access to Competition Mode, Deep Dive Notes, and AI Chat.";
          addAppNotification("Upgrade Available", msg, "INFO");
          localStorage.setItem(`last_upsell_${user.id}`, now.toString());
          return; // Show one at a time
        }
      }

      // 3. Discount Event Notification
      if (settings?.specialDiscountEvent?.enabled) {
        const event = settings.specialDiscountEvent;
        let isEventActive = true; // Assume true if enabled and dates are missing
        if (event.startsAt && event.endsAt) {
          const startTime = new Date(event.startsAt).getTime();
          const endTime = new Date(event.endsAt).getTime();
          if (startTime === endTime) {
            isEventActive = now >= startTime;
          } else {
            isEventActive = now >= startTime && now < endTime;
          }
        }

        if (isEventActive) {
          const isSubscribed =
            user.isPremium &&
            user.subscriptionEndDate &&
            new Date(user.subscriptionEndDate) > new Date(now);
          const shouldShow =
            (isSubscribed && event.showToPremiumUsers) ||
            (!isSubscribed && event.showToFreeUsers);

          if (shouldShow) {
            const lastShown = parseInt(
              localStorage.getItem(
                `last_event_promo_${user.id}_${event.eventName}`,
              ) || "0",
            );
            // Show every 2 hours if not specified differently, just to ensure they know about the sale
            const interval = 2 * 60 * 60 * 1000;
            if (now - lastShown > interval) {
              addAppNotification(
                "Special Event",
                `🎉 ${event.eventName} is LIVE! Get ${event.discountPercent}% OFF on subscriptions right now!`,
                "SUCCESS",
              );
              localStorage.setItem(
                `last_event_promo_${user.id}_${event.eventName}`,
                now.toString(),
              );
              return;
            }
          }
        }
      }

      // 4. Global Free Access & Credit Free Event Popups
      if (settings?.isGlobalFreeMode) {
        const lastShown = parseInt(
          localStorage.getItem(`last_global_free_${user.id}`) || "0",
        );
        const interval = 4 * 60 * 60 * 1000; // Every 4 hours
        if (now - lastShown > interval) {
          addAppNotification(
            "Special Event",
            "🌟 GLOBAL FREE ACCESS IS LIVE! Enjoy everything for free!",
            "SUCCESS",
          );
          localStorage.setItem(`last_global_free_${user.id}`, now.toString());
          return;
        }
      }

      if (settings?.creditFreeEvent?.enabled) {
        const lastShown = parseInt(
          localStorage.getItem(`last_credit_free_${user.id}`) || "0",
        );
        const interval = 4 * 60 * 60 * 1000; // Every 4 hours
        if (now - lastShown > interval) {
          addAppNotification(
            "Special Event",
            "⚡ CREDIT FREE EVENT IS LIVE! Unlock content without using your coins!",
            "SUCCESS",
          );
          localStorage.setItem(`last_credit_free_${user.id}`, now.toString());
          return;
        }
      }

      // 5. Admin Custom Popups
      if (settings?.adminCustomPopups) {
        for (const popup of settings.adminCustomPopups) {
          if (popup.enabled) {
            // Check audience
            if (popup.showTo === "FREE" && user.isPremium) continue;
            if (popup.showTo === "PREMIUM" && !user.isPremium) continue;

            const popupId = `custom_popup_${popup.title ? popup.title.replace(/\s+/g, "_") : "unnamed"}`;
            const lastShown = parseInt(
              localStorage.getItem(`${popupId}_${user.id}`) || "0",
            );
            const interval = 4 * 60 * 60 * 1000; // 4 hours by default for custom popups

            if (now - lastShown > interval) {
              let popupMsg = popup.message;
              if (popup.copyableText) {
                popupMsg += `\n\nCode: ${popup.copyableText}`;
              }
              addAppNotification(popup.title || "Notice", popupMsg, "INFO");
              localStorage.setItem(`${popupId}_${user.id}`, now.toString());
              return; // Show one at a time
            }
          }
        }
      }
    };

    checkPopups(); // Check immediately on mount/update
    const timer = setInterval(checkPopups, 60000); // And every minute
    return () => clearInterval(timer);
  }, [
    user.isPremium,
    user.subscriptionEndDate,
    settings?.popupConfigs,
    settings?.specialDiscountEvent,
  ]);

  // CUSTOM ALERT STATE
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: "SUCCESS" | "ERROR" | "INFO";
    title?: string;
    message: string;
  }>({ isOpen: false, type: "INFO", message: "" });
  const showAlert = (
    msg: string,
    type: "SUCCESS" | "ERROR" | "INFO" = "INFO",
    title?: string,
  ) => {
    setAlertConfig({ isOpen: true, type, title, message: msg });
  };

  // IN-APP NOTIFICATION HELPER
  // Pushes a notification into local store (shown on the Notifications page)
  // instead of opening a modal popup. Auto-dedupes within 4 hours.
  const addAppNotification = (
    title: string,
    message: string,
    type: "SUCCESS" | "ERROR" | "INFO" = "INFO",
  ) => {
    try {
      const key = `nst_app_notifications_${user.id}`;
      const existing: any[] = JSON.parse(localStorage.getItem(key) || "[]");
      const now = Date.now();
      const dup = existing.find(
        (n: any) =>
          n.title === title &&
          n.message === message &&
          now - (n.timestamp || 0) < 4 * 60 * 60 * 1000,
      );
      if (dup) return;
      const id = `n_${now}_${Math.random().toString(36).slice(2, 7)}`;
      const updated = [{ id, title, message, type, timestamp: now }, ...existing].slice(0, 100);
      localStorage.setItem(key, JSON.stringify(updated));
      setHasNewUpdate(true);
      window.dispatchEvent(new CustomEvent("nst_notification_added"));
    } catch (e) {
      console.error("addAppNotification failed", e);
    }
  };

  // NEW NOTIFICATION LOGIC
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  useEffect(() => {
    const q = query(ref(rtdb, "universal_updates"), limitToLast(1));
    const unsub = onValue(q, (snap) => {
      const data = snap.val();
      if (data) {
        const latest = Object.values(data)[0] as any;
        const lastRead = localStorage.getItem("nst_last_read_update") || "0";
        if (new Date(latest.timestamp).getTime() > Number(lastRead)) {
          setHasNewUpdate(true);
          const alertKey = `nst_update_alert_shown_${latest.id || latest.timestamp}`;
          if (!localStorage.getItem(alertKey)) {
            addAppNotification(
              "New Update",
              `New Content Available: ${latest.text}`,
              "INFO",
            );
            localStorage.setItem(alertKey, "true");
          }
        } else {
          // Don't override badge state from local notifications check
          try {
            const arr = JSON.parse(
              localStorage.getItem(`nst_app_notifications_${user.id}`) || "[]",
            );
            const lastReadLocal = Number(
              localStorage.getItem("nst_last_read_update") || "0",
            );
            const hasUnread = arr.some(
              (n: any) => (n.timestamp || 0) > lastReadLocal,
            );
            setHasNewUpdate(hasUnread);
          } catch {
            setHasNewUpdate(false);
          }
        }
      }
    });
    return () => unsub();
  }, []);

  const [testAttempts, setTestAttempts] = useState<Record<string, any>>(
    JSON.parse(localStorage.getItem(`nst_test_attempts_${user.id}`) || "{}"),
  );
  const globalMessage = localStorage.getItem("nst_global_message");
  const [activeExternalApp, setActiveExternalApp] = useState<string | null>(
    null,
  );
  const [mcqAppOpen, setMcqAppOpen] = useState<boolean>(false);
  const MCQ_APP_URL_DEFAULT = "https://mcq-n3tg.vercel.app/";
  const MCQ_APP_URL = settings?.mcqAppUrl?.trim() || MCQ_APP_URL_DEFAULT;
  const [contentTypePref, setContentTypePref] = useState<
    "ALL" | "PDF" | "AUDIO" | "VIDEO"
  >(() => {
    const v = localStorage.getItem(`nst_content_type_pref_${user.id}`);
    return v === "PDF" || v === "AUDIO" || v === "VIDEO" ? v : "ALL";
  });
  useEffect(() => {
    localStorage.setItem(`nst_content_type_pref_${user.id}`, contentTypePref);
  }, [contentTypePref, user.id]);
  const [pendingApp, setPendingApp] = useState<{
    app: any;
    cost: number;
  } | null>(null);
  const [contentViewStep, setContentViewStep] = useState<
    "SUBJECTS" | "CHAPTERS" | "PLAYER"
  >("SUBJECTS");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedLessonForModal, setSelectedLessonForModal] =
    useState<Chapter | null>(null);
  const [syllabusMode, setSyllabusMode] = useState<"SCHOOL" | "COMPETITION">(
    "SCHOOL",
  );
  const [currentAudioTrack, setCurrentAudioTrack] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [universalNotes, setUniversalNotes] = useState<any[]>([]);
  const [topicFilter, setTopicFilter] = useState<string | undefined>(undefined);
  const [initialParentSubject, setInitialParentSubject] = useState<
    string | null
  >(null);

  useEffect(() => {
    getChapterData("nst_universal_notes").then((data) => {
      if (data && data.notesPlaylist) setUniversalNotes(data.notesPlaylist);
    });
  }, []);

  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryData, setRecoveryData] = useState({
    mobile: user.mobile || "",
    password: user.password || "",
  });
  const [profileData, setProfileData] = useState({
    classLevel: activeSessionClass || user.classLevel || "10",
    board: activeSessionBoard || user.board || "CBSE",
    stream: user.stream || "Science",
    newPassword: "",
    mobile: user.mobile || "",
    dailyGoalHours: 3,
  });
  const [canClaimReward, setCanClaimReward] = useState(false);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("");
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [showNameChangeModal, setShowNameChangeModal] = useState(false);
  const [newNameInput, setNewNameInput] = useState("");
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isLayoutEditing, setIsLayoutEditing] = useState(false);
  const [showExpiryPopup, setShowExpiryPopup] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [marksheetType, setMarksheetType] = useState<"MONTHLY" | "ANNUAL">(
    "MONTHLY",
  );
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isDocFullscreen, setIsDocFullscreen] = useState(false);
  useEffect(() => {
    const handler = () => {
      setIsDocFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);
  const [showAllNotesCatalog, setShowAllNotesCatalog] = useState<
    "PREMIUM" | "DEEP_DIVE" | "VIDEO" | "AUDIO" | "MCQ" | false
  >(false);
  const [catalogChapterCounts, setCatalogChapterCounts] = useState<
    Record<string, number>
  >({});
  const [directActionTarget, setDirectActionTarget] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (showAllNotesCatalog) {
      const classes = ["6", "7", "8", "9", "10", "11", "12", "COMPETITION"];
      const board = activeSessionBoard || user.board || "CBSE";
      const stream = user.stream || "Science";
      const lang = board === "BSEB" ? "Hindi" : "English";
      const limit = pLimit(5);

      const tasks: Promise<void>[] = [];

      classes.forEach((cls) => {
        const subs = getSubjectsList(cls, stream, board).filter(
          (s) => !(settings?.hiddenSubjects || []).includes(s.id),
        );
        subs.forEach((sub) => {
          const key = `${cls}_${sub.id}`;
          // Skip if already fetched
          if (catalogChapterCounts[key] === undefined) {
            tasks.push(
              limit(async () => {
                try {
                  const data = await fetchChapters(
                    board,
                    cls,
                    stream,
                    sub,
                    lang,
                  );
                  setCatalogChapterCounts((prev) => ({
                    ...prev,
                    [key]: data.length,
                  }));
                } catch (e) {
                  setCatalogChapterCounts((prev) => ({ ...prev, [key]: 0 }));
                }
              }),
            );
          }
        });
      });

      Promise.all(tasks);
    }
  }, [
    showAllNotesCatalog,
    activeSessionBoard,
    user.board,
    user.stream,
    settings?.hiddenSubjects,
  ]);

  // Daily greeting disabled as requested by user

  const [showLevelModal, setShowLevelModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFeatureMatrix, setShowFeatureMatrix] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [isTopBarHidden, setIsTopBarHidden] = useState(false);

  useEffect(() => {
    let touchStartY = 0;
    let touchStartX = 0;
    let isTouchingTopBar = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;

      // Ensure swipe only activates if it starts within the top banner area (roughly top 100px)
      const target = e.target as HTMLElement;
      isTouchingTopBar = !!target.closest("#top-banner-container");
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchingTopBar) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = touchStartY - currentY;
      const diffX = touchStartX - currentX;

      // Check if vertical swipe is dominant
      if (Math.abs(diffY) > Math.abs(diffX)) {
        if (diffY > 40) {
          // Swiping up -> Hide top bar
          setIsTopBarHidden(true);
        } else if (diffY < -40) {
          // Swiping down -> Show top bar
          setIsTopBarHidden(false);
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  useEffect(() => {
    // Reset top bar visibility when navigating
    setIsTopBarHidden(false);
  }, [activeTab, contentViewStep]);

  useEffect(() => {
    setFullScreen(true); // Always true to hide global header
  }, [activeTab, setFullScreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenMode(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const isNew =
      Date.now() - new Date(user.createdAt).getTime() < 10 * 60 * 1000;
    if (
      isNew &&
      !user.redeemedReferralCode &&
      !localStorage.getItem(`referral_shown_${user.id}`)
    ) {
      setShowReferralPopup(true);
      localStorage.setItem(`referral_shown_${user.id}`, "true");
    }
  }, [user.id, user.createdAt, user.redeemedReferralCode]);

  const handleSupportEmail = () => {
    const email = settings?.supportEmail || "nadiman0636indo@gmail.com";
    const subject = encodeURIComponent(
      `Support Request: ${user.name} (ID: ${user.id})`,
    );
    const body = encodeURIComponent(
      `Student Details:\nName: ${user.name}\nUID: ${user.id}\nEmail: ${user.email}\n\nIssue Description:\n`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestData, setRequestData] = useState({
    subject: "",
    topic: "",
    type: "PDF",
  });
  const [showAiModal, setShowAiModal] = useState(false);
  const [showHomeworkHistory, setShowHomeworkHistory] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [homeworkSubjectView, setHomeworkSubjectView] = useState<string | null>(null);
  const [lucentCategoryView, setLucentCategoryView] = useState(false);
  // Page-wise notes viewer for admin-added Lucent lessons
  const [lucentNoteViewer, setLucentNoteViewer] = useState<LucentNoteEntry | null>(null);
  const [lucentPageIndex, setLucentPageIndex] = useState(0);
  // Local Auto-Read & Sync state for the Lucent viewer (mirrors LessonView pattern).
  // Initialised from settings.isAutoTtsEnabled but stays local to this view.
  const [lucentAutoSync, setLucentAutoSync] = useState<boolean>(!!settings?.isAutoTtsEnabled);
  const [hwAnswers, setHwAnswers] = useState<Record<string, number>>({});

  // ---- COMPETITION CUSTOM MCQ HUB (admin + student created practice MCQs) ----
  const [showCompMcqHub, setShowCompMcqHub] = useState(false);
  const [compMcqTab, setCompMcqTab] = useState<'PRACTICE' | 'CREATE'>('PRACTICE');
  const [compMcqDraft, setCompMcqDraft] = useState<{ question: string; options: string[]; correctAnswer: number }>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
  });
  const [compMcqIndex, setCompMcqIndex] = useState(0);
  const [compMcqSelected, setCompMcqSelected] = useState<number | null>(null);

  // ---- HOMEWORK HIERARCHY (Year → Month → Week → Day → Note) ----
  const [hwYear, setHwYear] = useState<number | null>(null);
  const [hwMonth, setHwMonth] = useState<number | null>(null);
  const [hwWeek, setHwWeek] = useState<number | null>(null);
  const [hwActiveHwId, setHwActiveHwId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // ---- HOMEWORK MCQ FULL-SCREEN PLAYER STATE ----
  const [homeworkPlayerHwId, setHomeworkPlayerHwId] = useState<string | null>(null);
  const [playerCurrentIndex, setPlayerCurrentIndex] = useState<number>(0);
  const [playerIsReadingAll, setPlayerIsReadingAll] = useState<boolean>(false);
  const [playerRevealAll, setPlayerRevealAll] = useState<boolean>(true);
  const playerScrollRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const playerIsReadingAllRef = React.useRef<boolean>(false);
  React.useEffect(() => { playerIsReadingAllRef.current = playerIsReadingAll; }, [playerIsReadingAll]);

  // Active homework being played
  const activePlayerHw = React.useMemo(() => {
    if (!homeworkPlayerHwId) return null;
    return (settings?.homework || []).find((h, i) => (h.id || String(i)) === homeworkPlayerHwId) || null;
  }, [homeworkPlayerHwId, settings?.homework]);

  // Build sequential player chunks (per-line notes + MCQs with answers + explanations)
  // Each chunk is one "row" of the player; reading READ ALL walks each row
  // sequentially with auto-scroll + highlight (line-wise sync).
  const buildPlayerChunks = React.useCallback((hw: any | null) => {
    type Chunk =
      | { kind: 'notes-line', index: number, text: string, isHeading: boolean }
      | { kind: 'mcq', index: number, text: string, mcq: any };
    if (!hw) return [] as Chunk[];
    const chunks: Chunk[] = [];

    if (hw.notes) {
      const topics = splitIntoTopics(hw.notes);
      topics.forEach((t, i) => {
        chunks.push({ kind: 'notes-line', index: i, text: t.text, isHeading: t.isHeading });
      });
    }

    if (Array.isArray(hw.parsedMcqs)) {
      hw.parsedMcqs.forEach((mcq: any, qi: number) => {
        const optsText = (mcq.options || []).map((o: string, oi: number) => `Option ${String.fromCharCode(65 + oi)}. ${o}`).join('. ');
        const correctLetter = String.fromCharCode(65 + (mcq.correctAnswer ?? 0));
        const correctText = (mcq.options || [])[mcq.correctAnswer ?? 0] || '';
        const parts: string[] = [];
        parts.push(`Question ${qi + 1}. ${mcq.question || ''}`);
        if (optsText) parts.push(optsText);
        parts.push(`Correct answer is option ${correctLetter}. ${correctText}.`);
        if (mcq.explanation) parts.push(`Explanation. ${mcq.explanation}`);
        if (mcq.concept) parts.push(`Concept. ${mcq.concept}`);
        if (mcq.examTip) parts.push(`Exam tip. ${mcq.examTip}`);
        if (mcq.commonMistake) parts.push(`Common mistake. ${mcq.commonMistake}`);
        if (mcq.mnemonic) parts.push(`Memory trick. ${mcq.mnemonic}`);
        chunks.push({ kind: 'mcq', index: qi, text: parts.join(' '), mcq });
      });
    }
    return chunks;
  }, []);

  const playerChunks = React.useMemo(() => buildPlayerChunks(activePlayerHw), [activePlayerHw, buildPlayerChunks]);

  const playPlayerFromIndex = React.useCallback((idx: number) => {
    if (!playerIsReadingAllRef.current) return;
    if (idx >= playerChunks.length) {
      playerIsReadingAllRef.current = false;
      setPlayerIsReadingAll(false);
      return;
    }
    setPlayerCurrentIndex(idx);
    setTimeout(() => {
      playerScrollRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    const chunk = playerChunks[idx];
    speakText(
      chunk.text,
      undefined,
      1.0,
      'hi-IN',
      undefined,
      () => {
        if (playerIsReadingAllRef.current) playPlayerFromIndex(idx + 1);
      }
    );
  }, [playerChunks]);

  const togglePlayerReadAll = React.useCallback(() => {
    if (playerIsReadingAll) {
      playerIsReadingAllRef.current = false;
      setPlayerIsReadingAll(false);
      stopSpeech();
      return;
    }
    if (playerChunks.length === 0) return;
    playerIsReadingAllRef.current = true;
    setPlayerIsReadingAll(true);
    playPlayerFromIndex(playerCurrentIndex || 0);
  }, [playerIsReadingAll, playerChunks.length, playPlayerFromIndex, playerCurrentIndex]);

  const closeHomeworkPlayer = React.useCallback(() => {
    playerIsReadingAllRef.current = false;
    setPlayerIsReadingAll(false);
    stopSpeech();
    setHomeworkPlayerHwId(null);
    setPlayerCurrentIndex(0);
  }, []);

  // ---- AUTO-SAVE HOMEWORK MCQ ATTEMPTS TO HISTORY (separate from regular MCQ) ----
  // When the student has answered all MCQs of a homework, persist a single
  // consolidated MCQResult to user.mcqHistory tagged with chapterId='homework_<id>'
  // so it shows up under the new "Homework MCQ History" section but stays
  // visually distinct from regular chapter MCQs.
  React.useEffect(() => {
    const allHw = settings?.homework || [];
    if (allHw.length === 0) return;

    const HOMEWORK_SUBJECT_LABELS: Record<string, string> = {
      mcq: 'MCQ Practice',
      sarSangrah: 'Sar Sangrah',
      speedySocialScience: 'Speedy Social Science',
      speedyScience: 'Speedy Science',
    };

    const existingHwResultIds = new Set(
      (user.mcqHistory || [])
        .filter((h) => (h.chapterId || '').startsWith('homework_'))
        .map((h) => h.chapterId)
    );

    const newResults: MCQResult[] = [];
    allHw.forEach((hw, idx) => {
      const hwKey = hw.id || String(idx);
      const histChapterId = `homework_${hwKey}`;
      if (existingHwResultIds.has(histChapterId)) return;
      const mcqs = hw.parsedMcqs || [];
      if (mcqs.length === 0) return;
      const allAnswered = mcqs.every((_, qi) => hwAnswers[`${hwKey}_${qi}`] !== undefined || hwAnswers[`hw_${hw.id}_${qi}`] !== undefined);
      if (!allAnswered) return;

      const omr = mcqs.map((mcq, qi) => {
        const sel = hwAnswers[`${hwKey}_${qi}`] ?? hwAnswers[`hw_${hw.id}_${qi}`] ?? -1;
        return {
          qIndex: qi,
          selected: typeof sel === 'number' ? sel : -1,
          correct: typeof mcq.correctAnswer === 'number' ? mcq.correctAnswer : -1,
        };
      });
      const correctCount = omr.filter((o) => o.selected === o.correct).length;
      const wrongCount = omr.length - correctCount;
      const score = Math.round((correctCount / omr.length) * 100);
      const subjectLabel = HOMEWORK_SUBJECT_LABELS[hw.targetSubject || ''] || 'General';
      const result: MCQResult = {
        id: `hw_${hwKey}_${Date.now()}`,
        userId: user.id,
        chapterId: histChapterId,
        subjectId: 'homework',
        subjectName: `Homework: ${subjectLabel}`,
        chapterTitle: hw.title || 'Homework',
        date: new Date().toISOString(),
        totalQuestions: omr.length,
        correctCount,
        wrongCount,
        score,
        totalTimeSeconds: 0,
        averageTimePerQuestion: 0,
        performanceTag:
          score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : score >= 40 ? 'BAD' : 'VERY_BAD',
        omrData: omr,
        topic: hw.title,
      };
      newResults.push(result);
    });

    if (newResults.length > 0) {
      handleUserUpdate({
        ...user,
        mcqHistory: [...newResults, ...(user.mcqHistory || [])],
      });
    }
    // We intentionally exclude `user` and `handleUserUpdate` from deps to avoid
    // re-saving loops; we only react to changes in answers and homework data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hwAnswers, settings?.homework]);

  const [showDailyGkHistory, setShowDailyGkHistory] = useState(false);
  const [gkExpandedYear, setGkExpandedYear] = useState<string | null>(null);
  const [gkExpandedMonth, setGkExpandedMonth] = useState<string | null>(null);
  const [gkExpandedWeek, setGkExpandedWeek] = useState<string | null>(null);
  const [activeChallenges20, setActiveChallenges20] = useState<Challenge20[]>(
    [],
  );
  const [homeBannerIndex, setHomeBannerIndex] = useState(0);

  useEffect(() => {
    const currentClass = activeSessionClass || user.classLevel;
    if (currentClass) {
      getActiveChallenges(currentClass as any).then(setActiveChallenges20);
    }
  }, [activeSessionClass, user.classLevel]);

  // Handle Banner Rotation
  useEffect(() => {
    const filteredChallenges = activeChallenges20.filter(
      (c) => !testAttempts[c.id] || testAttempts[c.id].isCompleted !== true,
    );
    const bannerCount =
      (settings?.homework?.length ? 1 : 0) +
      (settings?.globalChallengeMcq?.length ? 1 : 0) +
      (settings?.dailyGk?.length ? 1 : 0) +
      filteredChallenges.length;
    if (bannerCount > 1) {
      const interval = setInterval(() => {
        setHomeBannerIndex((prev) => (prev + 1) % bannerCount);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [
    settings?.globalChallengeMcq,
    settings?.dailyGk,
    activeChallenges20,
    JSON.stringify(testAttempts),
  ]);
  const [aiTopic, setAiTopic] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [dailyTargetSeconds, setDailyTargetSeconds] = useState(3 * 3600);
  const REWARD_AMOUNT = settings?.dailyReward || 3;
  const adminPhones = settings?.adminPhones || [
    { id: "default", number: "8227070298", name: "Admin" },
  ];
  const defaultPhoneId =
    adminPhones.find((p) => p.isDefault)?.id || adminPhones[0]?.id || "default";

  if (!selectedPhoneId && adminPhones.length > 0) {
    setSelectedPhoneId(defaultPhoneId);
  }

  const [viewingUserHistory, setViewingUserHistory] = useState<User | null>(
    null,
  );

  useEffect(() => {
    const today = new Date().toDateString();
    if (user.dailyRoutine?.date !== today) {
      const newRoutine = generateDailyRoutine(user);
      const updatedUser = { ...user, dailyRoutine: newRoutine };
      if (!isImpersonating) {
        localStorage.setItem("nst_current_user", JSON.stringify(updatedUser));
        saveUserToLive(updatedUser);
      }
      onRedeemSuccess(updatedUser);
    }
  }, [user.dailyRoutine?.date, user.mcqHistory?.length]);

  const [currentSlide, setCurrentSlide] = useState(0);

  const handleAiNotesGeneration = async () => {
    // 1. Feature Lock Check
    const access = checkFeatureAccess("AI_GENERATOR", user, settings || {});
    if (!access.hasAccess) {
      showAlert(
        access.reason === "FEED_LOCKED"
          ? "🔒 Locked by Admin"
          : "🔒 Upgrade to access AI Notes!",
        "ERROR",
        "Access Denied",
      );
      return;
    }

    if (!aiTopic.trim()) {
      showAlert("Please enter a topic!", "ERROR");
      return;
    }

    // 2. Limit Check (Use Feed Limit if available)
    const today = new Date().toDateString();
    const usageKey = `nst_ai_usage_${user.id}_${today}`;
    const currentUsage = parseInt(localStorage.getItem(usageKey) || "0");

    const limit = access.limit !== undefined ? access.limit : 5; // Default fallback

    if (currentUsage >= limit) {
      showAlert(
        `Daily Limit Reached! You have used ${currentUsage}/${limit} AI generations today.`,
        "ERROR",
        "Limit Exceeded",
      );
      return;
    }

    setAiGenerating(true);
    try {
      const notes = await generateCustomNotes(
        aiTopic,
        settings?.aiNotesPrompt || "",
        settings?.aiModel,
      );
      setAiResult(notes);
      localStorage.setItem(usageKey, (currentUsage + 1).toString());
      saveAiInteraction({
        id: `ai-note-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        type: "AI_NOTES",
        query: aiTopic,
        response: notes,
        timestamp: new Date().toISOString(),
      });
      showAlert("Notes Generated Successfully!", "SUCCESS");
    } catch (e) {
      console.error(e);
      showAlert("Failed to generate notes. Please try again.", "ERROR");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSwitchToAdmin = () => {
    if (onNavigate) onNavigate("ADMIN_DASHBOARD");
  };

  const toggleLayoutVisibility = (sectionId: string) => {
    if (!settings) return;
    const currentLayout = settings.dashboardLayout || {};
    const currentConfig = currentLayout[sectionId] || {
      id: sectionId,
      visible: true,
    };
    const newLayout = {
      ...currentLayout,
      [sectionId]: { ...currentConfig, visible: !currentConfig.visible },
    };
    const newSettings = { ...settings, dashboardLayout: newLayout };
    localStorage.setItem("nst_system_settings", JSON.stringify(newSettings));
    saveUserToLive(user);
    window.location.reload();
  };

  const getPhoneNumber = (phoneId?: string) => {
    const phone = adminPhones.find(
      (p) => p.id === (phoneId || selectedPhoneId),
    );
    return phone ? phone.number : "8227070298";
  };

  useEffect(() => {
    const checkCompetitionAccess = () => {
      if (syllabusMode === "COMPETITION") {
        const access = checkFeatureAccess(
          "COMPETITION_MODE",
          user,
          settings || {},
        );
        if (!access.hasAccess) {
          setSyllabusMode("SCHOOL");
          document.documentElement.style.setProperty(
            "--primary",
            settings?.themeColor || "#3b82f6",
          );
          showAlert(
            "⚠️ Competition Mode is locked! Please upgrade to an Ultra subscription to access competition content.",
            "ERROR",
            "Locked Feature",
          );
        }
      }
    };
    checkCompetitionAccess();
    const interval = setInterval(checkCompetitionAccess, 60000);
    return () => clearInterval(interval);
  }, [
    syllabusMode,
    user.isPremium,
    user.subscriptionEndDate,
    user.subscriptionTier,
    user.subscriptionLevel,
    settings?.themeColor,
  ]);

  useEffect(() => {
    const storedGoal = localStorage.getItem(`nst_goal_${user.id}`);
    if (storedGoal) {
      const hours = parseInt(storedGoal);
      setDailyTargetSeconds(hours * 3600);
      setProfileData((prev) => ({ ...prev, dailyGoalHours: hours }));
    }
  }, [user.id]);

  useEffect(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yDateStr = yesterday.toDateString();
    const yActivity = parseInt(
      localStorage.getItem(`activity_${user.id}_${yDateStr}`) || "0",
    );
    const yClaimed = localStorage.getItem(
      `reward_claimed_${user.id}_${yDateStr}`,
    );
    if (
      !yClaimed &&
      (!user.subscriptionTier || user.subscriptionTier === "FREE")
    ) {
      let reward = null;
      if (yActivity >= 10800)
        reward = { tier: "MONTHLY", level: "ULTRA", hours: 4 };
      else if (yActivity >= 3600)
        reward = { tier: "WEEKLY", level: "BASIC", hours: 4 };
      if (reward) {
        const expiresAt = new Date(
          new Date().setHours(new Date().getHours() + 24),
        ).toISOString();
        const newMsg: any = {
          id: `reward-${Date.now()}`,
          text: `🎁 Daily Reward! You studied enough yesterday. Claim your ${reward.hours} hours of ${reward.level} access now!`,
          date: new Date().toISOString(),
          read: false,
          type: "REWARD",
          reward: {
            tier: reward.tier as any,
            level: reward.level as any,
            durationHours: reward.hours,
          },
          expiresAt: expiresAt,
          isClaimed: false,
        };
        const updatedUser = { ...user, inbox: [newMsg, ...(user.inbox || [])] };
        handleUserUpdate(updatedUser);
        localStorage.setItem(`reward_claimed_${user.id}_${yDateStr}`, "true");
      }
    }
  }, [user.id]);

  const claimRewardMessage = (msgId: string, reward: any, gift?: any) => {
    const updatedInbox = user.inbox?.map((m) =>
      m.id === msgId ? { ...m, isClaimed: true, read: true } : m,
    );
    let updatedUser: User = { ...user, inbox: updatedInbox };
    let successMsg = "";

    const applySubscription = (
      tier: string,
      level: string,
      duration: number,
    ) => {
      const now = new Date();
      const currentEnd = user.subscriptionEndDate
        ? new Date(user.subscriptionEndDate)
        : now;
      const isActive =
        user.isPremium &&
        (currentEnd > now || user.subscriptionTier === "LIFETIME");

      // Prevent downgrading a higher tier plan
      const tierPriority: Record<string, number> = {
        LIFETIME: 5,
        YEARLY: 4,
        "3_MONTHLY": 3,
        MONTHLY: 2,
        WEEKLY: 1,
        FREE: 0,
        CUSTOM: 0,
      };
      const currentPriority =
        tierPriority[user.subscriptionTier || "FREE"] || 0;
      const newPriority = tierPriority[tier] || 0;

      if (isActive && currentPriority > newPriority) {
        // User already has a BETTER active plan, do NOT override tier, just extend date if not lifetime
        if (user.subscriptionTier !== "LIFETIME") {
          let newEndDate = new Date(
            currentEnd.getTime() + duration * 60 * 60 * 1000,
          );
          updatedUser.subscriptionEndDate = newEndDate.toISOString();
          successMsg = `🎁 Gift Claimed! Added ${duration} hours to your existing ${user.subscriptionTier} plan.`;
        } else {
          successMsg = `🎁 Gift Claimed! But you already have a Lifetime plan!`;
        }
      } else {
        // Upgrade or Apply New Plan
        let newEndDate = new Date(now.getTime() + duration * 60 * 60 * 1000);
        if (isActive && currentPriority === newPriority) {
          newEndDate = new Date(
            currentEnd.getTime() + duration * 60 * 60 * 1000,
          );
          successMsg = `🎁 Gift Claimed! Extended your ${tier} plan by ${duration} hours.`;
        } else {
          successMsg = `🎁 Gift Claimed! ${tier} ${level} unlocked for ${duration} hours.`;
        }
        updatedUser.subscriptionTier = tier as any;
        updatedUser.subscriptionLevel = level as any;
        updatedUser.subscriptionEndDate = newEndDate.toISOString();
        updatedUser.isPremium = true;
      }
    };

    if (gift) {
      if (gift.type === "CREDITS") {
        updatedUser.credits = (user.credits || 0) + Number(gift.value);
        successMsg = `🎁 Gift Claimed! Added ${gift.value} Credits.`;
      } else if (gift.type === "SUBSCRIPTION") {
        const [tier, level] = (gift.value as string).split("_");
        const duration = gift.durationHours || 24;
        applySubscription(tier, level, duration);
      }
    } else if (reward) {
      const duration = reward.durationHours || 4;
      applySubscription(reward.tier, reward.level, duration);
    }
    handleUserUpdate(updatedUser);
    showAlert(successMsg, "SUCCESS", "Rewards Claimed");
  };

  const userRef = React.useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!user.id) return;
    const unsub = onSnapshot(doc(db, "users", user.id), (doc) => {
      if (doc.exists()) {
        const cloudData = doc.data() as User;
        const currentUser = userRef.current;
        const needsUpdate =
          cloudData.credits !== currentUser.credits ||
          cloudData.subscriptionTier !== currentUser.subscriptionTier ||
          cloudData.isPremium !== currentUser.isPremium ||
          cloudData.isGameBanned !== currentUser.isGameBanned ||
          (cloudData.mcqHistory?.length || 0) >
            (currentUser.mcqHistory?.length || 0);
        if (needsUpdate) {
          // Handle expired subscriptions dynamically safely using getTime() to avoid string comparison bugs
          if (
            cloudData.isPremium &&
            cloudData.subscriptionEndDate &&
            cloudData.subscriptionTier !== "LIFETIME"
          ) {
            const expDate = new Date(cloudData.subscriptionEndDate).getTime();
            if (!isNaN(expDate) && expDate < Date.now()) {
              cloudData.isPremium = false;
              cloudData.subscriptionTier = "FREE";
              cloudData.subscriptionLevel = undefined;
            }
          }

          let protectedSub = {
            tier: cloudData.subscriptionTier,
            level: cloudData.subscriptionLevel,
            endDate: cloudData.subscriptionEndDate,
            isPremium: cloudData.isPremium,
          };
          const localTier = currentUser.subscriptionTier || "FREE";
          const cloudTier = cloudData.subscriptionTier || "FREE";
          const tierPriority: Record<string, number> = {
            LIFETIME: 5,
            YEARLY: 4,
            "3_MONTHLY": 3,
            MONTHLY: 2,
            WEEKLY: 1,
            FREE: 0,
            CUSTOM: 0,
          };
          if (tierPriority[localTier] > tierPriority[cloudTier]) {
            const localEnd = currentUser.subscriptionEndDate
              ? new Date(currentUser.subscriptionEndDate).getTime()
              : Date.now();
            if (
              localTier === "LIFETIME" ||
              (!isNaN(localEnd) && localEnd > Date.now())
            ) {
              console.warn(
                "⚠️ Prevented Cloud Downgrade! Keeping Local Subscription.",
                localTier,
              );
              protectedSub = {
                tier: currentUser.subscriptionTier,
                level: currentUser.subscriptionLevel,
                endDate: currentUser.subscriptionEndDate,
                isPremium: true,
              };
              saveUserToLive({ ...cloudData, ...protectedSub });
            }
          }
          const updated: User = {
            ...currentUser,
            ...cloudData,
            ...protectedSub,
          };

          // PRESERVE ADMIN OVERRIDES (Fix for Admin downgrading to Student)
          if (currentUser.role === "ADMIN" && cloudData.role !== "ADMIN") {
            updated.role = "ADMIN";
          }
          if (
            currentUser.role === "SUB_ADMIN" &&
            cloudData.role !== "SUB_ADMIN" &&
            cloudData.role !== "ADMIN"
          ) {
            updated.role = "SUB_ADMIN";
          }

          // CRITICAL FIX: The Firestore 'users/{uid}' document DOES NOT contain bulky data.
          // We must preserve the bulky data from the current state so it doesn't get wiped by the core sync.
          if (!cloudData.hasOwnProperty("mcqHistory"))
            updated.mcqHistory = currentUser.mcqHistory;
          if (!cloudData.hasOwnProperty("testResults"))
            updated.testResults = currentUser.testResults;
          if (!cloudData.hasOwnProperty("progress"))
            updated.progress = currentUser.progress;
          if (!cloudData.hasOwnProperty("usageHistory"))
            updated.usageHistory = currentUser.usageHistory;
          if (!cloudData.hasOwnProperty("inbox"))
            updated.inbox = currentUser.inbox;
          if (!cloudData.hasOwnProperty("topicStrength"))
            updated.topicStrength = currentUser.topicStrength;
          if (!cloudData.hasOwnProperty("subscriptionHistory"))
            updated.subscriptionHistory = currentUser.subscriptionHistory;
          if (!cloudData.hasOwnProperty("activeSubscriptions"))
            updated.activeSubscriptions = currentUser.activeSubscriptions;
          if (!cloudData.hasOwnProperty("pendingRewards"))
            updated.pendingRewards = currentUser.pendingRewards;
          if (!cloudData.hasOwnProperty("redeemedCodes"))
            updated.redeemedCodes = currentUser.redeemedCodes;
          if (!cloudData.hasOwnProperty("unlockedContent"))
            updated.unlockedContent = currentUser.unlockedContent;
          if (!cloudData.hasOwnProperty("dailyRoutine"))
            updated.dailyRoutine = currentUser.dailyRoutine;

          onRedeemSuccess(updated);
        }
      }
    });
    return () => unsub();
  }, [user.id]);

  useEffect(() => {
    if (isTeacherLocked && activeTab !== "STORE") return; // Pause updates if locked
    const interval = setInterval(() => {
      updateUserStatus(user.id, dailyStudySeconds);
      const todayStr = new Date().toDateString();
      localStorage.setItem(
        `activity_${user.id}_${todayStr}`,
        dailyStudySeconds.toString(),
      );
      const accountAgeHours =
        (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60);
      const firstDayBonusClaimed = localStorage.getItem(
        `first_day_ultra_${user.id}`,
      );
      if (
        accountAgeHours < 24 &&
        dailyStudySeconds >= 3600 &&
        !firstDayBonusClaimed
      ) {
        // Only apply if user is NOT already on a better plan
        const tierPriority: Record<string, number> = {
          LIFETIME: 5,
          YEARLY: 4,
          "3_MONTHLY": 3,
          MONTHLY: 2,
          WEEKLY: 1,
          FREE: 0,
          CUSTOM: 0,
        };
        const currentPriority =
          tierPriority[user.subscriptionTier || "FREE"] || 0;

        if (currentPriority < 2) {
          // Less than MONTHLY
          const endDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
          const updatedUser: User = {
            ...user,
            subscriptionTier: "MONTHLY",
            subscriptionLevel: "ULTRA",
            subscriptionEndDate: endDate,
            isPremium: true,
          };
          const storedUsers = JSON.parse(
            localStorage.getItem("nst_users") || "[]",
          );
          const idx = storedUsers.findIndex((u: User) => u.id === user.id);
          if (idx !== -1) storedUsers[idx] = updatedUser;
          localStorage.setItem("nst_users", JSON.stringify(storedUsers));
          localStorage.setItem("nst_current_user", JSON.stringify(updatedUser));
          localStorage.setItem(`first_day_ultra_${user.id}`, "true");
          onRedeemSuccess(updatedUser);
          showAlert(
            "🎉 FIRST DAY BONUS: You unlocked 1 Hour Free ULTRA Subscription!",
            "SUCCESS",
          );
        } else {
          // Mark claimed anyway so it doesn't trigger again
          localStorage.setItem(`first_day_ultra_${user.id}`, "true");
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [dailyStudySeconds, user.id, user.createdAt, user.subscriptionTier]);

  const [showInbox, setShowInbox] = useState(false);
  const unreadCount = user.inbox?.filter((m) => !m.read).length || 0;

  useEffect(() => {
    setCanClaimReward(
      RewardEngine.canClaimDaily(user, dailyStudySeconds, dailyTargetSeconds),
    );
  }, [user.lastRewardClaimDate, dailyStudySeconds, dailyTargetSeconds]);

  // === HARDWARE / BROWSER BACK BUTTON HANDLER ===
  // Keeps an always-fresh snapshot of navigation state so the popstate
  // listener (registered once) can react without stale closures.
  const navStateRef = useRef({
    activeTab,
    contentViewStep,
    showLessonModal,
    mcqAppOpen,
    showSidebar,
    showInbox,
    initialParentSubject,
    homeworkSubjectView,
    lucentCategoryView,
    activeSessionClass,
  });
  useEffect(() => {
    navStateRef.current = {
      activeTab,
      contentViewStep,
      showLessonModal,
      mcqAppOpen,
      showSidebar,
      showInbox,
      initialParentSubject,
      homeworkSubjectView,
      lucentCategoryView,
      activeSessionClass,
    };
  });

  useEffect(() => {
    // Push an initial trap entry so the first back press is captured.
    try {
      window.history.pushState({ __nstTrap: true }, "");
    } catch {}

    const reTrap = () => {
      try {
        window.history.pushState({ __nstTrap: true }, "");
      } catch {}
    };

    const onPopState = () => {
      if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.log(err));
      }
      const s = navStateRef.current;

      // 1. Close any open overlays first (one back press = one overlay close)
      if (s.showSidebar) { setShowSidebar(false); reTrap(); return; }
      if (s.showInbox) { setShowInbox(false); reTrap(); return; }
      if (s.showLessonModal) { setShowLessonModal(false); reTrap(); return; }
      if (s.mcqAppOpen) { setMcqAppOpen(false); reTrap(); return; }

      // 2. PDF / VIDEO / AUDIO / MCQ tabs (content player tabs)
      if (
        s.activeTab === "PDF" ||
        s.activeTab === "VIDEO" ||
        s.activeTab === "AUDIO" ||
        s.activeTab === "MCQ"
      ) {
        if (s.contentViewStep === "PLAYER") {
          // Player → Chapter list (switch back to COURSES tab so list renders)
          setContentViewStep("CHAPTERS");
          setFullScreen(false);
          onTabChange("COURSES");
        } else {
          // Anything else → Subject list
          onTabChange("COURSES");
          setContentViewStep("SUBJECTS");
          setDirectActionTarget(null);
          setLucentCategoryView(false);
          setHomeworkSubjectView(null);
        }
        reTrap();
        return;
      }

      // 3. COURSES tab — step-by-step back through the content tree
      if (s.activeTab === "COURSES") {
        if (s.contentViewStep === "PLAYER") {
          setContentViewStep("CHAPTERS");
          setFullScreen(false);
        } else if (s.contentViewStep === "CHAPTERS") {
          setContentViewStep("SUBJECTS");
          setDirectActionTarget(null);
          setLucentCategoryView(false);
          setHomeworkSubjectView(null);
        } else if (s.initialParentSubject) {
          setInitialParentSubject(null);
        } else if (s.homeworkSubjectView) {
          setHomeworkSubjectView(null);
        } else if (s.lucentCategoryView) {
          setLucentCategoryView(false);
        } else {
          // SUBJECTS root → back to HOME (class selection)
          setActiveSessionClass(null);
          setActiveSessionBoard(null);
          onTabChange("HOME");
        }
        reTrap();
        return;
      }

      // 4. Any other non-home tab (HISTORY / PROFILE / UPDATES / etc.) → HOME
      if (s.activeTab !== "HOME") {
        onTabChange("HOME");
        reTrap();
        return;
      }

      // 5. Already at HOME root → re-trap so the app does NOT close on back.
      reTrap();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const claimDailyReward = () => {
    if (!canClaimReward) return;
    const finalReward = RewardEngine.calculateDailyBonus(user, settings);
    const updatedUser = RewardEngine.processClaim(user, finalReward);
    handleUserUpdate(updatedUser);
    setCanClaimReward(false);
    showAlert(
      `Received: ${finalReward} Free Credits!`,
      "SUCCESS",
      "Daily Goal Met",
    );
  };

  const handleUserUpdate = (updatedUser: User) => {
    // Ignore nst_users if empty, just save to live and current user directly
    // since the system has moved away from 'nst_users' dependency.
    if (!isImpersonating) {
      localStorage.setItem("nst_current_user", JSON.stringify(updatedUser));
      saveUserToLive(updatedUser);
    }
    onRedeemSuccess(updatedUser);

    // Also keep legacy 'nst_users' updated just in case it's used elsewhere
    const storedUsersStr = localStorage.getItem("nst_users");
    if (storedUsersStr) {
      const storedUsers = JSON.parse(storedUsersStr);
      const userIdx = storedUsers.findIndex(
        (u: User) => u.id === updatedUser.id,
      );
      if (userIdx !== -1) {
        storedUsers[userIdx] = updatedUser;
        localStorage.setItem("nst_users", JSON.stringify(storedUsers));
      }
    }
  };

  const markInboxRead = () => {
    if (!user.inbox) return;
    const updatedInbox = user.inbox.map((m) => ({ ...m, read: true }));
    handleUserUpdate({ ...user, inbox: updatedInbox });
  };

  const HOMEWORK_SUBJECTS = ['mcq', 'sarSangrah', 'speedySocialScience', 'speedyScience'];

  const handleContentSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setHomeworkSubjectView(null);
    setLucentCategoryView(false);
    if (HOMEWORK_SUBJECTS.includes(subject.id)) {
      setHomeworkSubjectView(subject.id);
      setHwYear(null);
      setHwMonth(null);
      setHwWeek(null);
      setHwActiveHwId(null);
      return;
    }
    if (subject.id === 'lucent') {
      setLucentCategoryView(true);
      return;
    }
    setContentViewStep("CHAPTERS");
    setSelectedChapter(null);
    setLoadingChapters(true);
    const lang =
      (activeSessionBoard || user.board) === "BSEB" ? "Hindi" : "English";
    fetchChapters(
      activeSessionBoard || user.board || "CBSE",
      (activeSessionClass as any) || user.classLevel || "10",
      user.stream || "Science",
      subject,
      lang,
    ).then((data) => {
      const sortedData = [...data].sort((a, b) => {
        const matchA = a.title.match(/(\d+)/);
        const matchB = b.title.match(/(\d+)/);
        if (matchA && matchB) {
          const numA = parseInt(matchA[1], 10);
          const numB = parseInt(matchB[1], 10);
          if (numA !== numB) {
            return numA - numB;
          }
        }
        return a.title.localeCompare(b.title);
      });
      setChapters(sortedData);
      setLoadingChapters(false);
    });
  };

  const handleLessonOption = (
    type: "VIDEO" | "PDF" | "MCQ" | "AUDIO" | any,
  ) => {
    if (!selectedLessonForModal) return;
    setShowLessonModal(false);

    // Update Tab and State for Player
    onTabChange(type as any);
    setSelectedChapter(selectedLessonForModal);
    setContentViewStep("PLAYER");
    setFullScreen(true);
  };

  const handleExternalAppClick = (app: any) => {
    if (app.isLocked) {
      showAlert("🔒 This app is currently locked.", "ERROR");
      return;
    }

    if (app.creditCost > 0) {
      if (user.credits < app.creditCost) {
        showAlert(`Insufficient Credits! Need ${app.creditCost}.`, "ERROR");
        return;
      }
      const u = { ...user, credits: user.credits - app.creditCost };
      handleUserUpdate(u);
      setActiveExternalApp(app.url);
    } else {
      setActiveExternalApp(app.url);
    }
  };

  const LUCENT_CATEGORIES = [
    { id: 'biology', name: 'जीव विज्ञान (Biology)', icon: 'bio', color: 'bg-green-50 text-green-600' },
    { id: 'chemistry', name: 'रसायन शास्त्र (Chemistry)', icon: 'flask', color: 'bg-purple-50 text-purple-600' },
    { id: 'physics', name: 'भौतिकी (Physics)', icon: 'physics', color: 'bg-blue-50 text-blue-600' },
    { id: 'economics', name: 'अर्थशास्त्र (Economics)', icon: 'social', color: 'bg-cyan-50 text-cyan-600' },
    { id: 'geography', name: 'भूगोल (Geography)', icon: 'geo', color: 'bg-indigo-50 text-indigo-600' },
    { id: 'polity', name: 'राजनीति विज्ञान (Polity)', icon: 'gov', color: 'bg-amber-50 text-amber-600' },
    { id: 'history', name: 'इतिहास (History)', icon: 'history', color: 'bg-rose-50 text-rose-600' },
  ] as Subject[];

  const renderContentSection = (
    type: "VIDEO" | "PDF" | "MCQ" | "AUDIO" | "GENERIC",
  ) => {
    const goBack = () => {
      if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.log(err));
      }
      if (contentViewStep === "PLAYER") {
        setContentViewStep("CHAPTERS");
        setFullScreen(false);
        // If we entered the player via PDF/VIDEO/AUDIO/MCQ tab,
        // switch back to COURSES so the chapter list keeps rendering.
        if (
          activeTab === "PDF" ||
          activeTab === "VIDEO" ||
          activeTab === "AUDIO" ||
          activeTab === "MCQ"
        ) {
          onTabChange("COURSES");
        }
      } else if (contentViewStep === "CHAPTERS") {
        setContentViewStep("SUBJECTS");
        setDirectActionTarget(null);
        setLucentCategoryView(false);
        // Make sure subject list renders (only the COURSES tab does that)
        if (activeTab !== "COURSES") {
          onTabChange("COURSES");
        }
      }
    };

    // HOMEWORK SUBJECT VIEW (MCQ, Sar Sangrah, Speedy Social Science, Speedy Science)
    if (homeworkSubjectView && contentViewStep === "SUBJECTS") {
      const subjectLabel: Record<string, string> = {
        mcq: 'MCQ Practice',
        sarSangrah: 'Sar Sangrah',
        speedySocialScience: 'Speedy Social Science',
        speedyScience: 'Speedy Science',
      };
      const SUBJECT_THEME: Record<string, { bg: string; bgSoft: string; text: string; textDeep: string; border: string; ring: string; btn: string; btnHover: string; chip: string; }> = {
        mcq: { bg: 'bg-green-50', bgSoft: 'bg-green-100', text: 'text-green-600', textDeep: 'text-green-800', border: 'border-green-200', ring: 'ring-green-300', btn: 'bg-green-600', btnHover: 'hover:bg-green-700', chip: 'bg-green-100 text-green-700' },
        sarSangrah: { bg: 'bg-rose-50', bgSoft: 'bg-rose-100', text: 'text-rose-600', textDeep: 'text-rose-800', border: 'border-rose-200', ring: 'ring-rose-300', btn: 'bg-rose-600', btnHover: 'hover:bg-rose-700', chip: 'bg-rose-100 text-rose-700' },
        speedySocialScience: { bg: 'bg-orange-50', bgSoft: 'bg-orange-100', text: 'text-orange-600', textDeep: 'text-orange-800', border: 'border-orange-200', ring: 'ring-orange-300', btn: 'bg-orange-600', btnHover: 'hover:bg-orange-700', chip: 'bg-orange-100 text-orange-700' },
        speedyScience: { bg: 'bg-blue-50', bgSoft: 'bg-blue-100', text: 'text-blue-600', textDeep: 'text-blue-800', border: 'border-blue-200', ring: 'ring-blue-300', btn: 'bg-blue-600', btnHover: 'hover:bg-blue-700', chip: 'bg-blue-100 text-blue-700' },
      };
      const theme = SUBJECT_THEME[homeworkSubjectView] || SUBJECT_THEME.mcq;

      const getWeekOfMonth = (d: Date) => Math.floor((d.getDate() - 1) / 7) + 1;
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

      // Ascending order so "Next" goes oldest → newest naturally
      const filteredHw = (settings?.homework || [])
        .filter(hw => hw.targetSubject === homeworkSubjectView)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const goBack = () => {
        if (hwActiveHwId) { setHwActiveHwId(null); return; }
        if (hwWeek !== null) { setHwWeek(null); return; }
        if (hwMonth !== null) { setHwMonth(null); return; }
        if (hwYear !== null) { setHwYear(null); return; }
        setHomeworkSubjectView(null);
        setSelectedSubject(null);
        setShowHomeworkHistory(true);
      };

      // Breadcrumb title
      let crumb = subjectLabel[homeworkSubjectView] || homeworkSubjectView;
      if (hwYear !== null) crumb += ` › ${hwYear}`;
      if (hwMonth !== null) crumb += ` › ${monthNames[hwMonth]}`;
      if (hwWeek !== null) crumb += ` › Week ${hwWeek}`;

      // EMPTY STATE
      if (filteredHw.length === 0) {
        return (
          <div className={`min-h-[100dvh] ${theme.bg} p-4 pt-2`}>
            <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
              <div className="flex items-center gap-3 mb-5">
                <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <h2 className={`text-xl font-black ${theme.textDeep}`}>{crumb}</h2>
              </div>
              <div className="text-center py-16 text-slate-400">
                <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold text-slate-500">Koi content nahi mila</p>
                <p className="text-sm text-slate-400 mt-1">Admin ne abhi tak koi content nahi dala hai</p>
              </div>
            </div>
          </div>
        );
      }

      // ============== ACTIVE NOTE VIEW (single homework with Next button) ==============
      if (hwActiveHwId) {
        const activeHw = filteredHw.find(h => (h.id || '') === hwActiveHwId);
        if (!activeHw) {
          // fallback: clear and re-render hierarchy
          setHwActiveHwId(null);
          return null;
        }
        const flatIdx = filteredHw.findIndex(h => (h.id || '') === hwActiveHwId);
        const nextHw = flatIdx >= 0 && flatIdx + 1 < filteredHw.length ? filteredHw[flatIdx + 1] : null;
        const prevHw = flatIdx > 0 ? filteredHw[flatIdx - 1] : null;
        const hwKey = activeHw.id || String(flatIdx);

        const goToHw = (target: typeof activeHw) => {
          const d = new Date(target.date);
          setHwYear(d.getFullYear());
          setHwMonth(d.getMonth());
          setHwWeek(getWeekOfMonth(d));
          setHwActiveHwId(target.id || '');
        };

        return (
          <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in fade-in">
            {/* Sticky header */}
            <div className={`${theme.btn} text-white px-4 py-3 flex items-center gap-3 shrink-0`}>
              <button onClick={goBack} className="bg-white/20 hover:bg-white/30 p-2 rounded-full shrink-0 transition-colors">
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold opacity-75 uppercase tracking-widest truncate">{crumb}</p>
                <p className="font-black text-sm leading-tight truncate">{activeHw.title}</p>
              </div>
              <span className="bg-white/20 text-white text-[11px] font-black px-2.5 py-1 rounded-full shrink-0">
                {flatIdx + 1}/{filteredHw.length}
              </span>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Notes */}
              {activeHw.notes && (
                <div className="px-4 pb-2">
                  <ChunkedNotesReader
                    content={activeHw.notes}
                    topBarLabel={activeHw.title}
                  />
                </div>
              )}

              {/* Audio */}
              {activeHw.audioUrl && (
                <div className="mx-4 mb-3 bg-purple-50 border border-purple-100 rounded-2xl p-3">
                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Volume2 size={11} /> Audio
                  </p>
                  <audio controls src={activeHw.audioUrl} className="w-full h-8" />
                </div>
              )}

              {/* Video */}
              {activeHw.videoUrl && (
                <div className="mx-4 mb-3 bg-rose-50 border border-rose-100 rounded-2xl p-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-rose-700">Video lesson available</p>
                  <a href={activeHw.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-rose-700 active:scale-95 transition-all">
                    <Play size={12} /> Watch
                  </a>
                </div>
              )}

              {/* MCQ */}
              {activeHw.parsedMcqs && activeHw.parsedMcqs.length > 0 && (
                <div className="px-4 pb-4">
                  <p className={`text-[10px] font-black ${theme.text} uppercase tracking-widest mb-3 flex items-center gap-1`}>
                    <CheckSquare size={11} /> MCQ Practice · {activeHw.parsedMcqs.length} questions
                  </p>
                  <div className="space-y-3">
                    {activeHw.parsedMcqs.map((mcq, qi) => {
                      const ansKey = `${hwKey}_${qi}`;
                      const selected = hwAnswers[ansKey];
                      return (
                        <div key={qi} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                          <p className="text-sm font-bold text-slate-800 mb-3 leading-snug">{qi + 1}. {mcq.question}</p>
                          <div className="space-y-2">
                            {mcq.options.map((opt, oi) => {
                              const isSelected = selected === oi;
                              const isCorrect = mcq.correctAnswer === oi;
                              const showResult = selected !== undefined;
                              return (
                                <button key={oi} onClick={() => { if (selected === undefined) setHwAnswers(prev => ({ ...prev, [ansKey]: oi })); }}
                                  className={`w-full text-left text-sm px-4 py-2.5 rounded-xl border-2 transition-all font-medium ${showResult
                                    ? (isCorrect ? 'bg-green-50 border-green-400 text-green-800 font-bold'
                                      : isSelected ? 'bg-red-50 border-red-400 text-red-800'
                                      : 'bg-slate-50 border-slate-200 text-slate-500')
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'}`}>
                                  <span className="font-black mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
                                </button>
                              );
                            })}
                          </div>
                          {selected !== undefined && mcq.explanation && (
                            <p className="text-xs text-slate-600 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-relaxed">{mcq.explanation}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {!nextHw && (
                <p className="text-center text-xs text-slate-400 font-bold py-6">🎉 Saare notes complete!</p>
              )}
            </div>

            {/* Fixed bottom nav */}
            <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 flex items-center gap-3">
              <button
                disabled={!prevHw}
                onClick={() => prevHw && goToHw(prevHw)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all ${prevHw ? `border-2 ${theme.border} ${theme.text} hover:${theme.bgSoft} active:scale-95` : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                <ChevronRight size={16} className="rotate-180" /> Prev
              </button>
              <button
                disabled={!nextHw}
                onClick={() => nextHw && goToHw(nextHw)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all ${nextHw ? `${theme.btn} ${theme.btnHover} text-white shadow-md active:scale-95` : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        );
      }

      // ============== WEEK VIEW (7-day list inside selected week) ==============
      if (hwYear !== null && hwMonth !== null && hwWeek !== null) {
        const weekHw = filteredHw.filter(hw => {
          const d = new Date(hw.date);
          return d.getFullYear() === hwYear && d.getMonth() === hwMonth && getWeekOfMonth(d) === hwWeek;
        });
        return (
          <div className={`min-h-[100dvh] ${theme.bg} p-4 pt-2`}>
            <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
              <div className="flex items-center gap-3 mb-5">
                <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest`}>{crumb}</p>
                  <h2 className={`text-xl font-black ${theme.textDeep}`}>Week {hwWeek}</h2>
                </div>
              </div>
              <div className="space-y-3">
                {weekHw.map((hw, idx) => {
                  const d = new Date(hw.date);
                  const dayName = d.toLocaleDateString('default', { weekday: 'long' });
                  const openHw = () => {
                    // For MCQ subject, jump directly into the full-screen player
                    if (homeworkSubjectView === 'mcq' && ((hw.parsedMcqs && hw.parsedMcqs.length > 0) || hw.notes)) {
                      setHomeworkPlayerHwId(hw.id || String(idx));
                      setPlayerCurrentIndex(0);
                      setPlayerIsReadingAll(false);
                      setPlayerRevealAll(true);
                    } else {
                      setHwActiveHwId(hw.id || '');
                    }
                  };
                  return (
                    <button
                      key={hw.id || idx}
                      onClick={openHw}
                      className={`w-full text-left bg-white border-2 ${theme.border} rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all active:scale-[0.98]`}
                    >
                      <div className={`${theme.bgSoft} ${theme.textDeep} w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0`}>
                        <span className="text-xl font-black leading-none">{d.getDate()}</span>
                        <span className="text-[9px] font-bold uppercase mt-0.5">{dayName.slice(0,3)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest`}>{dayName}</p>
                        <p className="font-black text-slate-800 text-sm leading-snug truncate">{hw.title}</p>
                        <div className="flex gap-1 mt-1">
                          {hw.notes && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>NOTES</span>}
                          {hw.parsedMcqs && hw.parsedMcqs.length > 0 && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>{hw.parsedMcqs.length} MCQ</span>}
                          {hw.audioUrl && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>AUDIO</span>}
                          {hw.videoUrl && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>VIDEO</span>}
                        </div>
                      </div>
                      <ChevronRight size={18} className={`${theme.text} shrink-0`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      // ============== MONTH VIEW (date-wise notes inside selected month) ==============
      // Note: We skip the intermediate "Week" step entirely — the user goes
      // Year → Month → Date directly. Each date with a note is shown as its own card.
      if (hwYear !== null && hwMonth !== null) {
        const monthHw = filteredHw
          .filter(hw => {
            const d = new Date(hw.date);
            return d.getFullYear() === hwYear && d.getMonth() === hwMonth;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return (
          <div className={`min-h-[100dvh] ${theme.bg} p-4 pt-2`}>
            <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
              <div className="flex items-center gap-3 mb-5">
                <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest`}>{crumb}</p>
                  <h2 className={`text-xl font-black ${theme.textDeep}`}>{monthNames[hwMonth]} {hwYear}</h2>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{monthHw.length} {monthHw.length === 1 ? 'note' : 'notes'} added</p>
                </div>
              </div>
              {monthHw.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-12">No notes for this month.</div>
              ) : (
                <div className="space-y-3">
                  {monthHw.map((hw, idx) => {
                    const d = new Date(hw.date);
                    const dayName = d.toLocaleDateString('default', { weekday: 'long' });
                    const openHw = () => {
                      if (homeworkSubjectView === 'mcq' && ((hw.parsedMcqs && hw.parsedMcqs.length > 0) || hw.notes)) {
                        setHomeworkPlayerHwId(hw.id || String(idx));
                        setPlayerCurrentIndex(0);
                        setPlayerIsReadingAll(false);
                        setPlayerRevealAll(true);
                      } else {
                        setHwActiveHwId(hw.id || '');
                      }
                    };
                    return (
                      <button
                        key={hw.id || idx}
                        onClick={openHw}
                        className={`w-full text-left bg-white border-2 ${theme.border} rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all active:scale-[0.98]`}
                      >
                        <div className={`${theme.bgSoft} ${theme.textDeep} w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0`}>
                          <span className="text-xl font-black leading-none">{d.getDate()}</span>
                          <span className="text-[9px] font-bold uppercase mt-0.5">{dayName.slice(0,3)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest`}>{dayName}</p>
                          <p className="font-black text-slate-800 text-sm leading-snug truncate">{hw.title}</p>
                          <div className="flex gap-1 mt-1">
                            {hw.notes && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>NOTES</span>}
                            {hw.parsedMcqs && hw.parsedMcqs.length > 0 && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>{hw.parsedMcqs.length} MCQ</span>}
                            {hw.audioUrl && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>AUDIO</span>}
                            {hw.videoUrl && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>VIDEO</span>}
                          </div>
                        </div>
                        <ChevronRight size={18} className={`${theme.text} shrink-0`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      }

      // ============== YEAR VIEW (months inside selected year) ==============
      if (hwYear !== null) {
        const yearHw = filteredHw.filter(hw => new Date(hw.date).getFullYear() === hwYear);
        const monthsMap = new Map<number, number>();
        yearHw.forEach(hw => {
          const m = new Date(hw.date).getMonth();
          monthsMap.set(m, (monthsMap.get(m) || 0) + 1);
        });
        const months = Array.from(monthsMap.entries()).sort((a,b) => a[0]-b[0]);
        return (
          <div className={`min-h-[100dvh] ${theme.bg} p-4 pt-2`}>
            <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
              <div className="flex items-center gap-3 mb-5">
                <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest`}>{subjectLabel[homeworkSubjectView] || homeworkSubjectView}</p>
                  <h2 className={`text-xl font-black ${theme.textDeep}`}>{hwYear}</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {months.map(([m, count]) => (
                  <button
                    key={m}
                    onClick={() => setHwMonth(m)}
                    className={`bg-white border-2 ${theme.border} rounded-2xl p-4 text-center hover:shadow-md transition-all active:scale-[0.98]`}
                  >
                    <div className={`${theme.bgSoft} ${theme.textDeep} w-14 h-14 rounded-2xl mx-auto flex items-center justify-center font-black text-xl mb-2`}>
                      {monthNames[m].slice(0,3)}
                    </div>
                    <p className={`text-sm font-black ${theme.textDeep}`}>{monthNames[m]}</p>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">{count} {count === 1 ? 'note' : 'notes'}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      }

      // ============== ROOT YEAR LIST ==============
      const yearMap = new Map<number, number>();
      filteredHw.forEach(hw => {
        const y = new Date(hw.date).getFullYear();
        yearMap.set(y, (yearMap.get(y) || 0) + 1);
      });
      const years = Array.from(yearMap.entries()).sort((a,b) => b[0]-a[0]);

      return (
        <div className={`min-h-[100dvh] ${theme.bg} p-4 pt-2`}>
          <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <h2 className={`text-xl font-black ${theme.textDeep}`}>{subjectLabel[homeworkSubjectView] || homeworkSubjectView}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {years.map(([y, count]) => (
                <button
                  key={y}
                  onClick={() => setHwYear(y)}
                  className={`bg-white border-2 ${theme.border} rounded-2xl p-5 text-left hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-4`}
                >
                  <div className={`${theme.bgSoft} ${theme.textDeep} w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0`}>
                    <span className="text-[10px] font-bold uppercase">Year</span>
                    <span className="text-2xl font-black leading-none">{y}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-lg font-black ${theme.textDeep}`}>{y}</p>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">{count} {count === 1 ? 'note' : 'notes'} added</p>
                  </div>
                  <ChevronRight size={18} className={`${theme.text}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // LUCENT BOOK CATEGORY VIEW
    if (lucentCategoryView && contentViewStep === "SUBJECTS") {
      return (
        <div className="p-4 pt-2 max-w-3xl mx-auto pb-8 animate-in fade-in">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => { setLucentCategoryView(false); setSelectedSubject(null); }} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 text-slate-700">
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-800">Lucent Book</h2>
              <p className="text-xs text-slate-500">Subject choose karein</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {LUCENT_CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => {
                setLucentCategoryView(false);
                setSelectedSubject(cat);
                setContentViewStep("CHAPTERS");
                setSelectedChapter(null);
                setLoadingChapters(true);
                const lang = (activeSessionBoard || user.board) === "BSEB" ? "Hindi" : "English";
                // Inject admin-added Lucent lessons (page-wise notes) at the top of the chapter list
                const adminLucentLessons: Chapter[] = ((settings?.lucentNotes || []) as LucentNoteEntry[])
                  .filter(n => n.subject === cat.id)
                  .map(n => ({
                    id: `lucent_admin_${n.id}`,
                    title: n.lessonTitle,
                    description: `📘 Admin Notes • ${n.pages.length} page${n.pages.length === 1 ? '' : 's'}`,
                  }));
                // Default: hide built-in/AI Lucent syllabus. Admin can re-enable it from the Lucent panel.
                const hideSyllabus = settings?.hideLucentSyllabus !== false;
                if (hideSyllabus) {
                  setChapters(adminLucentLessons);
                  setLoadingChapters(false);
                } else {
                  fetchChapters(activeSessionBoard || user.board || "CBSE", 'COMPETITION', user.stream || "Science", cat, lang).then((data) => {
                    const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title));
                    setChapters([...adminLucentLessons, ...sorted]);
                    setLoadingChapters(false);
                  });
                }
              }} className={`${cat.color.split(' ')[0]} border-2 ${cat.color.split(' ')[0].replace('bg-', 'border-').replace('50', '200')} p-4 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all active:scale-95 text-left`}>
                <div className={`w-12 h-12 rounded-xl ${cat.color} flex items-center justify-center text-xl font-black`}>
                  {cat.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className={`font-black text-base ${cat.color.split(' ')[1]}`}>{cat.name.split('(')[1]?.replace(')', '') || cat.name}</p>
                  <p className="text-xs text-slate-500">{cat.name.split('(')[0].trim()}</p>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (contentViewStep === "CHAPTERS") {
      return (
        <ChapterSelection
          chapters={chapters}
          subject={
            selectedSubject || {
              id: "all",
              name: "All Subjects",
              icon: "Book",
              color: "bg-slate-100",
            }
          }
          classLevel={activeSessionClass || user.classLevel || "10"}
          loading={loadingChapters}
          user={user}
          settings={settings}
          onSelect={(chapter) => {
            // Admin-added Lucent lessons → open page-wise notes viewer
            if (chapter.id && chapter.id.startsWith('lucent_admin_')) {
              const noteId = chapter.id.replace('lucent_admin_', '');
              const entry = (settings?.lucentNotes || []).find(n => n.id === noteId);
              if (entry) {
                setLucentNoteViewer(entry);
                setLucentPageIndex(0);
                return;
              }
            }
            if (directActionTarget) {
              // Bypass popup and directly open target
              let targetTab = directActionTarget;
              if (
                directActionTarget === "DEEP_DIVE" ||
                directActionTarget === "PREMIUM"
              ) {
                targetTab = "PDF";
              }
              setSelectedChapter(chapter);
              setContentViewStep("PLAYER");
              onTabChange(targetTab as any);
            } else if (contentTypePref !== "ALL") {
              // BYPASS MODAL - user picked a specific content type on home page
              setSelectedChapter(chapter);
              setContentViewStep("PLAYER");
              onTabChange(contentTypePref as any);
              setFullScreen(true);
            } else {
              // OPEN MODAL INSTEAD OF PLAYER
              setSelectedLessonForModal(chapter);
              setShowLessonModal(true);
            }
          }}
          onBack={goBack}
        />
      );
    }

    if (contentViewStep === "PLAYER" && selectedChapter) {
      const contentProps = {
        subject: selectedSubject || {
          id: "all",
          name: "All Subjects",
          icon: "Book",
          color: "bg-slate-100",
        },
        board: activeSessionBoard || user.board || "CBSE",
        classLevel: activeSessionClass || user.classLevel || "10",
        stream: user.stream || "Science",
        onUpdateUser: handleUserUpdate,
      };

      if (type === "VIDEO")
        return (
          <VideoPlaylistView
            chapter={selectedChapter}
            onBack={goBack}
            user={user}
            settings={settings}
            {...contentProps}
          />
        );
      if (type === "PDF")
        return (
          <PdfView
            chapter={selectedChapter}
            onBack={goBack}
            user={user}
            settings={settings}
            {...contentProps}
          />
        );
      if (type === "MCQ")
        return (
          <McqView
            chapter={selectedChapter}
            onBack={goBack}
            user={user}
            settings={settings}
            {...contentProps}
          />
        );
      if (type === "AUDIO")
        return (
          <AudioPlaylistView
            chapter={selectedChapter}
            onBack={goBack}
            user={user}
            settings={settings}
            onPlayAudio={setCurrentAudioTrack}
            {...contentProps}
          />
        );
    }

    return null;
  };

  // --- MENU ITEM GENERATOR WITH LOCKS ---
  const renderSidebarMenuItems = () => {
    const groupedItems = [
      {
        category: "Essential",
        items: [
          {
            id: "INBOX",
            label: "Inbox",
            icon: Mail,
            color: "indigo",
            action: () => {
              setShowInbox(true);
              setShowSidebar(false);
            },
            featureId: "INBOX",
          },
          {
            id: "UPDATES",
            label: "Notifications",
            icon: Bell,
            color: "red",
            action: () => {
              onTabChange("UPDATES");
              setHasNewUpdate(false);
              localStorage.setItem(
                "nst_last_read_update",
                Date.now().toString(),
              );
              setShowSidebar(false);
            },
            featureId: "UPDATES",
          },
        ],
      },
      {
        category: "Learning & Progress",
        items: [
          {
            id: "HISTORY",
            label: "History",
            icon: History,
            color: "slate",
            action: () => {
              onTabChange("HISTORY");
              setShowSidebar(false);
            },
            featureId: "HISTORY_PAGE",
          },
        ],
      },
      {
        category: "Premium & Rewards",
        items: [
          {
            id: "PLAN",
            label: "My Plan",
            icon: CreditCard,
            color: "purple",
            action: () => {
              onTabChange("SUB_HISTORY" as any);
              setShowSidebar(false);
            },
            featureId: "MY_PLAN",
          },
          {
            id: "REDEEM",
            label: "Redeem",
            icon: Gift,
            color: "pink",
            action: () => {
              onTabChange("REDEEM");
              setShowSidebar(false);
            },
            featureId: "REDEEM_CODE",
          },
        ],
      },
      {
        category: "Fun & Utilities",
        items: [
          ...(isGameEnabled
            ? [
                {
                  id: "GAME",
                  label: "Play Game",
                  icon: Gamepad2,
                  color: "orange",
                  action: () => {
                    onTabChange("GAME");
                    setShowSidebar(false);
                  },
                  featureId: "GAMES",
                },
              ]
            : []),
          {
            id: "REQUEST",
            label: "Request Content",
            icon: Megaphone,
            color: "purple",
            action: () => {
              setShowRequestModal(true);
              setShowSidebar(false);
            },
            featureId: "REQUEST_CONTENT",
          },
        ],
      },
      {
        category: "Help & Support",
        items: [
          {
            id: "SUPPORT",
            label: "Admin Support",
            icon: MessageSquare,
            color: "rose",
            action: handleSupportEmail,
            featureId: "SUPPORT",
          }, // Optional featureId, fallback true if missing
        ],
      },
    ];

    return groupedItems.map((group, gIdx) => {
      // Filter items that are hidden
      const visibleItems = group.items.filter((item) => {
        if (item.featureId) {
          const access = getFeatureAccess(item.featureId);
          return !access.isHidden;
        }
        return true;
      });

      if (visibleItems.length === 0) return null;

      return (
        <div key={gIdx} className="mb-4">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">
            {group.category}
          </h4>
          <div className="space-y-1">
            {visibleItems.map((item) => {
              let isLocked = false;
              if (item.featureId) {
                const access = getFeatureAccess(item.featureId);
                if (!access.hasAccess) isLocked = true;
              }

              return (
                <Button
                  key={item.id}
                  onClick={() => {
                    if (isLocked) {
                      showAlert(
                        "🔒 Locked by Admin. Upgrade your plan to access.",
                        "ERROR",
                      );
                      return;
                    }
                    item.action();
                  }}
                  variant="ghost"
                  fullWidth
                  className={`justify-start gap-4 p-3 mx-2 hover:bg-slate-50 rounded-xl ${isLocked ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`bg-${item.color}-100 text-${item.color}-600 p-2 rounded-lg relative`}
                  >
                    <item.icon size={18} />
                    {isLocked && (
                      <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border border-white">
                        <Lock size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {item.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      );
    });
  };

  // --- RENDER BASED ON ACTIVE TAB ---

  const renderMainContent = () => {
    // 1. HOME TAB
    if (activeTab === "HOME") {
      return (
        <div className="space-y-4 pb-4">
          <DashboardSectionWrapper
            id="section_main_actions"
            label="Main Actions"
            settings={settings}
            isLayoutEditing={isLayoutEditing}
            onToggleVisibility={toggleLayoutVisibility}
          >
            <div className="grid grid-cols-2 gap-4">
              {/* CLASS SELECTION */}
              <div className="col-span-2 bg-white rounded-3xl p-5 border border-slate-100 shadow-md transition-all">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 min-w-0">
                    <BookOpen className="text-blue-600 shrink-0" size={22} />
                    <span className="truncate">Select Class</span>
                  </h3>

                  {/* BOARD SELECTION TOGGLE - inline */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl shrink-0">
                    <button
                      onClick={() => setActiveSessionBoard("CBSE")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSessionBoard !== "BSEB" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      CBSE
                    </button>
                    <button
                      onClick={() => setActiveSessionBoard("BSEB")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSessionBoard === "BSEB" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      BSEB
                    </button>
                  </div>
                </div>

                {/* CONTENT TYPE PREFERENCE */}
                <div className="mb-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Open Lesson As</span>
                    {contentTypePref !== "ALL" && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Direct mode
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 p-1 bg-slate-100 rounded-2xl">
                    {[
                      { id: "ALL", label: "All", icon: <List size={14} /> },
                      { id: "PDF", label: "Notes", icon: <FileText size={14} /> },
                      { id: "AUDIO", label: "Audio", icon: <Headphones size={14} /> },
                      { id: "VIDEO", label: "Video", icon: <Video size={14} /> },
                    ].map((opt) => {
                      const active = contentTypePref === (opt.id as any);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setContentTypePref(opt.id as any)}
                          className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-[10px] font-bold transition-all ${
                            active
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {opt.icon}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CLASS SELECTION — grouped categories */}
                {(() => {
                  type ClassTheme = {
                    label: string;
                    accent: string;
                    chip: string;
                    border: string;
                    hoverBorder: string;
                    hoverBg: string;
                    hoverText: string;
                    text: string;
                    iconBg: string;
                    iconText: string;
                  };
                  const themes: Record<"junior" | "secondary" | "senior", ClassTheme> = {
                    junior: {
                      label: "Junior • Foundation",
                      accent: "from-emerald-400 to-teal-500",
                      chip: "bg-emerald-100 text-emerald-700 border-emerald-200",
                      border: "border-emerald-200",
                      hoverBorder: "hover:border-emerald-400",
                      hoverBg: "hover:bg-gradient-to-b hover:from-emerald-50 hover:to-teal-50",
                      hoverText: "hover:text-emerald-800",
                      text: "text-emerald-700",
                      iconBg: "bg-emerald-50",
                      iconText: "text-emerald-600",
                    },
                    secondary: {
                      label: "Secondary • Building Concepts",
                      accent: "from-blue-500 to-indigo-600",
                      chip: "bg-blue-100 text-blue-700 border-blue-200",
                      border: "border-blue-200",
                      hoverBorder: "hover:border-blue-400",
                      hoverBg: "hover:bg-gradient-to-b hover:from-blue-50 hover:to-indigo-50",
                      hoverText: "hover:text-blue-800",
                      text: "text-blue-700",
                      iconBg: "bg-blue-50",
                      iconText: "text-blue-600",
                    },
                    senior: {
                      label: "Senior • Boards & Beyond",
                      accent: "from-purple-500 to-fuchsia-600",
                      chip: "bg-purple-100 text-purple-700 border-purple-200",
                      border: "border-purple-200",
                      hoverBorder: "hover:border-purple-400",
                      hoverBg: "hover:bg-gradient-to-b hover:from-purple-50 hover:to-fuchsia-50",
                      hoverText: "hover:text-purple-800",
                      text: "text-purple-700",
                      iconBg: "bg-purple-50",
                      iconText: "text-purple-600",
                    },
                  };
                  const groups: Array<{
                    key: keyof typeof themes;
                    classes: string[];
                  }> = [
                    { key: "junior", classes: ["6", "7", "8"] },
                    { key: "secondary", classes: ["9", "10"] },
                    { key: "senior", classes: ["11", "12"] },
                  ];
                  const isBoardYear = (c: string) => c === "8" || c === "10" || c === "12";
                  const showBoardBadge = (c: string) => c === "10" || c === "12";

                  const goToClass = (c: string) => {
                    setActiveSessionClass(c);
                    setActiveSessionBoard(
                      activeSessionBoard || user.board || "CBSE",
                    );
                    setContentViewStep("SUBJECTS");
                    setInitialParentSubject(null);
                    onTabChange("COURSES");
                  };

                  return (
                    <div className="space-y-4">
                      {groups.map((g) => {
                        const t = themes[g.key];
                        return (
                          <div key={g.key}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-block h-2 w-2 rounded-full bg-gradient-to-r ${t.accent}`} />
                              <span className={`text-[10px] font-black uppercase tracking-widest ${t.text}`}>
                                {t.label}
                              </span>
                              <span className="flex-1 h-px bg-slate-100" />
                            </div>
                            <div className={`grid ${g.classes.length === 2 ? "grid-cols-2" : "grid-cols-3"} gap-3`}>
                              {g.classes.map((c) => {
                                const board = isBoardYear(c);
                                return (
                                  <button
                                    key={c}
                                    onClick={() => goToClass(c)}
                                    className={`group relative w-full py-5 px-3 rounded-2xl bg-white border-2 ${t.border} text-slate-700 font-black ${t.hoverBorder} active:scale-[0.97] transition-all text-center text-base flex flex-col items-center justify-center gap-1 overflow-hidden shadow-md hover:shadow-lg`}
                                  >
                                    {/* Top accent bar — thicker & rounded */}
                                    <span className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${t.accent} rounded-t-2xl`} />
                                    {/* Subtle inner glow on hover */}
                                    <span className={`absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br ${t.accent} opacity-5 transition-opacity`} style={{opacity: 0}} />

                                    {/* Board year crown badge */}
                                    {showBoardBadge(c) && (
                                      <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[8px] font-black uppercase tracking-wider shadow-sm">
                                        <Crown size={9} className="text-amber-600" />
                                        Board
                                      </span>
                                    )}

                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Class</span>
                                    <span className={`text-3xl font-black leading-none ${board ? "text-amber-600" : t.text}`}>{c}</span>
                                    <span className={`text-[9px] font-bold ${t.text} opacity-60`}>Tap to open</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* GOVT EXAMS + AI SHORTCUT */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-600" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-700">
                            Competitive • Govt. Exams
                          </span>
                          <span className="flex-1 h-px bg-slate-100" />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <button
                            onClick={() => goToClass("COMPETITION")}
                            className="group relative w-full py-5 px-5 rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-200 text-slate-700 font-black hover:border-orange-400 hover:from-orange-100 hover:via-amber-100 hover:to-yellow-100 active:scale-[0.97] transition-all text-left flex items-center gap-4 overflow-hidden shadow-md hover:shadow-lg"
                          >
                            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-t-2xl" />
                            <span className="absolute -right-6 -bottom-6 w-24 h-24 bg-orange-100/60 rounded-full blur-2xl group-hover:bg-orange-200/60 transition-colors" />
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shrink-0">
                              <Trophy size={26} className="text-white drop-shadow" />
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                              <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 block">Competitive Mode</span>
                              <span className="text-lg font-black text-slate-800 leading-tight block">Govt. Exams</span>
                              <span className="text-[10px] text-slate-500 font-medium">SSC, Railway, UPSC, Bihar</span>
                            </div>
                            <ChevronRight size={20} className="text-orange-500 shrink-0 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* MCQ MAKER (in-app) - controlled by admin */}
              {settings?.showMcqMakerCard !== false && (
                <button
                  onClick={() => setMcqAppOpen(true)}
                  className="col-span-2 relative overflow-hidden rounded-3xl p-5 text-left shadow-sm hover:shadow-md active:scale-[0.99] transition-all group bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border border-slate-200"
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-100/60 blur-2xl"></div>
                  <div className="absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-teal-100/60 blur-2xl"></div>

                  <div className="relative z-10 flex items-center gap-4">
                    <div className="bg-emerald-100 rounded-2xl p-3.5 border border-emerald-200 shrink-0">
                      <ListChecks size={28} className="text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-200">
                          New
                        </span>
                        <Sparkles size={12} className="text-emerald-600" />
                      </div>
                      <h3 className="font-black text-slate-800 text-lg leading-tight">
                        MCQ Maker
                      </h3>
                      <p className="text-slate-600 text-xs font-medium mt-0.5">
                        Create your own MCQs
                      </p>
                    </div>
                    <ArrowRight size={20} className="text-emerald-700 shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              )}
            </div>
          </DashboardSectionWrapper>
        </div>
      );
    }

    // 2. AI FUTURE HUB (NEW)
    if (activeTab === "AI_HUB" || activeTab === "AI_STUDIO") {
      return (
        <AiHub
          user={user}
          onTabChange={handleTabChangeWrapper}
          settings={settings}
        />
      );
    }

    // 5. UNIVERSAL VIDEO
    if (activeTab === "UNIVERSAL_VIDEO") {
      return (
        <UniversalVideoView
          user={user}
          onBack={() => onTabChange("HOME")}
          settings={settings}
        />
      );
    }

    // 4. MCQ REVIEW HUB
    if (activeTab === "MCQ_REVIEW") {
      return (
        <McqReviewHub
          user={user}
          onTabChange={onTabChange}
          settings={settings}
          onNavigateContent={(type, chapterId, topicName, subjectName) => {
            // Navigate to MCQ Player
            setLoadingChapters(true);
            const lang =
              (activeSessionBoard || user.board) === "BSEB"
                ? "Hindi"
                : "English";

            // Fix Subject Context FIRST
            const subjects = getSubjectsList(
              (activeSessionClass as any) || user.classLevel || "10",
              user.stream || "Science",
              activeSessionBoard || user.board,
            ).filter((s) => !(settings?.hiddenSubjects || []).includes(s.id));
            let targetSubject = selectedSubject;

            if (subjectName) {
              targetSubject =
                subjects.find((s) => s.name === subjectName) || subjects[0];
            } else if (!targetSubject) {
              targetSubject = subjects[0];
            }

            fetchChapters(
              activeSessionBoard || user.board || "CBSE",
              (activeSessionClass as any) || user.classLevel || "10",
              user.stream || "Science",
              targetSubject,
              lang,
            ).then((allChapters) => {
              const ch = allChapters.find((c) => c.id === chapterId);
              if (ch) {
                onTabChange("MCQ");
                setSelectedSubject(targetSubject);
                setSelectedChapter(ch);
                setContentViewStep("PLAYER");
                setFullScreen(true);
              } else {
                showAlert("Test not found.", "ERROR");
              }
              setLoadingChapters(false);
            });
          }}
        />
      );
    }

    // 3. COURSES TAB (Generic Chapter List for Study Mode)
    if (activeTab === "COURSES") {
      if (
        contentViewStep === "SUBJECTS" &&
        !lucentCategoryView &&
        !homeworkSubjectView
      ) {
        const isCompetition = (activeSessionClass || user.classLevel) === 'COMPETITION';
        return (
          <div className="p-4 pt-2 max-w-6xl mx-auto pb-4">
            {isCompetition && (
              <button
                onClick={() => { setShowCompMcqHub(true); setCompMcqTab('PRACTICE'); setCompMcqIndex(0); setCompMcqSelected(null); }}
                className="w-full mb-4 rounded-2xl p-4 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border border-slate-200 shadow-sm active:scale-[0.99] transition-transform text-left relative overflow-hidden"
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-100/60 rounded-full blur-2xl" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
                    <CheckSquare size={22} className="text-orange-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-700">Apna MCQ Banaye</p>
                    <h3 className="text-base font-black text-slate-800 truncate">Practice MCQ Maker</h3>
                    <p className="text-[11px] text-slate-600 mt-0.5">Khud question banayein, turant sahi/galat ka feedback paayein</p>
                  </div>
                  <ChevronRight size={20} className="text-orange-700 shrink-0" />
                </div>
              </button>
            )}
            <SubjectSelection
              classLevel={(activeSessionClass as any) || "10"}
              stream={user.stream || "Science"}
              board={activeSessionBoard as any}
              settings={settings}
              initialParentSubject={initialParentSubject}
              onSelect={(subject) => {
                setSelectedSubject(subject);
                setHomeworkSubjectView(null);
                setLucentCategoryView(false);
                if (HOMEWORK_SUBJECTS.includes(subject.id)) {
                  setHomeworkSubjectView(subject.id);
                  return;
                }
                if (subject.id === 'lucent') {
                  setLucentCategoryView(true);
                  return;
                }
                setContentViewStep("CHAPTERS");
                setSelectedChapter(null);
                setLoadingChapters(true);
                const lang =
                  activeSessionBoard === "BSEB" ? "Hindi" : "English";
                fetchChapters(
                  activeSessionBoard || "CBSE",
                  activeSessionClass || "10",
                  user.stream || "Science",
                  subject,
                  lang,
                ).then((data) => {
                  const sortedData = [...data].sort((a, b) => {
                    const matchA = a.title.match(/(\d+)/);
                    const matchB = b.title.match(/(\d+)/);
                    if (matchA && matchB) {
                      const numA = parseInt(matchA[1], 10);
                      const numB = parseInt(matchB[1], 10);
                      if (numA !== numB) {
                        return numA - numB;
                      }
                    }
                    return a.title.localeCompare(b.title);
                  });
                  setChapters(sortedData);
                  setLoadingChapters(false);
                });
              }}
              onBack={() => {
                if (initialParentSubject) {
                  setInitialParentSubject(null);
                } else {
                  // If going back from root subject list, go back to HOME class selection
                  setActiveSessionClass(null);
                  setActiveSessionBoard(null);
                  onTabChange("HOME");
                }
              }}
            />
          </div>
        );
      }
      return renderContentSection("GENERIC");
    }

    // 4. LEGACY TABS (Mapped to new structure or kept as sub-views)
    if (activeTab === "CUSTOM_PAGE")
      return (
        <CustomBloggerPage
          onBack={() => onTabChange("HOME")}
          settings={settings}
        />
      );
    if (activeTab === "UPDATES")
      return <UniversalInfoPage onBack={() => onTabChange("HOME")} userId={user.id} />;
    if ((activeTab as string) === "SUB_HISTORY")
      return (
        <HistoryPage
          user={user}
          onUpdateUser={handleUserUpdate}
          settings={settings}
          initialTab="SUB_HISTORY"
        />
      );
    if (activeTab === "HISTORY")
      return (
        <HistoryPage
          user={user}
          onUpdateUser={handleUserUpdate}
          settings={settings}
        />
      );
    // DOWNLOADS is handled in the main render flow so bottom nav shows
    if (activeTab === "LEADERBOARD")
      return <Leaderboard user={user} settings={settings} />;
    if (activeTab === "GAME")
      return isGameEnabled ? (
        user.isGameBanned ? (
          <div className="text-center py-20 bg-red-50 rounded-2xl border border-red-100">
            <Ban size={48} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-red-700">Access Denied</h3>
            <p className="text-sm text-red-600">
              Admin has disabled the game for your account.
            </p>
          </div>
        ) : (
          <SpinWheel
            user={user}
            onUpdateUser={handleUserUpdate}
            settings={settings}
          />
        )
      ) : null;
    if (activeTab === "REDEEM")
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <RedeemSection user={user} onSuccess={onRedeemSuccess} />
        </div>
      );
    // if (activeTab === 'REWARDS') return (...); // REMOVED TO PREVENT CRASH
    if (activeTab === "STORE") {
      return (
        <Store
          user={user}
          settings={settings}
          onUserUpdate={handleUserUpdate}
        />
      );
    }
    if ((activeTab as any) === "TEACHER_STORE") {
      return (
        <TeacherStore
          user={user}
          settings={settings}
          onRedeemSuccess={handleUserUpdate}
        />
      );
    }
    if ((activeTab as string) === "APP_STORE") {
      if (settings?.appStorePageHidden) {
        return (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-700">App Store unavailable</h3>
            <p className="text-sm text-slate-500 mt-1">This page has been hidden by admin.</p>
          </div>
        );
      }
      return <AppStore settings={settings} />;
    }
    if (activeTab === "PROFILE")
      return (
        <div className="animate-in fade-in zoom-in duration-300 pb-4">
          <div
            className={`rounded-3xl p-8 text-center mb-6 shadow-sm relative overflow-hidden transition-all duration-500 ${
              user.subscriptionLevel === "ULTRA" && user.isPremium
                ? "bg-slate-900 border border-slate-700 shadow-purple-500/10 ring-2 ring-purple-900/50 text-white"
                : user.subscriptionLevel === "BASIC" && user.isPremium
                  ? "bg-gradient-to-br from-sky-50 via-sky-100 to-cyan-50 shadow-sky-500/10 ring-2 ring-sky-200/50 text-sky-900 border border-slate-200"
                  : "bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 shadow-gray-500/10 text-slate-800 grayscale border border-slate-200"
            }`}
          >
            {/* ANIMATED BACKGROUND FOR ULTRA */}
            {user.subscriptionLevel === "ULTRA" && user.isPremium && (
              <>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-spin-slow invert"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
              </>
            )}

            {/* ANIMATED BACKGROUND FOR BASIC */}
            {user.subscriptionLevel === "BASIC" && user.isPremium && (
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-10"></div>
            )}

            {/* SPECIAL BANNER ANIMATION (7/30/365) */}
            {(user.subscriptionTier === "WEEKLY" ||
              user.subscriptionTier === "MONTHLY" ||
              user.subscriptionTier === "YEARLY" ||
              user.subscriptionTier === "LIFETIME") &&
              user.isPremium && (
                <div className="absolute top-2 right-2 animate-bounce">
                  <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/30">
                    {user.subscriptionTier === "WEEKLY"
                      ? "7 DAYS"
                      : user.subscriptionTier === "MONTHLY"
                        ? "30 DAYS"
                        : user.subscriptionTier === "LIFETIME"
                          ? "∞"
                          : "365 DAYS"}
                  </span>
                </div>
              )}

            <div
              className={`w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-3xl font-black shadow-2xl relative z-10 ${
                user.subscriptionLevel === "ULTRA" && user.isPremium
                  ? "text-purple-700 ring-4 ring-purple-300 animate-bounce-slow"
                  : user.subscriptionLevel === "BASIC" && user.isPremium
                    ? "text-sky-600 ring-4 ring-sky-300"
                    : "text-slate-600 ring-4 ring-slate-200"
              }`}
            >
              {(user.name || "S").charAt(0)}
              {user.subscriptionLevel === "ULTRA" && user.isPremium && (
                <div className="absolute -top-2 -right-2 text-2xl">👑</div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 relative z-10">
              <h2
                className={`text-2xl font-black tracking-tight ${user.subscriptionLevel === "ULTRA" && user.isPremium ? "text-white" : "text-slate-800"}`}
              >
                {user.name}
              </h2>
              <button
                onClick={() => {
                  setNewNameInput(user.name);
                  setShowNameChangeModal(true);
                }}
                className="bg-black/10 p-1 rounded-full hover:bg-black/20 transition-colors"
              >
                <Edit
                  size={12}
                  className={
                    user.subscriptionLevel === "ULTRA" && user.isPremium
                      ? "text-white"
                      : "text-slate-600"
                  }
                />
              </button>
            </div>
            <p
              className={`text-sm font-mono relative z-10 flex justify-center items-center gap-2 ${user.subscriptionLevel === "ULTRA" && user.isPremium ? "text-slate-300" : "text-slate-600"}`}
            >
              ID: {user.displayId || user.id}
            </p>
            {user.createdAt && !isNaN(new Date(user.createdAt).getTime()) && (
              <p
                className={`text-[10px] mt-1 font-medium relative z-10 ${user.subscriptionLevel === "ULTRA" && user.isPremium ? "text-slate-400" : "text-slate-500"}`}
              >
                Joined:{" "}
                {new Date(user.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}

            <p
              className={`text-[9px] mt-4 relative z-10 ${user.subscriptionLevel === "ULTRA" && user.isPremium ? "text-slate-500" : "text-slate-400"}`}
            >
              App Version: {APP_VERSION}
            </p>
            <p
              className={`text-[9px] relative z-10 ${user.subscriptionLevel === "ULTRA" && user.isPremium ? "text-slate-500" : "text-slate-400"}`}
            >
              Developed by Nadim Anwar
            </p>

            <div className="mt-4 relative z-10">
              <span
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-black/20 border-2 ${
                  user.subscriptionLevel === "ULTRA" && user.isPremium
                    ? "bg-purple-500 text-white border-purple-300 animate-pulse"
                    : user.subscriptionLevel === "BASIC" && user.isPremium
                      ? "bg-sky-500 text-white border-sky-300"
                      : "bg-slate-600 text-white border-slate-500"
                }`}
              >
                {user.isPremium
                  ? (() => {
                      const tier = user.subscriptionTier;
                      let displayTier = "PREMIUM";

                      if (tier === "WEEKLY") displayTier = "Weekly";
                      else if (tier === "MONTHLY") displayTier = "Monthly";
                      else if (tier === "YEARLY") displayTier = "Yearly";
                      else if (tier === "LIFETIME")
                        displayTier = "Yearly Plus"; // Mapped as per user request
                      else if (tier === "3_MONTHLY") displayTier = "Quarterly";
                      else if (tier === "CUSTOM") displayTier = "Custom Plan";

                      return (
                        <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                          {displayTier} {user.subscriptionLevel}
                        </span>
                      );
                    })()
                  : "Free User"}
              </span>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {/* SUBSCRIPTION CARD */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 shrink-0">
                <Crown size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subscription</p>
                <p className="text-sm font-black text-slate-800 truncate">
                  {user.subscriptionTier === "CUSTOM"
                    ? user.customSubscriptionName || "Basic Ultra"
                    : user.subscriptionTier || "FREE"}
                </p>
                {user.subscriptionEndDate &&
                  user.subscriptionTier !== "LIFETIME" &&
                  !isNaN(new Date(user.subscriptionEndDate).getTime()) && (
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                      Expires {new Date(user.subscriptionEndDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {(() => {
                        const diff = new Date(user.subscriptionEndDate).getTime() - Date.now();
                        if (diff <= 0) return ' • Expired';
                        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                        return ` • ${d}d left`;
                      })()}
                    </p>
                  )}
              </div>
            </div>

            {/* ACTION LIST */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {/* HISTORY */}
              {(() => {
                const access = getFeatureAccess("HISTORY_PAGE");
                if (access.isHidden) return null;
                const isLocked = !access.hasAccess;
                return (
                  <button
                    onClick={() => {
                      if (isLocked) {
                        showAlert("🔒 Locked by Admin.", "ERROR");
                        return;
                      }
                      onTabChange("HISTORY");
                    }}
                    className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors active:bg-slate-100"
                  >
                    <div className="bg-rose-100 w-10 h-10 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                      <History size={18} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        History
                        {isLocked && <Lock size={12} className="text-red-500" />}
                      </p>
                      <p className="text-[11px] text-slate-500">Tests, activity & past sessions</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 shrink-0" />
                  </button>
                );
              })()}

              {/* SETTINGS */}
              <button
                onClick={() => setShowSettingsSheet(true)}
                className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors active:bg-slate-100"
              >
                <div className="bg-slate-100 w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
                  <Settings size={18} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold text-slate-800">Settings</p>
                  <p className="text-[11px] text-slate-500">Theme, marksheets, recovery & data</p>
                </div>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>

              {/* TEACHER STORE */}
              <button
                onClick={() => onTabChange("TEACHER_STORE" as any)}
                className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors active:bg-slate-100"
              >
                <div className="bg-purple-100 w-10 h-10 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                  <Crown size={18} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold text-slate-800">
                    {user.role === "TEACHER" ? "Teacher Store" : "Upgrade to Teacher"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {user.role === "TEACHER" ? "Manage your store & content" : "Unlock premium creator tools"}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>

              {/* LOGOUT */}
              {(settings?.isLogoutEnabled !== false ||
                user.role === "ADMIN" ||
                isImpersonating) && (
                <button
                  onClick={onLogout}
                  className="w-full p-4 flex items-center gap-3 hover:bg-red-50 transition-colors active:bg-red-100"
                >
                  <div className="bg-red-100 w-10 h-10 rounded-xl flex items-center justify-center text-red-600 shrink-0">
                    <LogOut size={18} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-bold text-red-600">Logout Safely</p>
                    <p className="text-[11px] text-red-400">Sign out of your account</p>
                  </div>
                  <ChevronRight size={16} className="text-red-300 shrink-0" />
                </button>
              )}
            </div>

            {/* HIDDEN: MY DATA SECTION - kept for settings sheet reference */}
            <div className="hidden bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-black text-slate-800 flex items-center gap-2">
                <Database size={18} className="text-slate-600" /> Data
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewingUserHistory(user)}
                  className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2"
                >
                  <Activity size={14} className="text-blue-500" /> View Full
                  Activity
                </button>
                <button
                  onClick={async () => {
                    try {
                      showAlert("Generating Report...", "INFO");

                      // Create container
                      const element = document.createElement("div");
                      element.style.width = "210mm";
                      element.style.minHeight = "297mm";
                      element.style.padding = "40px";
                      element.style.background = "#ffffff";
                      element.style.fontFamily = "Helvetica, Arial, sans-serif";
                      element.style.position = "fixed";
                      element.style.top = "-9999px";
                      element.style.left = "-9999px";

                      // Calculate Stats
                      const totalTests = user.mcqHistory?.length || 0;
                      const avgScore =
                        totalTests > 0
                          ? Math.round(
                              ((user.mcqHistory?.reduce(
                                (a, b) => a + b.score / b.totalQuestions,
                                0,
                              ) || 0) /
                                totalTests) *
                                100,
                            )
                          : 0;
                      const bestSubject = "General"; // simplified logic for now

                      element.innerHTML = `
                                                <div style="border: 4px solid #1e293b; padding: 40px; height: 100%; box-sizing: border-box; position: relative;">

                                                    <!-- Header -->
                                                    <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
                                                        <h1 style="color: #1e293b; font-size: 32px; margin: 0; font-weight: 900; letter-spacing: -1px;">STUDENT PROGRESS REPORT</h1>
                                                        <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">${settings?.appName || "NST AI"} Official Record</p>
                                                    </div>

                                                    <!-- Student Info Grid -->
                                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px;">
                                                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px;">
                                                            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Student Name</p>
                                                            <p style="margin: 5px 0 0 0; color: #0f172a; font-size: 18px; font-weight: bold;">${user.name}</p>
                                                        </div>
                                                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px;">
                                                            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Student ID</p>
                                                            <p style="margin: 5px 0 0 0; color: #0f172a; font-size: 18px; font-weight: bold;">${user.displayId || user.id.slice(0, 8)}</p>
                                                        </div>
                                                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px;">
                                                            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Class & Stream</p>
                                                            <p style="margin: 5px 0 0 0; color: #0f172a; font-size: 18px; font-weight: bold;">${user.classLevel} - ${user.stream || "General"}</p>
                                                        </div>
                                                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px;">
                                                            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Date Generated</p>
                                                            <p style="margin: 5px 0 0 0; color: #0f172a; font-size: 18px; font-weight: bold;">${new Date().toLocaleDateString()}</p>
                                                        </div>
                                                    </div>

                                                    <!-- Performance Snapshot -->
                                                    <h3 style="color: #334155; font-size: 16px; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 20px;">PERFORMANCE SNAPSHOT</h3>
                                                    <div style="display: flex; gap: 20px; margin-bottom: 40px;">
                                                        <div style="flex: 1; text-align: center; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">
                                                            <div style="font-size: 32px; font-weight: 900; color: #3b82f6;">${avgScore}%</div>
                                                            <div style="font-size: 12px; color: #64748b; font-weight: bold;">AVERAGE SCORE</div>
                                                        </div>
                                                        <div style="flex: 1; text-align: center; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">
                                                            <div style="font-size: 32px; font-weight: 900; color: #10b981;">${totalTests}</div>
                                                            <div style="font-size: 12px; color: #64748b; font-weight: bold;">TESTS TAKEN</div>
                                                        </div>
                                                        <div style="flex: 1; text-align: center; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">
                                                            <div style="font-size: 32px; font-weight: 900; color: #f59e0b;">${user.credits}</div>
                                                            <div style="font-size: 12px; color: #64748b; font-weight: bold;">CREDITS EARNED</div>
                                                        </div>
                                                    </div>

                                                    <!-- Recent Activity Table -->
                                                    <h3 style="color: #334155; font-size: 16px; border-left: 4px solid #ec4899; padding-left: 10px; margin-bottom: 20px;">RECENT TEST ACTIVITY</h3>
                                                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                                        <thead>
                                                            <tr style="background: #f1f5f9; color: #475569;">
                                                                <th style="padding: 12px; text-align: left; border-radius: 8px 0 0 8px;">DATE</th>
                                                                <th style="padding: 12px; text-align: left;">TOPIC</th>
                                                                <th style="padding: 12px; text-align: right; border-radius: 0 8px 8px 0;">SCORE</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            ${(
                                                              user.mcqHistory ||
                                                              []
                                                            )
                                                              .slice(0, 15)
                                                              .map(
                                                                (h, i) => `
                                                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                                                    <td style="padding: 12px; color: #64748b;">${h.date && !isNaN(new Date(h.date).getTime()) ? new Date(h.date).toLocaleDateString() : "N/A"}</td>
                                                                    <td style="padding: 12px; font-weight: 600; color: #334155;">${h.chapterTitle.substring(0, 40)}</td>
                                                                    <td style="padding: 12px; text-align: right;">
                                                                        <span style="background: ${h.score / h.totalQuestions >= 0.8 ? "#dcfce7" : "#fee2e2"}; color: ${h.score / h.totalQuestions >= 0.8 ? "#166534" : "#991b1b"}; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                                                                            ${h.score}/${h.totalQuestions}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            `,
                                                              )
                                                              .join("")}
                                                        </tbody>
                                                    </table>

                                                    <!-- Footer -->
                                                    <div style="position: absolute; bottom: 40px; left: 40px; right: 40px; text-align: center; color: #94a3b8; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                                        This report is system generated by ${settings?.appName || "NST AI"}. Verified & Valid.
                                                    </div>
                                                </div>
                                            `;

                      document.body.appendChild(element);

                      // Render
                      const canvas = await html2canvas(element, {
                        scale: 2,
                        useCORS: true,
                      });
                      const imgData = canvas.toDataURL("image/jpeg", 0.9);

                      const pdf = new jsPDF("p", "mm", "a4");
                      const pdfWidth = pdf.internal.pageSize.getWidth();
                      const pdfHeight =
                        (canvas.height * pdfWidth) / canvas.width;

                      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
                      const safeName = user.name
                        ? user.name.replace(/\s+/g, "_")
                        : "Student";
                      pdf.save(`Report_${safeName}_${Date.now()}.pdf`);

                      document.body.removeChild(element);
                      showAlert("✅ Report Downloaded!", "SUCCESS");
                    } catch (e) {
                      console.error("PDF Error", e);
                      showAlert(
                        "Failed to generate PDF. Please try again.",
                        "ERROR",
                      );
                    }
                  }}
                  className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2"
                >
                  <Download size={14} className="text-red-500" /> Download
                  Optimized Report
                </button>
              </div>
            </div>

          </div>

          {/* SETTINGS SHEET MODAL */}
          {showSettingsSheet && (
            <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSettingsSheet(false)}>
              <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 shadow-2xl space-y-3 pb-8 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                  <Settings size={18} className="text-slate-600" /> Settings
                </h3>

                {/* LIGHT/DARK MODE TOGGLE */}
                <button
                  onClick={() => {
                    if (!isDarkMode) {
                      localStorage.setItem("nst_dark_theme_type", "black");
                      onToggleDarkMode && onToggleDarkMode(true);
                    } else {
                      const currentType = localStorage.getItem("nst_dark_theme_type");
                      if (currentType === "black") {
                        localStorage.setItem("nst_dark_theme_type", "blue");
                        onToggleDarkMode && onToggleDarkMode(true);
                      } else {
                        onToggleDarkMode && onToggleDarkMode(false);
                      }
                    }
                  }}
                  className={`w-full p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-all ${isDarkMode ? (localStorage.getItem("nst_dark_theme_type") === "blue" ? "bg-blue-900 border-blue-800" : "bg-slate-800 border-slate-700") : "bg-white border-slate-200 hover:bg-slate-50"}`}
                >
                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-black/20" : "bg-slate-100"}`}>
                    {isDarkMode ? <Sparkles size={18} className={localStorage.getItem("nst_dark_theme_type") === "blue" ? "text-blue-300" : "text-yellow-400"} /> : <Zap size={18} className="text-slate-600" />}
                  </div>
                  <span className={`text-sm font-bold flex-1 text-left ${isDarkMode ? (localStorage.getItem("nst_dark_theme_type") === "blue" ? "text-blue-300" : "text-slate-300") : "text-slate-700"}`}>
                    {isDarkMode ? (localStorage.getItem("nst_dark_theme_type") === "blue" ? "Blue Mode Active" : "Black Mode Active") : "Light Mode Active"}
                  </span>
                  <div className="w-10 h-6 bg-slate-200 rounded-full flex items-center px-1 overflow-hidden">
                    <div className={`w-4 h-4 rounded-full transition-transform ${isDarkMode ? "translate-x-4 bg-indigo-500" : "bg-white shadow"}`}></div>
                  </div>
                </button>

                {/* SETUP RECOVERY */}
                <button
                  onClick={() => { setShowSidebar(false); setShowRecoveryModal(true); setShowSettingsSheet(false); }}
                  className="w-full bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex items-center gap-3 hover:bg-orange-50 transition-all"
                >
                  <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Lock size={18} /></div>
                  <span className="text-sm font-bold text-slate-800 flex-1 text-left">Setup Recovery</span>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                <button onClick={() => setShowSettingsSheet(false)} className="w-full mt-2 text-slate-500 text-sm font-bold py-3">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      );

    // Handle Drill-Down Views (Video, PDF, MCQ, AUDIO)
    if (
      activeTab === "VIDEO" ||
      activeTab === "PDF" ||
      activeTab === "MCQ" ||
      (activeTab as any) === "AUDIO"
    ) {
      return renderContentSection(activeTab as any);
    }

    if ((activeTab as string) === "DOWNLOADS") {
      return (
        <div className="animate-in fade-in duration-300">
          <OfflineDownloads onBack={() => onTabChange("HOME")} />
        </div>
      );
    }

    return null;
  };

  if (showBoardPromptForClass) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900/50 p-4 z-[200] fixed inset-0 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-3xl p-6 w-full shadow-2xl relative text-center">
          <button
            onClick={() => setShowBoardPromptForClass(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
          <h2 className="text-2xl font-black text-slate-800 mb-2">
            Select Board
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Choose your board for Class {showBoardPromptForClass}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setActiveSessionClass(showBoardPromptForClass);
                setActiveSessionBoard("CBSE");
                setShowBoardPromptForClass(null);
                setContentViewStep("SUBJECTS");
                setInitialParentSubject(null);
                onTabChange("COURSES");
              }}
              className="py-4 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              CBSE <br />
              <span className="text-[10px] font-medium text-slate-500">
                (English)
              </span>
            </button>
            <button
              onClick={() => {
                setActiveSessionClass(showBoardPromptForClass);
                setActiveSessionBoard("BSEB");
                setShowBoardPromptForClass(null);
                setContentViewStep("SUBJECTS");
                setInitialParentSubject(null);
                onTabChange("COURSES");
              }}
              className="py-4 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              BSEB <br />
              <span className="text-[10px] font-medium text-slate-500">
                (Hindi)
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- TEACHER LOCKED SCREEN MOVED TO RENDER ---
  if (isTeacherLocked && activeTab !== "STORE") {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <Lock size={64} className="text-purple-500 mb-6" />
        <h1 className="text-3xl font-black text-white mb-2">
          Teacher Access Expired
        </h1>
        <p className="text-slate-500 mb-8 w-full">
          Your Teacher Code has expired. Please enter a new access code or
          purchase a renewal plan to continue using the platform.
        </p>

        <div className="w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8">
          <h3 className="text-white font-bold mb-4 text-sm text-left">
            Enter New Teacher Code
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={teacherUnlockCode}
              onChange={(e) => setTeacherUnlockCode(e.target.value)}
              placeholder="e.g. TCH1234"
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-purple-500 font-mono"
            />
            <button
              onClick={() => {
                const codes = settings?.teacherCodes || [];
                const validCode = codes.find(
                  (c) => c.code === teacherUnlockCode && c.isActive,
                );
                if (validCode) {
                  const durationDays = validCode.durationDays || 365;
                  const newExpiry = new Date();
                  newExpiry.setDate(newExpiry.getDate() + durationDays);
                  onRedeemSuccess({
                    ...user,
                    role: "TEACHER",
                    teacherCode: validCode.code,
                    isPremium: true,
                    subscriptionTier: "ULTRA",
                    subscriptionEndDate: newExpiry.toISOString(),
                    teacherExpiryDate: newExpiry.toISOString(),
                  });
                  setTeacherUnlockCode("");
                  setIsTeacherLocked(false);
                  setAlertConfig({
                    isOpen: true,
                    type: "SUCCESS",
                    message: `Success! Account renewed for ${durationDays} days.`,
                  });
                } else {
                  setAlertConfig({
                    isOpen: true,
                    type: "ERROR",
                    message: "Invalid or inactive code.",
                  });
                }
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={() => onTabChange("STORE")}
            className="w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200"
          >
            <ShoppingBag size={18} /> Visit Teacher Store
          </button>
          {(settings?.isLogoutEnabled !== false ||
            user.role === "ADMIN" ||
            isImpersonating) && (
            <button
              onClick={() => {
                if (onLogout) onLogout();
                else {
                  localStorage.removeItem("nst_current_user");
                  window.location.reload();
                }
              }}
              className="w-full text-slate-500 py-4 font-bold hover:text-white"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-0">
      <NotificationPrompt />
      {/* ADMIN SWITCH BUTTON */}
      {(user.role === "ADMIN" ||
        user.role === "SUB_ADMIN" ||
        isImpersonating) && (
        <div className="fixed bottom-36 right-4 z-50 flex flex-col gap-3 items-end">
          <button
            onClick={() => setIsLayoutEditing(!isLayoutEditing)}
            className={`p-4 rounded-full shadow-2xl border-2 hover:scale-110 transition-transform flex items-center gap-2 ${isLayoutEditing ? "bg-yellow-400 text-black border-yellow-500" : "bg-white text-slate-800 border-slate-200"}`}
          >
            <Edit size={20} />
            {isLayoutEditing && (
              <span className="font-bold text-xs">Editing Layout</span>
            )}
          </button>
          <button
            onClick={handleSwitchToAdmin}
            className="bg-slate-900 text-white p-4 rounded-full shadow-2xl border-2 border-slate-700 hover:scale-110 transition-transform flex items-center gap-2 animate-bounce-slow"
          >
            <Layout size={20} className="text-yellow-400" />
            <span className="font-bold text-xs">Admin Panel</span>
          </button>
        </div>
      )}

      {/* NEW GLOBAL TOP BAR */}
      <div
        id="top-banner-container"
        className={`sticky top-0 z-[100] w-full shadow-md flex flex-col justify-between px-4 py-3 transition-all duration-300 ${
          user.isPremium
            ? user.subscriptionLevel === "ULTRA"
              ? "bg-slate-900 text-white"
              : user.subscriptionLevel === "BASIC"
                ? "bg-gradient-to-r from-sky-500 to-cyan-600 text-white"
                : "bg-[var(--primary)] text-white"
            : "bg-gradient-to-r from-slate-600 to-slate-800 text-white grayscale border-b border-slate-700"
        } ${isFullscreenMode ? "hidden" : ""} transition-all duration-300 ease-in-out ${isTopBarHidden ? "-translate-y-full !h-0 overflow-hidden opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}`}
      >
        {/* Main Header Row */}
        <div className="flex items-center justify-between w-full relative">
          <div
            className="flex items-center gap-2 shrink-0 cursor-pointer z-10"
            onClick={() => setShowSidebar(true)}
          >
            <button className="p-1 rounded-full transition-colors hover:bg-white/20 -ml-1 shrink-0">
              <Menu size={20} className="text-white" />
            </button>
            {settings?.appLogo ? (
              <img
                src={settings.appLogo}
                alt="Logo"
                className="w-8 h-8 rounded-full object-cover border-2 border-white/30 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 text-white shrink-0">
                <BrainCircuit size={16} />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-black text-xl leading-tight tracking-tight whitespace-nowrap truncate">
                {settings?.appName || "NST AI"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar justify-end pl-2 z-10 ml-auto">
            {/* Streak Badge */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full shadow-sm text-xs font-black bg-orange-500/20 text-orange-100 border border-orange-400/30 backdrop-blur-sm whitespace-nowrap shrink-0">
              🔥 {user.streak || 0}
            </div>

            {/* Credits */}
            <button
              onClick={() => onTabChange("STORE")}
              className="flex items-center gap-1 px-2 py-1 rounded-full shadow-sm text-xs font-black hover:scale-105 transition-transform bg-[#FDFBF7] text-slate-800 border border-amber-100 whitespace-nowrap shrink-0"
            >
              <Crown size={14} className="fill-slate-800" /> {user.credits} CR
            </button>

            {/* Custom Page / Lightning */}
            <button
              onClick={() => onTabChange("CUSTOM_PAGE")}
              className="p-1.5 rounded-full transition-colors relative bg-[#FDFBF7] hover:bg-slate-50 text-slate-800 border border-amber-100 shrink-0"
            >
              <Zap size={16} />
              {hasNewUpdate && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>

            {/* Sale Discount Mini Button */}
            {settings?.specialDiscountEvent?.enabled && (
              <button
                onClick={() => onTabChange("STORE")}
                className="p-1.5 rounded-full transition-colors relative bg-[#FDFBF7] hover:bg-slate-50 text-slate-800 border border-amber-100 shrink-0 flex items-center gap-1"
              >
                <Ticket size={16} />
                <span className="text-[10px] font-bold whitespace-nowrap">
                  {settings?.specialDiscountEvent?.discountPercent
                    ? `${settings.specialDiscountEvent.discountPercent}% OFF`
                    : "50% OFF"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* SECOND LINE: Subscription, Expiry Date */}
        <div className="flex items-center justify-between w-full mt-2 pt-1 border-t border-white/10">
          <div className="flex items-center gap-2 opacity-90 shrink-0">
            <span className="text-sm font-bold text-white/90 truncate">
              Hey, {(user.name || "Student").split(" ")[0]} 👋
            </span>
          </div>
          <div className="flex items-center gap-2 opacity-90 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">
              {user.isPremium ? user.subscriptionTier || "PREMIUM" : "FREE"}
            </span>
            {user.isPremium &&
              user.subscriptionEndDate &&
              user.subscriptionTier !== "LIFETIME" &&
              !isNaN(new Date(user.subscriptionEndDate).getTime()) && (
                <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-black/20 px-1.5 py-0.5 rounded-sm">
                  EXP:{" "}
                  {new Date(user.subscriptionEndDate)
                    .toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })
                    .replace(/ /g, " ")
                    .toUpperCase()}
                </span>
              )}
          </div>
        </div>
      </div>

      {/* NOTIFICATION BAR (Only on Home) (COMPACT VERSION) */}
      {activeTab === "HOME" && settings?.noticeText && (
        <div className="bg-slate-900 text-white p-3 mb-4 rounded-xl shadow-md border border-slate-700 animate-in slide-in-from-top-4 relative mx-2 mt-2">
          <div className="flex items-center gap-3">
            <Megaphone size={16} className="text-yellow-400 shrink-0" />
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-medium truncate">
                {settings.noticeText}
              </p>
            </div>
            <SpeakButton
              text={settings.noticeText}
              className="text-white hover:bg-white/10"
              iconSize={14}
            />
          </div>
        </div>
      )}

      {/* DAILY GK & GLOBAL CHALLENGE (Only on Home) */}
      {activeTab === "HOME" && (() => {
        const banners: React.ReactNode[] = [];

        // 1. GLOBAL CHALLENGE MCQ
        if (
          settings?.globalChallengeMcq &&
          settings.globalChallengeMcq.length > 0
        ) {
              banners.push(
                <div
                  key="global-challenge"
                  className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200 shadow-sm relative overflow-hidden h-full w-full absolute top-0 left-0 animate-in fade-in zoom-in duration-300"
                >
                  <div className="absolute top-0 right-0 -mr-4 -mt-4 text-orange-200 opacity-50">
                    <Trophy size={64} />
                  </div>
                  <h4 className="text-xs font-black text-orange-800 uppercase tracking-widest mb-2 flex items-center gap-2 relative z-10">
                    <Trophy size={14} className="text-orange-600" /> Challenge
                    of the Day
                  </h4>
                  <div className="relative z-10">
                    <p className="font-bold text-slate-800 text-sm mb-3 leading-snug">
                      {settings.globalChallengeMcq[0].question}
                    </p>
                    <div className="space-y-2">
                      {settings.globalChallengeMcq[0].options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (
                              i ===
                              settings.globalChallengeMcq![0].correctAnswer
                            ) {
                              showAlert(
                                "🎉 Correct Answer! Great job!",
                                "SUCCESS",
                              );
                            } else {
                              showAlert(
                                `❌ Incorrect. The right answer is: ${settings.globalChallengeMcq![0].options[settings.globalChallengeMcq![0].correctAnswer]}`,
                                "ERROR",
                              );
                            }
                          }}
                          className="w-full text-left p-2.5 rounded-lg border border-orange-200 bg-white hover:bg-orange-100 text-sm font-medium text-slate-700 transition-colors shadow-sm"
                        >
                          {String.fromCharCode(65 + i)}. {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>,
              );
            }

            // 3. CHALLENGE 2.0
            if (activeChallenges20.length > 0) {
              activeChallenges20
                .filter(
                  (c) =>
                    !testAttempts[c.id] ||
                    testAttempts[c.id].isCompleted !== true,
                )
                .forEach((challenge, idx) => {
                  banners.push(
                    <div
                      key={`challenge-20-${idx}`}
                      className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-xl border border-violet-200 shadow-sm relative overflow-hidden h-full w-full absolute top-0 left-0 animate-in fade-in zoom-in duration-300"
                    >
                      <div className="absolute top-0 right-0 -mr-4 -mt-4 text-violet-200 opacity-50">
                        <Rocket size={64} />
                      </div>
                      <h4 className="text-xs font-black text-violet-800 uppercase tracking-widest mb-2 flex items-center gap-2 relative z-10">
                        <Rocket size={14} className="text-violet-600" />{" "}
                        {challenge.type === "DAILY_CHALLENGE"
                          ? "Daily Challenge"
                          : "Weekly Test"}{" "}
                        2.0
                      </h4>
                      <div className="relative z-10">
                        <p className="font-bold text-slate-800 text-sm mb-1 leading-snug">
                          {challenge.title}
                        </p>
                        <p className="text-xs text-slate-600 mb-3">
                          {challenge.questions.length} Questions •{" "}
                          {challenge.durationMinutes} Mins
                        </p>
                        <button
                          onClick={() => {
                            if (onStartWeeklyTest) {
                              // Map Challenge20 to WeeklyTest structure to use WeeklyTestView
                              onStartWeeklyTest({
                                id: challenge.id,
                                title: challenge.title,
                                date: new Date().toISOString(),
                                durationMinutes: challenge.durationMinutes,
                                isCompleted: false,
                                score: 0,
                                totalQuestions: challenge.questions.length,
                                questions: challenge.questions,
                                classLevel: challenge.classLevel,
                              } as any);
                            }
                          }}
                          className="w-full text-center p-2 rounded-lg bg-violet-600 text-white text-sm font-bold shadow-md hover:bg-violet-700 transition-colors"
                        >
                          Start Challenge
                        </button>
                      </div>
                    </div>,
                  );
                });
            }

        if (banners.length === 0) return null;

        // Show only the current banner
        const currentIndex = homeBannerIndex % banners.length;

        return (
          <div className="mx-4 mt-4 mb-4 relative min-h-[82px]">
            {banners[currentIndex]}
          </div>
        );
      })()}

      {/* AI NOTES MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {settings?.aiName || "AI Notes"}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Instant Note Generator
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAiModal(false);
                  setAiResult(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {!aiResult ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-2">
                    What topic do you want notes for?
                  </label>
                  <textarea
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. Newton's Laws of Motion, Photosynthesis process..."
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-indigo-100 h-32 resize-none"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                  <AlertCircle
                    size={16}
                    className="text-blue-600 mt-0.5 shrink-0"
                  />
                  <div className="text-xs text-blue-800">
                    <span className="font-bold block mb-1">Usage Limit</span>
                    You can generate notes within your daily limit.
                    {user.isPremium
                      ? user.subscriptionLevel === "ULTRA"
                        ? " (Ultra Plan: High Limit)"
                        : " (Basic Plan: Medium Limit)"
                      : " (Free Plan: Low Limit)"}
                  </div>
                </div>

                <Button
                  onClick={handleAiNotesGeneration}
                  isLoading={aiGenerating}
                  variant="primary"
                  fullWidth
                  size="lg"
                  icon={<Sparkles />}
                >
                  {aiGenerating ? "Generating Magic..." : "Generate Notes"}
                </Button>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap">{aiResult}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setAiResult(null)}
                    variant="ghost"
                    className="flex-1"
                  >
                    New Topic
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult);
                      showAlert("Notes Copied!", "SUCCESS");
                    }}
                    variant="primary"
                    className="flex-1"
                  >
                    Copy Text
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL (Moved to root level of StudentDashboard to fix z-index and conditional rendering issues) */}
      {editMode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Edit className="text-blue-600" /> Edit Profile
              </h3>
              <button
                onClick={() => setEditMode(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Class Level
                </label>
                <select
                  value={profileData.classLevel}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      classLevel: e.target.value as any,
                    })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50"
                >
                  {(
                    settings?.allowedClasses || [
                      "6",
                      "7",
                      "8",
                      "9",
                      "10",
                      "11",
                      "12",
                      "COMPETITION",
                    ]
                  ).map((c) => (
                    <option key={c} value={c}>
                      {c === "COMPETITION" ? "Competition" : `Class ${c}`}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-slate-600">
                    Daily Limit:{" "}
                    {user.subscriptionLevel === "ULTRA"
                      ? "3"
                      : user.subscriptionLevel === "BASIC"
                        ? "2"
                        : "1"}{" "}
                    changes
                  </p>
                  <p className="text-[10px] text-blue-600 font-bold">
                    Remaining:{" "}
                    {(() => {
                      const limit =
                        user.subscriptionLevel === "ULTRA"
                          ? 3
                          : user.subscriptionLevel === "BASIC"
                            ? 2
                            : 1;
                      const used = parseInt(
                        localStorage.getItem(
                          `nst_class_changes_${user.id}_${new Date().toDateString()}`,
                        ) || "0",
                      );
                      return Math.max(0, limit - used);
                    })()}
                  </p>
                </div>
              </div>

              {(["11", "12"].includes(profileData.classLevel) ||
                profileData.classLevel === "COMPETITION") && (
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    Stream
                  </label>
                  <select
                    value={profileData.stream}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        stream: e.target.value as any,
                      })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50"
                  >
                    <option value="Science">Science</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Arts">Arts</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Board
                </label>
                <select
                  value={profileData.board}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      board: e.target.value as any,
                    })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50"
                >
                  {(settings?.allowedBoards || ["CBSE", "BSEB"]).map((b) => (
                    <option key={b} value={b}>
                      {b}{" "}
                      {b === "CBSE"
                        ? "(English)"
                        : b === "BSEB"
                          ? "(Hindi)"
                          : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={profileData.mobile || user.mobile}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                    } as any)
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold"
                  placeholder="10-digit number"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  New Password (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to keep current"
                  value={profileData.newPassword}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setEditMode(false)}
                className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Check Class Change Limit (Exclude TEACHER)
                  if (
                    profileData.classLevel !== user.classLevel &&
                    user.role !== "TEACHER"
                  ) {
                    const limit =
                      user.subscriptionLevel === "ULTRA"
                        ? 3
                        : user.subscriptionLevel === "BASIC"
                          ? 2
                          : 1;
                    const todayKey = `nst_class_changes_${user.id}_${new Date().toDateString()}`;
                    const used = parseInt(
                      localStorage.getItem(todayKey) || "0",
                    );

                    if (used >= limit) {
                      showAlert(
                        `Daily class change limit reached (${limit})! Upgrade to increase.`,
                        "ERROR",
                      );
                      return;
                    }

                    // Increment Usage
                    localStorage.setItem(todayKey, (used + 1).toString());
                  }

                  // Update User
                  const updates: Partial<User> = {
                    classLevel: profileData.classLevel as any,
                    board: profileData.board as any,
                    stream: profileData.stream as any,
                  };
                  if (profileData.newPassword)
                    updates.password = profileData.newPassword;
                  if (profileData.mobile) updates.mobile = profileData.mobile;

                  handleUserUpdate({ ...user, ...updates });
                  setEditMode(false);
                  showAlert("Profile Updated Successfully!", "SUCCESS");
                }}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecoveryModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full shadow-xl border-t-4 border-orange-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Lock className="text-orange-500" /> Setup Recovery
              </h3>
              <button
                onClick={() => setShowRecoveryModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs font-bold text-slate-600 mb-4 bg-orange-50 p-3 rounded-lg border border-orange-100">
              Set a Mobile Number and Password. If Google Auth fails, you can
              use these to login via the Recovery option.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={recoveryData.mobile}
                  onChange={(e) =>
                    setRecoveryData({
                      ...recoveryData,
                      mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold"
                  placeholder="10-digit mobile number"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Recovery Password
                </label>
                <input
                  type="text"
                  placeholder="Create a strong password"
                  value={recoveryData.password}
                  onChange={(e) =>
                    setRecoveryData({
                      ...recoveryData,
                      password: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowRecoveryModal(false)}
                className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (recoveryData.mobile.length !== 10) {
                    showAlert(
                      "Please enter a valid 10-digit mobile number.",
                      "ERROR",
                    );
                    return;
                  }
                  if (recoveryData.password.length < 6) {
                    showAlert(
                      "Password must be at least 6 characters.",
                      "ERROR",
                    );
                    return;
                  }
                  handleUserUpdate({
                    ...user,
                    mobile: recoveryData.mobile,
                    password: recoveryData.password,
                  });
                  setShowRecoveryModal(false);
                  showAlert("Recovery details saved successfully!", "SUCCESS");
                }}
                className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl shadow-lg hover:bg-orange-600"
              >
                Save Recovery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOMEWORK FULL PAGE (GK-style) */}
      {showHomeworkHistory && (() => {
        const SUBJECT_INFO: Record<string, { label: string; gradient: string; chipBg: string; chipText: string; ring: string; iconBg: string; iconText: string; }> = {
          mcq: { label: 'MCQ Practice', gradient: 'from-emerald-500 via-green-500 to-teal-500', chipBg: 'bg-emerald-100', chipText: 'text-emerald-700', ring: 'border-emerald-200', iconBg: 'bg-emerald-100', iconText: 'text-emerald-700' },
          sarSangrah: { label: 'Sar Sangrah', gradient: 'from-rose-500 via-pink-500 to-fuchsia-500', chipBg: 'bg-rose-100', chipText: 'text-rose-700', ring: 'border-rose-200', iconBg: 'bg-rose-100', iconText: 'text-rose-700' },
          speedySocialScience: { label: 'Speedy Social Science', gradient: 'from-orange-500 via-amber-500 to-yellow-500', chipBg: 'bg-orange-100', chipText: 'text-orange-700', ring: 'border-orange-200', iconBg: 'bg-orange-100', iconText: 'text-orange-700' },
          speedyScience: { label: 'Speedy Science', gradient: 'from-blue-500 via-sky-500 to-cyan-500', chipBg: 'bg-blue-100', chipText: 'text-blue-700', ring: 'border-blue-200', iconBg: 'bg-blue-100', iconText: 'text-blue-700' },
          other: { label: 'Other', gradient: 'from-slate-500 via-zinc-500 to-stone-500', chipBg: 'bg-slate-100', chipText: 'text-slate-700', ring: 'border-slate-200', iconBg: 'bg-slate-100', iconText: 'text-slate-700' },
        };
        const allHw = (settings?.homework || []).filter(hw => !isNaN(new Date(hw.date).getTime()));
        const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
        const todayKey = todayD.toISOString().split('T')[0];
        const todaysHw = allHw.filter(hw => {
          const d = new Date(hw.date); d.setHours(0, 0, 0, 0);
          return d.toISOString().split('T')[0] === todayKey;
        });
        const bySubject: Record<string, typeof allHw> = {};
        allHw.forEach(hw => {
          const sub = hw.targetSubject && SUBJECT_INFO[hw.targetSubject] ? hw.targetSubject : 'other';
          if (!bySubject[sub]) bySubject[sub] = [];
          bySubject[sub].push(hw);
        });
        const subjectKeys = Object.keys(bySubject).sort((a, b) => {
          const order = ['mcq', 'sarSangrah', 'speedySocialScience', 'speedyScience', 'other'];
          return order.indexOf(a) - order.indexOf(b);
        });

        const openSubject = (subId: string) => {
          setShowHomeworkHistory(false);
          setHomeworkSubjectView(subId);
          setSelectedSubject({ id: subId, name: SUBJECT_INFO[subId]?.label || subId, icon: 'Book', color: 'bg-slate-100' } as any);
          setContentViewStep('SUBJECTS');
          setLucentCategoryView(false);
          setHwYear(null);
          setHwMonth(null);
          setHwWeek(null);
          setHwActiveHwId(null);
          onTabChange('COURSES');
        };

        return (
          <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in fade-in pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
              <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => setShowHomeworkHistory(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-700 transition-colors"
                  aria-label="Back"
                >
                  <ChevronRight size={22} className="rotate-180" />
                </button>
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                  <GraduationCap size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-800">Homework</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Aaj ka homework
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
                {/* TODAY'S HOMEWORK BANNER */}
                {todaysHw.length > 0 && (
                  <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-indigo-100/60 rounded-full blur-2xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-black bg-white text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                          Aaj ka Homework
                        </span>
                        <span className="text-[11px] text-slate-600 font-semibold">
                          {todayD.toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      {/* Group today's homeworks by subject as chips so 4+ items don't stack tall */}
                      <div className="grid grid-cols-2 gap-2">
                        {(() => {
                          const todayBySub: Record<string, typeof todaysHw> = {};
                          todaysHw.forEach(hw => {
                            const sub = hw.targetSubject && SUBJECT_INFO[hw.targetSubject] ? hw.targetSubject : 'other';
                            if (!todayBySub[sub]) todayBySub[sub] = [];
                            todayBySub[sub].push(hw);
                          });
                          return Object.entries(todayBySub).map(([sub, hws]) => (
                            <button
                              key={sub}
                              onClick={() => openSubject(sub)}
                              className="bg-white hover:bg-slate-50 rounded-xl p-3 border border-slate-200 text-left active:scale-95 transition-all shadow-sm"
                            >
                              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">
                                {SUBJECT_INFO[sub]?.label || sub}
                              </p>
                              <p className="text-sm font-bold text-slate-800 truncate">{hws[0].title}</p>
                              {hws.length > 1 && (
                                <p className="text-[10px] text-slate-500 mt-0.5">+{hws.length - 1} more</p>
                              )}
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {hws.some(h => h.notes) && (
                                  <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">NOTES</span>
                                )}
                                {hws.some(h => (h.parsedMcqs?.length || 0) > 0) && (
                                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">MCQ</span>
                                )}
                                {hws.some(h => h.audioUrl) && (
                                  <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">AUDIO</span>
                                )}
                                {hws.some(h => h.videoUrl) && (
                                  <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">VIDEO</span>
                                )}
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* EMPTY STATE */}
                {todaysHw.length === 0 && (
                  <div className="text-center py-10 text-slate-500">
                    <GraduationCap size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="font-bold text-sm">Aaj koi homework nahi hai</p>
                    <p className="text-xs mt-1">Admin ke add karne ka intezaar karein</p>
                  </div>
                )}

                {/* SUBJECT-WISE HISTORY */}
                {subjectKeys.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">
                      Subject-wise History
                    </h4>
                    {subjectKeys.map((subId) => {
                      const info = SUBJECT_INFO[subId] || SUBJECT_INFO.other;
                      const subHw = bySubject[subId] || [];
                      if (subHw.length === 0) return null;
                      const sortedHw = [...subHw].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                      const latest = sortedHw[0];
                      const totalMcqs = subHw.reduce((s, h) => s + (h.parsedMcqs?.length || 0), 0);
                      return (
                        <button
                          key={subId}
                          onClick={() => openSubject(subId)}
                          className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md active:scale-[0.99] transition-all text-left"
                        >
                          <div className={`h-1.5 w-full bg-gradient-to-r ${info.gradient}`} />
                          <div className="p-4 flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl ${info.iconBg} ${info.iconText} flex items-center justify-center shrink-0`}>
                              {subId === 'mcq' ? <CheckSquare size={20} /> : subId === 'sarSangrah' ? <BookOpen size={20} /> : subId === 'speedySocialScience' ? <Globe size={20} /> : subId === 'speedyScience' ? <BookOpenText size={20} /> : <BookOpen size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-slate-800 text-sm">{info.label}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                Latest: {latest.title}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold ${info.chipBg} ${info.chipText} px-2 py-0.5 rounded-full`}>
                                  {subHw.length} {subHw.length === 1 ? 'note' : 'notes'}
                                </span>
                                {totalMcqs > 0 && (
                                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                    {totalMcqs} MCQs
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-slate-400">
                                  • {new Date(latest.date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                            </div>
                            <ChevronRight size={20} className="text-slate-400 shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* CREATE / PRACTICE MCQ CARD */}
                <div className="pt-1">
                  <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 mb-3">
                    Khud banao
                  </h4>
                  <button
                    onClick={() => { setShowHomeworkHistory(false); setShowCompMcqHub(true); setCompMcqTab('CREATE'); }}
                    className="w-full bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden hover:shadow-md active:scale-[0.99] transition-all text-left"
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckSquare size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 text-sm">MCQ Banao / Practice Karo</p>
                        <p className="text-[11px] text-slate-500 font-medium">Apna khud ka MCQ set banao aur practice karo</p>
                      </div>
                      <ChevronRight size={20} className="text-emerald-500 shrink-0" />
                    </div>
                  </button>
                </div>

                {/* HOMEWORK MCQ HISTORY (separate from regular MCQ) */}
                {(() => {
                  const hwMcqHistory = (user.mcqHistory || []).filter(h => h.subjectId === 'homework' || (h.chapterId || '').startsWith('homework_'));
                  if (hwMcqHistory.length === 0) return null;
                  return (
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                        <CheckSquare size={12} /> Homework MCQ History
                      </h4>
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {hwMcqHistory.slice(0, 8).map((h) => (
                          <div key={h.id} className="p-3 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${h.score >= 80 ? 'bg-emerald-100 text-emerald-700' : h.score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                              {h.score}%
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{h.chapterTitle}</p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {h.correctCount}/{h.totalQuestions} correct • {new Date(h.date).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* COMPETITION CUSTOM MCQ HUB (Practice + Create) */}
      {showCompMcqHub && (() => {
        const adminMcqs = (settings?.competitionMcqs || []).map((m, i) => ({ ...m, _src: 'admin' as const, _key: `a_${i}` }));
        const userMcqs = (user.customMcqs || []).map((m, i) => ({ ...m, _src: 'user' as const, _key: `u_${i}` }));
        const allMcqs = [...adminMcqs, ...userMcqs];
        const safeIdx = Math.min(compMcqIndex, Math.max(0, allMcqs.length - 1));
        const current = allMcqs[safeIdx];

        const closeHub = () => {
          setShowCompMcqHub(false);
          setCompMcqSelected(null);
          setCompMcqIndex(0);
        };

        const saveDraft = () => {
          if (!compMcqDraft.question.trim()) {
            showAlert('Question khaali nahi ho sakta.', 'ERROR');
            return;
          }
          const filledOpts = compMcqDraft.options.map(o => o.trim());
          if (filledOpts.some(o => !o)) {
            showAlert('Saare 4 options bharein.', 'ERROR');
            return;
          }
          const newMcq: any = {
            question: compMcqDraft.question.trim(),
            options: filledOpts,
            correctAnswer: compMcqDraft.correctAnswer,
            explanation: '',
          };
          handleUserUpdate({ ...user, customMcqs: [...(user.customMcqs || []), newMcq] });
          setCompMcqDraft({ question: '', options: ['', '', '', ''], correctAnswer: 0 });
          setCompMcqTab('PRACTICE');
          setCompMcqIndex((user.customMcqs?.length || 0) + adminMcqs.length);
          setCompMcqSelected(null);
        };

        const deleteUserMcq = (userMcqIndex: number) => {
          const updated = (user.customMcqs || []).filter((_, i) => i !== userMcqIndex);
          handleUserUpdate({ ...user, customMcqs: updated });
          setCompMcqSelected(null);
          setCompMcqIndex(prev => Math.max(0, prev - 1));
        };

        return (
          <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in fade-in pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
              <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                <button
                  onClick={closeHub}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-700"
                  aria-label="Back"
                >
                  <ChevronRight size={22} className="rotate-180" />
                </button>
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shadow-sm shrink-0">
                  <CheckSquare size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-800">Practice MCQ Maker</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Competition ke liye apna MCQ banaye + practice karein</p>
                </div>
              </div>
              {/* Tabs */}
              <div className="max-w-2xl mx-auto px-4 pb-3">
                <div className="flex bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => { setCompMcqTab('PRACTICE'); setCompMcqSelected(null); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${compMcqTab === 'PRACTICE' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}
                  >
                    Practice ({allMcqs.length})
                  </button>
                  <button
                    onClick={() => setCompMcqTab('CREATE')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${compMcqTab === 'CREATE' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}
                  >
                    + Create New
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-4">
                {/* PRACTICE TAB */}
                {compMcqTab === 'PRACTICE' && (
                  <>
                    {allMcqs.length === 0 ? (
                      <div className="text-center py-16 text-slate-400">
                        <CheckSquare size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-slate-500">Abhi koi MCQ nahi hai</p>
                        <p className="text-sm text-slate-400 mt-1 mb-4">"+ Create New" tab se apna pehla MCQ banayein</p>
                        <button
                          onClick={() => setCompMcqTab('CREATE')}
                          className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform"
                        >
                          Create First MCQ
                        </button>
                      </div>
                    ) : current ? (
                      <div className="space-y-4">
                        {/* Progress */}
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          <span>Question {safeIdx + 1} / {allMcqs.length}</span>
                          <span className={`px-2 py-0.5 rounded-full ${current._src === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {current._src === 'admin' ? 'Official' : 'My MCQ'}
                          </span>
                        </div>

                        {/* Question Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                          <p className="text-base font-bold text-slate-800 leading-relaxed mb-5 whitespace-pre-wrap">{current.question}</p>
                          <div className="space-y-2.5">
                            {current.options.map((opt, oi) => {
                              const isSelected = compMcqSelected === oi;
                              const isCorrect = oi === current.correctAnswer;
                              const showResult = compMcqSelected !== null;
                              let cls = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
                              if (showResult) {
                                if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 text-emerald-800';
                                else if (isSelected) cls = 'border-rose-400 bg-rose-50 text-rose-800';
                                else cls = 'border-slate-200 bg-slate-50 text-slate-500';
                              }
                              return (
                                <button
                                  key={oi}
                                  disabled={showResult}
                                  onClick={() => setCompMcqSelected(oi)}
                                  className={`w-full text-left p-3.5 rounded-xl border-2 font-semibold text-sm transition-colors flex items-start gap-3 ${cls}`}
                                >
                                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                    showResult && isCorrect ? 'bg-emerald-500 text-white' :
                                    showResult && isSelected ? 'bg-rose-500 text-white' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {String.fromCharCode(65 + oi)}
                                  </span>
                                  <span className="flex-1 whitespace-pre-wrap">{opt}</span>
                                  {showResult && isCorrect && <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />}
                                </button>
                              );
                            })}
                          </div>

                          {/* Feedback */}
                          {compMcqSelected !== null && (
                            <div className={`mt-4 p-3 rounded-xl text-sm font-bold ${
                              compMcqSelected === current.correctAnswer
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {compMcqSelected === current.correctAnswer
                                ? '✅ Sahi answer!'
                                : `❌ Galat. Sahi answer: Option ${String.fromCharCode(65 + current.correctAnswer)}`}
                            </div>
                          )}
                        </div>

                        {/* Nav */}
                        <div className="flex items-center justify-between gap-3">
                          <button
                            onClick={() => { setCompMcqIndex(Math.max(0, safeIdx - 1)); setCompMcqSelected(null); }}
                            disabled={safeIdx === 0}
                            className="flex-1 py-3 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-700 disabled:opacity-40 active:scale-95 transition-transform"
                          >
                            ← Previous
                          </button>
                          {current._src === 'user' && (
                            <button
                              onClick={() => {
                                const userIdx = safeIdx - adminMcqs.length;
                                if (userIdx >= 0 && confirm('Yeh MCQ delete karein?')) deleteUserMcq(userIdx);
                              }}
                              className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 font-bold text-sm text-rose-700 active:scale-95 transition-transform"
                              aria-label="Delete"
                            >
                              🗑
                            </button>
                          )}
                          <button
                            onClick={() => { setCompMcqIndex(Math.min(allMcqs.length - 1, safeIdx + 1)); setCompMcqSelected(null); }}
                            disabled={safeIdx >= allMcqs.length - 1}
                            className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                {/* CREATE TAB */}
                {compMcqTab === 'CREATE' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-800 font-medium">
                      📝 Apna question + 4 options bhare. Sahi option select karein. Save ke baad Practice tab me dikhega.
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Question</label>
                        <textarea
                          value={compMcqDraft.question}
                          onChange={e => setCompMcqDraft({ ...compMcqDraft, question: e.target.value })}
                          placeholder="Apna question yahan likhein..."
                          className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-500 h-24 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Options (Sahi option ka radio select karein)</label>
                        <div className="space-y-2">
                          {compMcqDraft.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setCompMcqDraft({ ...compMcqDraft, correctAnswer: oi })}
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 border-2 transition-colors ${
                                  compMcqDraft.correctAnswer === oi
                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                    : 'bg-white text-slate-500 border-slate-300'
                                }`}
                                aria-label={`Mark option ${String.fromCharCode(65 + oi)} as correct`}
                              >
                                {String.fromCharCode(65 + oi)}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const newOpts = [...compMcqDraft.options];
                                  newOpts[oi] = e.target.value;
                                  setCompMcqDraft({ ...compMcqDraft, options: newOpts });
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-orange-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={saveDraft}
                        className="w-full py-3 bg-orange-600 text-white rounded-xl font-black text-sm shadow-md active:scale-95 transition-transform"
                      >
                        💾 Save MCQ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* HOMEWORK HISTORY MODAL (legacy - hidden, kept for reference) */}
      {false && showHomeworkHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-sm">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Homework History
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Grouped by Month & Year
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHomeworkHistory(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
              {settings?.homework && settings.homework.length > 0 ? (
                (() => {
                  const grouped = settings.homework.reduce(
                    (acc, hw) => {
                      const d = new Date(hw.date);
                      if (isNaN(d.getTime())) return acc;
                      const monthYear = d.toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                      });
                      if (!acc[monthYear]) acc[monthYear] = [];
                      acc[monthYear].push(hw);
                      return acc;
                    },
                    {} as Record<string, typeof settings.homework>,
                  );
                  return Object.entries(grouped).map(([monthYear, hws]) => (
                    <div key={monthYear} className="space-y-3">
                      <div className="sticky top-0 bg-white/90 backdrop-blur-sm py-2 z-10 border-b border-slate-100">
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">
                          {monthYear}
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {[...hws].reverse().map((hw, i) => (
                          <div
                            key={hw.id || i}
                            className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-100 px-2 py-1 rounded uppercase tracking-widest">
                                {new Date(hw.date).toLocaleDateString(
                                  "default",
                                  { weekday: "short", day: "numeric" },
                                )}
                              </span>
                            </div>
                            <p className="font-bold text-slate-800 text-sm mb-2">
                              {hw.title}
                            </p>

                            {/* NEW HOMEWORK ASSETS UI */}
                            <div className="flex flex-col gap-2 mb-3">
                              {hw.notes && (
                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-start gap-3">
                                  <BookOpen
                                    className="text-blue-600 shrink-0 mt-0.5"
                                    size={16}
                                  />
                                  <div className="w-full">
                                    <p className="text-xs font-bold text-blue-800 mb-1">
                                      Main Notes
                                    </p>
                                    <div className="flex flex-col gap-4">
                                      {(hw.notes || "")
                                        .split(/(?=SET\s*-\s*\d+)/i)
                                        .filter((c) => c.trim().length > 0)
                                        .map((chunk, chunkIdx) => (
                                          <div key={chunkIdx} className="relative">
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                              <p className="whitespace-pre-wrap text-sm text-slate-700 flex-1">
                                                {chunk.trim()}
                                              </p>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const ttsId = `hw_notes_${hw.id}_${chunkIdx}`;
                                                  if (speakingId === ttsId) {
                                                    stopSpeech();
                                                    setSpeakingId(null);
                                                  } else {
                                                    speakText(
                                                      chunk,
                                                      null,
                                                      1.0,
                                                      "hi-IN",
                                                      () => setSpeakingId(ttsId),
                                                      () => setSpeakingId(null),
                                                    );
                                                  }
                                                }}
                                                title={`Play part ${chunkIdx + 1}`}
                                                className={`p-2 rounded-full shrink-0 transition-colors ${speakingId === `hw_notes_${hw.id}_${chunkIdx}` ? "bg-red-100 text-red-600" : "bg-blue-100/50 text-blue-600 hover:bg-blue-200"}`}
                                              >
                                                {speakingId === `hw_notes_${hw.id}_${chunkIdx}` ? (
                                                  <Square
                                                    size={14}
                                                    className="fill-current"
                                                  />
                                                ) : (
                                                  <Volume2 size={14} />
                                                )}
                                              </button>
                                            </div>
                                            {/* Add a subtle separator between chunks except for the last one */}
                                            {chunkIdx < ((hw.notes || "").split(/(?=SET\s*-\s*\d+)/i).filter((c) => c.trim().length > 0).length - 1) && (
                                              <hr className="border-blue-200 mt-2" />
                                            )}
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {hw.videoUrl && (
                                <a
                                  href={hw.videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-3 hover:bg-rose-100 transition-colors"
                                >
                                  <Youtube
                                    className="text-rose-600 shrink-0"
                                    size={16}
                                  />
                                  <span className="text-sm font-bold text-rose-800">
                                    Watch Video
                                  </span>
                                </a>
                              )}
                              {hw.audioUrl && (
                                <a
                                  href={hw.audioUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex items-center gap-3 hover:bg-purple-100 transition-colors"
                                >
                                  <Headphones
                                    className="text-purple-600 shrink-0"
                                    size={16}
                                  />
                                  <span className="text-sm font-bold text-purple-800">
                                    Play Audio
                                  </span>
                                </a>
                              )}
                            </div>

                            {hw.parsedMcqs && hw.parsedMcqs.length > 0 && (
                              <div className="bg-white p-3 rounded-lg border border-slate-100 mb-2">
                                <p className="text-xs text-indigo-600 font-bold mb-2">
                                  Includes {hw.parsedMcqs.length} MCQ(s):
                                </p>
                                <div className="space-y-4">
                                  {hw.parsedMcqs.map((mcq, idx) => {
                                    const mcqKey = `hw_${hw.id}_${idx}`;
                                    const selectedOpt = hwAnswers[mcqKey];
                                    const hasAnswered =
                                      selectedOpt !== undefined;

                                    return (
                                      <div
                                        key={idx}
                                        className="border-b border-slate-100 pb-4 last:border-0 mb-4 last:mb-0"
                                      >
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                          <p className="text-sm font-bold text-slate-800">
                                            {idx + 1}.{" "}
                                            <span
                                              dangerouslySetInnerHTML={{
                                                __html: mcq.question,
                                              }}
                                            />
                                          </p>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const ttsId = `hw_mcq_${hw.id}_${idx}`;
                                              if (speakingId === ttsId) {
                                                stopSpeech();
                                                setSpeakingId(null);
                                              } else {
                                                const textToSpeak = `${mcq.question} ${mcq.statements?.join(" ") || ""} ${mcq.options.map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}`).join(". ")}`;
                                                speakText(
                                                  textToSpeak,
                                                  null,
                                                  1.0,
                                                  "hi-IN",
                                                  () => setSpeakingId(ttsId),
                                                  () => setSpeakingId(null),
                                                );
                                              }
                                            }}
                                            className={`p-1.5 rounded-full transition-colors shrink-0 ${speakingId === `hw_mcq_${hw.id}_${idx}` ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600"}`}
                                          >
                                            {speakingId ===
                                            `hw_mcq_${hw.id}_${idx}` ? (
                                              <Square
                                                size={14}
                                                className="fill-current"
                                              />
                                            ) : (
                                              <Volume2 size={14} />
                                            )}
                                          </button>
                                        </div>
                                        {mcq.statements &&
                                          mcq.statements.length > 0 && (
                                            <div className="mb-4 space-y-2 pl-4 border-l-2 border-slate-200">
                                              {mcq.statements.map(
                                                (stmt, sIdx) => (
                                                  <p
                                                    key={sIdx}
                                                    className="text-sm text-slate-600"
                                                  >
                                                    <span
                                                      dangerouslySetInnerHTML={{
                                                        __html: stmt,
                                                      }}
                                                    />
                                                  </p>
                                                ),
                                              )}
                                            </div>
                                          )}
                                        <div className="space-y-2">
                                          {mcq.options.map((opt, oIdx) => {
                                            const isThisCorrect =
                                              oIdx === mcq.correctAnswer;
                                            const isThisSelected =
                                              oIdx === selectedOpt;

                                            let optClass =
                                              "bg-slate-50 border-slate-200 text-slate-700 cursor-pointer hover:bg-slate-100";

                                            if (hasAnswered) {
                                              optClass =
                                                "bg-slate-50 border-slate-200 text-slate-500 opacity-60 cursor-default"; // Default answered state

                                              if (
                                                isThisCorrect &&
                                                isThisSelected
                                              ) {
                                                optClass =
                                                  "bg-green-100 border-green-500 text-green-900 cursor-default shadow-sm";
                                              } else if (
                                                isThisCorrect &&
                                                !isThisSelected
                                              ) {
                                                optClass =
                                                  "bg-green-50 border-green-300 text-green-800 cursor-default";
                                              } else if (
                                                isThisSelected &&
                                                !isThisCorrect
                                              ) {
                                                optClass =
                                                  "bg-red-50 border-red-300 text-red-900 cursor-default";
                                              }
                                            }

                                            return (
                                              <div
                                                key={oIdx}
                                                onClick={() => {
                                                  if (!hasAnswered) {
                                                    setHwAnswers((prev) => ({
                                                      ...prev,
                                                      [mcqKey]: oIdx,
                                                    }));
                                                  }
                                                }}
                                                className={`p-4 rounded-xl text-sm font-medium border transition-all ${optClass}`}
                                              >
                                                <div className="flex items-start gap-3">
                                                  <span className="mt-0.5">
                                                    {String.fromCharCode(
                                                      65 + oIdx,
                                                    )}
                                                    .
                                                  </span>
                                                  <div className="flex-1">
                                                    <span
                                                      dangerouslySetInnerHTML={{
                                                        __html: opt,
                                                      }}
                                                    />
                                                    {hasAnswered &&
                                                      isThisCorrect &&
                                                      isThisSelected && (
                                                        <p className="text-xs text-green-700 font-bold mt-1 flex items-center gap-1">
                                                          <Check size={14} />{" "}
                                                          That's right!
                                                        </p>
                                                      )}
                                                    {hasAnswered &&
                                                      isThisSelected &&
                                                      !isThisCorrect && (
                                                        <p className="text-xs text-red-700 font-bold mt-1 flex items-center gap-1">
                                                          <X size={14} /> Not
                                                          quite
                                                        </p>
                                                      )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        {hasAnswered && mcq.explanation && (
                                          <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
                                            <p className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-2">
                                              <BookOpen
                                                size={14}
                                                className="text-indigo-600"
                                              />{" "}
                                              Explanation
                                            </p>
                                            <p className="text-sm text-slate-600">
                                              <span
                                                dangerouslySetInnerHTML={{
                                                  __html: mcq.explanation,
                                                }}
                                              />
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No homework history found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DAILY GK FULL PAGE */}
      {showDailyGkHistory && (() => {
        const allGks = (settings?.dailyGk || []).filter((gk) => {
          const d = new Date(gk.date);
          return !isNaN(d.getTime());
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayKey = today.toISOString().split("T")[0];

        const todaysGks = allGks.filter((gk) => {
          const d = new Date(gk.date);
          d.setHours(0, 0, 0, 0);
          return d.toISOString().split("T")[0] === todayKey;
        });

        // Monday-based week start
        const getWeekStart = (date: Date) => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          d.setDate(diff);
          return d;
        };

        // Build hierarchy: year -> monthKey -> weekKey -> gks[]
        type GkItem = (typeof allGks)[number];
        const tree: Record<
          string,
          Record<string, Record<string, GkItem[]>>
        > = {};
        allGks.forEach((gk) => {
          const d = new Date(gk.date);
          const year = String(d.getFullYear());
          const monthKey = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const ws = getWeekStart(d);
          const weekKey = ws.toISOString().split("T")[0];
          if (!tree[year]) tree[year] = {};
          if (!tree[year][monthKey]) tree[year][monthKey] = {};
          if (!tree[year][monthKey][weekKey])
            tree[year][monthKey][weekKey] = [];
          tree[year][monthKey][weekKey].push(gk);
        });

        const years = Object.keys(tree).sort((a, b) => b.localeCompare(a));

        const renderGkCard = (gk: GkItem, idx: number) => (
          <div
            key={gk.id || idx}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black text-teal-600 bg-teal-100 px-2 py-1 rounded uppercase tracking-widest">
                {new Date(gk.date).toLocaleDateString("default", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const ttsId = `gk_${gk.id || idx}`;
                  if (speakingId === ttsId) {
                    stopSpeech();
                    setSpeakingId(null);
                  } else {
                    const textToSpeak = `Question: ${gk.question}. Answer: ${gk.answer}`;
                    speakText(
                      textToSpeak,
                      null,
                      1.0,
                      "hi-IN",
                      () => setSpeakingId(ttsId),
                      () => setSpeakingId(null),
                    );
                  }
                }}
                className={`p-1.5 rounded-full transition-colors shrink-0 ${speakingId === `gk_${gk.id || idx}` ? "bg-red-100 text-red-600" : "bg-teal-100/50 text-teal-600 hover:bg-teal-200"}`}
              >
                {speakingId === `gk_${gk.id || idx}` ? (
                  <Square size={14} className="fill-current" />
                ) : (
                  <Volume2 size={14} />
                )}
              </button>
            </div>
            <p className="font-bold text-slate-800 text-sm mb-2">
              {gk.question}
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-sm text-slate-700">
                <strong>Ans:</strong> {gk.answer}
              </p>
            </div>
          </div>
        );

        return (
          <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in fade-in pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
              <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => { setShowDailyGkHistory(false); stopSpeech(); setSpeakingId(null); }}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-700 transition-colors"
                  aria-label="Back"
                >
                  <ChevronRight size={22} className="rotate-180" />
                </button>
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 shadow-sm shrink-0">
                  <BookOpen size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-800">
                    Daily GK
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Today's GK + full history
                  </p>
                </div>
                {/* Read All GK button */}
                <button
                  onClick={() => {
                    const gksToRead = allGks.length > 0 ? allGks : [];
                    if (speakingId === 'gk_readall') {
                      stopSpeech();
                      setSpeakingId(null);
                    } else if (gksToRead.length > 0) {
                      const fullText = gksToRead.map((gk, i) => `Question ${i + 1}: ${gk.question}. Answer: ${gk.answer}`).join('. ');
                      speakText(fullText, null, 1.0, 'hi-IN', () => setSpeakingId('gk_readall'), () => setSpeakingId(null));
                    }
                  }}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition ${speakingId === 'gk_readall' ? 'bg-red-600 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                >
                  {speakingId === 'gk_readall' ? <><Square size={13} /> Stop</> : <><Volume2 size={13} /> Read All</>}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
                {/* TODAY'S GK BANNER (only if today has GK) */}
                {todaysGks.length > 0 && (
                  <div className="rounded-2xl p-4 bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-100/60 rounded-full blur-2xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-black bg-white text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          Today
                        </span>
                        <span className="text-[11px] text-slate-600 font-semibold">
                          {today.toLocaleDateString("default", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {todaysGks.map((gk, i) => (
                          <div
                            key={gk.id || `today-${i}`}
                            className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm"
                          >
                            <p className="font-bold text-slate-800 text-sm mb-2">
                              {gk.question}
                            </p>
                            <p className="text-sm text-slate-700">
                              <strong className="text-emerald-700">Ans:</strong> {gk.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* HIERARCHICAL HISTORY: YEAR -> MONTH -> WEEK -> DAYS */}
                {years.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">
                      Full History
                    </h4>

                    {years.map((year) => {
                      const yearOpen = gkExpandedYear === year;
                      const months = Object.keys(tree[year]).sort((a, b) =>
                        b.localeCompare(a),
                      );
                      return (
                        <div
                          key={year}
                          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                        >
                          <button
                            onClick={() => {
                              setGkExpandedYear(yearOpen ? null : year);
                              setGkExpandedMonth(null);
                              setGkExpandedWeek(null);
                            }}
                            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-black text-xs">
                                {year.slice(-2)}
                              </div>
                              <div className="text-left">
                                <p className="font-black text-slate-800 text-base">
                                  {year}
                                </p>
                                <p className="text-[11px] text-slate-500 font-medium">
                                  {months.length} month
                                  {months.length === 1 ? "" : "s"}
                                </p>
                              </div>
                            </div>
                            <ChevronRight
                              size={18}
                              className={`text-slate-400 transition-transform ${yearOpen ? "rotate-90" : ""}`}
                            />
                          </button>

                          {yearOpen && (
                            <div className="border-t border-slate-100 bg-slate-50/60 p-3 space-y-2">
                              {months.map((monthKey) => {
                                const monthOpen = gkExpandedMonth === monthKey;
                                const monthName = new Date(
                                  `${monthKey}-01`,
                                ).toLocaleDateString("default", {
                                  month: "long",
                                });
                                const weekKeys = Object.keys(
                                  tree[year][monthKey],
                                ).sort((a, b) => a.localeCompare(b));
                                return (
                                  <div
                                    key={monthKey}
                                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                                  >
                                    <button
                                      onClick={() => {
                                        setGkExpandedMonth(
                                          monthOpen ? null : monthKey,
                                        );
                                        setGkExpandedWeek(null);
                                      }}
                                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Calendar
                                          size={14}
                                          className="text-teal-600"
                                        />
                                        <span className="font-bold text-slate-800 text-sm">
                                          {monthName}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                          {weekKeys.length} week
                                          {weekKeys.length === 1 ? "" : "s"}
                                        </span>
                                      </div>
                                      <ChevronRight
                                        size={16}
                                        className={`text-slate-400 transition-transform ${monthOpen ? "rotate-90" : ""}`}
                                      />
                                    </button>

                                    {monthOpen && (
                                      <div className="border-t border-slate-100 p-3 space-y-2">
                                        {weekKeys.map((weekKey, wIdx) => {
                                          const weekOpen =
                                            gkExpandedWeek === weekKey;
                                          const weekStart = new Date(weekKey);
                                          const weekEnd = new Date(
                                            weekStart.getTime() +
                                              6 * 86400000,
                                          );
                                          const weekRange = `${weekStart.toLocaleDateString("default", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("default", { day: "numeric", month: "short" })}`;
                                          const weekGks = [
                                            ...tree[year][monthKey][weekKey],
                                          ].sort(
                                            (a, b) =>
                                              new Date(a.date).getTime() -
                                              new Date(b.date).getTime(),
                                          );
                                          return (
                                            <div
                                              key={weekKey}
                                              className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"
                                            >
                                              <button
                                                onClick={() =>
                                                  setGkExpandedWeek(
                                                    weekOpen ? null : weekKey,
                                                  )
                                                }
                                                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-white transition-colors"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-black text-white bg-teal-600 px-2 py-1 rounded">
                                                    Week {wIdx + 1}
                                                  </span>
                                                  <span className="text-xs font-semibold text-slate-700">
                                                    {weekRange}
                                                  </span>
                                                  <span className="text-[10px] font-bold text-slate-500">
                                                    • {weekGks.length} day
                                                    {weekGks.length === 1
                                                      ? ""
                                                      : "s"}
                                                  </span>
                                                </div>
                                                <ChevronRight
                                                  size={14}
                                                  className={`text-slate-400 transition-transform ${weekOpen ? "rotate-90" : ""}`}
                                                />
                                              </button>

                                              {weekOpen && (
                                                <div className="bg-white border-t border-slate-200 p-3 space-y-3">
                                                  {weekGks.map((gk, i) =>
                                                    renderGkCard(gk, i),
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : todaysGks.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-bold">No GK available yet.</p>
                    <p className="text-xs mt-1">Check back tomorrow!</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}

      {/* REQUEST CONTENT MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-pink-600">
              <Megaphone size={24} />
              <h3 className="text-lg font-black text-slate-800">
                Request Content
              </h3>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">
                  Subject
                </label>
                <input
                  type="text"
                  value={requestData.subject}
                  onChange={(e) =>
                    setRequestData({ ...requestData, subject: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g. Mathematics"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">
                  Topic / Chapter
                </label>
                <input
                  type="text"
                  value={requestData.topic}
                  onChange={(e) =>
                    setRequestData({ ...requestData, topic: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g. Trigonometry"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">
                  Type
                </label>
                <select
                  value={requestData.type}
                  onChange={(e) =>
                    setRequestData({ ...requestData, type: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="PDF">PDF Notes</option>
                  <option value="VIDEO">Video Lecture</option>
                  <option value="MCQ">MCQ Test</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowRequestModal(false)}
                variant="ghost"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!requestData.subject || !requestData.topic) {
                    showAlert("Please fill all fields", "ERROR");
                    return;
                  }
                  const request = {
                    id: `req-${Date.now()}`,
                    userId: user.id,
                    userName: user.name,
                    details: `${activeSessionClass || user.classLevel || "10"} ${activeSessionBoard || user.board || "CBSE"} - ${requestData.subject} - ${requestData.topic} - ${requestData.type}`,
                    timestamp: new Date().toISOString(),
                  };
                  // Save to Firebase for Admin Visibility
                  saveDemandRequest(request)
                    .then(() => {
                      setShowRequestModal(false);
                      showAlert(
                        "✅ Request Sent! Admin will check it.",
                        "SUCCESS",
                      );
                      // Also save locally just in case
                      const existing = JSON.parse(
                        localStorage.getItem("nst_demand_requests") || "[]",
                      );
                      existing.push(request);
                      localStorage.setItem(
                        "nst_demand_requests",
                        JSON.stringify(existing),
                      );
                    })
                    .catch(() => showAlert("Failed to send request.", "ERROR"));
                }}
                className="flex-1 bg-pink-600 hover:bg-pink-700 shadow-lg"
              >
                Send Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* NAME CHANGE MODAL */}
      {showNameChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-slate-800">
              Change Display Name
            </h3>
            <input
              type="text"
              value={newNameInput}
              onChange={(e) => setNewNameInput(e.target.value)}
              className="w-full p-3 border rounded-xl mb-2"
              placeholder="Enter new name"
            />
            <p className="text-xs text-slate-600 mb-4">
              Cost:{" "}
              <span className="font-bold text-orange-600">
                {settings?.nameChangeCost || 10} Coins
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowNameChangeModal(false)}
                variant="ghost"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const cost = settings?.nameChangeCost || 10;
                  if (newNameInput && newNameInput !== user.name) {
                    if (user.credits < cost) {
                      showAlert(`Insufficient Coins! Need ${cost}.`, "ERROR");
                      return;
                    }
                    const u = {
                      ...user,
                      name: newNameInput,
                      credits: user.credits - cost,
                    };
                    handleUserUpdate(u);
                    setShowNameChangeModal(false);
                    showAlert("Name Updated Successfully!", "SUCCESS");
                  }
                }}
                className="flex-1"
              >
                Pay & Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div
        className={`relative ${
          activeTab === "REVISION" || activeTab === "AI_HUB"
            ? ""
            : activeTab === "HOME"
              ? "px-4 pt-0 pb-20"
              : "p-4 pb-20"
        }`}
      >
        {renderMainContent()}
      </div>

      {/* MINI PLAYER */}
      <MiniPlayer
        track={currentAudioTrack}
        onClose={() => setCurrentAudioTrack(null)}
      />

      {/* FIXED BOTTOM NAVIGATION */}
      <nav
        className={`fixed bottom-0 left-0 right-0 w-full mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/70 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] z-[300] pb-safe ${mcqAppOpen || activeExternalApp || showAllNotesCatalog || viewingUserHistory || homeworkPlayerHwId || isDocFullscreen ? "hidden" : ""}`}
        aria-label="Primary"
      >
        <div className="flex justify-around items-stretch h-[64px] max-w-3xl mx-auto px-1">
          {(() => {
            const tabs: Array<{
              id: "HOME" | "HOMEWORK" | "GK" | "VIDEO" | "MCQ" | "PROFILE" | "APP_STORE";
              label: string;
              Icon: any;
              featureId?: string;
              filledOnActive?: boolean;
              isActive: boolean;
              onClick: () => void;
            }> = [
              {
                id: "HOME",
                label: "Home",
                Icon: Home,
                featureId: "NAV_HOME",
                filledOnActive: true,
                isActive:
                  activeTab === "HOME" &&
                  !mcqAppOpen &&
                  !showDailyGkHistory &&
                  !showHomeworkHistory &&
                  !activeExternalApp,
                onClick: () => {
                  setMcqAppOpen(false);
                  setShowDailyGkHistory(false);
                  setShowHomeworkHistory(false);
                  setActiveExternalApp(null);
                  onTabChange("HOME");
                  setContentViewStep("SUBJECTS");
                },
              },
              ...(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const hasActiveHomework = (settings?.homework || []).some(
                  (hw) => {
                    const d = new Date(hw.date);
                    if (isNaN(d.getTime())) return false;
                    d.setHours(0, 0, 0, 0);
                    return d.getTime() >= today.getTime();
                  },
                );
                return hasActiveHomework
                  ? [
                      {
                        id: "HOMEWORK" as const,
                        label: "Homework",
                        Icon: GraduationCap,
                        isActive:
                          showHomeworkHistory &&
                          !mcqAppOpen &&
                          !showDailyGkHistory &&
                          !activeExternalApp,
                        onClick: () => {
                          setMcqAppOpen(false);
                          setShowDailyGkHistory(false);
                          setActiveExternalApp(null);
                          setShowHomeworkHistory(true);
                        },
                      },
                    ]
                  : [];
              })(),
              {
                id: "GK",
                label: "GK",
                Icon: Newspaper,
                isActive:
                  showDailyGkHistory &&
                  !mcqAppOpen &&
                  !activeExternalApp,
                onClick: () => {
                  setMcqAppOpen(false);
                  setActiveExternalApp(null);
                  setShowHomeworkHistory(false);
                  setGkExpandedYear(null);
                  setGkExpandedMonth(null);
                  setGkExpandedWeek(null);
                  setShowDailyGkHistory(true);
                },
              },
              {
                id: "VIDEO",
                label: "Video",
                Icon: Video,
                featureId: "VIDEO_ACCESS",
                isActive:
                  activeTab === "UNIVERSAL_VIDEO" &&
                  !mcqAppOpen &&
                  !showDailyGkHistory &&
                  !showHomeworkHistory &&
                  !activeExternalApp,
                onClick: () => {
                  setMcqAppOpen(false);
                  setShowDailyGkHistory(false);
                  setShowHomeworkHistory(false);
                  setActiveExternalApp(null);
                  onTabChange("UNIVERSAL_VIDEO");
                },
              },
              {
                id: "PROFILE",
                label: "Profile",
                Icon: UserIconOutline,
                featureId: "PROFILE_PAGE",
                filledOnActive: true,
                isActive:
                  activeTab === "PROFILE" &&
                  !mcqAppOpen &&
                  !showDailyGkHistory &&
                  !showHomeworkHistory &&
                  !activeExternalApp,
                onClick: () => {
                  setMcqAppOpen(false);
                  setShowDailyGkHistory(false);
                  setShowHomeworkHistory(false);
                  setActiveExternalApp(null);
                  onTabChange("PROFILE");
                },
              },
              ...(!settings?.appStorePageHidden
                ? [
                    {
                      id: "APP_STORE" as const,
                      label: "Apps",
                      Icon: ShoppingBag,
                      filledOnActive: true,
                      isActive:
                        (activeTab as string) === "APP_STORE" &&
                        !mcqAppOpen &&
                        !showDailyGkHistory &&
                        !showHomeworkHistory &&
                        !activeExternalApp,
                      onClick: () => {
                        setMcqAppOpen(false);
                        setShowDailyGkHistory(false);
                        setShowHomeworkHistory(false);
                        setActiveExternalApp(null);
                        onTabChange("APP_STORE" as any);
                      },
                    },
                  ]
                : []),
            ];

            return tabs.map((tab) => {
              const access = tab.featureId
                ? getFeatureAccess(tab.featureId)
                : { hasAccess: true, isHidden: false };
              if (access.isHidden) return null;
              const isLocked = !access.hasAccess;
              const { Icon } = tab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (isLocked) {
                      showAlert("🔒 Locked by Admin.", "ERROR");
                      return;
                    }
                    tab.onClick();
                  }}
                  aria-label={tab.label}
                  aria-current={tab.isActive ? "page" : undefined}
                  className={`group relative flex-1 flex flex-col items-center justify-center gap-1 pt-1.5 pb-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 rounded-xl transition-colors ${
                    isLocked ? "opacity-50" : ""
                  }`}
                >
                  {/* Top active accent bar */}
                  <span
                    className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full transition-all duration-300 ease-out ${
                      tab.isActive
                        ? "w-8 bg-gradient-to-r from-blue-500 to-indigo-600"
                        : "w-0 bg-transparent"
                    }`}
                  />

                  {/* Icon container with pill highlight on active */}
                  <span
                    className={`relative inline-flex items-center justify-center h-9 w-12 rounded-2xl transition-all duration-300 ease-out ${
                      tab.isActive
                        ? "bg-gradient-to-br from-blue-50 to-indigo-50 scale-105"
                        : "bg-transparent group-active:bg-slate-100 scale-100"
                    }`}
                  >
                    <Icon
                      size={22}
                      strokeWidth={tab.isActive ? 2.4 : 2}
                      className={`transition-colors duration-200 ${
                        tab.isActive ? "text-blue-600" : "text-slate-500"
                      }`}
                      fill={
                        tab.filledOnActive && tab.isActive && !isLocked
                          ? "currentColor"
                          : "none"
                      }
                    />
                    {isLocked && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full p-[2px] border border-white shadow-sm">
                        <Lock size={8} className="text-white" />
                      </span>
                    )}
                  </span>

                  <span
                    className={`text-[10.5px] leading-none tracking-wide transition-all duration-200 ${
                      tab.isActive
                        ? "text-blue-600 font-semibold"
                        : "text-slate-500 font-medium"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            });
          })()}
        </div>
      </nav>

      {/* SIDEBAR OVERLAY (INLINE) */}
      {showSidebar && (
        <div className="fixed inset-0 z-[100] flex animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowSidebar(false)}
          ></div>

          <div className="w-60 bg-white h-full shadow-2xl relative z-10 flex flex-col slide-in-from-left duration-300">
            <div className="p-6 bg-slate-900 text-white rounded-br-3xl relative overflow-hidden">
              <div className="flex flex-col relative z-10">
                <h2 className="text-3xl font-black italic mb-0.5">
                  {settings?.appName || "App"}
                </h2>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white z-20"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {renderSidebarMenuItems()}

              {/* EXTERNAL APPS */}
              {settings?.externalApps?.map((app) => (
                <Button
                  key={app.id}
                  onClick={() => {
                    handleExternalAppClick(app);
                    setShowSidebar(false);
                  }}
                  variant="ghost"
                  fullWidth
                  className="justify-start gap-4 p-4 hover:bg-slate-50"
                >
                  <div className="bg-cyan-100 text-cyan-600 p-2 rounded-lg">
                    {app.icon ? (
                      <img src={app.icon} alt="" className="w-5 h-5" />
                    ) : (
                      <Smartphone size={20} />
                    )}
                  </div>
                  <span className="flex-1 text-left">{app.name}</span>
                  {app.isLocked && <Lock size={14} className="text-red-500" />}
                </Button>
              ))}

              <Button
                onClick={() => {
                  onTabChange("CUSTOM_PAGE");
                  setShowSidebar(false);
                }}
                variant="ghost"
                fullWidth
                className="justify-start gap-4 p-4 hover:bg-slate-50 relative"
              >
                <div className="bg-teal-100 text-teal-600 p-2 rounded-lg">
                  <Zap size={20} />
                </div>
                What's New
                {hasNewUpdate && (
                  <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
                )}
              </Button>
            </div>

            <div className="p-4 border-t border-slate-100">
              <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                  {user.subscriptionLevel === "ULTRA" ? (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white">
                      👑
                    </div>
                  ) : (
                    (user.name || "S").charAt(0)
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-sm truncate text-slate-800">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-600 truncate">{user.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT AI ASSISTANT (Chat Check) */}
      <StudentAiAssistant
        user={user}
        settings={settings}
        isOpen={activeTab === "AI_CHAT"}
        onClose={() => onTabChange("HOME")}
      />

      {/* INBOX MODAL */}
      {showInbox && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowInbox(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full shadow-2xl flex flex-col h-[85vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Inbox</h3>
                  <p className="text-xs text-slate-500 font-bold">
                    {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInbox(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-6">
              {!user.inbox || user.inbox.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                    <Mail size={32} />
                  </div>
                  <p className="text-slate-500 font-bold">No messages yet.</p>
                </div>
              ) : (
                user.inbox.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`p-4 rounded-2xl border ${msg.read ? "bg-white border-slate-200 opacity-70" : "bg-indigo-50 border-indigo-200 shadow-sm"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {msg.type === "GIFT" ? (
                          <Gift size={16} className="text-pink-500" />
                        ) : (
                          <MessageSquare size={16} className="text-blue-500" />
                        )}
                        <span className="text-xs font-bold text-slate-500">
                          {new Date(msg.date).toLocaleDateString()}
                        </span>
                      </div>
                      {!msg.read && (
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed mb-3">
                      {msg.text}
                    </p>

                    {msg.type === "GIFT" && msg.gift && !msg.isClaimed && (
                      <button
                        onClick={() =>
                          claimRewardMessage(msg.id, null, msg.gift)
                        }
                        className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Gift size={16} /> Claim Gift
                      </button>
                    )}
                    {msg.type === "GIFT" && msg.gift && msg.isClaimed && (
                      <div className="text-xs font-bold text-green-600 bg-green-50 p-2 rounded-lg text-center flex items-center justify-center gap-1">
                        <CheckCircle size={14} /> Gift Claimed
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {unreadCount > 0 && (
              <div className="pt-4 border-t border-slate-100 mt-auto">
                <button
                  onClick={markInboxRead}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MCQ APP OVERLAY (in-app) */}
      {mcqAppOpen && (() => {
        let mcqHost = "";
        try { mcqHost = new URL(MCQ_APP_URL).host; } catch { mcqHost = MCQ_APP_URL; }
        return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border-b border-slate-200 shadow-sm shrink-0">
            <button
              onClick={() => setMcqAppOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-sm font-medium transition-colors shrink-0"
              aria-label="Back to IIC"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <span>Back</span>
            </button>
            <div className="flex flex-col items-center min-w-0 flex-1">
              <span className="text-sm font-semibold text-slate-700">MCQ Maker</span>
              <span className="text-[10px] text-slate-400 truncate max-w-full">{mcqHost}</span>
            </div>
            <button
              onClick={() => setMcqAppOpen(false)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors shrink-0"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div className="flex-1 w-full bg-slate-50 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-sm pointer-events-none">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-500 rounded-full animate-spin mb-3"></div>
              <span>Loading {mcqHost}...</span>
            </div>
            <iframe
              key={MCQ_APP_URL}
              src={MCQ_APP_URL}
              className="absolute inset-0 w-full h-full border-none bg-white"
              title="MCQ Maker"
              allow="autoplay; camera; microphone; fullscreen; display-capture; clipboard-read; clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-presentation"
            />
          </div>
        </div>
        );
      })()}

      {/* EXTERNAL APP OVERLAY */}
      {activeExternalApp && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 shadow-sm shrink-0">
            <button
              onClick={() => setActiveExternalApp(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-sm font-medium transition-colors"
              aria-label="Back to IIC"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <span>Back</span>
            </button>
            <span className="text-sm font-semibold text-slate-700">External App</span>
            <button
              onClick={() => setActiveExternalApp(null)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div className="flex-1 w-full bg-slate-50 relative">
            <iframe
              src={activeExternalApp}
              className="absolute inset-0 w-full h-full border-none"
              title="External App Viewer"
              allow="autoplay; camera; microphone; fullscreen; display-capture"
              sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-presentation"
            />
          </div>
        </div>
      )}

      {/* STUDENT HISTORY MODAL (FULL ACTIVITY) */}
      {viewingUserHistory && (
        <StudentHistoryModal
          user={viewingUserHistory}
          onClose={() => setViewingUserHistory(null)}
        />
      )}

      {/* LESSON ACTION MODAL */}
      {showLessonModal && selectedLessonForModal && (() => {
        const cls = String(activeSessionClass || user.classLevel || "");
        const isClass6to12 = ["6","7","8","9","10","11","12"].includes(cls);
        return (
          <LessonActionModal
            chapter={selectedLessonForModal}
            onClose={() => setShowLessonModal(false)}
            onSelect={handleLessonOption}
            logoUrl={settings?.appLogo} // Pass logo from settings
            appName={settings?.appName}
            hideMcq={isClass6to12}
          />
        );
      })()}

      {/* LUCENT PAGE-WISE NOTES VIEWER */}
      {lucentNoteViewer && (() => {
        const entry = lucentNoteViewer;
        const totalPages = entry.pages.length;
        const safeIndex = Math.min(Math.max(0, lucentPageIndex), Math.max(0, totalPages - 1));
        const currentPage = entry.pages[safeIndex];
        const goPrev = () => setLucentPageIndex(Math.max(0, safeIndex - 1));
        const goNext = () => setLucentPageIndex(Math.min(totalPages - 1, safeIndex + 1));
        const autoSyncOn = lucentAutoSync;
        // Build a per-page text that includes the page number heading so TTS announces it.
        const pageSpeakText = currentPage
          ? `Page ${currentPage.pageNo}. ${currentPage.content || ''}`
          : '';
        return (
          <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center gap-3 shrink-0">
              <button onClick={() => { stopSpeech(); setLucentAutoSync(false); setLucentNoteViewer(null); }} className="bg-white/20 hover:bg-white/30 p-2 rounded-full shrink-0 transition-colors">
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">📘 Lucent Book</p>
                <p className="font-black text-sm truncate">{entry.lessonTitle}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-white/20 px-2.5 py-1 rounded-full text-[11px] font-black whitespace-nowrap">
                  {safeIndex + 1}/{totalPages}
                </span>
                <button
                  onClick={() => { const next = !autoSyncOn; setLucentAutoSync(next); if (!next) stopSpeech(); }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${autoSyncOn ? 'bg-white text-indigo-700' : 'bg-white/20 text-white'}`}
                  title="Auto-Read & Sync: automatically read each page and move to the next"
                >
                  <Zap size={11} className={autoSyncOn ? 'fill-indigo-600' : ''} />
                  {autoSyncOn ? 'Auto ON' : 'Auto'}
                </button>
              </div>
            </div>
            {/* Notes scroll area */}
            <div className="flex-1 overflow-y-auto">
              {currentPage ? (
                <div className="px-4 pb-2">
                  <ChunkedNotesReader
                    key={`lucent-reader-${entry.id}-${safeIndex}-${autoSyncOn ? 'auto' : 'manual'}`}
                    content={pageSpeakText}
                    topBarLabel={`Page ${currentPage.pageNo}`}
                    autoStart={autoSyncOn}
                    onComplete={() => {
                      if (autoSyncOn && safeIndex < totalPages - 1) {
                        setTimeout(() => setLucentPageIndex(safeIndex + 1), 400);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="text-center text-slate-500 py-16 text-sm">No pages available.</div>
              )}
            </div>
            {/* Fixed bottom nav */}
            <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 flex items-center gap-3">
              <button onClick={() => { stopSpeech(); goPrev(); }} disabled={safeIndex <= 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight size={16} className="rotate-180" /> Prev
              </button>
              <select value={safeIndex} onChange={e => { stopSpeech(); setLucentPageIndex(parseInt(e.target.value, 10)); }}
                className="px-3 py-3 border-2 border-slate-200 rounded-2xl text-sm font-bold bg-white outline-none focus:border-indigo-400">
                {entry.pages.map((p, idx) => (
                  <option key={p.id} value={idx}>Pg {p.pageNo}</option>
                ))}
              </select>
              <button onClick={() => { stopSpeech(); goNext(); }} disabled={safeIndex >= totalPages - 1}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* ALL NOTES CATALOG MODAL */}
      {showAllNotesCatalog !== false && (
        <div className="fixed inset-0 bg-white z-[200] overflow-y-auto animate-in fade-in slide-in-from-bottom-4">
          <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              {showAllNotesCatalog === "VIDEO" ? (
                <Youtube className="text-rose-600" />
              ) : showAllNotesCatalog === "AUDIO" ? (
                <Headphones className="text-purple-600" />
              ) : showAllNotesCatalog === "MCQ" ? (
                <CheckSquare className="text-emerald-600" />
              ) : (
                <BookOpen className="text-blue-600" />
              )}
              {showAllNotesCatalog === "PREMIUM"
                ? "Premium Notes Library"
                : showAllNotesCatalog === "DEEP_DIVE"
                  ? "Deep Dive Concept Notes"
                  : showAllNotesCatalog === "VIDEO"
                    ? "Video Lectures Library"
                    : showAllNotesCatalog === "AUDIO"
                      ? "Audio Podcasts Library"
                      : "MCQ Practice Hub"}
            </h2>
            <button
              onClick={() => setShowAllNotesCatalog(false)}
              className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X size={20} className="text-slate-600" />
            </button>
          </div>

          <div className="p-4 space-y-8 pb-24">
            {["6", "7", "8", "9", "10", "11", "12", "COMPETITION"].map(
              (cls) => {
                const classSubjects = getSubjectsList(
                  cls,
                  user.stream || "Science",
                  activeSessionBoard || user.board,
                ).filter(
                  (s) => !(settings?.hiddenSubjects || []).includes(s.id),
                );
                if (classSubjects.length === 0) return null;

                return (
                  <div key={cls} className="space-y-3">
                    <h3 className="font-bold text-lg text-slate-700 uppercase tracking-widest border-b-2 border-slate-100 pb-2">
                      {cls === "COMPETITION" ? "Govt. Exams" : `Class ${cls}`}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {classSubjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between group hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                              {sub.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">
                                {sub.name}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {catalogChapterCounts[`${cls}_${sub.id}`] !==
                                undefined
                                  ? catalogChapterCounts[`${cls}_${sub.id}`]
                                  : "..."}{" "}
                                Chapters
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (
                                showAllNotesCatalog !== "DEEP_DIVE" &&
                                !user.isPremium
                              ) {
                                onTabChange("STORE");
                                return;
                              }
                              setDirectActionTarget(showAllNotesCatalog);
                              setActiveSessionClass(cls);
                              setActiveSessionBoard(
                                activeSessionBoard || user.board || "CBSE",
                              );
                              setSelectedSubject(sub);
                              setContentViewStep("CHAPTERS");
                              setSelectedChapter(null);

                              // Trigger Chapter Fetch manually since handleContentSubjectSelect expects standard flow
                              setLoadingChapters(true);
                              const lang =
                                (activeSessionBoard || user.board) === "BSEB"
                                  ? "Hindi"
                                  : "English";
                              fetchChapters(
                                activeSessionBoard || user.board || "CBSE",
                                cls,
                                user.stream || "Science",
                                sub,
                                lang,
                              ).then((data) => {
                                const sortedData = [...data].sort((a, b) => {
                                  const matchA = a.title.match(/(\d+)/);
                                  const matchB = b.title.match(/(\d+)/);
                                  if (matchA && matchB) {
                                    return (
                                      parseInt(matchA[1], 10) -
                                      parseInt(matchB[1], 10)
                                    );
                                  }
                                  return a.title.localeCompare(b.title);
                                });
                                setChapters(sortedData);
                                setLoadingChapters(false);
                              });

                              setShowAllNotesCatalog(false);
                              onTabChange("COURSES");
                            }}
                            className={`font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-colors ${showAllNotesCatalog === "DEEP_DIVE" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-yellow-400 hover:bg-yellow-500 text-slate-900"}`}
                          >
                            {showAllNotesCatalog === "DEEP_DIVE" ? (
                              <BookOpen size={14} className="text-white" />
                            ) : (
                              <Crown size={14} className="text-slate-900" />
                            )}
                            {showAllNotesCatalog === "DEEP_DIVE"
                              ? "Deep Dive"
                              : showAllNotesCatalog === "VIDEO"
                                ? "Watch Videos"
                                : showAllNotesCatalog === "AUDIO"
                                  ? "Listen Audio"
                                  : showAllNotesCatalog === "MCQ"
                                    ? "Practice MCQ"
                                    : "Premium Notes"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* HOMEWORK MCQ FULL-SCREEN PLAYER */}
      {homeworkPlayerHwId && activePlayerHw && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col h-[100dvh] w-screen animate-in fade-in slide-in-from-bottom-4">
          {/* Top Bar */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
            <button
              onClick={closeHomeworkPlayer}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full active:scale-95 transition"
              title="Close"
            >
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest truncate">
                {new Date(activePlayerHw.date).toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <h2 className="text-base sm:text-lg font-black text-slate-800 truncate">{activePlayerHw.title}</h2>
            </div>
            <button
              onClick={togglePlayerReadAll}
              disabled={playerChunks.length === 0}
              className={`shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-transform ${
                playerIsReadingAll
                  ? 'bg-red-600 text-white shadow-red-200 hover:bg-red-700'
                  : playerChunks.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
              }`}
            >
              {playerIsReadingAll ? <><Square size={14} /> Stop</> : <><Volume2 size={14} /> Read All</>}
            </button>
          </div>

          {/* Progress + Reveal toggle bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-3">
            <div className="text-[11px] font-bold text-slate-600">
              {playerChunks.length > 0 ? (
                <>
                  <span className="text-indigo-600">{Math.min(playerCurrentIndex + 1, playerChunks.length)}</span>
                  <span className="text-slate-400"> / {playerChunks.length}</span>
                  <span className="text-slate-400 ml-2">
                    {(activePlayerHw.parsedMcqs?.length || 0)} MCQs
                  </span>
                </>
              ) : (
                <span className="text-slate-400">No content</span>
              )}
            </div>
            <button
              onClick={() => setPlayerRevealAll(v => !v)}
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-white"
            >
              {playerRevealAll ? 'Hide Answers' : 'Show Answers'}
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5 pb-32 overscroll-contain">
            <div className="max-w-3xl mx-auto space-y-5">
              {playerChunks.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-slate-500">Is homework mein abhi kuch nahi hai</p>
                </div>
              )}
              {playerChunks.map((chunk, idx) => {
                const isActive = idx === playerCurrentIndex && playerIsReadingAll;

                if (chunk.kind === 'notes-line') {
                  return (
                    <React.Fragment key={`pchunk-${idx}`}>
                      <div
                        ref={(el) => { playerScrollRefs.current[idx] = el; }}
                        className={`group relative rounded-xl transition-all ${
                          chunk.isHeading
                            ? 'mt-3 mb-1 px-3 py-2 bg-gradient-to-r from-indigo-50 to-transparent border-l-4 border-indigo-500'
                            : `pl-4 pr-12 py-2.5 ${
                                isActive
                                  ? 'bg-yellow-50 ring-2 ring-yellow-300 shadow-sm'
                                  : 'bg-white hover:bg-slate-50 border border-slate-100'
                              }`
                        }`}
                      >
                        {chunk.isHeading ? (
                          <p className="text-sm sm:text-base font-black text-indigo-800 uppercase tracking-wide flex items-center gap-2">
                            <BookOpen size={14} className="opacity-60" />
                            {chunk.text}
                          </p>
                        ) : (
                          <p className={`text-sm sm:text-[15px] leading-relaxed ${
                            isActive ? 'text-yellow-900 font-semibold' : 'text-slate-800'
                          }`}>
                            <span className="text-indigo-400 font-bold mr-1.5">•</span>
                            {chunk.text}
                          </p>
                        )}
                        {!chunk.isHeading && (
                          <button
                            onClick={() => {
                              if (isActive) {
                                playerIsReadingAllRef.current = false;
                                setPlayerIsReadingAll(false);
                                stopSpeech();
                              } else {
                                stopSpeech();
                                setPlayerCurrentIndex(idx);
                                playerIsReadingAllRef.current = true;
                                setPlayerIsReadingAll(true);
                                setTimeout(() => playPlayerFromIndex(idx), 80);
                              }
                            }}
                            aria-label={isActive ? 'Stop' : 'Read this line'}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                              isActive
                                ? 'opacity-100 bg-red-100 text-red-600 animate-pulse'
                                : 'opacity-0 group-hover:opacity-100 bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
                            }`}
                          >
                            {isActive ? <Square size={12} fill="currentColor" /> : <Volume2 size={12} />}
                          </button>
                        )}
                      </div>
                    </React.Fragment>
                  );
                }

                // MCQ chunk
                return (
                  <div
                    key={`pchunk-${idx}`}
                    ref={(el) => { playerScrollRefs.current[idx] = el; }}
                    className={`bg-white rounded-2xl border-2 p-4 sm:p-5 shadow-sm transition-all ${
                      isActive ? 'border-indigo-500 ring-4 ring-indigo-100 scale-[1.01]' : 'border-slate-200'
                    }`}
                  >
                    {(
                      <>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2 py-1 rounded-md">
                              Q{chunk.index + 1}
                            </span>
                            {chunk.mcq?.topic && (
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{chunk.mcq.topic}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (speakingId === `player_mcq_${idx}`) { stopSpeech(); setSpeakingId(null); }
                                else {
                                  speakText(chunk.text, undefined, 1.0, 'hi-IN',
                                    () => setSpeakingId(`player_mcq_${idx}`),
                                    () => setSpeakingId(null));
                                }
                              }}
                              className={`shrink-0 p-2 rounded-full transition ${speakingId === `player_mcq_${idx}` ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'}`}
                              title="Read this question"
                            >
                              {speakingId === `player_mcq_${idx}` ? <Square size={14} /> : <Volume2 size={14} />}
                            </button>
                            <button
                              onClick={() => { setShowCompMcqHub(true); setCompMcqTab('CREATE'); setCompMcqDraft({ question: chunk.mcq?.question || '', options: chunk.mcq?.options?.length === 4 ? [...chunk.mcq.options] : ['', '', '', ''], correctAnswer: chunk.mcq?.correctAnswer ?? 0 }); }}
                              className="shrink-0 p-2 rounded-full transition bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              title="Is question ko MCQ bank mein save karo"
                            >
                              <PlusCircle size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-base sm:text-lg font-bold text-slate-800 mb-3 leading-snug">
                          {chunk.mcq?.question}
                        </p>
                        <div className="space-y-2 mb-4">
                          {(chunk.mcq?.options || []).map((opt: string, oi: number) => {
                            const isCorrect = chunk.mcq?.correctAnswer === oi;
                            return (
                              <div
                                key={oi}
                                className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-sm ${
                                  playerRevealAll && isCorrect
                                    ? 'bg-green-50 border-green-300 text-green-900 font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                  playerRevealAll && isCorrect ? 'bg-green-600 text-white' : 'bg-white border border-slate-300 text-slate-500'
                                }`}>
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {playerRevealAll && isCorrect && (
                                  <CheckSquare size={16} className="text-green-600 shrink-0 mt-0.5" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {playerRevealAll && (
                          <div className="space-y-2">
                            {chunk.mcq?.explanation && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-yellow-700 mb-1">Explanation</p>
                                <p className="text-sm text-yellow-900 leading-relaxed whitespace-pre-wrap">{chunk.mcq.explanation}</p>
                              </div>
                            )}
                            {chunk.mcq?.concept && (
                              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-blue-700 mb-1">Concept</p>
                                <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{chunk.mcq.concept}</p>
                              </div>
                            )}
                            {chunk.mcq?.examTip && (
                              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-purple-700 mb-1">Exam Tip</p>
                                <p className="text-sm text-purple-900 leading-relaxed whitespace-pre-wrap">{chunk.mcq.examTip}</p>
                              </div>
                            )}
                            {chunk.mcq?.commonMistake && (
                              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-red-700 mb-1">Common Mistake</p>
                                <p className="text-sm text-red-900 leading-relaxed whitespace-pre-wrap">{chunk.mcq.commonMistake}</p>
                              </div>
                            )}
                            {chunk.mcq?.mnemonic && (
                              <div className="bg-pink-50 border border-pink-200 rounded-xl p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-pink-700 mb-1">Memory Trick</p>
                                <p className="text-sm text-pink-900 leading-relaxed whitespace-pre-wrap">{chunk.mcq.mnemonic}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
