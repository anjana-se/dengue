import type { Report, ResolvedLocation } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string;
  role: string;
}

let zonesCache: Record<string, string> = {};

// Helper: Get local storage items safely
const getLocal = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// Helper: Set local storage items safely
const setLocal = (key: string, val: string): void => {
  try {
    localStorage.setItem(key, val);
  } catch {}
};

// Helper: Remove local storage items safely
const removeLocal = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {}
};

export const api = {
  getAccessToken(): string | null {
    return getLocal("dg_access_token");
  },

  getRefreshToken(): string | null {
    return getLocal("dg_refresh_token");
  },

  getUser(): UserProfile | null {
    const raw = getLocal("dg_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setAuth(tokens: TokenPair, user: UserProfile) {
    setLocal("dg_access_token", tokens.access_token);
    setLocal("dg_refresh_token", tokens.refresh_token);
    setLocal("dg_user", JSON.stringify(user));
  },

  logout() {
    removeLocal("dg_access_token");
    removeLocal("dg_refresh_token");
    removeLocal("dg_user");
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },

  async request(url: string, options: RequestInit = {}): Promise<any> {
    const headers = new Headers(options.headers || {});
    
    // Add bearer token if present
    const token = this.getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Set Content-Type only if it's not FormData (which sets its own boundary)
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    options.headers = headers;

    let res = await fetch(`${API_BASE}${url}`, options);

    // If 401 Unauthorized, try to refresh the token
    if (res.status === 401 && this.getRefreshToken()) {
      try {
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          // Retry original request with the new access token
          headers.set("Authorization", `Bearer ${this.getAccessToken()}`);
          res = await fetch(`${API_BASE}${url}`, options);
        }
      } catch (err) {
        this.logout();
        throw err;
      }
    }

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = { error: { message: "Unknown error occurred" } };
      }
      throw {
        status: res.status,
        message: errorData?.error?.message || errorData?.message || "Request failed",
        code: errorData?.error?.code || errorData?.code,
      };
    }

    return res.json();
  },

  async refreshTokens(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        this.logout();
        return false;
      }

      const payload = await res.json();
      if (payload.success && payload.data?.access_token) {
        setLocal("dg_access_token", payload.data.access_token);
        if (payload.data.refresh_token) {
          setLocal("dg_refresh_token", payload.data.refresh_token);
        }
        return true;
      }
    } catch {
      this.logout();
    }
    return false;
  },

  // ─── AUTH ENDPOINTS ────────────────────────────────────────────────────────

  async requestOtp(email: string, fullName?: string): Promise<{ success: boolean; message: string }> {
    const body: Record<string, string> = { email };
    if (fullName) {
      body.full_name = fullName;
    }
    const res = await this.request("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return {
      success: true,
      message: res.data?.message || "OTP code sent to your email",
    };
  },

  async verifyOtp(email: string, code: string): Promise<{ success: boolean; user: UserProfile }> {
    const res = await this.request("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });

    if (res.success && res.data?.access_token) {
      const { access_token, refresh_token, user } = res.data;
      this.setAuth({ access_token, refresh_token }, user);
      return { success: true, user };
    }

    throw new Error("Invalid verification response");
  },

  async loginWithGoogle(idToken: string): Promise<{ success: boolean; user: UserProfile }> {
    const res = await this.request("/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    });

    if (res.success && res.data?.access_token) {
      const { access_token, refresh_token, user } = res.data;
      this.setAuth({ access_token, refresh_token }, user);
      return { success: true, user };
    }

    throw new Error("Invalid Google sign-in response");
  },

  // ─── ZONES ENDPOINTS ───────────────────────────────────────────────────────

  async fetchZones(): Promise<Record<string, string>> {
    try {
      const res = await this.request("/zones");
      if (res.success && Array.isArray(res.data)) {
        const dict: Record<string, string> = {};
        for (const zone of res.data) {
          dict[zone.id] = `${zone.district} — ${zone.name}`;
        }
        zonesCache = dict;
        return dict;
      }
    } catch (err) {
      console.error("Failed to fetch zones:", err);
    }
    return zonesCache;
  },

  // ─── REPORTS ENDPOINTS ──────────────────────────────────────────────────────

  async getReports(): Promise<Report[]> {
    // Refresh zones cache to map zone_id to readable names
    const zones = Object.keys(zonesCache).length ? zonesCache : await this.fetchZones();

    const res = await this.request("/reports");
    if (res.success && res.data && Array.isArray(res.data.data)) {
      return res.data.data.map((r: any) => this.mapReport(r, zones));
    }
    return [];
  },

  async getReportDetails(id: string): Promise<Report | null> {
    const zones = Object.keys(zonesCache).length ? zonesCache : await this.fetchZones();
    const res = await this.request(`/reports/${id}`);
    if (res.success && res.data) {
      return this.mapReport(res.data, zones);
    }
    return null;
  },

  async submitReport(
    photoDataUrl: string,
    location: ResolvedLocation,
    notes?: string,
    language: string = "en"
  ): Promise<{ success: boolean; report_id: string; status: string }> {
    // Convert data URL to Blob
    const response = await fetch(photoDataUrl);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append("image", blob, "report.jpg");
    formData.append("latitude", String(location.lat));
    formData.append("longitude", String(location.lng));
    if (notes) {
      formData.append("notes", notes);
    }
    formData.append("language", language);

    const res = await this.request("/reports", {
      method: "POST",
      body: formData,
    });

    if (res.success && res.data?.report_id) {
      return {
        success: true,
        report_id: res.data.report_id,
        status: res.data.status,
      };
    }

    throw new Error(res.message || "Failed to submit report");
  },

  // Map backend report row to frontend model shape
  mapReport(r: any, zones: Record<string, string>): Report {
    const diffTime = Math.abs(new Date().getTime() - new Date(r.created_at).getTime());
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    // Map backend status ('pending', 'processing', 'complete', 'needs_human_review', 'failed')
    // to frontend ReportStatus ('processing' | 'complete' | 'flagged')
    let status: Report["status"] = "processing";
    if (r.status === "complete" || r.status === "failed" || r.status === "needs_human_review") {
      // High/Critical risk reports automatically spawn work orders in backend
      if (r.risk_level === "high" || r.risk_level === "critical") {
        status = "flagged";
      } else {
        status = "complete";
      }
    }

    // Map risk_level ('low', 'medium', 'high', 'critical' or null)
    const risk = (r.risk_level || "low").toLowerCase() as Report["risk"];

    const latNum = r.latitude != null ? Number(r.latitude) : null;
    const lngNum = r.longitude != null ? Number(r.longitude) : null;

    let imageUrl = r.image_url || undefined;
    if (imageUrl) {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
      try {
        const apiOrigin = new URL(API_BASE).origin;
        if (imageUrl.startsWith("http://localhost:3000")) {
          imageUrl = imageUrl.replace("http://localhost:3000", apiOrigin);
        }
      } catch (e) {
        // Fallback to original url
      }
    }

    return {
      id: r.id,
      risk,
      status,
      zone: r.zone_id
        ? zones[r.zone_id] || "Unknown Zone"
        : r.location_name || (latNum != null && lngNum != null
        ? `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`
        : "Unknown Zone"),
      siteType: r.site_type || "Stagnant Water",
      confidence: Math.round(Number(r.confidence_score ?? 0.5) * 100),
      days,
      hours: days === 0 ? Math.max(1, hours) : undefined,
      guidanceText: r.guidance_text || undefined,
      guidanceTextSi: r.guidance_text_si || undefined,
      guidanceTextTa: r.guidance_text_ta || undefined,
      latitude: latNum || undefined,
      longitude: lngNum || undefined,
      imageUrl,
      createdAt: r.created_at || undefined,
    };
  }
};
