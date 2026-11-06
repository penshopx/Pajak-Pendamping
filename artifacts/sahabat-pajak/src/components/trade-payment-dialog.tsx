import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Link2, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { uid, useStore } from '@/lib/store';
import { formatDate, rupiah, todayISO } from '@/lib/format';
import { parseRupiah } from '@/lib/rupiah';
import { categoryFor, validLedgerDate } from '@/lib/business-ledger';
import { billProgress, eligibleTradeTransactions, type TradeBill } from '@/lib/trade-ledger';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  date: z.string().refine(validLedgerDate, 'Masukkan tanggal yang benar-benar ada.'),
  amount: z.string(),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter.'),
});
type Values = z.infer<typeof schema>;
const inputCls = 'bg-background border-input text-foreground h-11';

export function TradePaymentDialog({ open, onOpenChange, bill }: { open: boolean; onOpenChange: (o: boolean) => void; bill: TradeBill | null }) {
  const { transactions, recordTradePayment, linkTradeTransaction } = useStore();
  const { toast } = useToast();
  const [mode, setMode] = useState<'baru' | 'tautkan'>('baru');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const paymentId = useRef('');
  const busy = useRef(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { date: todayISO(), amount: '', notes: '' } });

  const progress = bill ? billProgress(bill, transactions, todayISO()) : null;
  const remaining = progress?.remaining ?? 0;

  useEffect(() => {
    if (!open || !bill) return;
    paymentId.current = uid(); // once per opening; reused across retries/double-clicks
    busy.current = false;
    const t = todayISO();
    form.reset({ date: t < bill.date ? bill.date : t, amount: remaining > 0 ? remaining.toLocaleString('id-ID') : '', notes: '' });
    setMode('baru'); setError(null); setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bill?.id]);

  if (!bill || !progress) return null;
  const isIn = bill.kind === 'piutang';
  const eligible = eligibleTradeTransactions(bill, transactions).sort((a, b) => b.date.localeCompare(a.date));
  const amountPreview = parseRupiah(form.watch('amount') ?? '');

  const submit = (v: Values) => {
    if (busy.current) return;
    const r = parseRupiah(v.amount);
    if (!r.ok) { form.setError('amount', { message: r.error }); return; }
    if (r.value > remaining) { form.setError('amount', { message: `Melebihi sisa tagihan ${rupiah(remaining)}.` }); return; }
    if (v.date < bill.date) { form.setError('date', { message: `Tidak boleh sebelum tanggal tagihan (${formatDate(bill.date)}).` }); return; }
    busy.current = true;
    setError(null);
    try {
      recordTradePayment({ billId: bill.id, paymentId: paymentId.current, date: v.date, amount: r.value, notes: v.notes.trim() });
    } catch (e) {
      busy.current = false;
      setError(e instanceof Error ? e.message : 'Pembayaran gagal disimpan.');
      return;
    }
    toast({ title: isIn ? 'Penerimaan dicatat' : 'Pembayaran dicatat', description: `${rupiah(r.value)} · ${bill.party}. Satu transaksi kas baru dibuat.` });
    onOpenChange(false);
  };
  const link = () => {
    if (!selected || busy.current) return;
    busy.current = true;
    setError(null);
    try { linkTradeTransaction(bill.id, selected); }
    catch (e) { busy.current = false; setError(e instanceof Error ? e.message : 'Transaksi gagal ditautkan.'); return; }
    const t = transactions.find((x) => x.id === selected);
    toast({ title: 'Transaksi ditautkan', description: `${t ? rupiah(t.amount) : ''} · tidak ada transaksi kas baru.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-border bg-popover sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-white">{isIn ? 'Catat penerimaan piutang' : 'Catat pembayaran utang'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{bill.party} · {bill.reference || bill.description}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-card p-3 text-sm">
          <div><div className="text-xs text-foreground/70">Nilai</div><div className="num font-semibold text-white">{rupiah(bill.amount)}</div></div>
          <div><div className="text-xs text-foreground/70">Terbayar</div><div className="num font-semibold text-accent">{rupiah(progress.paid)}</div></div>
          <div><div className="text-xs text-foreground/70">Sisa</div><div className="num font-semibold text-white" data-testid="text-payment-remaining">{rupiah(remaining)}</div></div>
        </div>

        {remaining <= 0 ? (
          <div className="rounded-lg border border-[hsl(var(--success)/.4)] bg-[hsl(var(--success)/.08)] px-3 py-3 text-sm text-foreground" data-testid="text-payment-paid">Tagihan sudah lunas. Tidak bisa menambah pembayaran lagi.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Cara mencatat">
              {([['baru', PlusCircle, 'Buat transaksi kas baru'], ['tautkan', Link2, 'Tautkan transaksi yang ada']] as const).map(([m, Icon, l]) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); }} data-testid={`tab-payment-${m}`}
                  className={`press flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${mode === m ? 'border-primary bg-primary/15 text-white' : 'border-input text-foreground/80 hover:text-white'}`}>
                  <Icon className="h-4 w-4" />{l}
                </button>
              ))}
            </div>

            {mode === 'baru' ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
                  <p className="text-sm text-foreground/85">Mencatat {isIn ? 'uang yang sudah diterima' : 'uang yang sudah dibayarkan'}. Aplikasi tidak mengirim atau menagih uang. Akan dibuat <b className="text-white">satu transaksi {isIn ? 'pemasukan' : 'pengeluaran'}</b> kategori {categoryFor(bill.category)?.label}. Jika sudah pernah mencatatnya di Transaksi, pilih "Tautkan" agar tidak tercatat dua kali.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] font-semibold text-foreground">Tanggal {isIn ? 'diterima' : 'dibayar'}</FormLabel>
                        <FormControl><Input type="date" min={bill.date} className={inputCls} {...field} data-testid="input-payment-date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] font-semibold text-foreground">Nominal (Rp)</FormLabel>
                        <FormControl><Input inputMode="numeric" autoComplete="off" className={`${inputCls} num`} {...field} data-testid="input-payment-amount" /></FormControl>
                        {!form.formState.errors.amount && <FormDescription className="num text-xs">{amountPreview.ok ? rupiah(amountPreview.value) : `Maks. ${rupiah(remaining)}; boleh sebagian.`}</FormDescription>}
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] font-semibold text-foreground">Catatan (opsional)</FormLabel>
                      <FormControl><Textarea rows={2} className="bg-background border-input text-foreground" placeholder="Contoh: dibayar tunai di toko. Tanpa nomor rekening." {...field} data-testid="input-payment-notes" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {error && <ErrorBox msg={error} />}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-payment">Batal</Button>
                    <Button type="submit" className="press font-semibold" data-testid="button-save-payment">Simpan pembayaran</Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-foreground/85">Pilih transaksi yang sudah Anda catat. <b className="text-white">Tidak ada transaksi kas baru</b>; kas dan laba rugi tidak berubah, hanya sisa tagihan. Hanya transaksi {isIn ? 'pemasukan' : 'pengeluaran'} kategori {categoryFor(bill.category)?.label}, belum tertaut, sejak {formatDate(bill.date)}, dan maksimal {rupiah(remaining)} yang ditampilkan. Tidak ada penautan otomatis.</p>
                {eligible.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-input px-3 py-6 text-center text-sm text-foreground/80" data-testid="text-no-eligible">Belum ada transaksi yang cocok. Gunakan "Buat transaksi kas baru" bila pembayaran belum pernah dicatat.</div>
                ) : (
                  <ul className="max-h-64 space-y-1.5 overflow-y-auto" role="radiogroup" aria-label="Transaksi yang dapat ditautkan">
                    {eligible.map((t) => (
                      <li key={t.id}>
                        <button type="button" role="radio" aria-checked={selected === t.id} onClick={() => setSelected(t.id)} data-testid={`option-link-transaction-${t.id}`}
                          className={`press grid w-full grid-cols-[1fr_auto] gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors ${selected === t.id ? 'border-accent bg-accent/10' : 'border-input hover:border-foreground/40'}`}>
                          <span className="min-w-0"><span className="block truncate font-semibold text-white">{t.description}</span>
                            <span className="text-xs text-foreground/75">{formatDate(t.date)} · {categoryFor(t.category)?.label}</span></span>
                          <span className="num font-semibold text-white">{rupiah(t.amount)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {error && <ErrorBox msg={error} />}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-link">Batal</Button>
                  <Button type="button" className="press font-semibold" disabled={!selected} onClick={link} data-testid="button-confirm-link"><Link2 className="mr-1.5 h-4 w-4" />Tautkan tanpa transaksi baru</Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div role="alert" className="flex gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-foreground" data-testid="text-payment-error">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /><span><b>Belum tersimpan.</b> {msg}</span>
    </div>
  );
}
