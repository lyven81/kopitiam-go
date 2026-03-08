import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  ClipboardList, 
  TrendingUp, 
  BarChart3, 
  Plus, 
  Minus,
  AlertCircle,
  ChevronRight,
  Coffee,
  Utensils,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
}

interface Stats {
  revenue: number;
  items: number;
  transactions: number;
  alerts: string[];
  quickTip: string;
  topItems: { id: string; name: string; value: number }[];
}

interface PerformanceItem {
  id: string;
  name: string;
  value: number;
}

interface Analytics {
  busyHours: { hour: string; count: number }[];
  dailyTrends: { date: string; revenue: number }[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "logbook" | "performance" | "analytics">("dashboard");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [performance, setPerformance] = useState<PerformanceItem[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [menuRes, statsRes, perfRes, analRes] = await Promise.all([
        fetch("/api/menu"),
        fetch("/api/stats/today"),
        fetch("/api/stats/performance"),
        fetch("/api/stats/analytics")
      ]);
      
      const [menuData, statsData, perfData, analData] = await Promise.all([
        menuRes.json(),
        statsRes.json(),
        perfRes.json(),
        analRes.json()
      ]);

      setMenu(menuData);
      setStats(statsData);
      setPerformance(perfData);
      setAnalytics(analData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordSale = async (itemId: string, quantity: number) => {
    try {
      await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, quantity })
      });
      fetchData(); // Refresh stats
    } catch (error) {
      console.error("Error recording sale:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="text-center">
          <Coffee className="mx-auto h-12 w-12 animate-bounce text-emerald-600" />
          <p className="mt-4 font-medium text-stone-600">Selamat pagi! Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-stone-50 font-sans text-stone-900 md:flex-row">
      {/* Sidebar / Bottom Nav */}
      <nav className="z-10 flex w-full border-stone-200 bg-white shadow-sm md:h-full md:w-24 md:flex-col md:border-r lg:w-64">
        <div className="hidden items-center gap-3 p-6 md:flex md:justify-center lg:justify-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Coffee className="h-6 w-6" />
          </div>
          <span className="hidden text-xl font-bold tracking-tight lg:block">Kopitiam Go</span>
        </div>

        <div className="flex flex-1 justify-around p-2 md:flex-col md:justify-start md:gap-2 md:p-4">
          <NavButton 
            active={activeTab === "dashboard"} 
            onClick={() => setActiveTab("dashboard")}
            icon={<LayoutDashboard className="h-5 w-5 md:h-6 md:w-6" />}
            label="Dashboard"
          />
          <NavButton 
            active={activeTab === "logbook"} 
            onClick={() => setActiveTab("logbook")}
            icon={<ClipboardList className="h-5 w-5 md:h-6 md:w-6" />}
            label="Logbook"
          />
          <NavButton 
            active={activeTab === "performance"} 
            onClick={() => setActiveTab("performance")}
            icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6" />}
            label="Items"
          />
          <NavButton 
            active={activeTab === "analytics"} 
            onClick={() => setActiveTab("analytics")}
            icon={<BarChart3 className="h-5 w-5 md:h-6 md:w-6" />}
            label="Analytics"
          />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {activeTab === "dashboard" && "Selamat Pagi, Boss!"}
              {activeTab === "logbook" && "Record Sales"}
              {activeTab === "performance" && "Item Performance"}
              {activeTab === "analytics" && "Sales Trends"}
            </h1>
            <p className="text-stone-500">
              {new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="hidden h-12 w-12 items-center justify-center rounded-full bg-stone-200 text-stone-600 md:flex">
            <Zap className="h-6 w-6" />
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "dashboard" && <Dashboard stats={stats} />}
            {activeTab === "logbook" && <Logbook menu={menu} onRecord={handleRecordSale} stats={stats} />}
            {activeTab === "performance" && <Performance performance={performance} />}
            {activeTab === "analytics" && <AnalyticsView analytics={analytics} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl p-2 transition-all md:flex-none md:p-3 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:py-3",
        active 
          ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200" 
          : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
      )}
    >
      <span className={cn("shrink-0", active ? "text-emerald-600" : "")}>{icon}</span>
      <span className="text-[10px] font-semibold tracking-tight md:text-[11px] lg:text-sm">{label}</span>
    </button>
  );
}

function Dashboard({ stats }: { stats: Stats | null }) {
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          title="Total Revenue Today" 
          value={`RM ${(stats.revenue / 100).toFixed(2)}`} 
          icon={<TrendingUp className="text-emerald-600" />}
          color="bg-emerald-50"
        />
        <StatCard 
          title="Items Sold" 
          value={stats.items.toString()} 
          icon={<Utensils className="text-orange-600" />}
          color="bg-orange-50"
        />
        <StatCard 
          title="Transactions" 
          value={stats.transactions.toString()} 
          icon={<ClipboardList className="text-blue-600" />}
          color="bg-blue-50"
        />
      </div>

      {stats.alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600" />
            <h3 className="font-bold text-amber-900">Milestone Alerts</h3>
          </div>
          <div className="mt-2 space-y-1">
            {stats.alerts.map((alert, i) => (
              <p key={i} className="text-amber-800">• {alert}</p>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-emerald-900 p-8 text-white shadow-xl shadow-emerald-900/20">
        <h2 className="text-xl font-bold opacity-80">Quick Tip</h2>
        <p className="mt-2 text-lg leading-relaxed">
          "{stats.quickTip}"
        </p>
        <button className="mt-6 flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 font-bold backdrop-blur-sm transition-all hover:bg-white/20">
          View Inventory <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-2xl", color)}>
        {icon}
      </div>
      <p className="text-sm font-medium text-stone-500">{title}</p>
      <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function Logbook({ menu, onRecord, stats }: { menu: MenuItem[]; onRecord: (id: string, qty: number) => void; stats: Stats | null }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [recording, setRecording] = useState<string | null>(null);

  const updateQty = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const handleRecord = async (id: string) => {
    const qty = quantities[id] || 1;
    setRecording(id);
    await onRecord(id, qty);
    setQuantities(prev => ({ ...prev, [id]: 0 }));
    setTimeout(() => setRecording(null), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Today's Summary Bar */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex items-center justify-between rounded-2xl bg-emerald-600 p-4 text-white shadow-lg shadow-emerald-600/20 lg:col-span-2">
            <div>
              <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Today's Sales</p>
              <p className="text-xl font-black">RM {(stats.revenue / 100).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Items Sold</p>
              <p className="text-xl font-black">{stats.items}</p>
            </div>
          </div>
          
          {/* Live Mini Analytics */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">Top Items Today</p>
            <div className="space-y-2">
              {stats.topItems.length > 0 ? (
                stats.topItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-600">{idx + 1}. {item.name}</span>
                    <span className="font-bold text-emerald-600">{item.value}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs italic text-stone-400">No sales yet today</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {menu.map(item => (
          <div key={item.id} className="flex flex-col rounded-3xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
            <div className="mb-4 flex-1">
              <h3 className="font-bold leading-tight">{item.name}</h3>
              <p className="text-sm text-stone-500">RM {(item.price / 100).toFixed(2)}</p>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 rounded-2xl bg-stone-100 p-1">
                <button 
                  onClick={() => updateQty(item.id, -1)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-stone-600 shadow-sm hover:bg-stone-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center font-bold">{quantities[item.id] || 0}</span>
                <button 
                  onClick={() => updateQty(item.id, 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-stone-600 shadow-sm hover:bg-stone-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button 
                onClick={() => handleRecord(item.id)}
                disabled={recording === item.id}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl text-white transition-all active:scale-95",
                  recording === item.id ? "bg-emerald-400" : "bg-emerald-600 shadow-lg shadow-emerald-600/20"
                )}
              >
                {recording === item.id ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"
                  />
                ) : (
                  <Plus className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Performance({ performance }: { performance: PerformanceItem[] }) {
  const maxVal = Math.max(...performance.map(p => p.value));

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-bold">Item Popularity</h2>
      <div className="space-y-6">
        {performance.slice(0, 10).map((item, i) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-stone-100 text-xs font-bold text-stone-500">
                  {i + 1}
                </span>
                <span className="font-bold">{item.name}</span>
              </div>
              <span className="font-medium text-stone-500">{item.value} sold</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / maxVal) * 100}%` }}
                className={cn(
                  "h-full rounded-full",
                  i === 0 ? "bg-emerald-500" : i < 3 ? "bg-emerald-400" : "bg-stone-300"
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsView({ analytics }: { analytics: Analytics | null }) {
  if (!analytics) return null;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-stone-900">Busy Hours (Total Volume)</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.busyHours}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
              <XAxis 
                dataKey="hour" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#78716c', fontSize: 12 }}
                tickFormatter={(val) => `${val}:00`}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelFormatter={(val) => `Time: ${val}:00`}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#059669" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-stone-900">Daily Revenue Trend</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#78716c', fontSize: 12 }}
                tickFormatter={(val) => new Date(val).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(val: number) => [`RM ${(val / 100).toFixed(2)}`, 'Revenue']}
              />
              <Bar 
                dataKey="revenue" 
                fill="#059669" 
                radius={[8, 8, 0, 0]} 
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
