import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type BusinessType = 'orang-pribadi' | 'badan';
export interface Profile { businessName: string; businessType: BusinessType }
export interface Obligation {
  id: string; title: string; taxType: string; period: string; dueDate: string;
  amount: number; status: 'belum' | 'selesai'; notes: string; demo?: boolean;
}
export interface Payment {
  id: string; taxType: string; period: string; amount: number; date: string;
  ntpn?: string; notes: string; demo?: boolean;
}
export interface ChatSource { id: string; title: string; url: string; publisher: string; category: string; checkedAt: string }
export interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string; createdAt: string;
  sources?: ChatSource[]; disclaimer?: string; checkedAt?: string;
}

interface State { profile: Profile; obligations: Obligation[]; payments: Payment[]; chat: ChatMessage[] }

const KEY = 'sahabat-pajak:v1';
const EMPTY: State = { profile: { businessName: '', businessType: 'orang-pribadi' }, obligations: [], payments: [], chat: [] };

export const TAX_TYPES = [
  'PPh Final UMKM', 'PPh 21', 'PPh 23', 'PPh 25', 'PPh 4 ayat (2)', 'PPh Tahunan (SPT)', 'PPN', 'PBB', 'Lainnya',
];

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<State>;
    return {
      profile: { ...EMPTY.profile, ...(p.profile ?? {}) },
      obligations: Array.isArray(p.obligations) ? p.obligations : [],
      payments: Array.isArray(p.payments) ? p.payments : [],
      chat: Array.isArray(p.chat) ? p.chat : [],
    };
  } catch { return EMPTY; }
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

interface Ctx extends State {
  setProfile: (p: Profile) => void;
  saveObligation: (o: Omit<Obligation, 'id'> & { id?: string }) => void;
  deleteObligation: (id: string) => void;
  toggleObligation: (id: string) => void;
  savePayment: (p: Omit<Payment, 'id'> & { id?: string }) => void;
  deletePayment: (id: string) => void;
  addChat: (m: ChatMessage) => void;
  clearChat: () => void;
  loadDemo: () => void;
  removeDemo: () => void;
  clearAll: () => void;
  hasDemo: boolean;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ } }, [state]);

  const upsert = <T extends { id: string }>(list: T[], item: T) =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];

  const setProfile = useCallback((profile: Profile) => setState((s) => ({ ...s, profile })), []);
  const saveObligation = useCallback((o: Omit<Obligation, 'id'> & { id?: string }) =>
    setState((s) => ({ ...s, obligations: upsert(s.obligations, { ...o, id: o.id ?? uid() } as Obligation) })), []);
  const deleteObligation = useCallback((id: string) => setState((s) => ({ ...s, obligations: s.obligations.filter((x) => x.id !== id) })), []);
  const toggleObligation = useCallback((id: string) => setState((s) => ({
    ...s, obligations: s.obligations.map((x) => (x.id === id ? { ...x, status: x.status === 'selesai' ? 'belum' : 'selesai' } : x)),
  })), []);
  const savePayment = useCallback((p: Omit<Payment, 'id'> & { id?: string }) =>
    setState((s) => ({ ...s, payments: upsert(s.payments, { ...p, id: p.id ?? uid() } as Payment) })), []);
  const deletePayment = useCallback((id: string) => setState((s) => ({ ...s, payments: s.payments.filter((x) => x.id !== id) })), []);
  const addChat = useCallback((m: ChatMessage) => setState((s) => ({ ...s, chat: [...s.chat, m].slice(-60) })), []);
  const clearChat = useCallback(() => setState((s) => ({ ...s, chat: [] })), []);
  const clearAll = useCallback(() => setState(EMPTY), []);
  const removeDemo = useCallback(() => setState((s) => ({
    ...s, obligations: s.obligations.filter((x) => !x.demo), payments: s.payments.filter((x) => !x.demo),
  })), []);
  const loadDemo = useCallback(() => {
    const now = new Date();
    const ym = (off: number) => { const d = new Date(now.getFullYear(), now.getMonth() + off, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
    const day = (period: string, d: number) => `${period}-${String(d).padStart(2, '0')}`;
    const p0 = ym(-1), p1 = ym(0), p2 = ym(-2);
    const obligations: Obligation[] = [
      { id: uid(), title: '[Contoh] Setor PPh Final UMKM', taxType: 'PPh Final UMKM', period: p2, dueDate: day(ym(-1), 15), amount: 412500, status: 'selesai', notes: 'Data contoh, bukan data Anda.', demo: true },
      { id: uid(), title: '[Contoh] Setor PPh Final UMKM', taxType: 'PPh Final UMKM', period: p0, dueDate: day(p1, 15), amount: 387250, status: 'belum', notes: 'Data contoh. Periksa tenggat resmi di DJP.', demo: true },
      { id: uid(), title: '[Contoh] PPh 21 karyawan paruh waktu', taxType: 'PPh 21', period: p0, dueDate: day(p1, 10), amount: 126800, status: 'belum', notes: 'Data contoh.', demo: true },
    ];
    const payments: Payment[] = [
      { id: uid(), taxType: 'PPh Final UMKM', period: p2, amount: 412500, date: day(ym(-1), 12), ntpn: '', notes: 'Data contoh. Tidak ada NTPN nyata.', demo: true },
    ];
    setState((s) => ({ ...s, obligations: [...obligations, ...s.obligations.filter((x) => !x.demo)], payments: [...payments, ...s.payments.filter((x) => !x.demo)] }));
  }, []);

  const hasDemo = state.obligations.some((x) => x.demo) || state.payments.some((x) => x.demo);
  const value = useMemo<Ctx>(() => ({
    ...state, setProfile, saveObligation, deleteObligation, toggleObligation, savePayment, deletePayment,
    addChat, clearChat, loadDemo, removeDemo, clearAll, hasDemo,
  }), [state, setProfile, saveObligation, deleteObligation, toggleObligation, savePayment, deletePayment, addChat, clearChat, loadDemo, removeDemo, clearAll, hasDemo]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore must be used within StoreProvider');
  return c;
}
