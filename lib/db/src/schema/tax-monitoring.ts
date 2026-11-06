import { pgTable, serial, text, timestamp, integer, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod/v4";

// Append-only evidence: no document bytes or automatic excerpt replacements.
export const taxObservations = pgTable("tax_source_observations", {
  id: serial("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  effectiveUrl: text("effective_url"),
  contentHash: text("content_hash"),
  linksHash: text("links_hash"),
  outcome: text("outcome", { enum: ["ok", "error"] }).notNull(),
  detail: text("detail").notNull(),
}, t => [index("tax_observation_source_idx").on(t.sourceUrl, t.id)]);

export const taxReviews = pgTable("tax_source_reviews", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull(),
  resourceDigest: text("resource_digest").notNull(),
  resourceSnapshot: jsonb("resource_snapshot").notNull(),
  observationId: integer("observation_id").notNull().references(() => taxObservations.id),
  decision: text("decision", { enum: ["approve", "reject"] }).notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  reviewer: text("reviewer").notNull(),
  note: text("note").notNull(),
}, t => [index("tax_review_resource_idx").on(t.resourceId, t.id)]);

export const insertTaxObservationSchema = createInsertSchema(taxObservations).omit({ id: true, checkedAt: true });
export const insertTaxReviewSchema = createInsertSchema(taxReviews).omit({ id: true, reviewedAt: true });
export type TaxObservation = typeof taxObservations.$inferSelect;
export type TaxReview = typeof taxReviews.$inferSelect;
export type InsertTaxObservation = z.infer<typeof insertTaxObservationSchema>;
export type InsertTaxReview = z.infer<typeof insertTaxReviewSchema>;
