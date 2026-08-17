import catalog from '../data/equipmentCatalog.json';

export type EquipmentStatus = 'active' | 'inactive' | 'archived';

export interface PanelCatalogItem {
  id: string;
  nombre: string;
  marca: string;
  potenciaW: number;
  corrienteA: number | null;
  espesorMm: number | null;
  anchoMm: number | null;
  costoNetoClp: number;
  precioVentaClp: number;
  margen: number;
  garantiaAnios: number;
  estado: EquipmentStatus;
  actualizadoEl: string | null;
  fichaUrl: string | null;
}

export interface InverterCatalogItem {
  id: string;
  nombre: string;
  marca: string;
  stock: boolean;
  acCoupling: boolean;
  linea: string;
  fases: number;
  paralelizable: boolean;
  soportaBateria: boolean;
  potenciaDcKw: number;
  potenciaAcKw: number;
  voltajeBateriaV: number | null;
  prioridad: number;
  strings: number;
  costoNetoClp: number;
  precioVentaClp: number;
  margen: number;
  garantiaAnios: number;
  estado: EquipmentStatus;
  actualizadoEl: string | null;
  fichaUrl: string | null;
}

const STATUSES = new Set<EquipmentStatus>(['active', 'inactive', 'archived']);

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim().slice(0, 180) : fallback;
}

function number(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : number(value, 0);
}

function nullableText(value: unknown): string | null {
  const result = text(value);
  return result || null;
}

function status(value: unknown): EquipmentStatus {
  return typeof value === 'string' && STATUSES.has(value as EquipmentStatus)
    ? value as EquipmentStatus
    : 'inactive';
}

export const DEFAULT_PANELS: PanelCatalogItem[] = catalog.panels.map((item) => ({
  ...item,
  estado: item.estado as EquipmentStatus,
}));

export const DEFAULT_INVERTERS: InverterCatalogItem[] = catalog.inverters.map((item) => ({
  ...item,
  estado: item.estado as EquipmentStatus,
}));

export function normalizePanels(value: unknown): PanelCatalogItem[] {
  if (!Array.isArray(value)) return DEFAULT_PANELS.map((item) => ({ ...item }));
  return value.map(record).filter((item): item is Record<string, unknown> => item !== null).map((item) => ({
    id: text(item.id),
    nombre: text(item.nombre),
    marca: text(item.marca),
    potenciaW: number(item.potenciaW),
    corrienteA: nullableNumber(item.corrienteA),
    espesorMm: nullableNumber(item.espesorMm),
    anchoMm: nullableNumber(item.anchoMm),
    costoNetoClp: number(item.costoNetoClp),
    precioVentaClp: number(item.precioVentaClp),
    margen: number(item.margen),
    garantiaAnios: number(item.garantiaAnios),
    estado: status(item.estado),
    actualizadoEl: nullableText(item.actualizadoEl),
    fichaUrl: nullableText(item.fichaUrl),
  })).filter((item) => item.id && item.nombre);
}

export function normalizeInverters(value: unknown): InverterCatalogItem[] {
  if (!Array.isArray(value)) return DEFAULT_INVERTERS.map((item) => ({ ...item }));
  return value.map(record).filter((item): item is Record<string, unknown> => item !== null).map((item) => ({
    id: text(item.id),
    nombre: text(item.nombre),
    marca: text(item.marca),
    stock: item.stock === true,
    acCoupling: item.acCoupling === true,
    linea: text(item.linea, 'On-Grid'),
    fases: number(item.fases, 1),
    paralelizable: item.paralelizable === true,
    soportaBateria: item.soportaBateria === true,
    potenciaDcKw: number(item.potenciaDcKw),
    potenciaAcKw: number(item.potenciaAcKw),
    voltajeBateriaV: nullableNumber(item.voltajeBateriaV),
    prioridad: number(item.prioridad, 1),
    strings: number(item.strings, 1),
    costoNetoClp: number(item.costoNetoClp),
    precioVentaClp: number(item.precioVentaClp),
    margen: number(item.margen),
    garantiaAnios: number(item.garantiaAnios),
    estado: status(item.estado),
    actualizadoEl: nullableText(item.actualizadoEl),
    fichaUrl: nullableText(item.fichaUrl),
  })).filter((item) => item.id && item.nombre);
}
