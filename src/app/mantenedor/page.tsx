'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Save, RotateCcw, ChevronDown, ChevronRight,
  Zap, Sun, DollarSign, ShieldCheck, CreditCard, BarChart2,
} from 'lucide-react';
import { getConfig, saveConfig, resetConfig, CONFIG_DEFAULT, REGIONES } from '@/lib/config';
import type { ConfigCotizador, Region } from '@/lib/config';
import { GENERACION_POR_ZONA } from '@/lib/config';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNum(v: number, decimals = 0): string {
  return v.toLocaleString('es-CL', { maximumFractionDigits: decimals });
}

// ─── Sección colapsable ──────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-400">{icon}</span>
          <span className="text-sm font-semibold text-slate-800">{title}</span>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Campo editable ──────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-xs text-slate-400">{prefix}</span>}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/15"
      />
      {suffix && <span className="text-xs text-slate-400 whitespace-nowrap">{suffix}</span>}
    </div>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/15"
    />
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function MantenedorPage() {
  const [cfg, setCfg] = useState<ConfigCotizador>(CONFIG_DEFAULT);
  const [saved, setSaved] = useState(false);
  const [genZona, setGenZona] = useState({ ...GENERACION_POR_ZONA });

  useEffect(() => {
    setCfg(getConfig());
    // Cargar tabla de generación guardada si existe
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('gg-gen-zona');
      if (raw) {
        try { setGenZona(JSON.parse(raw)); } catch { /* usa default */ }
      }
    }
  }, []);

  const patch = useCallback(<K extends keyof ConfigCotizador>(key: K, value: ConfigCotizador[K]) => {
    setCfg((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = () => {
    saveConfig(cfg);
    // Guardar tabla de generación por zona en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('gg-gen-zona', JSON.stringify(genZona));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    resetConfig();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gg-gen-zona');
    }
    setCfg(CONFIG_DEFAULT);
    setGenZona({ ...GENERACION_POR_ZONA });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-400" />
            <h1 className="text-base font-bold text-slate-900">Mantenedor de Variables</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-300 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              {saved ? '¡Guardado!' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-3">

        <p className="text-sm text-slate-600">
          Todos los cambios se guardan en el navegador y se usan en el cotizador web.
          Los valores por defecto corresponden exactamente al Excel de referencia.
        </p>

        {/* ── PRECIOS DE ENERGÍA ─────────────────────────────────────────── */}
        <Section icon={<Zap className="h-4 w-4" />} title="Precios de Energía" defaultOpen>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Precio kWh consumo ($/kWh)"
              hint="Tarifa residencial de referencia. Default: $250"
            >
              <NumberInput
                value={cfg.precioKwhClp}
                onChange={(v) => patch('precioKwhClp', v)}
                min={1}
                suffix="$/kWh"
              />
            </Field>
            <Field
              label="Precio inyección neta ($/kWh)"
              hint="Tarifa net-billing (precio de nudo). Default: $125,79"
            >
              <NumberInput
                value={cfg.precioInyeccionKwhClp}
                onChange={(v) => patch('precioInyeccionKwhClp', v)}
                min={0}
                step={0.01}
                suffix="$/kWh"
              />
            </Field>
          </div>
        </Section>

        {/* ── PANEL Y DIMENSIONAMIENTO ───────────────────────────────────── */}
        <Section icon={<Sun className="h-4 w-4" />} title="Panel y Dimensionamiento">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Modelo panel" hint="Nombre para mostrar en cotización">
              <TextInput value={cfg.panelMarcaModelo} onChange={(v) => patch('panelMarcaModelo', v)} />
            </Field>
            <Field label="Potencia panel (W)" hint="Default: 620 W">
              <NumberInput value={cfg.panelPotenciaW} onChange={(v) => patch('panelPotenciaW', v)} min={1} suffix="W" />
            </Field>
            <Field
              label="Límite autoconsumo"
              hint="% del consumo anual cubierto por autoconsumo. Default: 0.50"
            >
              <NumberInput value={cfg.limiteAutoconsumo} onChange={(v) => patch('limiteAutoconsumo', v)} min={0.1} max={1} step={0.01} suffix="(0–1)" />
            </Field>
            <Field
              label="Factor sobredimensionamiento"
              hint="Ratio gen/consumo. Default: 1.585 (Excel)"
            >
              <NumberInput value={cfg.factorGeneracion} onChange={(v) => patch('factorGeneracion', v)} min={0.5} max={5} step={0.01} />
            </Field>
          </div>
        </Section>

        {/* ── PRECIOS Y MARGEN ───────────────────────────────────────────── */}
        <Section icon={<DollarSign className="h-4 w-4" />} title="Precios y Margen">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Precio por kWp IVA inc. (CLP)" hint="$/kWp sistema instalado. Default: $1.053.495">
              <NumberInput value={cfg.costoPorKwpClpIva} onChange={(v) => patch('costoPorKwpClpIva', v)} min={1} suffix="$/kWp" />
            </Field>
            <Field label="Margen directo" hint="Porcentaje de margen. Default: 0.2111">
              <NumberInput value={cfg.margen} onChange={(v) => patch('margen', v)} min={0} max={1} step={0.001} />
            </Field>
            <Field label="IPC/CPI anual" hint="Ajuste inflación proyección. Default: 1.03">
              <NumberInput value={cfg.ipcAnual} onChange={(v) => patch('ipcAnual', v)} min={1} max={1.5} step={0.001} />
            </Field>
            <Field label="Degradación paneles/año" hint="Pérdida anual de generación. Default: 0.005">
              <NumberInput value={cfg.degradacionPaneles} onChange={(v) => patch('degradacionPaneles', v)} min={0} max={0.05} step={0.001} />
            </Field>
          </div>
        </Section>

        {/* ── FINANCIAMIENTO ────────────────────────────────────────────── */}
        <Section icon={<CreditCard className="h-4 w-4" />} title="Opciones de Financiamiento">
          <div className="space-y-5">
            {/* Transferencia */}
            <div>
              <p className="mb-2 text-xs font-semibold text-amber-600">Transferencia / Contado</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="% descuento mostrado" hint="Solo visual. Default: 0.155">
                  <NumberInput value={cfg.descuentoTransferencia} onChange={(v) => patch('descuentoTransferencia', v)} min={0} max={1} step={0.01} />
                </Field>
              </div>
            </div>

            {/* Mercado Pago */}
            <div>
              <p className="mb-2 text-xs font-semibold text-amber-600">Mercado Pago</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Factor recargo MP" hint="Precio × factor = total. Default: 1.1832">
                  <NumberInput value={cfg.factorMP} onChange={(v) => patch('factorMP', v)} min={1} max={2} step={0.001} />
                </Field>
                <Field label="N° cuotas MP" hint="Default: 12">
                  <NumberInput value={cfg.cuotasMP} onChange={(v) => patch('cuotasMP', v)} min={1} max={60} />
                </Field>
              </div>
            </div>

            {/* Santander */}
            <div>
              <p className="mb-2 text-xs font-semibold text-amber-600">Santander</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Factor recargo Santander" hint="Default: 1.1832 (mismo que MP)">
                  <NumberInput value={cfg.factorSantander} onChange={(v) => patch('factorSantander', v)} min={1} max={2} step={0.001} />
                </Field>
                <Field label="N° cuotas Santander" hint="Default: 48">
                  <NumberInput value={cfg.cuotasSantander} onChange={(v) => patch('cuotasSantander', v)} min={1} max={120} />
                </Field>
              </div>
            </div>

            {/* ALZA */}
            <div>
              <p className="mb-2 text-xs font-semibold text-amber-600">Crédito Largo Plazo (ALZA)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ratio ahorro/cuota" hint="ahorro_mensual / cuota_mensual. Default: 1.1506">
                  <NumberInput value={cfg.ratioAhorroCuotaALZA} onChange={(v) => patch('ratioAhorroCuotaALZA', v)} min={1} max={3} step={0.001} />
                </Field>
                <Field label="N° cuotas ALZA" hint="Default: 300 (25 años)">
                  <NumberInput value={cfg.cuotasALZA} onChange={(v) => patch('cuotasALZA', v)} min={12} max={360} />
                </Field>
              </div>
            </div>
          </div>
        </Section>

        {/* ── GARANTÍAS ─────────────────────────────────────────────────── */}
        <Section icon={<ShieldCheck className="h-4 w-4" />} title="Garantías y Mantenimiento">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Garantía paneles (años)">
              <NumberInput value={cfg.garantiaPaneles} onChange={(v) => patch('garantiaPaneles', v)} min={1} max={30} suffix="años" />
            </Field>
            <Field label="Garantía inversor (años)">
              <NumberInput value={cfg.garantiaInversor} onChange={(v) => patch('garantiaInversor', v)} min={1} max={20} suffix="años" />
            </Field>
            <Field label="Garantía instalación (años)">
              <NumberInput value={cfg.garantiaInstalacion} onChange={(v) => patch('garantiaInstalacion', v)} min={1} max={10} suffix="años" />
            </Field>
          </div>
          <p className="mt-4 mb-2 text-xs font-semibold text-amber-600">Inversión de repuesto proyectada</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Repuesto año 10 (CLP)" hint="Reemplazo inversor proyectado. Default: $518.000">
              <NumberInput value={cfg.inversionRespuesto10} onChange={(v) => patch('inversionRespuesto10', v)} min={0} suffix="CLP" />
            </Field>
            <Field label="Repuesto año 22 (CLP)" hint="Reemplazo inversor proyectado. Default: $518.000">
              <NumberInput value={cfg.inversionRespuesto22} onChange={(v) => patch('inversionRespuesto22', v)} min={0} suffix="CLP" />
            </Field>
          </div>
        </Section>

        {/* ── GENERACIÓN POR ZONA ───────────────────────────────────────── */}
        <Section icon={<BarChart2 className="h-4 w-4" />} title="Generación por Zona (kWh/kWp/mes)">
          <p className="mb-3 text-[11px] text-slate-500">
            Energía generada por kWp instalado en cada mes, según región. Fuente: hoja &quot;GEN Zona&quot; del Excel.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3 text-left font-semibold text-slate-500">Región</th>
                  {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','Total'].map((m) => (
                    <th key={m} className="px-1 py-2 text-center font-semibold text-slate-500">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REGIONES.map((region) => {
                  const vals = genZona[region];
                  const total = vals.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={region} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-1.5 pr-3 font-medium text-slate-700 whitespace-nowrap">{region}</td>
                      {vals.map((v, i) => (
                        <td key={i} className="px-1 py-1 text-center">
                          <input
                            type="number"
                            value={v}
                            min={0}
                            onChange={(e) => {
                              const newVals = [...vals] as typeof vals;
                              newVals[i] = Number(e.target.value);
                              setGenZona((prev) => ({ ...prev, [region]: newVals }));
                            }}
                            className="w-10 rounded border border-slate-200 bg-white py-0.5 text-center text-slate-900 focus:border-sky-500 focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1 text-center font-semibold text-amber-600">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            * Los cambios en esta tabla NO se guardan con el botón &quot;Guardar cambios&quot; aún
            (requiere migración de esquema). Edita directamente en config.ts para persistir.
          </p>
        </Section>

        {/* ── Botón guardar inferior ─────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar valores Excel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>

      </div>
    </div>
  );
}
