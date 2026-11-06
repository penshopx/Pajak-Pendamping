import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/lib/store';
import { formatDate, rupiah, todayISO } from '@/lib/format';
import { parseRupiah } from '@/lib/rupiah';
import { validLedgerDate } from '@/lib/business-ledger';
import { billCategories, billProgress, type TradeBill, type TradeBillKind } from '@/lib/trade-ledger';
import { useToast } from '@/hooks/use-toast';

const dateMsg = 'Masukkan tanggal yang benar-benar ada (tahun 1900 sampai 2100).';
const schema = z.object({
  kind: z.enum(['piutang', 'utang']),
  party: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(80, 'Nama maksimal 80 karakter.'),
  reference: z.string().trim().max(60, 'Referensi maksimal 60 karakter.'),
  description: z.string().trim().min(3, 'Uraian minimal 3 karakter.').max(120, 'Uraian maksimal 120 karakter.'),
  date: z.string().refine(validLedgerDate, dateMsg),
  dueDate: z.string().refine(validLedgerDate, dateMsg),
  amount: z.string(),
  category: z.string().min(1, 'Pilih kategori.'),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter.'),
}).superRefine((v, ctx) => {
  const r = parseRupiah(v.amount);
  if (!r.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message: r.error });
  if (validLedgerDate(v.date) && validLedgerDate(v.dueDate) && v.dueDate < v.date)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dueDate'], message: 'Jatuh tempo tidak boleh sebelum tanggal tagihan.' });
  if (!billCategories(v.kind).some((c) => c.id === v.category))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['category'], message: 'Kategori tidak sesuai jenis tagihan.' });
});
type Values = z.infer<typeof schema>;

const firstCat = (k: TradeBillKind) => billCategories(k)[0].id;
const toValues = (b?: TradeBill | null, kind: TradeBillKind = 'piutang'): Values => b
  ? { kind: b.kind, party: b.party, reference: b.reference, description: b.description, date: b.date, dueDate: b.dueDate, amount: b.amount.toLocaleString('id-ID'), category: b.category, notes: b.notes }
  : { kind, party: '', reference: '', description: '', date: todayISO(), dueDate: todayISO(), amount: '', category: firstCat(kind), notes: '' };
const inputCls = 'bg-background border-input text-foreground h-11';
const label = 'text-[13px] font-semibold text-foreground';

export function TradeBillDialog({ open, onOpenChange, initial, defaultKind }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial: TradeBill | null; defaultKind: TradeBillKind;
}) {
  const { saveTradeBill, transactions } = useStore();
  const { toast } = useToast();
  const [saveError, setSaveError] = useState<string | null>(null);
  const busy = useRef(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(initial, defaultKind) });

  useEffect(() => {
    if (open) { form.reset(toValues(initial, defaultKind)); setSaveError(null); busy.current = false; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultKind]);

  const progress = initial ? billProgress(initial, transactions, todayISO()) : null;
  const locked = !!progress && progress.payments.length > 0;
  const earliestPayment = progress?.payments.reduce<string | null>((m, t) => (!m || t.date < m ? t.date : m), null) ?? null;
  const kind = form.watch('kind');
  const amountPreview = parseRupiah(form.watch('amount') ?? '');

  const submit = (v: Values) => {
    if (busy.current) return;
    const r = parseRupiah(v.amount);
    if (!r.ok) return;
    if (progress && r.value < progress.paid) { form.setError('amount', { message: `Nilai tidak boleh di bawah total terbayar ${rupiah(progress.paid)}.` }); return; }
    if (earliestPayment && v.date > earliestPayment) { form.setError('date', { message: `Tanggal tagihan tidak boleh setelah pembayaran pertama (${formatDate(earliestPayment)}).` }); return; }
    busy.current = true;
    setSaveError(null);
    try {
      saveTradeBill({ ...(initial ? { id: initial.id } : {}), kind: v.kind, party: v.party.trim(), reference: v.reference.trim(), description: v.description.trim(),
        date: v.date, dueDate: v.dueDate, amount: r.value, category: v.category, notes: v.notes.trim() });
    } catch (e) {
      busy.current = false;
      setSaveError(e instanceof Error ? e.message : 'Tagihan gagal disimpan di peramban ini.');
      return;
    }
    toast({ title: initial ? 'Tagihan diperbarui' : 'Tagihan dicatat', description: `${v.party.trim()} · ${rupiah(r.value)}` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-border bg-popover sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-white">{initial ? 'Ubah tagihan' : 'Catat tagihan baru'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">Mencatat tagihan tidak membuat transaksi kas dan tidak mengubah laba rugi. Hanya pembayaran tertaut yang masuk rekap kas.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
            {locked && (
              <div role="note" className="flex gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm text-foreground" data-testid="text-bill-locked">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Sudah ada {progress!.payments.length} pembayaran tertaut ({rupiah(progress!.paid)}). Jenis dan kategori dikunci, nilai tidak boleh di bawah jumlah terbayar, dan tanggal tagihan tidak boleh setelah pembayaran pertama.</span>
              </div>
            )}
            <FormField control={form.control} name="kind" render={({ field }) => (
              <FormItem>
                <FormLabel className={label}>Jenis tagihan</FormLabel>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jenis tagihan">
                  {(['piutang', 'utang'] as const).map((k) => {
                    const on = field.value === k; const Icon = k === 'piutang' ? ArrowDownLeft : ArrowUpRight;
                    return (
                      <button key={k} type="button" role="radio" aria-checked={on} disabled={locked} data-testid={`radio-bill-kind-${k}`}
                        onClick={() => { if (on || locked) return; field.onChange(k); form.setValue('category', firstCat(k), { shouldValidate: form.formState.isSubmitted }); }}
                        className={`press flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${on ? (k === 'piutang' ? 'border-accent bg-accent/15' : 'border-primary bg-primary/15') : 'border-input hover:border-foreground/40'}`}>
                        <span className="flex items-center gap-2 text-sm font-semibold text-white"><Icon className="h-4 w-4" />{k === 'piutang' ? 'Piutang' : 'Utang'}</span>
                        <span className="mt-0.5 text-xs text-foreground/75">{k === 'piutang' ? 'Pelanggan belum membayar Anda' : 'Anda belum membayar pemasok'}</span>
                      </button>
                    );
                  })}
                </div>
              </FormItem>
            )} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="party" render={({ field }) => (
                <FormItem>
                  <FormLabel className={label}>{kind === 'piutang' ? 'Nama pelanggan' : 'Nama pemasok'}</FormLabel>
                  <FormControl><Input maxLength={90} autoComplete="off" placeholder={kind === 'piutang' ? 'Contoh: Warung Bu Sari' : 'Contoh: CV Tepung Makmur'} className={inputCls} {...field} data-testid="input-bill-party" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reference" render={({ field }) => (
                <FormItem>
                  <FormLabel className={label}>No. faktur / nota (opsional)</FormLabel>
                  <FormControl><Input maxLength={70} autoComplete="off" placeholder="INV-0412" className={inputCls} {...field} data-testid="input-bill-reference" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className={label}>Uraian</FormLabel>
                <FormControl><Input maxLength={130} placeholder="Contoh: Pesanan 40 kotak kue lebaran" className={inputCls} {...field} data-testid="input-bill-description" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel className={label}>Tanggal tagihan</FormLabel>
                  <FormControl><Input type="date" className={inputCls} {...field} data-testid="input-bill-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel className={label}>Jatuh tempo</FormLabel>
                  <FormControl><Input type="date" className={inputCls} {...field} data-testid="input-bill-due-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel className={label}>Nilai tagihan (Rp)</FormLabel>
                  <FormControl><Input inputMode="numeric" autoComplete="off" placeholder="1.250.000" className={`${inputCls} num`} {...field} data-testid="input-bill-amount" /></FormControl>
                  {!form.formState.errors.amount && <FormDescription className="num text-xs">{amountPreview.ok ? rupiah(amountPreview.value) : 'Sesuai nota, apa adanya.'}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel className={label}>Kategori saat pembayaran</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={locked}>
                  <FormControl><SelectTrigger className={inputCls} data-testid="select-bill-category"><SelectValue placeholder="Pilih kategori" /></SelectTrigger></FormControl>
                  <SelectContent>{billCategories(kind).map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
                <FormDescription className="text-xs">Kategori ini dipakai untuk transaksi kas pembayarannya. {field.value === 'persediaan' || field.value === 'aset' ? 'Pembayaran persediaan/aset tetap di luar laba rugi; HPP tetap dicatat terpisah sebagai penyesuaian nonkas.' : ''}</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className={label}>Catatan (opsional)</FormLabel>
                <FormControl><Textarea rows={2} className="bg-background border-input text-foreground" placeholder="Jangan isi NPWP, NIK, atau nomor rekening." {...field} data-testid="input-bill-notes" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {saveError && (
              <div role="alert" className="flex gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-foreground" data-testid="text-bill-save-error">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span><b>Belum tersimpan.</b> {saveError}</span>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-bill">Batal</Button>
              <Button type="submit" className="press font-semibold" data-testid="button-save-bill">{initial ? 'Simpan perubahan' : 'Simpan tagihan'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
