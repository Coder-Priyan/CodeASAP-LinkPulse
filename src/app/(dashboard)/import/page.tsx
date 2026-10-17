"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface CsvRowPreview {
  lineNumber: number;
  rawUrl: string;
  rawAlias?: string;
  rawTitle?: string;
  sanitizedTitle?: string;
  isValid: boolean;
  error?: string;
}

interface ImportSummary {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  created: Array<{
    lineNumber: number;
    id: string;
    code: string;
    destinationUrl: string;
    title?: string | null;
  }>;
  skipped: Array<{
    lineNumber: number;
    destinationUrl: string;
    reason: string;
  }>;
}

const SAMPLE_CSV = `destination_url,alias,title
https://github.com/Coder-Priyan/LinkPulse,linkpulse-repo,LinkPulse Repository
https://nextjs.org/docs,nextjs-docs,Next.js Documentation
https://prisma.io/docs,prisma-docs,Prisma ORM Guides`;

export default function CsvImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [previewRows, setPreviewRows] = useState<CsvRowPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    document.title = "CSV Import | LinkPulse";
  }, []);

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "linkpulse-import-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadSample = () => {
    setFile(new File([SAMPLE_CSV], "sample-import.csv", { type: "text/csv" }));
    setCsvContent(SAMPLE_CSV);
    handlePreview(SAMPLE_CSV);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 1024 * 1024) {
      setErrorMessage("File exceeds maximum allowed size of 1 MB.");
      setFile(null);
      setCsvContent("");
      setPreviewRows([]);
      return;
    }

    setFile(selected);
    setErrorMessage(null);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || "";
      setCsvContent(text);
      handlePreview(text);
    };
    reader.readAsText(selected);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (droppedFile.size > 1024 * 1024) {
      setErrorMessage("File exceeds maximum allowed size of 1 MB.");
      return;
    }

    setFile(droppedFile);
    setErrorMessage(null);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || "";
      setCsvContent(text);
      handlePreview(text);
    };
    reader.readAsText(droppedFile);
  };

  const handlePreview = async (content: string) => {
    setLoading(true);
    setErrorMessage(null);
    setSummary(null);

    try {
      const res = await fetch("/api/links/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: content }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to parse CSV preview.");
        setPreviewRows([]);
      } else {
        setPreviewRows(data.preview.rows || []);
      }
    } catch {
      setErrorMessage("Network error while validating CSV preview.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!csvContent) return;
    setImporting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/links/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to execute CSV import.");
      } else {
        setSummary(data.summary);
      }
    } catch {
      setErrorMessage("Network error while executing import.");
    } finally {
      setImporting(false);
    }
  };

  const validCount = previewRows.filter((r) => r.isValid).length;
  const invalidCount = previewRows.length - validCount;

  return (
    <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem" }}>
      {/* Top Navigation */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/dashboard" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 900, marginBottom: "0.4rem", fontFamily: "var(--font-display)" }} className="flex items-center gap-3">
            <span className="icon-chip icon-chip-blue" style={{ width: "42px", height: "42px" }}>
              <FileSpreadsheet size={22} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
            </span>
            <span>CSV Bulk Import</span>
          </h1>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "0.95rem" }}>
            Upload a CSV to batch create up to 200 shortened links into your account with automatic validation.
          </p>
        </div>

        <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
          <button
            onClick={handleLoadSample}
            type="button"
            className="btn btn-secondary flex items-center gap-2"
          >
            <Sparkles size={16} />
            <span>Load Sample CSV</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            type="button"
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download size={16} />
            <span>Download CSV Template</span>
          </button>
        </div>
      </div>

      {/* Upload Box */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "1rem", fontFamily: "var(--font-display)" }}>
          Step 1: Select CSV File
        </h2>

        <div
          className={`upload-dropzone ${isDragOver ? "dragover" : ""}`}
          onClick={() => document.getElementById("csvFileInput")?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("csvFileInput")?.click();
            }
          }}
          aria-label="Upload CSV file"
        >
          <div className="icon-chip icon-chip-blue" style={{ width: "48px", height: "48px", margin: "0 auto 0.75rem", display: "flex" }}>
            <Upload size={24} strokeWidth={2.5} style={{ color: "var(--color-ink)" }} />
          </div>
          <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.35rem", color: "var(--color-ink)" }}>
            {file ? file.name : "Click to select or drag and drop a CSV file"}
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--color-ink-muted)" }}>
            Columns: <code className="code-badge">destination_url</code> (required), <code className="code-badge">alias</code> (optional), <code className="code-badge">title</code> (optional). Max 1 MB, 200 rows.
          </p>
          <input
            id="csvFileInput"
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        {loading && (
          <div className="flex items-center gap-2" style={{ marginTop: "1.25rem", color: "var(--color-ink)", fontWeight: 600 }}>
            <RefreshCw size={18} className="spin" />
            <span>Validating rows and checking domain blocklist...</span>
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-error" style={{ marginTop: "1.25rem" }}>
            <AlertCircle size={18} />
            <span style={{ fontWeight: 600 }}>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Import Execution Summary Banner if finished */}
      {summary && (
        <div
          className="card"
          style={{
            marginBottom: "2rem",
            backgroundColor: "var(--color-white)",
            border: "2px solid var(--color-green)",
            boxShadow: "var(--shadow-hard)",
          }}
        >
          <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-green)",
                  border: "2px solid var(--color-ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle size={22} style={{ color: "var(--color-ink)" }} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>
                  Import Complete
                </h3>
                <p style={{ fontSize: "0.9rem", color: "var(--color-ink-muted)" }}>
                  Created <strong>{summary.createdCount}</strong> links, skipped <strong>{summary.skippedCount}</strong> rows.
                </p>
              </div>
            </div>

            <Link href="/dashboard" className="btn btn-primary btn-sm">
              View Links in Dashboard &rarr;
            </Link>
          </div>

          {summary.skipped.length > 0 && (
            <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "var(--color-paper)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-ink-faint)" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-text-danger)", marginBottom: "0.5rem" }}>
                Skipped Rows ({summary.skipped.length}):
              </div>
              <ul style={{ fontSize: "0.85rem", color: "var(--color-ink)", paddingLeft: "1.25rem", margin: 0 }}>
                {summary.skipped.map((s, idx) => (
                  <li key={idx} style={{ marginBottom: "0.35rem" }}>
                    <strong>Line {s.lineNumber}:</strong> {s.reason} <span style={{ color: "var(--color-ink-muted)" }}>({s.destinationUrl})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview & Validation Table */}
      {previewRows.length > 0 && !summary && (
        <div className="card">
          <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, fontFamily: "var(--font-display)" }}>
                Step 2: Preview & Validate ({previewRows.length} rows)
              </h2>
              <div className="flex items-center gap-3" style={{ fontSize: "0.9rem", marginTop: "0.35rem" }}>
                <span className="badge badge-active flex items-center gap-1" style={{ fontSize: "0.8rem" }}>
                  <CheckCircle size={12} />
                  <span>{validCount} valid</span>
                </span>
                {invalidCount > 0 && (
                  <span className="badge badge-disabled flex items-center gap-1" style={{ fontSize: "0.8rem" }}>
                    <AlertCircle size={12} />
                    <span>{invalidCount} invalid</span>
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={importing || validCount === 0}
              className="btn btn-primary flex items-center gap-2"
              type="button"
            >
              {importing ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Importing Links...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Import {validCount} Valid {validCount === 1 ? "Link" : "Links"}</span>
                </>
              )}
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>Line</th>
                  <th>Destination URL</th>
                  <th>Alias</th>
                  <th>Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.lineNumber}>
                    <td style={{ fontFamily: "monospace", color: "var(--color-ink-muted)", fontSize: "0.9rem", fontWeight: 600 }}>
                      {row.lineNumber}
                    </td>
                    <td>
                      <div className="truncate max-w-xs" title={row.rawUrl} style={{ fontSize: "0.9rem", color: "var(--color-ink)", fontWeight: 500 }}>
                        {row.rawUrl}
                      </div>
                    </td>
                    <td>
                      {row.rawAlias ? (
                        <code className="code-badge" style={{ fontSize: "0.85rem" }}>
                          {row.rawAlias}
                        </code>
                      ) : (
                        <span style={{ color: "var(--color-ink-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                          (Auto-generate)
                        </span>
                      )}
                    </td>
                    <td>
                      {row.sanitizedTitle ? (
                        <span style={{ fontSize: "0.9rem", color: "var(--color-ink)" }}>
                          {row.sanitizedTitle}
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-ink-muted)", fontSize: "0.85rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      {row.isValid ? (
                        <span className="badge badge-active flex items-center gap-1" style={{ fontSize: "0.8rem", width: "fit-content" }}>
                          <CheckCircle size={13} />
                          <span>Valid</span>
                        </span>
                      ) : (
                        <div>
                          <span className="badge badge-disabled flex items-center gap-1" style={{ fontSize: "0.8rem", marginBottom: "4px", width: "fit-content" }}>
                            <AlertCircle size={13} />
                            <span>Invalid</span>
                          </span>
                          <div style={{ color: "var(--color-text-danger)", fontSize: "0.8rem", fontWeight: 700, maxWidth: "260px", lineHeight: 1.3 }}>
                            {row.error}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
