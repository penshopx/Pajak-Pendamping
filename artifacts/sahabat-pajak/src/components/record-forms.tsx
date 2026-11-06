import { useEffect, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TAX_TYPES, useStore, type Obligation, type Payment } from '@/lib/store';
import { currentPeriod, todayISO } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-semibold text-foreground">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const inputCls = 'bg-background border-input text-foreground h-11';

function TaxSelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={inputCls} data-testid={`select-${id}`}><SelectValue placeholder="Pilih jenis pajak" /></SelectTrigger>
      <SelectContent>{TAX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
    </Select>
  );
}

const parseAmount = (s: string) => Number(s.replace(/[^\d]/g, ''));
const fmtInput = (s: string) => { const n = parseAmount(s); return n ? n.toLocaleString('id-ID') : ''; };

export function ObligationDialog({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: Obligation | null }) {
  const { saveObligation } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState({ title: '', taxType: 'PPh Final UMKM', period: currentPeriod(), dueDate: '', amount: '', status: 'belum' as Obligation['status'], notes: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    setErr({});
    setF(initial
      ? { title: initial.title, taxType: initial.taxType, period: initial.period, dueDate: initial.dueDate, amount: initial.amount ? initial.amount.toLocaleString('id-ID') : '', status: initial.status, notes: initial.notes }
      : { title: '', taxType: 'PPh Final UMKM', period: currentPeriod(), dueDate: '', amount: '', status: 'belum', notes: '' });
  }, [open, initial]);

  const submit = () => {
    const e: Record<string, string> = {};
    if (f.title.trim().length < 3) e.title = 'Judul minimal 3 karakter.';
    if (!/^\d{4}-\d{2}$/.test(f.period)) e.period = 'Pilih masa pajak.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dueDate)) e.dueDate = 'Isi tanggal tenggat yang Anda ketahui.';
    setErr(e);
    if (Object.keys(e).length) return;
    saveObligation({ id: initial?.id, demo: initial?.demo, title: f.title.trim(), taxType: f.taxType, period: f.period, dueDate: f.dueDate, amount: parseAmount(f.amount), status: f.status, notes: f.notes.trim() });
    toast({ title: initial ? 'Kewajiban diperbarui' : 'Kewajiban ditambahkan', description: f.title.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-white">{initial ? 'Ubah kewajiban' : 'Kewajiban baru'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">Tenggat diisi sendiri. Cocokkan dengan ketentuan resmi DJP atau KPP Anda.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field id="ob-title" label="Judul" error={err.title}>
            <Input id="ob-title" data-testid="input-obligation-title" className={inputCls} value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Setor PPh Final masa ini" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ob-tax" label="Jenis pajak"><TaxSelect id="ob-tax" value={f.taxType} onChange={(v) => setF({ ...f, taxType: v })} /></Field>
            <Field id="ob-period" label="Masa pajak" error={err.period}>
              <Input id="ob-period" type="month" data-testid="input-obligation-period" className={inputCls} value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} />
            </Field>
            <Field id="ob-due" label="Tanggal tenggat" error={err.dueDate}>
              <Input id="ob-due" type="date" data-testid="input-obligation-due" className={inputCls} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
            </Field>
            <Field id="ob-amount" label="Perkiraan nominal (Rp)" hint="Opsional, dari catatan Anda sendiri.">
              <Input id="ob-amount" inputMode="numeric" data-testid="input-obligation-amount" className={`${inputCls} num`} value={f.amount} onChange={(e) => setF({ ...f, amount: fmtInput(e.target.value) })} placeholder="0" />
            </Field>
          </div>
          <Field id="ob-status" label="Status">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" id="ob-status">
              {(['belum', 'selesai'] as const).map((s) => (
                <button type="button" key={s} role="radio" aria-checked={f.status === s} data-testid={`radio-status-${s}`} onClick={() => setF({ ...f, status: s })}
                  className={`press h-11 rounded-lg border text-sm font-semibold transition-colors ${f.status === s ? 'border-primary bg-primary/15 text-white' : 'border-input text-muted-foreground hover:text-white'}`}>
                  {s === 'belum' ? 'Belum selesai' : 'Selesai'}
                </button>
              ))}
            </div>
          </Field>
          <Field id="ob-notes" label="Catatan" hint="Jangan tulis NPWP, NIK, atau kata sandi.">
            <Textarea id="ob-notes" data-testid="input-obligation-notes" className="bg-background border-input" rows={3} maxLength={1000} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-obligation">Batal</Button>
            <Button type="submit" className="press font-semibold" data-testid="button-save-obligation">Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentDialog({ open, onOpenChange, initial, preset }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: Payment | null; preset?: Partial<Payment> }) {
  const { savePayment } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState({ taxType: 'PPh Final UMKM', period: currentPeriod(), amount: '', date: todayISO(), ntpn: '', notes: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    setErr({});
    const src = initial ?? preset;
    setF({
      taxType: src?.taxType ?? 'PPh Final UMKM', period: src?.period ?? currentPeriod(),
      amount: src?.amount ? src.amount.toLocaleString('id-ID') : '', date: src?.date ?? todayISO(), ntpn: src?.ntpn ?? '', notes: src?.notes ?? '',
    });
  }, [open, initial, preset]);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!/^\d{4}-\d{2}$/.test(f.period)) e.period = 'Pilih masa pajak.';
    if (parseAmount(f.amount) <= 0) e.amount = 'Isi nominal sesuai bukti bayar.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) e.date = 'Isi tanggal bayar.';
    if (f.ntpn && !/^[A-Za-z0-9]{8,32}$/.test(f.ntpn.trim())) e.ntpn = 'NTPN hanya huruf/angka, 8 sampai 32 karakter.';
    setErr(e);
    if (Object.keys(e).length) return;
    savePayment({ id: initial?.id, demo: initial?.demo, taxType: f.taxType, period: f.period, amount: parseAmount(f.amount), date: f.date, ntpn: f.ntpn.trim().toUpperCase(), notes: f.notes.trim() });
    toast({ title: initial ? 'Catatan pembayaran diperbarui' : 'Pembayaran dicatat', description: 'Catatan lokal, tidak diverifikasi ke DJP.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-white">{initial ? 'Ubah catatan pembayaran' : 'Catat pembayaran'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">Salin dari Bukti Penerimaan Negara (BPN). Aplikasi ini tidak memeriksa ke DJP.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pay-tax" label="Jenis pajak"><TaxSelect id="pay-tax" value={f.taxType} onChange={(v) => setF({ ...f, taxType: v })} /></Field>
            <Field id="pay-period" label="Masa pajak" error={err.period}>
              <Input id="pay-period" type="month" data-testid="input-payment-period" className={inputCls} value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} />
            </Field>
            <Field id="pay-amount" label="Nominal dibayar (Rp)" error={err.amount}>
              <Input id="pay-amount" inputMode="numeric" data-testid="input-payment-amount" className={`${inputCls} num`} value={f.amount} onChange={(e) => setF({ ...f, amount: fmtInput(e.target.value) })} placeholder="0" />
            </Field>
            <Field id="pay-date" label="Tanggal bayar" error={err.date}>
              <Input id="pay-date" type="date" data-testid="input-payment-date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </Field>
          </div>
          <Field id="pay-ntpn" label="NTPN (opsional)" error={err.ntpn} hint="Nomor Transaksi Penerimaan Negara dari BPN, untuk rujukan Anda sendiri.">
            <Input id="pay-ntpn" data-testid="input-payment-ntpn" className={`${inputCls} num uppercase`} maxLength={32} value={f.ntpn} onChange={(e) => setF({ ...f, ntpn: e.target.value })} />
          </Field>
          <Field id="pay-notes" label="Catatan" hint="Jangan tulis NPWP, NIK, atau kata sandi.">
            <Textarea id="pay-notes" data-testid="input-payment-notes" className="bg-background border-input" rows={3} maxLength={1000} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-payment">Batal</Button>
            <Button type="submit" className="press font-semibold" data-testid="button-save-payment">Simpan catatan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
