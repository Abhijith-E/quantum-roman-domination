import React from 'react';
import { Settings as SettingsIcon, Monitor, Moon, Volume2, Trash2 } from 'lucide-react';

export const SettingsView = () => {
    return (
        <div className="max-w-3xl mx-auto p-6 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">System Settings</h2>
            <p className="text-slate-500 mb-8">Configure global application preferences.</p>

            <div className="grid gap-6">

                {/* 1. Interface Preferences */}
                <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <Monitor size={18} className="text-slate-400" />
                        <h3 className="font-semibold text-slate-700">Interface</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-800">Theme Mode</p>
                                <p className="text-sm text-slate-400">Toggle between light and dark visual themes</p>
                            </div>
                            <div className="bg-slate-100 p-1 rounded-lg flex">
                                <button className="px-3 py-1 bg-white shadow-sm rounded-md text-slate-800 text-xs font-medium">Light</button>
                                <button className="px-3 py-1 text-slate-400 text-xs font-medium">Dark</button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-800">Animation Speed</p>
                                <p className="text-sm text-slate-400">Adjust the speed of solver visualizations</p>
                            </div>
                            <select className="bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-1.5 focus:outline-blue-500">
                                <option>Normal (1.0x)</option>
                                <option>Fail (2.0x)</option>
                                <option>Slow (0.5x)</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* 2. System Data */}
                <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <SettingsIcon size={18} className="text-slate-400" />
                        <h3 className="font-semibold text-slate-700">System</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-800">Total Graph Elements</p>
                                <p className="text-sm text-slate-400">Current workspace capacity</p>
                            </div>
                            <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                Unlimited
                            </span>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-red-600">Reset Application</p>
                                <p className="text-sm text-slate-400">Clear all local settings and history</p>
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium">
                                <Trash2 size={16} /> Reset All
                            </button>
                        </div>
                    </div>
                </section>

                <div className="text-center mt-8">
                    <p className="text-xs text-slate-400">Quantum RDF Solver v1.2.0 (BETA)</p>
                    <p className="text-xs text-slate-300 mt-1">Powered by IBM Quantum & React</p>
                </div>

            </div>
        </div>
    )
}
