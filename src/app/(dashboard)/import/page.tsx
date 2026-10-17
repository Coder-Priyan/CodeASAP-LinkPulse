"use client";

import { useState } from "react";
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
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Top Navigation */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/dashboard" className="btn btn-secondary btn-sm flex items-center gap-2" style={{ display: "inline-flex" }}>
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.4rem" }} className="flex items-center gap-2">
            <FileSpreadsheet size={28} color="var(--accent-primary)" />
            <span>CSV Bulk Import</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Upload a CSV to batch create up to 200 shortened links into your account with automatic validation.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Download size={15} />
          <span>Download CSV Template</span>
        </button>
      </div>

      {/* Upload Box */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
          Step 1: Select CSV File
        </h2>

        <div
          style={{
            border: "2px dashed var(--border-color)",
            borderRadius: "var(--radius-lg)",
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            cursor: "pointer",
          }}
          onClick={() => document.getElementById("csvFileInput")?.click()}
        >
          <Upload size={32} color="var(--accent-secondary)" style={{ margin: "0 auto 0.75rem" }} />
          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
            {file ? file.name : "Click to select or drag and drop a CSV file"}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Columns: <code style={{ color: "var(--accent-secondary)" }}>destination_url</code> (required), <code style={{ color: "var(--accent-secondary)" }}>alias</code> (optional), <code style={{ color: "var(--accent-secondary)" }}>title</code> (optional). Max 1 MB, 200 rows.
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
          <div className="flex items-center gap-2" style={{ marginTop: "1rem", color: "var(--accent-primary)" }}>
            <RefreshCw size={16} className="spin" />
            <span>Validating rows and checking domain blocklist...</span>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-md)",
              color: "#fca5a5",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Import Execution Summary Banner if finished */}
      {summary && (
        <div
          className="card"
          style={{
            marginBottom: "2rem",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            borderColor: "rgba(16, 185, 129, 0.3)",
          }}
        >
          <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
            <div className="flex items-center gap-2">
              <CheckCircle size={22} color="var(--success)" />
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#6ee7b7" }}>
                  Import Complete
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Created <strong>{summary.createdCount}</strong> links, skipped <strong>{summary.skippedCount}</strong> rows.
                </p>
              </div>
            </div>

            <Link href="/dashboard" className="btn btn-primary btn-sm">
              View Links in Dashboard &rarr;
            </Link>
          </div>

          {summary.skipped.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fca5a5", marginBottom: "0.5rem" }}>
                Skipped Rows ({summary.skipped.length}):
              </div>
              <ul style={{ fontSize: "0.8rem", color: "var(--text-muted)", paddingLeft: "1.25rem", margin: 0 }}>
                {summary.skipped.map((s, idx) => (
                  <li key={idx} style={{ marginBottom: "0.25rem" }}>
                    Line {s.lineNumber}: {s.reason} ({s.destinationUrl})
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
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                Step 2: Preview & Validate ({previewRows.length} rows)
              </h2>
              <div className="flex items-center gap-3" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                <span style={{ color: "var(--success)" }}>
                  &bull; {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span style={{ color: "var(--danger)" }}>
                    &bull; {invalidCount} invalid
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={importing || validCount === 0}
              className="btn btn-primary flex items-center gap-2"
            >
              {importing ? (
                <>
                  <RefreshCw size={15} className="spin" />
                  <span>Importing Links...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={15} />
                  <span>Import {validCount} Valid {validCount === 1 ? "Link" : "Links"}</span>
                </>
              )}
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>Line</th>
                  <th>Destination URL</th>
                  <th>Alias</th>
                  <th>Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.lineNumber}>
                    <td style={{ fontFamily: "monospace", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      {row.lineNumber}
                    </td>
                    <td>
                      <div className="truncate max-w-xs" title={row.rawUrl} style={{ fontSize: "0.85rem" }}>
                        {row.rawUrl}
                      </div>
                    </td>
                    <td>
                      {row.rawAlias ? (
                        <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--accent-secondary)" }}>
                          {row.rawAlias}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
                          (Auto-generate)
                        </span>
                      )}
                    </td>
                    <td>
                      {row.sanitizedTitle ? (
                        <span style={{ fontSize: "0.85rem" }}>
                          {row.sanitizedTitle}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      {row.isValid ? (
                        <span className="badge badge-active flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                          <CheckCircle size={12} />
                          <span>Valid</span>
                        </span>
                      ) : (
                        <div>
                          <span className="badge badge-inactive flex items-center gap-1" style={{ fontSize: "0.75rem", marginBottom: "2px" }}>
                            <AlertCircle size={12} />
                            <span>Invalid</span>
                          </span>
                          <div style={{ color: "#fca5a5", fontSize: "0.75rem", maxWidth: "240px" }}>
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
