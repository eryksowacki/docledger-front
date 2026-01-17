import { apiFetchBlob } from "./api";

type KpirPeriod =
  | { mode: "month"; year: number; month: number }
  | { mode: "quarter"; year: number; quarter: number }
  | { mode: "year"; year: number };

type ContractorXlsxParams = {
  dateFrom: string;
  dateTo: string;
  includeIncome: boolean;
  includeCost: boolean;
  contractorId?: number | null;
};

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadKpirPdf(period: KpirPeriod) {
  const { blob, filename } = await apiFetchBlob("/api/reports/kpir", {
    method: "POST",
    body: JSON.stringify(period),
  });

  const fallback =
    period.mode === "month"
      ? `kpir-${period.year}-${String(period.month).padStart(2, "0")}.pdf`
      : period.mode === "quarter"
      ? `kpir-${period.year}-Q${period.quarter}.pdf`
      : `kpir-${period.year}.pdf`;

  triggerDownload(blob, filename ?? fallback);
}

export async function downloadContractorsXlsx(params: ContractorXlsxParams) {
  const { blob, filename } = await apiFetchBlob(
    "/api/reports/contractors-xlsx",
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );

  triggerDownload(
    blob,
    filename ?? `raport-kontrahenci-${params.dateFrom}_${params.dateTo}.xlsx`
  );
}
