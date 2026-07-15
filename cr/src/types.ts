import type { RiskLevel } from "./theme";

export type { RiskLevel };

/** Lifecycle of a submitted report (mirrors the design's status set). */
export type ReportStatus = "processing" | "complete" | "flagged";

export interface GeoPoint {
  lat: number;
  lng: number;
  /** Metres of horizontal accuracy, when the device reports it. */
  accuracy?: number;
}

/** A resolved location: coordinates plus a human-readable zone label. */
export interface ResolvedLocation extends GeoPoint {
  zone: string;
}

export interface Report {
  id: string;
  risk: RiskLevel;
  status: ReportStatus;
  zone: string;
  siteType: string;
  confidence: number;
  /** Whole days since the report was filed (used to render a relative time). */
  days: number;
  /** Optional finer-grained age for same-day reports. */
  hours?: number;
}

/** Result of analysing a captured photo. */
export interface AnalysisResult {
  risk: RiskLevel;
  confidence: number;
  siteType: string;
}
