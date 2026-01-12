import React from 'react';
import { LayoutDashboard, Settings, Cpu, History } from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    const [ibmStatus, setIbmStatus] = React.useState<{ status: 'loading' | 'connected' | 'error', msg: string }>({
        status: 'loading',
        msg: 'Connecting...'
    });

    React.useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('http://127.0.0.1:5000/status');
                if (!res.ok) throw new Error("Backend Offline");
                const data = await res.json();
                if (data.status === 'connected') {
                    setIbmStatus({ status: 'connected', msg: 'System Online' });
                } else {
                    setIbmStatus({ status: 'error', msg: data.msg || 'Auth Failed' });
                }
            } catch (err) {
                setIbmStatus({ status: 'error', msg: 'Backend Offline' });
            }
        };

        // Initial check
        checkStatus();

        // Optional: Poll every 30s
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    let statusColor = "bg-slate-400";
    let statusGlow = "";

    if (ibmStatus.status === 'connected') {
        statusColor = "bg-green-500";
        statusGlow = "shadow-[0_0_8px_rgba(34,197,94,0.6)]";
    } else if (ibmStatus.status === 'error') {
        statusColor = "bg-red-500";
        statusGlow = "shadow-[0_0_8px_rgba(239,68,68,0.6)]";
    } else {
        statusColor = "bg-yellow-500"; // Loading
    }

    return (
        <aside className="w-64 bg-slate-900 h-screen flex flex-col text-slate-300 border-r border-slate-800 flex-shrink-0 fixed left-0 top-0 z-50">
            {/* Brand */}
            <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Cpu className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-white text-lg tracking-tight">Quantum RDF</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 mt-2">
                <NavItem
                    icon={<LayoutDashboard size={20} />}
                    label="Solver Dashboard"
                    isActive={activeTab === 'dashboard'}
                    onClick={() => setActiveTab('dashboard')}
                />
                <NavItem
                    icon={<History size={20} />}
                    label="History"
                    isActive={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                />
                <NavItem
                    icon={<Settings size={20} />}
                    label="Settings"
                    isActive={activeTab === 'settings'}
                    onClick={() => setActiveTab('settings')}
                />
            </nav>

            {/* Status Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group">
                    <div className="relative">
                        <div className={`w-2.5 h-2.5 rounded-full ${statusColor} ${statusGlow} ${ibmStatus.status === 'loading' ? 'animate-pulse' : ''}`}></div>
                        {ibmStatus.status === 'connected' && (
                            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-white group-hover:text-blue-200 transition-colors">IBM Quantum</p>
                        <p className={`text-[10px] ${ibmStatus.status === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
                            {ibmStatus.msg}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

const NavItem = ({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive?: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden ${isActive
            ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-sm'
            : 'hover:bg-slate-800 hover:text-white border border-transparent'
            }`}
    >
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg"></div>}
        <span className={`relative z-10 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`}>{icon}</span>
        <span className="font-medium text-sm relative z-10">{label}</span>
    </button>
)
