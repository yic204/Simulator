/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { TitrationStepResult } from "../types";
import { Download, FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface ResultsTableProps {
  steps: TitrationStepResult[];
  currentVolumeAdded: number;
  isArabic: boolean;
  analyteName: string;
  titrantName: string;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  steps,
  currentVolumeAdded,
  isArabic,
  analyteName,
  titrantName,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filter steps based on search (e.g., search for pH values, or specific volumes)
  const filteredSteps = steps.filter((step) => {
    if (!searchTerm) return true;
    const volStr = step.volumeAdded.toFixed(2);
    const phStr = step.ph.toFixed(2);
    return volStr.includes(searchTerm) || phStr.includes(searchTerm);
  });

  // Calculate pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredSteps.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredSteps.length / rowsPerPage);

  const handlePageChange = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === "next" && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // CSV Exporter
  const exportToCSV = () => {
    const headers = [
      "Volume Added (mL)",
      "Total Volume (mL)",
      "Remaining Analyte (mol)",
      "Added Titrant (mol)",
      "pH",
      "pOH",
      "[H+] (M)",
      "[OH-] (M)",
      "Conductivity (uS/cm)",
      "Buffer Capacity",
      "Derivative (dpH/dV)",
      "Indicator Color",
      "Status"
    ];

    const csvRows = [
      headers.join(","), // header row
      ...steps.map((s) => [
        s.volumeAdded.toFixed(3),
        s.totalVolume.toFixed(3),
        s.molesAnalyteRemaining.toExponential(4),
        s.molesTitrantAdded.toExponential(4),
        s.ph.toFixed(3),
        s.poh.toFixed(3),
        s.hConcentration.toExponential(4),
        s.ohConcentration.toExponential(4),
        s.conductivity.toFixed(1),
        s.bufferCapacity.toFixed(5),
        s.dpH_dV.toFixed(4),
        s.indicatorColor,
        s.excessReagent.toUpperCase()
      ].join(","))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `titration_experiment_${analyteName}_vs_${titrantName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printer / PDF report trigger
  const triggerPrintReport = () => {
    window.print();
  };

  const t = {
    title: isArabic ? "جدول البيانات التحليلية" : "Analytical Data Logs",
    searchPlaceholder: isArabic ? "ابحث عن حجم أو رقم هيدروجيني..." : "Search by volume or pH...",
    volAdded: isArabic ? "الحجم المضاف (مل)" : "Volume Added (mL)",
    totalVol: isArabic ? "الحجم الكلي (مل)" : "Total Volume (mL)",
    molesAnalyte: isArabic ? "مولات المحلل" : "Moles Analyte",
    molesTitrant: isArabic ? "مولات المعاير" : "Moles Titrant",
    ph: isArabic ? "pH" : "pH",
    poh: isArabic ? "pOH" : "pOH",
    hConc: isArabic ? "[H⁺]" : "[H⁺] (M)",
    ohConc: isArabic ? "[OH⁻]" : "[OH⁻] (M)",
    indicator: isArabic ? "كاشف" : "Indicator",
    status: isArabic ? "الحالة" : "Status",
    equivalence: isArabic ? "نقطة التكافؤ" : "Equivalence",
    excessAnalyte: isArabic ? "فائض محلل" : "Analyte Excess",
    excessTitrant: isArabic ? "فائض معاير" : "Titrant Excess",
    csvBtn: isArabic ? "تصدير CSV" : "Export CSV",
    pdfBtn: isArabic ? "تقرير / PDF" : "Print PDF",
    showing: isArabic ? "عرض الصفوف" : "Showing",
    of: isArabic ? "من" : "of",
    to: isArabic ? "إلى" : "to",
  };

  return (
    <div id="results-table-section" className="bg-zinc-950/45 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] glass-layered-shadow p-7 flex flex-col gap-5 w-full print:border-none print:shadow-none">
      {/* Table header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-1.5 font-mono uppercase tracking-wider">
            {t.title}
          </h3>
          <span className="text-xs text-zinc-500 font-mono mt-0.5">
            {steps.length} {isArabic ? "سجل كيميائي محسوب" : "computed chemical registers"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 print:hidden">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            {t.csvBtn}
          </button>
          <button
            onClick={triggerPrintReport}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-4 py-2.5 rounded-xl border border-cyan-400/20 text-xs transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {t.pdfBtn}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:max-w-xs print:hidden">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to first page
          }}
          className="w-full text-xs pl-10 pr-4 py-2.5 border border-white/10 bg-zinc-950/80 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
        />
      </div>

      {/* Main Responsive Table */}
      <div className="overflow-x-auto w-full border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs font-mono select-none">
          <thead className="bg-zinc-950 text-zinc-400 text-[10px] uppercase tracking-wider font-bold border-b border-white/5">
            <tr>
              <th className="py-4 px-4">{t.volAdded}</th>
              <th className="py-4 px-4">{t.totalVol}</th>
              <th className="py-4 px-4 hidden md:table-cell">{t.molesAnalyte}</th>
              <th className="py-4 px-4 hidden md:table-cell">{t.molesTitrant}</th>
              <th className="py-4 px-4 text-cyan-400 font-bold">pH</th>
              <th className="py-4 px-4 hidden sm:table-cell">pOH</th>
              <th className="py-4 px-4">{t.hConc}</th>
              <th className="py-4 px-4 hidden lg:table-cell">{t.ohConc}</th>
              <th className="py-4 px-4 text-center">{t.indicator}</th>
              <th className="py-4 px-4 text-right">{t.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-zinc-300 bg-zinc-950/20">
            {currentRows.map((row) => {
              const isHighlight = Math.abs(row.volumeAdded - currentVolumeAdded) < 0.001;
              const isEquivalence = row.excessReagent === "equivalence";

              return (
                <tr
                  key={row.volumeAdded}
                  className={`transition-colors duration-150 ${
                    isHighlight 
                      ? "bg-cyan-500/10 border-l-2 border-l-cyan-400" 
                      : isEquivalence 
                        ? "bg-emerald-500/10 text-emerald-300" 
                        : "hover:bg-white/5"
                  }`}
                >
                  <td className="py-3 px-4 font-bold">{row.volumeAdded.toFixed(3)}</td>
                  <td className="py-3 px-4 text-zinc-500">{row.totalVolume.toFixed(3)}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-zinc-500 font-normal">
                    {row.molesAnalyteRemaining.toExponential(3)}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-zinc-500 font-normal">
                    {row.molesTitrantAdded.toExponential(3)}
                  </td>
                  <td className="py-3 px-4 text-cyan-400 font-bold">
                    {row.ph.toFixed(3)}
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell text-zinc-500">{row.poh.toFixed(3)}</td>
                  <td className="py-3 px-4 text-cyan-500/80">{row.hConcentration.toExponential(3)}</td>
                  <td className="py-3 px-4 hidden lg:table-cell text-pink-500/80">
                    {row.ohConcentration.toExponential(3)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5 text-xs">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: row.indicatorColor }}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isEquivalence ? (
                      <span className="bg-emerald-500/10 text-emerald-300 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/20">
                        {t.equivalence}
                      </span>
                    ) : row.excessReagent === "analyte" ? (
                      <span className="bg-cyan-500/10 text-cyan-300 text-[9px] font-semibold px-2 py-0.5 rounded border border-cyan-500/10">
                        {t.excessAnalyte}
                      </span>
                    ) : (
                      <span className="bg-pink-500/10 text-pink-300 text-[9px] font-semibold px-2 py-0.5 rounded border border-pink-500/10">
                        {t.excessTitrant}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredSteps.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-zinc-500 font-bold">
                  {isArabic ? "لم يتم العثور على سجلات مطابقة" : "No matching steps found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500 mt-2 print:hidden select-none">
          <span>
            {t.showing} <span className="font-bold text-zinc-400">{indexOfFirstRow + 1}</span>{" "}
            {t.to}{" "}
            <span className="font-bold text-zinc-400">
              {Math.min(indexOfLastRow, filteredSteps.length)}
            </span>{" "}
            {t.of} <span className="font-bold text-zinc-400">{filteredSteps.length}</span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange("prev")}
              disabled={currentPage === 1}
              className="p-1.5 border border-white/10 bg-white/5 rounded-xl hover:bg-white/10 text-zinc-400 disabled:opacity-20 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-zinc-500 font-semibold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange("next")}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-white/10 bg-white/5 rounded-xl hover:bg-white/10 text-zinc-400 disabled:opacity-20 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
