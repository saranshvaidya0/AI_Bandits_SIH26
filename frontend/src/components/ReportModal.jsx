import React, { useEffect, useState, useRef } from 'react';
import { FileText, Download, X } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { generateReportHTML } from '../services/api';

export default function ReportModal({ isOpen, onClose, simulationResult }) {
  const [reportHtml, setReportHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    if (isOpen && simulationResult) {
      async function fetchHtml() {
        setLoading(true);
        const html = await generateReportHTML(simulationResult);
        if (html) setReportHtml(html);
        setLoading(false);
      }
      fetchHtml();
    }
  }, [isOpen, simulationResult]);

  if (!isOpen) return null;

  const handleDownloadPDF = () => {
    if (!reportRef.current) return;
    const opt = {
      margin: 0.5,
      filename: `FloodGuard_Simulation_Report_${simulationResult?.simulation_id || 'SIH2026'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(reportRef.current).save();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center p-4" style={{ background: 'var(--bg-overlay)' }}>
      <div className="glass-panel rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-strong)' }}>
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-accent)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#38bdf8]" />
            <h2 className="text-base font-black text-slate-100">
              Executive Hydrodynamic Simulation Report
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 btn-blue-gradient rounded-xl text-xs font-black flex items-center gap-2 shadow-lg"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#0284c7]/40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Preview */}
        <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg-surface)' }}>
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
              Generating executive report layout...
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 shadow-2xl text-slate-900 max-w-3xl mx-auto border border-slate-200">
              <div ref={reportRef} dangerouslySetInnerHTML={{ __html: reportHtml }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
