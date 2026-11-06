import { Link } from 'wouter';
import { Compass } from 'lucide-react';
import { usePageTitle } from '@/lib/format';
import { EmptyState } from '@/components/shell';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  usePageTitle('Halaman tidak ditemukan');
  return (
    <div className="pt-10">
      <div className="num mb-4 text-center text-6xl font-bold text-primary/80">404</div>
      <EmptyState icon={Compass} title="Halaman ini tidak ada" desc="Alamatnya mungkin salah ketik atau sudah dipindah. Data Anda tetap aman di peramban ini."
        action={<Button asChild><Link href="/" data-testid="link-back-home">Kembali ke ringkasan</Link></Button>} />
    </div>
  );
}
