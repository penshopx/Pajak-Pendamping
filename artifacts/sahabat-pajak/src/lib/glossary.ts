import { GLOSSARY_CATEGORIES, GLOSSARY_TERMS, type GlossaryTerm } from './glossary-data';
export function normalizeGlossaryQuery(value: string) {
  return value.slice(0, 120).normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('id-ID')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
export function filterGlossary(query = '', category = 'semua') {
  const needle = normalizeGlossaryQuery(query);
  const parts = needle.split(' ').filter(Boolean);
  const validCategory = GLOSSARY_CATEGORIES.some(c => c.id === category) ? category : 'semua';
  return GLOSSARY_TERMS.filter(t => {
    if (validCategory !== 'semua' && t.category !== validCategory) return false;
    const haystack = normalizeGlossaryQueryUnlimited([t.term, ...t.aliases, t.description, t.example, t.caution].join(' '));
    return parts.every(part => haystack.includes(part));
  }).sort((a, b) => {
    const exact = (t: GlossaryTerm) => needle && [t.term, ...t.aliases].some(s => normalizeGlossaryQuery(s) === needle) ? 1 : 0;
    return exact(b) - exact(a) || a.term.localeCompare(b.term, 'id-ID');
  });
}
function normalizeGlossaryQueryUnlimited(value: string) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('id-ID').replace(/[^\p{L}\p{N}]+/gu, ' ');
}
export function glossaryTerm(id: string | null) {
  return GLOSSARY_TERMS.find(t => t.id === id) ?? null;
}
export function glossaryQuestionHref(term: GlossaryTerm) {
  const question = `Jelaskan istilah "${term.term}" (${term.aliases.join(', ') || 'istilah pajak'}) dengan bahasa sederhana untuk UMKM. Bedakan dari istilah yang sering tertukar. Gunakan sumber yang mendukung dan sebutkan keterbatasannya; jangan menetapkan tarif, tenggat, atau kewajiban kasus saya tanpa data yang cukup.`;
  return `/konsultasi?pertanyaan=${encodeURIComponent(question)}`;
}
export const glossaryTermHref = (id: string) => `/glosarium?istilah=${encodeURIComponent(id)}`;
