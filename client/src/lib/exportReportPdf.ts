/**
 * Export Report to PDF — Uses browser print to generate a clean PDF
 * of the report detail view. Works on desktop and mobile.
 */

export interface ReportPdfData {
  reportType: string;
  reportTypeLabel: string;
  storeName: string;
  reportDate: string;
  submittedBy: string;
  score?: string;
  submittedAt?: string;
  position?: string;
  status?: string;
}

/**
 * Export the report detail to PDF by opening a print-friendly window.
 * The `contentHtml` should be the innerHTML of the report detail renderer.
 */
export function exportReportToPdf(
  meta: ReportPdfData,
  contentElement: HTMLElement | null
) {
  if (!contentElement) return;

  // Clone the content to avoid modifying the original
  const clone = contentElement.cloneNode(true) as HTMLElement;

  // Remove any buttons, inputs, or interactive elements from the clone
  clone.querySelectorAll("button, input, textarea, select, [data-no-print]").forEach(el => el.remove());

  // Convert any images to have proper sizing for print
  clone.querySelectorAll("img").forEach(img => {
    img.style.maxWidth = "200px";
    img.style.maxHeight = "200px";
    img.style.objectFit = "contain";
  });

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to export PDF");
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${meta.reportTypeLabel} — ${meta.storeName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1a1a1a;
      padding: 32px;
      max-width: 800px;
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Header */
    .report-header {
      border-bottom: 2px solid #D4A853;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .report-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1C1210;
      margin-bottom: 4px;
    }
    .report-header .subtitle {
      font-size: 13px;
      color: #666;
    }
    .company-name {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #D4A853;
      font-weight: 600;
      margin-bottom: 8px;
    }

    /* Meta Grid */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
      padding: 16px;
      background: #faf8f5;
      border-radius: 8px;
      border: 1px solid #e8e0d4;
    }
    .meta-item label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      display: block;
      margin-bottom: 2px;
    }
    .meta-item span {
      font-size: 13px;
      font-weight: 600;
      color: #1C1210;
    }
    .meta-item .score {
      font-size: 18px;
      font-weight: 700;
      color: #D4A853;
    }
    .meta-item .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-submitted {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .status-draft {
      background: #ffedd5;
      color: #9a3412;
      border: 1px solid #fed7aa;
    }

    /* Content */
    .report-content {
      font-size: 13px;
      line-height: 1.6;
    }
    .report-content > div {
      margin-bottom: 8px;
    }

    /* Override any dark mode styles */
    .report-content * {
      color: #1a1a1a !important;
      background-color: transparent !important;
    }
    .report-content [class*="bg-amber"], .report-content [class*="bg-blue"],
    .report-content [class*="bg-emerald"], .report-content [class*="bg-red"],
    .report-content [class*="bg-muted"] {
      background-color: #f5f5f5 !important;
      border: 1px solid #e0e0e0 !important;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
    }
    th, td {
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid #e5e5e5;
      font-size: 12px;
    }
    th {
      font-weight: 600;
      background: #f5f2ed !important;
      color: #1C1210 !important;
    }

    /* Cards */
    [class*="rounded"], [class*="border"] {
      border: 1px solid #e5e5e5 !important;
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 6px;
    }

    /* Stars */
    svg {
      width: 12px;
      height: 12px;
    }

    /* Photos */
    img {
      max-width: 180px;
      max-height: 180px;
      object-fit: contain;
      border-radius: 4px;
      border: 1px solid #ddd;
    }

    /* Footer */
    .report-footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e5e5;
      font-size: 10px;
      color: #999;
      text-align: center;
    }

    @media print {
      body { padding: 16px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <p class="company-name">Hinnawi Bros Operations</p>
    <h1>${meta.reportTypeLabel}</h1>
    <p class="subtitle">${meta.storeName} — ${meta.reportDate}</p>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <label>Store</label>
      <span>${meta.storeName}</span>
    </div>
    <div class="meta-item">
      <label>Report Date</label>
      <span>${meta.reportDate}</span>
    </div>
    ${meta.position ? `<div class="meta-item"><label>Position</label><span>${meta.position}</span></div>` : ""}
    <div class="meta-item">
      <label>Submitted By</label>
      <span>${meta.submittedBy}</span>
    </div>
    <div class="meta-item">
      <label>Status</label>
      <span class="status-badge ${meta.status === "draft" ? "status-draft" : "status-submitted"}">${meta.status === "draft" ? "Not Submitted" : "Submitted"}</span>
    </div>
    ${meta.score ? `<div class="meta-item"><label>Score</label><span class="score">${meta.score}</span></div>` : ""}
    ${meta.submittedAt ? `<div class="meta-item"><label>Submitted At</label><span>${meta.submittedAt}</span></div>` : ""}
  </div>

  <div class="report-content">
    ${clone.innerHTML}
  </div>

  <div class="report-footer">
    <p>Generated on ${new Date().toLocaleString("en-CA")} — Hinnawi Bros Operations Dashboard</p>
  </div>

  <script>
    // Auto-trigger print after images load
    const images = document.querySelectorAll('img');
    if (images.length === 0) {
      setTimeout(() => window.print(), 300);
    } else {
      let loaded = 0;
      images.forEach(img => {
        if (img.complete) { loaded++; }
        else {
          img.onload = () => { loaded++; if (loaded >= images.length) setTimeout(() => window.print(), 300); };
          img.onerror = () => { loaded++; if (loaded >= images.length) setTimeout(() => window.print(), 300); };
        }
      });
      if (loaded >= images.length) setTimeout(() => window.print(), 300);
    }
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
