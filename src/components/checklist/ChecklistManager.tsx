import React, { useState } from 'react';
import { ChecklistItem, ChecklistPriority, ChecklistStatus } from '../../types/api';
import { saveChecklistItemStatus } from '../../lib/api/client';
import { generateChecklistPdf } from '../../lib/pdf/generateChecklistPdf';
import { Link } from '../../lib/router';
import { 
  CheckSquare, 
  Square, 
  ArrowLeft, 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Download, 
  FileText,
  Filter,
  Copy,
  Check
} from 'lucide-react';

interface ChecklistManagerProps {
  initialItems: ChecklistItem[];
  requestId: string;
  question: string;
}

export const ChecklistManager: React.FC<ChecklistManagerProps> = ({
  initialItems,
  requestId,
  question
}) => {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const toggleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus: ChecklistStatus =
            item.status === 'completed' ? 'pending' : 'completed';
          saveChecklistItemStatus(requestId, id, nextStatus);
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const updateItemStatusExplicit = (id: string, newStatus: ChecklistStatus) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          saveChecklistItemStatus(requestId, id, newStatus);
          return { ...item, status: newStatus };
        }
        return item;
      })
    );
  };

  const completedCount = items.filter((i) => i.status === 'completed' || i.status === 'verified').length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  const filteredItems = priorityFilter === 'ALL'
    ? items
    : priorityFilter === 'COMPLETED'
    ? items.filter(i => i.status === 'completed' || i.status === 'verified')
    : items.filter(i => i.priority === priorityFilter);

  // Generate and download formal PDF document
  const handleExportPdf = () => {
    try {
      setGeneratingPdf(true);
      generateChecklistPdf({
        items,
        requestId,
        question,
      });
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Secondary option to copy text summary if desired
  const handleCopyText = () => {
    const textLines = [
      `IP-SAKTI Sahayak — Statutory Pre-Filing Compliance Checklist`,
      `Dossier ID: ${requestId}`,
      `Query: "${question}"`,
      `Progress: ${completedCount}/${items.length} (${progressPercent}%)\n`,
      ...items.map(
        (it, idx) =>
          `[${it.status.toUpperCase()}] ${idx + 1}. ${it.title} (${it.priority})\n   Description: ${it.description}\n   Evidence: ${it.evidence_references.join(', ')}\n   Deadline: ${it.statutory_deadline || 'N/A'}\n`
      )
    ].join('\n');

    navigator.clipboard.writeText(textLines);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  const getPriorityBadge = (priority: ChecklistPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-950/60 text-red-300 border border-red-500/40">
            <AlertOctagon className="w-3 h-3" />
            <span>CRITICAL</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3" />
            <span>HIGH PRIORITY</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#142e25] text-[#2dd4bf] border border-[#14b8a6]/40">
            <span>MEDIUM</span>
          </span>
        );
      case 'RECOMMENDED':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#0f221b] text-[#dfbe7b] border border-[#c8a45d]/30">
            <span>RECOMMENDED</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Navigation and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1c3e32]">
        <Link
          href={`/results/${requestId}`}
          className="inline-flex items-center space-x-2 text-xs sm:text-sm font-mono text-[#dfbe7b] hover:text-[#f5f1e7] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Structured Regulatory Dossier</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono bg-[#0f221b] text-[#d6ccb6] hover:text-[#dfbe7b] border border-[#1c3e32] hover:border-[#c8a45d]/40 transition-colors cursor-pointer"
            title="Copy plaintext summary to clipboard"
          >
            {copiedNotice ? <Check className="w-3.5 h-3.5 text-[#14b8a6]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedNotice ? 'Copied Text' : 'Copy Text'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={generatingPdf}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f] hover:brightness-105 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[#08130f]" />
            <span>{generatingPdf ? 'Generating PDF...' : pdfSuccess ? 'PDF Downloaded!' : 'Export PDF Dossier'}</span>
          </button>
        </div>
      </div>

      {/* Progress Header Card */}
      <div className="bg-[#0b1813] border border-[#c8a45d]/30 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs uppercase font-mono tracking-widest text-[#c8a45d]">
              Statutory Action Plan • Dossier {requestId}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#f5f1e7] font-serif-heading">
              Actionable Pre-Filing Regulatory Checklist
            </h1>
            <p className="text-xs sm:text-sm text-[#d6ccb6] font-sans">
              Mark items complete as your laboratory tests, TKDL clearance, and statutory authority filings are finalized.
            </p>
          </div>

          {/* Radial or linear progress indicator */}
          <div className="p-4 rounded-xl bg-[#08130f] border border-[#1c3e32] shrink-0 text-center sm:text-right min-w-[200px]">
            <div className="text-xs font-mono uppercase text-[#dfbe7b] mb-1">
              Readiness Status
            </div>
            <div className="text-3xl font-bold text-[#f5f1e7] font-mono">
              {progressPercent}%
            </div>
            <div className="text-xs font-mono text-[#2dd4bf] mt-0.5">
              {completedCount} of {items.length} items validated
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[#142e25] h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#14b8a6] to-[#dfbe7b] h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-[#c8a45d]" />
          <span className="text-[#d6ccb6]">Filter Priority:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'COMPLETED'].map((f) => (
            <button
              key={f}
              onClick={() => setPriorityFilter(f)}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                priorityFilter === f
                  ? 'bg-[#142e25] text-[#dfbe7b] border border-[#c8a45d]'
                  : 'bg-[#08130f] text-[#d6ccb6]/60 border border-[#1c3e32] hover:text-[#f5f1e7]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="text-[#d6ccb6]/60">
          Showing {filteredItems.length} checklist items
        </div>
      </div>

      {/* Checklist Items List */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const isDone = item.status === 'completed' || item.status === 'verified';

          return (
            <div
              key={item.id}
              className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                isDone
                  ? 'bg-[#0a1611]/80 border-[#14b8a6]/40 opacity-80'
                  : 'bg-[#0b1813] border-[#c8a45d]/20 hover:border-[#c8a45d]/50 shadow-lg'
              }`}
            >
              <div className="flex items-start space-x-4">
                
                {/* Toggle Checkbox Button */}
                <button
                  type="button"
                  onClick={() => toggleStatus(item.id)}
                  className="mt-1 text-[#dfbe7b] hover:text-[#f5f1e7] transition-transform active:scale-95 cursor-pointer shrink-0"
                  aria-label={`Mark ${item.title} as ${isDone ? 'incomplete' : 'complete'}`}
                >
                  {isDone ? (
                    <CheckSquare className="w-6 h-6 text-[#2dd4bf]" />
                  ) : (
                    <Square className="w-6 h-6 text-[#c8a45d]/70 hover:text-[#dfbe7b]" />
                  )}
                </button>

                {/* Content Body */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs text-[#dfbe7b] px-2 py-0.5 rounded bg-[#08130f] border border-[#c8a45d]/30">
                        {item.id}
                      </span>
                      {getPriorityBadge(item.priority)}
                    </div>

                    {/* Status Dropdown / Pill */}
                    <div className="flex items-center space-x-2">
                      <select
                        value={item.status}
                        onChange={(e) => updateItemStatusExplicit(item.id, e.target.value as ChecklistStatus)}
                        className="bg-[#08130f] border border-[#1c3e32] text-xs font-mono text-[#dfbe7b] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#dfbe7b] cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="verified">Verified Official</option>
                      </select>
                    </div>
                  </div>

                  <h3 className={`text-base sm:text-lg font-bold font-serif-heading transition-colors ${
                    isDone ? 'line-through text-[#d6ccb6]/70' : 'text-[#f5f1e7]'
                  }`}>
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#d6ccb6]/85 font-sans leading-relaxed">
                    {item.description}
                  </p>

                  {/* Metadata Row: Deadlines & Evidence References */}
                  <div className="pt-3 border-t border-[#1c3e32]/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[#c8a45d]/80">Evidence Ref:</span>
                      {item.evidence_references.map((ref) => (
                        <span
                          key={ref}
                          className="px-2 py-0.5 rounded bg-[#08130f] border border-[#14b8a6]/30 text-[#2dd4bf] text-[11px]"
                        >
                          {ref}
                        </span>
                      ))}
                    </div>

                    {item.statutory_deadline && (
                      <div className="flex items-center space-x-1.5 text-amber-300 text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Deadline: {item.statutory_deadline}</span>
                      </div>
                    )}
                  </div>

                  {/* Required Documentation */}
                  {item.required_documentation && item.required_documentation.length > 0 && (
                    <div className="pt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-mono text-[#d6ccb6]/70 flex items-center space-x-1">
                        <FileText className="w-3 h-3 text-[#c8a45d]" />
                        <span>Required:</span>
                      </span>
                      {item.required_documentation.map((doc, dIdx) => (
                        <span
                          key={dIdx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#142e25] text-[#dfbe7b] border border-[#c8a45d]/25"
                        >
                          {doc}
                        </span>
                      ))}
                    </div>
                  )}

                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
