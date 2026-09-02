'use client';

import { Check, MapPinned, PackageOpen, Settings2 } from 'lucide-react';
import {
  REGIONES,
  costoPartidaNeto,
  costoPartidasPorCategoria,
  withSyncedCostItems,
  type ConfigCotizador,
  type PartidaCostoKwp,
  type Region,
  type VariablesVinculantesKwp,
} from '@/lib/config';
import { formatCLP, type CotizacionCompleta } from '@/lib/estimaciones';
import type { ConfigIssue } from '@/lib/configValidation';

function inputClass(hasError = false): string {
  return `min-h-11 w-full rounded-xl border bg-white px-3 text-base text-slate-950 outline-none transition focus:ring-4 ${hasError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300 focus:border-sky-500 focus:ring-sky-100'}`;
}

function Section({ icon: Icon, title, description, children }: { icon: typeof PackageOpen; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-start gap-3 border-b border-slate-200 p-4 sm:p-6">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700"><Icon className="h-5 w-5" aria-hidden="true" /></div>
      <div><h2 className="text-lg font-bold text-slate-950">{title}</h2><p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">{description}</p></div>
    </div>
    <div className="p-4 sm:p-6">{children}</div>
  </section>;
}

function MoneyInput({ value, unit, onChange, error }: { value: number; unit: string; onChange: (value: number) => void; error?: boolean }) {
  return <div className="relative"><input type="number" inputMode="decimal" min={0} step="any" value={Number.isFinite(value) ? value : ''} onChange={(event) => onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))} className={`${inputClass(error)} pr-24 tabular-nums`} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-slate-500">{unit}</span></div>;
}

export function KwpVariablesManager({ config, onChange, preview, issues, region, onRegionChange }: { config: ConfigCotizador; onChange: (config: ConfigCotizador) => void; preview: CotizacionCompleta | null; issues: ConfigIssue[]; region: Region; onRegionChange: (region: Region) => void }) {
  const capacidadKwp = preview?.sistema.capacidadKwp ?? 0;
  const materiales = config.partidasCostoKwp.filter((item) => item.categoria === 'materiales');
  const regionales = config.partidasCostoKwp.filter((item) => item.tipoCalculo !== 'fijo-variable');
  const issueFor = (id: string) => issues.find((issue) => issue.field === `partidasCostoKwp.${id}`);
  const updateVariables = <K extends keyof VariablesVinculantesKwp>(key: K, value: VariablesVinculantesKwp[K]) => onChange({ ...config, variablesVinculantesKwp: { ...config.variablesVinculantesKwp, [key]: value } });
  const updatePartida = (id: string, patch: Partial<PartidaCostoKwp>) => onChange(withSyncedCostItems(config, config.partidasCostoKwp.map((item) => item.id === id ? { ...item, ...patch } : item)));
  const updateRegional = (partida: PartidaCostoKwp, value: number) => updatePartida(partida.id, { costosRegionalesNeto: { ...(partida.costosRegionalesNeto ?? Object.fromEntries(REGIONES.map((item) => [item, 0]))), [region]: value } as Record<Region, number> });

  return <div className="space-y-5">
    <Section icon={PackageOpen} title="Materiales del proyecto" description="Cada partida tiene un monto fijo por proyecto y un monto variable por kWp. Son la única fuente de costo para estos materiales; las canalizaciones ya no se ingresan ni vuelven a multiplicar el precio.">
      <div className="space-y-3">{materiales.map((partida) => {
        const issue = issueFor(partida.id);
        return <article key={partida.id} className={`rounded-2xl border p-4 ${partida.activa ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{partida.nombre}</h3><p className="mt-1 text-xs text-slate-500">{partida.referenciaExcel}</p></div><button type="button" onClick={() => updatePartida(partida.id, { activa: !partida.activa })} aria-pressed={partida.activa} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${partida.activa ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-600'}`}>{partida.activa && <Check className="h-4 w-4" aria-hidden="true" />}{partida.activa ? 'Incluida' : 'Excluida'}</button></div>
          <div className="mt-4 grid gap-3 md:grid-cols-3 md:items-end">
            <label className="space-y-1.5 text-xs font-semibold text-slate-600"><span>Fijo por proyecto</span><MoneyInput value={partida.costoFijoNetoClp} unit="CLP" error={issue?.severity === 'error'} onChange={(value) => updatePartida(partida.id, { costoFijoNetoClp: value })} /></label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-600"><span>Variable por potencia</span><MoneyInput value={partida.costoVariableNetoClpPorKwp} unit="CLP/kWp" error={issue?.severity === 'error'} onChange={(value) => updatePartida(partida.id, { costoVariableNetoClpPorKwp: value })} /></label>
            <div className="min-h-11 rounded-xl bg-slate-100 px-3 py-2"><p className="text-[11px] font-semibold text-slate-500">Aplicado al caso</p><p className="font-bold tabular-nums text-slate-950">{formatCLP(costoPartidaNeto(partida, capacidadKwp, region))}</p></div>
          </div>{issue && <p className={issue.severity === 'error' ? 'mt-2 text-xs text-rose-700' : 'mt-2 text-xs text-amber-700'}>{issue.message}</p>}
        </article>;
      })}</div>
      <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Materiales aplicados</p><p className="mt-1 text-xl font-bold tabular-nums">{formatCLP(costoPartidasPorCategoria(config.partidasCostoKwp, 'materiales', capacidadKwp, region))}</p><p className="text-xs text-slate-500">Para {capacidadKwp.toLocaleString('es-CL')} kWp</p></div>
    </Section>

    <Section icon={MapPinned} title="Costos por región" description="Gestión del proyecto e Ingeniería TE4 y conexión son montos fijos. Instalación es un valor por kWp. Se usa un solo valor por partida y región.">
      <label className="mb-5 block max-w-sm space-y-1.5 text-sm font-semibold text-slate-800"><span>Región a configurar</span><select value={region} onChange={(event) => onRegionChange(event.target.value as Region)} className={inputClass()}>{REGIONES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <div className="space-y-3">{regionales.map((partida) => {
        const value = partida.costosRegionalesNeto?.[region] ?? 0;
        const isVariable = partida.tipoCalculo === 'variable-regional';
        const issue = issueFor(partida.id);
        return <div key={partida.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_220px_190px] md:items-end">
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-950">{partida.nombre}</h3><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{isVariable ? 'variable regional' : 'fijo regional'}</span></div><p className="mt-1 text-xs text-slate-500">{partida.referenciaExcel}</p>{issue && <p className="mt-1 text-xs text-rose-700">{issue.message}</p>}</div>
          <label className="space-y-1.5 text-xs font-semibold text-slate-600"><span>{isVariable ? 'Costo neto por potencia' : 'Costo neto fijo'}</span><MoneyInput value={value} unit={isVariable ? 'CLP/kWp' : 'CLP'} error={issue?.severity === 'error'} onChange={(next) => updateRegional(partida, next)} /></label>
          <div className="min-h-11 rounded-xl bg-slate-100 px-3 py-2"><p className="text-[11px] font-semibold text-slate-500">Aplicado al caso</p><p className="font-bold tabular-nums">{formatCLP(costoPartidaNeto(partida, capacidadKwp, region))}</p></div>
        </div>;
      })}</div>
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Servicios aplicados</p><p className="mt-1 text-xl font-bold tabular-nums">{formatCLP(costoPartidasPorCategoria(config.partidasCostoKwp, 'servicios', capacidadKwp, region))}</p><p className="text-xs text-slate-500">Dos fijos regionales + instalación por kWp</p></div>
    </Section>

    <Section icon={Settings2} title="Supuestos técnicos" description="Estos valores describen el sistema y no modifican nuevamente las partidas de costo.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5 text-sm font-semibold text-slate-800"><span>Protección general</span><MoneyInput value={config.variablesVinculantesKwp.proteccionGeneralAPorKwp} unit="A/kWp" onChange={(value) => updateVariables('proteccionGeneralAPorKwp', value)} /></label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-800"><span>Mesas</span><MoneyInput value={config.variablesVinculantesKwp.mesasPorKwp} unit="mesas/kWp" onChange={(value) => updateVariables('mesasPorKwp', value)} /></label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-800"><span>Fases predeterminadas</span><select value={config.variablesVinculantesKwp.fasesPredeterminadas} onChange={(event) => updateVariables('fasesPredeterminadas', Number(event.target.value) === 3 ? 3 : 1)} className={inputClass()}><option value={1}>Monofásico</option><option value={3}>Trifásico</option></select></label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-800"><span>Tipo de fijación</span><input value={config.variablesVinculantesKwp.tipoFijacionTecho} onChange={(event) => updateVariables('tipoFijacionTecho', event.target.value)} className={inputClass()} /></label>
      </div>
    </Section>
  </div>;
}
