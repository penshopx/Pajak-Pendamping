import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MAX_TRANSACTIONS, validateTransaction, type BusinessTransaction } from './business-ledger';
import { updateLearningCompleted, validateLearningCompleted } from './learning-path';
import {
  assertTradeLedger, deleteBillInLedger, linkTransactionInLedger, recordPaymentInLedger,
  saveBillInLedger, unlinkTransactionInLedger, type TradeBill, type TradeLedger, type TradePaymentInput,
} from './trade-ledger';

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
export interface ChatSource {
  id: string; title: string; url: string; publisher: string; category: string; checkedAt: string;
  sourceType?: string; locator?: string; version?: string; verification?: string; limitations?: string; excerpt?: string;
}
export interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string; createdAt: string;
  sources?: ChatSource[]; disclaimer?: string; checkedAt?: string;
}

interface State { profile: Profile; obligations: Obligation[]; payments: Payment[]; chat: ChatMessage[]; transactions: BusinessTransaction[]; tradeBills: TradeBill[]; learningCompleted: string[] }

const KEY = 'sahabat-pajak:v1';
const EMPTY: State = { profile: { businessName: '', businessType: 'orang-pribadi' }, obligations: [], payments: [], chat: [], transactions: [], tradeBills: [], learningCompleted: [] };
const READ_ERROR = 'Data lokal tidak dapat dibaca dengan aman. Data asli tidak dihapus. Jangan hapus data peramban; pulihkan cadangan atau hubungi pengelola sebelum melanjutkan.';

export const TAX_TYPES = [
  'PPh Final UMKM', 'PPh 21', 'PPh 23', 'PPh 25', 'PPh 4 ayat (2)', 'PPh Tahunan (SPT)', 'PPN', 'PBB', 'Lainnya',
];

function readState(): State {
  const raw = localStorage.getItem(KEY);
  if (!raw) return EMPTY;
  try {
    const p = JSON.parse(raw) as Partial<State>;
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error(READ_ERROR);
    for (const key of ['obligations', 'payments', 'chat', 'transactions', 'tradeBills'] as const) {
      if (p[key] !== undefined && !Array.isArray(p[key])) throw new Error(READ_ERROR);
    }
    if (p.transactions && (p.transactions.length > MAX_TRANSACTIONS || !p.transactions.every(validateTransaction)
      || new Set(p.transactions.map(t => t.id)).size !== p.transactions.length)) throw new Error(READ_ERROR);
    assertTradeLedger(p.tradeBills ?? [], p.transactions ?? []);
    if (p.learningCompleted !== undefined && !validateLearningCompleted(p.learningCompleted)) throw new Error(READ_ERROR);
    return {
      ...p,
      profile: { ...EMPTY.profile, ...(p.profile ?? {}) },
      obligations: Array.isArray(p.obligations) ? p.obligations : [],
      payments: Array.isArray(p.payments) ? p.payments : [],
      chat: Array.isArray(p.chat) ? p.chat : [],
      transactions: p.transactions ?? [],
      tradeBills: p.tradeBills ?? [],
      learningCompleted: p.learningCompleted ?? [],
    };
  } catch { throw new Error(READ_ERROR); }
}
function load() {
  try { return { state: readState(), error: null as string | null }; }
  catch { return { state: EMPTY, error: READ_ERROR }; }
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
  storageError: string | null;
  saveTransaction: (t: Omit<BusinessTransaction, 'id'> & { id?: string }) => void;
  deleteTransaction: (id: string) => void;
  saveTradeBill: (b: Omit<TradeBill, 'id'> & { id?: string }) => void;
  deleteTradeBill: (id: string) => void;
  recordTradePayment: (input: TradePaymentInput) => void;
  linkTradeTransaction: (billId: string, transactionId: string) => void;
  unlinkTradeTransaction: (transactionId: string) => void;
  setLearningComplete: (id: string, done: boolean) => void;
  resetLearningProgress: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(load);
  const [state, setInternalState] = useState<State>(initial.state);
  const [storageError, setStorageError] = useState<string | null>(initial.error);
  // Persist before announcing success; no mount-time write may replace unreadable data.
  // Re-read the latest browser snapshot so a delayed storage event cannot lose another tab's entries.
  const persist = useCallback((update: (s: State) => State, reset = false) => {
    try {
      const next = update(reset ? EMPTY : readState());
      localStorage.setItem(KEY, JSON.stringify(next));
      setInternalState(next);
      setStorageError(null);
    } catch (error) {
      const message = error instanceof Error && error.message === READ_ERROR
        ? READ_ERROR : error instanceof Error && !(error instanceof DOMException)
          ? error.message : 'Penyimpanan peramban gagal. Perubahan tidak disimpan. Ekspor catatan yang masih terlihat dan periksa kapasitas/izin penyimpanan.';
      setStorageError(message);
      throw new Error(message);
    }
  }, []);
  const setState = useCallback((update: (s: State) => State) => persist(update), [persist]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== KEY && event.key !== null) return;
      const latest = load();
      setStorageError(latest.error);
      if (!latest.error) setInternalState(latest.state);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

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
  const clearAll = useCallback(() => persist(() => EMPTY, true), [persist]);
  const saveTransaction = useCallback((input: Omit<BusinessTransaction, 'id'> & { id?: string }) => setState(s => {
    const previous = s.transactions.find(t => t.id === input.id);
    if (input.tradeBillId !== undefined && input.tradeBillId !== previous?.tradeBillId) {
      throw new Error('Tautkan transaksi melalui menu Piutang & Utang agar kas tidak dicatat dua kali.');
    }
    const transaction = { ...input, id: input.id ?? uid(), tradeBillId: previous?.tradeBillId, description: input.description.trim(), notes: input.notes.trim() };
    if (!validateTransaction(transaction)) throw new Error('Periksa tanggal, uraian, kategori, dan nominal rupiah bulat yang lebih dari nol.');
    if (input.id && !s.transactions.some(t => t.id === input.id)) throw new Error('Transaksi sudah berubah atau dihapus. Muat ulang daftar sebelum menyunting.');
    if (!input.id && s.transactions.length >= MAX_TRANSACTIONS) throw new Error(`Batas ${MAX_TRANSACTIONS} transaksi lokal tercapai. Ekspor catatan sebelum melanjutkan.`);
    const transactions = upsert(s.transactions, transaction);
    assertTradeLedger(s.tradeBills, transactions);
    return { ...s, transactions };
  }), [setState]);
  const deleteTransaction = useCallback((id: string) => setState(s => {
    if (!s.transactions.some(t => t.id === id)) throw new Error('Transaksi sudah dihapus. Muat ulang daftar.');
    return { ...s, transactions: s.transactions.filter(t => t.id !== id) };
  }), [setState]);
  // Invoice changes and cash settlements share one storage commit: never persist
  // a paid balance separately from the cash entry that supports it.
  const updateTrade = useCallback((change: (ledger: TradeLedger) => TradeLedger) =>
    setState(s => ({ ...s, ...change(s) })), [setState]);
  const saveTradeBill = useCallback((input: Omit<TradeBill, 'id'> & { id?: string }) => updateTrade(s =>
    saveBillInLedger(s, {
      ...input, id: input.id ?? uid(), party: input.party.trim(), reference: input.reference.trim(),
      description: input.description.trim(), notes: input.notes.trim(),
    }, Boolean(input.id))), [updateTrade]);
  const deleteTradeBill = useCallback((id: string) => updateTrade(s => deleteBillInLedger(s, id)), [updateTrade]);
  const recordTradePayment = useCallback((input: TradePaymentInput) => updateTrade(s => recordPaymentInLedger(s, input)), [updateTrade]);
  const linkTradeTransaction = useCallback((billId: string, transactionId: string) =>
    updateTrade(s => linkTransactionInLedger(s, billId, transactionId)), [updateTrade]);
  const unlinkTradeTransaction = useCallback((id: string) => updateTrade(s => unlinkTransactionInLedger(s, id)), [updateTrade]);
  const setLearningComplete = useCallback((id: string, done: boolean) => setState(s => ({
    ...s, learningCompleted: updateLearningCompleted(s.learningCompleted, id, done),
  })), [setState]);
  const resetLearningProgress = useCallback(() => setState(s => ({ ...s, learningCompleted: [] })), [setState]);
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
    addChat, clearChat, loadDemo, removeDemo, clearAll, hasDemo, storageError, saveTransaction, deleteTransaction,
    saveTradeBill, deleteTradeBill, recordTradePayment, linkTradeTransaction, unlinkTradeTransaction,
    setLearningComplete, resetLearningProgress,
  }), [state, setProfile, saveObligation, deleteObligation, toggleObligation, savePayment, deletePayment, addChat, clearChat, loadDemo, removeDemo, clearAll, hasDemo, storageError, saveTransaction, deleteTransaction,
    saveTradeBill, deleteTradeBill, recordTradePayment, linkTradeTransaction, unlinkTradeTransaction, setLearningComplete, resetLearningProgress]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore must be used within StoreProvider');
  return c;
}
