export type QRCodeStatus = "active" | "archived";

export interface QRCodeRecord {
  id: string;
  name: string;
  content: string;
  foreground: string;
  background: string;
  status: QRCodeStatus;
  createdAt: string;
  scanCount: number;
}

export interface ScanEvent {
  qrCodeId: string;
  scannedAt: string;
  countryCode?: string;
  deviceType?: "mobile" | "desktop" | "tablet" | "unknown";
  source?: string;
}

export interface AnalyticsSummary {
  totalScans: number;
  uniqueVisitors: number;
  scanRate: number;
  previousPeriodChange: number;
}
