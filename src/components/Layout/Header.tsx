import React from 'react';
import { Share2, Download, Bell } from 'lucide-react';

interface HeaderProps {
    title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
    return (
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40 w-full">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                    BETA
                </span>
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all relative">
                    <Bell size={18} />
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>

                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors px-3 py-1.5 rounded-md hover:bg-slate-50">
                    <Share2 size={16} /> Share
                </button>
                <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-all shadow-sm hover:shadow-md active:scale-95">
                    <Download size={16} /> Export Report
                </button>
            </div>
        </header>
    )
}
