# Sahabat Pajak

Pendamping edukasi perpajakan UMKM Indonesia dengan konsultasi AI bersumber, pustaka Coretax, dan pencatatan kewajiban serta pembayaran.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

- Sasaran versi awal: UMKM dan pemilik usaha. Konsultasi AI, bukan pemesanan konsultan.
- Pembayaran dilakukan di kanal resmi; aplikasi hanya memberi panduan dan menyimpan catatan, bukan menerima dana, membuat billing, atau mengonfirmasi penerimaan DJP.
- Data profil usaha, kewajiban dan pembayaran disimpan di browser pengguna. Tidak tersinkron antardevice; ekspor cadangan diperlukan sebelum menghapus data browser.
- Pertanyaan konsultasi dikirim ke penyedia AI melalui server, bukan disimpan dalam database aplikasi. Jangan memasukkan identitas atau kredensial pajak.
- Pustaka merupakan kurasi dengan tanggal pemeriksaan, bukan pembaruan regulasi otomatis. Judul manual/metadata regulasi tidak mewakili pembacaan naskah lengkap.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
