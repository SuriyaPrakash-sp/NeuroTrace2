// The contract has no GET endpoint for assessments or plans, so the latest results returned by
// POST endpoints are kept per browser session. All storage access is guarded.
const get = <T,>(k: string): T | null => { try { const v = sessionStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; } };
const set = (k: string, v: unknown) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export const cache = {
  getAssessment: <T,>(sid: string) => get<T>(`nt:assessment:${sid}`),
  setAssessment: (sid: string, v: unknown) => set(`nt:assessment:${sid}`, v),
  getPlan: <T,>(sid: string) => get<T>(`nt:plan:${sid}`),
  setPlan: (sid: string, v: unknown) => set(`nt:plan:${sid}`, v),
  isReviewed: (planId: string) => get<boolean>(`nt:reviewed:${planId}`) === true,
  markReviewed: (planId: string) => set(`nt:reviewed:${planId}`, true),
};
