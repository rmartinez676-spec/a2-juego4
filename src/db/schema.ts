import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { NpcSeed } from "@/content/types";

export const temas = pgTable("temas", {
  id: text("id").primaryKey(),
  bloque: integer("bloque").notNull(),
  orden: integer("orden").notNull(),
  titulo: text("titulo").notNull(),
  resumen: text("resumen").notNull().default(""),
  npcs: jsonb("npcs").$type<NpcSeed[]>().notNull().default([]),
  ordenItem: jsonb("orden_item").$type<{ titulo: string; items: string[] } | null>(),
  fuentes: jsonb("fuentes").$type<string[]>().notNull().default([]),
  revisar: boolean("revisar").notNull().default(false),
  origen: text("origen").notNull().default("seed"),
});

export const preguntas = pgTable("preguntas", {
  id: text("id").primaryKey(),
  temaId: text("tema_id").notNull(),
  tipo: text("tipo").notNull().default("mcq"),
  dif: integer("dif").notNull().default(2),
  enunciado: text("enunciado").notNull(),
  opciones: jsonb("opciones").$type<string[]>().notNull(),
  correcta: integer("correcta").notNull().default(0),
  explicacion: text("explicacion").notNull().default(""),
  fuente: text("fuente"),
  activa: boolean("activa").notNull().default(true),
  origen: text("origen").notNull().default("seed"),
  creada: timestamp("creada", { withTimezone: true }).defaultNow(),
});

export const fuentes = pgTable("fuentes", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  tipo: text("tipo").notNull().default("boe"),
  url: text("url").notNull(),
  fechaBoe: text("fecha_boe"),
  tituloBoe: text("titulo_boe"),
  ultimaSync: timestamp("ultima_sync", { withTimezone: true }),
  estado: text("estado"),
  cambio: boolean("cambio").notNull().default(false),
  cambioEn: timestamp("cambio_en", { withTimezone: true }),
});

export const meta = pgTable("meta", {
  k: text("k").primaryKey(),
  v: text("v").notNull(),
});
