import React from 'react';
import { SRDFVariant } from '../../core/graph/RDF';

interface ProblemTypeSelectorProps {
    isSigned: boolean;
    setSigned: (s: boolean) => void;
    variant: SRDFVariant;
    setVariant: (v: SRDFVariant) => void;
}

export const ProblemTypeSelector: React.FC<ProblemTypeSelectorProps> = ({
    isSigned, setSigned, variant, setVariant
}) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2">Problem Configuration</h2>

            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Problem Type</label>
                <div className="flex bg-slate-100 p-1 rounded-md">
                    <button
                        onClick={() => setSigned(false)}
                        className={`flex-1 py-1.5 px-3 text-sm rounded-sm transition-all ${!isSigned ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Classic RDF
                    </button>
                    <button
                        onClick={() => setSigned(true)}
                        className={`flex-1 py-1.5 px-3 text-sm rounded-sm transition-all ${isSigned ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Signed RDF
                    </button>
                </div>
            </div>

            {isSigned && (
                <div className="space-y-3 animation-fade-in">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">SRDF Variant</label>
                        <select
                            value={variant}
                            onChange={(e) => setVariant(e.target.value as SRDFVariant)}
                            className="w-full rounded-md border-slate-300 py-2 px-3 text-sm border focus:ring-1 focus:ring-blue-500"
                        >
                            <option value={SRDFVariant.A_PositiveOnly}>Variant A: Positive-Only Defense</option>
                            <option value={SRDFVariant.B_Blocking}>Variant B: Negative Edge Blocking</option>
                            <option value={SRDFVariant.C_Weighted}>Variant C: Weighted Defense (Recommended)</option>
                            {/* D is placeholder */}
                        </select>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-md text-xs text-blue-700">
                        {variant === SRDFVariant.A_PositiveOnly && "Only positive neighbors can defend."}
                        {variant === SRDFVariant.B_Blocking && "Negative neighbors with f=2 block positive defense."}
                        {variant === SRDFVariant.C_Weighted && "Defense score (Pos - Neg) must ≥ 1."}
                    </div>
                </div>
            )}
        </div>
    );
};
