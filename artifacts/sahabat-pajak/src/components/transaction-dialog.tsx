import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/lib/store';
import { todayISO, rupiah } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { parseRupiah } from '@/lib/rupiah';
import { Link } from 'wouter';
import {
  LEDGER_CATEGORIES, categoryFor, validLedgerDate,
  type BusinessTransaction, type TransactionKind,
} from '@/lib/business-ledger';

export { parseRupiah };

const schema = z.object({
  date: z.string().refine(validLedgerDate, 'Masukkan tanggal yang benar-benar ada (tahun 1900 sampai 2100).'),
  kind: z.enum(['pemasukan', 'pengeluaran']),
  category: z.string().min(1, 'Pilih kategori.'),
  description: z.string().trim().min(3, 'Uraian minimal 3 karakter.').max(120, 'Uraian maksimal 120 karakter.'),
  amount: z.string(),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter.'),
}).superRefine((v, ctx) => {
  const r = parseRupiah(v.amount);
  if (!r.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message: r.error });
  const c = categoryFor(v.category);
  if (v.category && (!c || c.kind !== v.kind)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['category'], message: 'Kategori ini tidak sesuai dengan jenis transaksi. Pilih ulang kategori.' });
});
type Values = z.infer<typeof schema>;

const firstOf = (k: TransactionKind) => LEDGER_CATEGORIES.find((c) => c.kind === k)!.id;
const toValues = (t?: BusinessTransaction | null): Values => t
  ? { date: t.date, kind: t.kind, category: t.category, description: t.description, amount: t.amount.toLocaleString('id-ID'), notes: t.notes }
  : { date: todayISO(), kind: 'pemasukan', category: firstOf('pemasukan'), description: '', amount: '', notes: '' };

const inputCls = 'bg-background border-input text-foreground h-11';

export function TransactionDialog({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (o: boolean) => void; initial: BusinessTransaction | null }) {
  const { saveTransaction, tradeBills } = useStore();
  const linkedBill = initial?.tradeBillId ? tradeBills.find((b) => b.id === initial.tradeBillId) ?? null : null;
  const linked = !!initial?.tradeBillId;
  const { toast } = useToast();
  const [saveError, setSaveError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(initial) });

  useEffect(() => {
    if (open) { form.reset(toValues(initial)); setSaveError(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const kind = form.watch('kind');
  const category = categoryFor(form.watch('category'));
  const amountPreview = parseRupiah(form.watch('amount') ?? '');

  const submit = (v: Values) => {
    const r = parseRupiah(v.amount);
    if (!r.ok) return;
    setSaveError(null);
    try {
      saveTransaction({ ...(initial ? { id: initial.id } : {}), date: v.date, kind: v.kind, category: v.category, description: v.description.trim(), amount: r.value, notes: v.notes.trim() });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Transaksi gagal disimpan di peramban ini.');
      return;
    }
    toast({ title: initial ? 'Transaksi diperbarui' : 'Transaksi dicatat', description: `${v.description.trim()} · ${rupiah(r.value)}` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{initial ? 'Ubah transaksi' : 'Catat transaksi'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">Catat uang yang benar-benar masuk atau keluar dari usaha, atau penyesuaian HPP nonkas. Tanpa nomor rekening atau lampiran.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
            {linked && (
              <div role="note" className="flex gap-2 rounded-lg border border-[hsl(var(--warn)/.45)] bg-[hsl(var(--warn)/.08)] px-3 py-2.5 text-sm text-foreground" data-testid="text-transaction-linked-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warn))]" />
                <span>Transaksi ini tercatat sebagai pembayaran {linkedBill ? <b className="text-white">{linkedBill.kind === 'piutang' ? 'piutang' : 'utang'} {linkedBill.reference || linkedBill.description} · {linkedBill.party}</b> : 'tagihan usaha'}. Mengubah tanggal atau nominal akan menghitung ulang sisa tagihan. Jenis dan kategori dikunci; lepaskan tautan di <Link href="/piutang-utang" className="font-semibold text-accent underline underline-offset-4" data-testid="link-transaction-dialog-bill">Piutang & Utang</Link> bila perlu mengubahnya.</span>
              </div>
            )}

            <FormField control={form.control} name="kind" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] font-semibold text-foreground">Jenis</FormLabel>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jenis transaksi">
                  {(['pemasukan', 'pengeluaran'] as const).map((k) => {
                    const on = field.value === k; const Icon = k === 'pemasukan' ? ArrowDownLeft : ArrowUpRight;
                    return (
                      <button key={k} type="button" role="radio" aria-checked={on} disabled={linked} data-testid={`radio-kind-${k}`}
                        onClick={() => {
                          if (field.value === k || linked) return;
                          field.onChange(k);
                          form.setValue('category', firstOf(k), { shouldValidate: form.formState.isSubmitted });
                        }}
                        className={`press flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${on ? (k === 'pemasukan' ? 'border-accent bg-accent/15 text-white' : 'border-primary bg-primary/15 text-white') : 'border-input text-foreground/80 hover:text-white'}`}>
                        <Icon className="h-4 w-4" />{k === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran / beban'}
                      </button>
                    );
                  })}
                </div>
              </FormItem>
            )} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[13px] font-semibold text-foreground">Tanggal</FormLabel>
                  <FormControl><Input type="date" className={inputCls} {...field} data-testid="input-transaction-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[13px] font-semibold text-foreground">Nominal (Rp)</FormLabel>
                  <FormControl><Input inputMode="numeric" autoComplete="off" placeholder="150.000" className={`${inputCls} num`} {...field} data-testid="input-transaction-amount" /></FormControl>
                  {!form.formState.errors.amount && <FormDescription className="num text-xs">{amountPreview.ok ? rupiah(amountPreview.value) : 'Rupiah utuh, tanpa desimal.'}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] font-semibold text-foreground">Kategori</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={linked}>
                  <FormControl><SelectTrigger className={inputCls} data-testid="select-transaction-category"><SelectValue placeholder="Pilih kategori" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {LEDGER_CATEGORIES.filter((c) => c.kind === kind).map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {category?.group === 'excluded' && <FormDescription className="text-xs text-[hsl(var(--warn))]">Dicatat sebagai arus kas, tetapi tidak masuk laba rugi.</FormDescription>}
                {category?.id === 'hpp' && <FormDescription className="text-xs">Penyesuaian nonkas: isi harga pokok barang yang terjual pada periode ini. Pembelian persediaan saja bukan HPP, dan tidak ada penilaian persediaan otomatis. Tidak mengurangi kas, karena uangnya sudah tercatat saat pembelian.</FormDescription>}
                {category?.id === 'persediaan' && <FormDescription className="text-xs">Mengurangi kas, tetapi bukan HPP. Saat barang terjual, catat penyesuaian HPP nonkas secara terpisah; kas tidak berkurang dua kali.</FormDescription>}
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] font-semibold text-foreground">Uraian</FormLabel>
                <FormControl><Input maxLength={140} placeholder="Contoh: Penjualan kue pesanan Bu Rina" className={inputCls} {...field} data-testid="input-transaction-description" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] font-semibold text-foreground">Catatan (opsional)</FormLabel>
                <FormControl><Textarea rows={2} className="bg-background border-input text-foreground" {...field} data-testid="input-transaction-notes" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {saveError && (
              <div role="alert" className="flex gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-foreground" data-testid="text-transaction-save-error">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span><b>Belum tersimpan.</b> {saveError}</span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-transaction">Batal</Button>
              <Button type="submit" className="press font-semibold" data-testid="button-save-transaction">{initial ? 'Simpan perubahan' : 'Simpan transaksi'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
