import { useState, useEffect, useRef } from "react";
import { usePlannerStore } from "./store/plannerStore";
import { enhanceEventsWithGemini } from "./lib/geminiClient";
import { supabase } from "./lib/supabase";
import SetupForm from "./components/SetupForm";
import CalendarView from "./components/CalendarView";
import ListView from "./components/ListView";
import KanbanView from "./components/KanbanView";
import DashboardView from "./components/DashboardView";
import PomodoroWidget from "./components/PomodoroWidget";
import { PdfExportTemplate } from "./components/PdfExportTemplate";
import {
  Calendar,
  List,
  Settings,
  Key,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  BarChart3,
  Download,
  Clock,
  Menu,
  X,
  FileText,
  Calendar as CalendarIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

type Tab = "setup" | "calendar" | "list" | "kanban" | "dashboard";

export default function App() {
  const store = usePlannerStore();
  const [activeTab, setActiveTab] = useState<Tab>("setup");
  const [apiKeyInput, setApiKeyInput] = useState(store.apiKey);
  const [isKeySaved, setIsKeySaved] = useState(!!store.apiKey);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const deviceId = useRef(
    localStorage.getItem("focusflow_device_id") ||
      (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15))
  ).current;

  // Data Loading
  useEffect(() => {
    localStorage.setItem("focusflow_device_id", deviceId);
    loadData(deviceId);
  }, [deviceId]);

  const loadData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("planner_data")
        .select("state")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading data:", error);
      }

      if (data && data.state) {
        store.setFullState(data.state);
      }
    } catch (error) {
      console.error("Error in loadData:", error);
    } finally {
      setIsDataLoaded(true);
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (!isDataLoaded) return;

    const saveTimeout = setTimeout(async () => {
      try {
        const stateToSave = {
          dday: store.dday,
          startDate: store.startDate,
          goals: store.goals,
          goalImportance: store.goalImportance,
          timePerDay: store.timePerDay,
          prefTime: store.prefTime,
          restDay: store.restDay,
          extraRequest: store.extraRequest,
          events: store.events,
          theme: store.theme,
        };

        const { error } = await supabase.from("planner_data").upsert({
          user_id: deviceId,
          state: stateToSave,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          console.error("Error saving data:", error);
        }
      } catch (error) {
        console.error("Error in auto-save:", error);
      }
    }, 1500);

    return () => clearTimeout(saveTimeout);
  }, [
    isDataLoaded,
    deviceId,
    store.dday,
    store.startDate,
    store.goals,
    store.goalImportance,
    store.timePerDay,
    store.prefTime,
    store.restDay,
    store.extraRequest,
    store.events,
    store.theme,
  ]);

  useEffect(() => {
    // Apply initial theme
    document.documentElement.setAttribute("data-theme", store.theme);

    // If events exist, default to calendar view
    if (store.events.length > 0 && activeTab === "setup") {
      setActiveTab("calendar");
    }
  }, [store.events.length, store.theme]);

  const handleSaveKey = () => {
    store.setApiKey(apiKeyInput);
    setIsKeySaved(true);
    setTimeout(() => setIsKeySaved(false), 2000);
  };

  const handleRefineTasks = async () => {
    if (store.events.length === 0) return;

    setIsRefining(true);
    try {
      const refinedEvents = await enhanceEventsWithGemini(
        store.events,
        store.goals,
        store.extraRequest,
        store.apiKey
      );
      store.setEvents(refinedEvents);
    } catch (error) {
      console.error("Refinement error:", error);
      alert("AI 구체화 중 오류가 발생했습니다.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleExportPDF = async () => {
    if (!pdfRef.current || store.events.length === 0) return;
    setIsExporting(true);
    setIsExportMenuOpen(false);

    try {
      const element = pdfRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save("study_plan.pdf");
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("PDF 내보내기 중 오류가 발생했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportICS = () => {
    if (store.events.length === 0) return;

    let ics =
      "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AI Study Planner//KO\nCALSCALE:GREGORIAN\n";

    store.events.forEach((event) => {
      const dateStr = event.date.replace(/-/g, "");
      const uid = `${event.id}@aistudyplanner.com`;
      const dtstamp =
        new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      ics += "BEGIN:VEVENT\n";
      ics += `UID:${uid}\n`;
      ics += `DTSTAMP:${dtstamp}\n`;
      ics += `DTSTART;VALUE=DATE:${dateStr}\n`;
      ics += `SUMMARY:${event.subject} - ${event.task}\n`;
      ics += `DESCRIPTION:소요시간: ${event.duration}\\n단계: ${event.phase}\n`;
      ics += "END:VEVENT\n";
    });

    ics += "END:VCALENDAR";

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "study_plan.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navItems = [
    { id: "setup", label: "플랜 설정", icon: Settings, disabled: false },
    {
      id: "calendar",
      label: "캘린더",
      icon: Calendar,
      disabled: store.events.length === 0,
    },
    {
      id: "kanban",
      label: "보드",
      icon: LayoutGrid,
      disabled: store.events.length === 0,
    },
    {
      id: "dashboard",
      label: "통계",
      icon: BarChart3,
      disabled: store.events.length === 0,
    },
    {
      id: "list",
      label: "목록",
      icon: List,
      disabled: store.events.length === 0,
    },
  ] as const;

  if (!isDataLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-primary-500/30 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center shadow-sm shadow-primary-500/30">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">FocusFlow_AI</h1>
          </div>
          <button
            className="md:hidden text-zinc-500"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.disabled) {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100"
                } ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex-shrink-0">
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
              테마 설정
            </label>
            <div className="flex gap-2">
              {(["indigo", "rose", "emerald", "amber", "violet"] as const).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => store.setTheme(t)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      store.theme === t
                        ? "border-zinc-900 dark:border-white scale-110"
                        : "border-transparent"
                    }`}
                    style={{
                      backgroundColor: `var(--color-${t}-500)`,
                    }}
                    title={t}
                  />
                ),
              )}
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
              Gemini API 설정
            </label>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Key className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="API Key 입력"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                />
              </div>
              <button
                onClick={handleSaveKey}
                className="w-full py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                {isKeySaved ? "저장됨 ✓" : "저장하기"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            {store.apiKey ? (
              <div className="flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> AI 최적화 활성
              </div>
            ) : (
              <div className="flex items-center text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 mr-1.5" /> 기본 규칙 모드
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex-shrink-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {navItems.find((item) => item.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {store.dday > 0 && (
              <div className="flex items-center gap-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-3 py-1.5 rounded-full border border-primary-100 dark:border-primary-800/50 font-bold tracking-tight text-sm">
                <Clock className="w-4 h-4" />
                D-{store.dday}
              </div>
            )}

            {store.events.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefineTasks}
                  disabled={isRefining}
                  className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-full transition-colors text-sm font-medium shadow-sm disabled:opacity-50"
                >
                  {isRefining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isRefining ? "구체화 중..." : "AI 할 일 구체화"}
                  </span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {isExporting ? "생성 중..." : "내보내기"}
                    </span>
                  </button>

                  {isExportMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsExportMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-50 overflow-hidden">
                        <button
                          onClick={handleExportPDF}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                        >
                          <FileText className="w-4 h-4 text-red-500" />
                          PDF로 내보내기
                        </button>
                        <button
                          onClick={() => {
                            handleExportICS();
                            setIsExportMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                        >
                          <CalendarIcon className="w-4 h-4 text-blue-500" />
                          구글 캘린더 (ICS)
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto animate-in fade-in duration-300 h-full">
            {activeTab === "setup" && (
              <SetupForm onComplete={() => setActiveTab("calendar")} />
            )}
            {activeTab === "calendar" && <CalendarView />}
            {activeTab === "kanban" && <KanbanView />}
            {activeTab === "dashboard" && <DashboardView />}
            {activeTab === "list" && <ListView />}
          </div>
        </div>
      </main>

      {/* Global Widgets */}
      <PomodoroWidget />
      <PdfExportTemplate
        ref={pdfRef}
        events={store.events}
        dday={store.dday}
        startDate={store.startDate}
      />
    </div>
  );
}
