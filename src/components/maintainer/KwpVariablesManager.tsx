'use client';

import { Calculator, Check, Ruler, SlidersHorizontal } from 'lucide-react';
import {
  costoGeneralPorKwpNeto,
  costoPartidasPorCategoria,
  withSyncedCostItems,
  type ConfigCotizador,
  type PartidaCostoKwp,
  type VariablesVinculantesKwp,
} from '@/lib/config';
import { formatCLP, type CotizacionCompleta } from '@/lib/estimaciones';
import type { ConfigIssue } from '@/lib/configValidation';

type CoefficientKey =
  | 'canalizacionPanInvExteriorMPorKwp'
  | 'canalizacionPanInvSubterraneoMPorKwp'
  | 'canalizacionInvTabExteriorMPorKwp'
  | 'canalizacionInvTabSubterraneoMPorKwp'
  | 'canalizacionTabPcExteriorMPorKwp'
  | 'canalizacionTabPcSubterraneoMPorKwp'
  | 'canalizacionTabPcAereoMPorKwp'
  | 'proteccionGeneralAPorKwp'
  | 'mesasPorKwp';

const COEFFICIENTS: Array<{
  key: CoefficientKey;
  label: string;
  unit: string;
  reference: string;
}> = [
  { key: 'canalizacionPanInvExteriorMPorKwp', label: 'PAN–INV exterior', unit: 'm/kWp', reference: 'MAIN!C44' },
  { key: 'canalizacionPanInvSubterraneoMPorKwp', label: 'PAN–INV subterránea', unit: 'm/kWp', reference: 'MAIN!C45' },
  { key: 'canalizacionInvTabExteriorMPorKwp', label: 'INV–TAB exterior', unit: 'm/kWp', reference: 'MAIN!C46' },
  { key: 'canalizacionInvTabSubterraneoMPorKwp', label: 'INV–TAB subterránea', unit: 'm/kWp', reference: 'MAIN!C47' },
  { key: 'canalizacionTabPcExteriorMPorKwp', label: 'TAB–PC exterior', unit: 'm/kWp', reference: 'MAIN!C48' },
  { key: 'canalizacionTabPcSubterraneoMPorKwp', label: 'TAB–PC subterránea', unit: 'm/kWp', reference: 'MAIN!C49' },
  { key: 'canalizacionTabPcAereoMPorKwp', label: 'TAB–PC aérea', unit: 'm/kWp', reference: 'MAIN!C50' },
  { key: 'proteccionGeneralAPorKwp', label: 'Protección general', unit: 'A/kWp', reference: 'MAIN!C51' },
  { key: 'mesasPorKwp', label: 'Mesas', unit: 'mesas/kWp', reference: 'MAIN!C52' },
];

const RESULT_ROWS: Array<{
  key: keyof CotizacionCompleta['variablesVinculantes'];
  label: string;
  unit: string;
}> = [
  { key: 'canalizacionPanInvExteriorM', label: 'PAN–INV exterior', unit: 'm' },
  { key: 'canalizacionPanInvSubterraneoM', label: 'PAN–INV subterránea', unit: 'm' },
  { key: 'canalizacionInvTabExteriorM', label: 'INV–TAB exterior', unit: 'm' },
  { key: 'canalizacionInvTabSubterraneoM', label: 'INV–TAB subterránea', unit: 'm' },
  { key: 'canalizacionTabPcExteriorM', label: 'TAB–PC exterior', unit: 'm' },
  { key: 'canalizacionTabPcSubterraneoM', label: 'TAB–PC subterránea', unit: 'm' },
  { key: 'canalizacionTabPcAereoM', label: 'TAB–PC aérea', unit: 'm' },
  { key: 'proteccionGeneralA', label: 'Protección general', unit: 'A' },
  { key: 'numeroMesas', label: 'Mesas', unit: '' },
  { key: 'numeroFases', label: 'Fases', unit: '' },
  { key: 'tipoFijacionTecho', label: 'Fijación', unit: '' },
];

function inputClass(hasError = false): string {
  return `min-h-11 w-full rounded-xl border bg-white px-3 text-base text-slate-950 outline-none transition focus:ring-4 ${
    hasError
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
      : 'border-slate-300 focus:border-sky-500 focus:ring-sky-100'
  }`;
}

function Section({ icon: Icon, title, description, children }: {
  icon: typeof Ruler;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-200 p-4 sm:p-6">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700"><Icon className="h-5 w-5" aria-hidden="true" /></div>
        <div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

function issueFor(issues: ConfigIssue[], field: string): ConfigIssue | undefined {
  return issues.find((issue) => issue.field === field);
}

export function KwpVariablesManager({
  config,
  onChange,
  preview,
  issues,
}: {
  config: ConfigCotizador;
  onChange: (config: ConfigCotizador) => void;
  preview: CotizacionCompleta | null;
  issues: ConfigIssue[];
}) {
  const variables = config.variablesVinculantesKwp;
  const materiales = costoPartidasPorCategoria(config.partidasCostoKwp, 'materiales');
  const servicios = costoPartidasPorCategoria(config.partidasCostoKwp, 'servicios');

  const updateVariables = <K extends keyof VariablesVinculantesKwp>(key: K, value: VariablesVinculantesKwp[K]) => {
    onChange({
      ...config,
      variablesVinculantesKwp: { ...variables, [key]: value },
    });
  };

  const updatePartida = (id: string, patch: Partial<PartidaCostoKwp>) => {
    onChange(withSyncedCostItems(
      config,
      config.partidasCostoKwp.map((partida) => partida.id === id ? { ...partida, ...patch } : partida),
    ));
  };

  return (
    <div className="space-y-5">
      <Section
        icon={Ruler}
        title="Variables vinculantes por kWp"
        description="Cada coeficiente se multiplica por la potencia instalada. Metros, mesas y protección actualizan también su partida de costo y el precio final."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {COEFFICIENTS.map((field) => {
            const issue = issueFor(issues, `variablesVinculantesKwp.${field.key}`);
            return (
              <label key={field.key} className="min-w-0 space-y-1.5 text-sm font-semibold text-slate-800">
                <span className="flex flex-wrap items-center justify-between gap-2"><span>{field.label}</span><span className="font-normal text-slate-400">{field.reference}</span></span>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={Number.isFinite(variables[field.key]) ? Number(variables[field.key].toFixed(4)) : ''}
                    onChange={(event) => updateVariables(field.key, event.target.value === '' ? Number.NaN : Number(event.target.value))}
                    aria-invalid={issue?.severity === 'error' || undefined}
                    aria-describedby={issue ? `${field.key}-error` : undefined}
                    className={`${inputClass(issue?.severity === 'error')} pr-24`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">{field.unit}</span>
                </div>
                {issue && <span id={`${field.key}-error`} className="block text-xs font-normal text-rose-700">{issue.message}</span>}
              </label>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 text-sm font-semibold text-slate-800">
            <span>Redondeo de canalización</span>
            <div className="relative"><input type="number" min={0.01} step="any" value={variables.redondeoCanalizacionM} onChange={(event) => updateVariables('redondeoCanalizacionM', Number(event.target.value))} className={`${inputClass()} pr-16`} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">m</span></div>
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-800">
            <span>Escalón de protección</span>
            <div className="relative"><input type="number" min={1} step="any" value={variables.redondeoProteccionA} onChange={(event) => updateVariables('redondeoProteccionA', Number(event.target.value))} className={`${inputClass()} pr-16`} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">A</span></div>
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-800">
            <span>Fases predeterminadas</span>
            <select value={variables.fasesPredeterminadas} onChange={(event) => updateVariables('fasesPredeterminadas', Number(event.target.value) === 3 ? 3 : 1)} className={inputClass()}><option value={1}>Monofásico</option><option value={3}>Trifásico</option></select>
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-800">
            <span>Tipo de fijación</span>
            <input value={variables.tipoFijacionTecho} maxLength={160} onChange={(event) => updateVariables('tipoFijacionTecho', event.target.value)} className={inputClass(Boolean(issueFor(issues, 'variablesVinculantesKwp.tipoFijacionTecho')))} />
          </label>
        </div>
      </Section>

      <Section
        icon={Calculator}
        title="Resultado vinculante del caso de prueba"
        description="Vista calculada con los mismos campos de la tabla MAIN. Cambia automáticamente cuando varía el kWp del escenario o un coeficiente."
      >
        {preview ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 px-4 py-3 text-white">
              <span className="text-sm font-bold">Sistema de {preview.sistema.capacidadKwp.toLocaleString('es-CL')} kWp</span>
              <span className="text-xs text-slate-300">{preview.sistema.numeroPaneles} paneles · {formatCLP(preview.precioProyectoClp)}</span>
            </div>
            <dl className="grid sm:grid-cols-2 xl:grid-cols-3">
              {RESULT_ROWS.map((row) => (
                <div key={row.key} className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 xl:[&:nth-last-child(-n+3)]:border-b-0">
                  <dt className="text-sm text-slate-600">{row.label}</dt>
                  <dd className="min-w-0 text-right text-sm font-bold tabular-nums text-slate-950">{String(preview.variablesVinculantes[row.key])}{row.unit ? ` ${row.unit}` : ''}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Completa el escenario para calcular las variables vinculantes.</p>}
      </Section>

      <Section
        icon={SlidersHorizontal}
        title="Partidas de costo por kWp"
        description="Estas partidas alimentan directamente el precio. Paneles e inversor conservan su costo de catálogo para mantener trazabilidad de los equipos físicos."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Materiales</p><p className="mt-1 text-xl font-bold tabular-nums">{formatCLP(materiales)}</p><p className="text-xs text-slate-500">neto por kWp</p></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Servicios</p><p className="mt-1 text-xl font-bold tabular-nums">{formatCLP(servicios)}</p><p className="text-xs text-slate-500">neto por kWp</p></div>
          <div className="rounded-2xl border border-slate-300 bg-slate-950 p-4 text-white"><p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Total escalable</p><p className="mt-1 text-xl font-bold tabular-nums">{formatCLP(costoGeneralPorKwpNeto(config))}</p><p className="text-xs text-slate-400">neto por kWp</p></div>
        </div>

        <div className="mt-5 space-y-3">
          {config.partidasCostoKwp.map((partida) => {
            const issue = issueFor(issues, `partidasCostoKwp.${partida.id}`);
            return (
              <div key={partida.id} className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[minmax(0,1fr)_190px_120px] md:items-center ${partida.activa ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-950">{partida.nombre}</p><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${partida.categoria === 'materiales' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>{partida.categoria}</span></div>
                  <p className="mt-1 text-xs text-slate-500">{partida.referenciaExcel}</p>
                  {issue && <p className={issue.severity === 'error' ? 'mt-1 text-xs text-rose-700' : 'mt-1 text-xs text-amber-700'}>{issue.message}</p>}
                </div>
                <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Costo neto</span><div className="relative"><input type="number" inputMode="numeric" min={0} step={1} value={Number.isFinite(partida.costoNetoClpPorKwp) ? partida.costoNetoClpPorKwp : ''} onChange={(event) => updatePartida(partida.id, { costoNetoClpPorKwp: event.target.value === '' ? Number.NaN : Number(event.target.value) })} className={`${inputClass(issue?.severity === 'error')} pr-16 tabular-nums`} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-slate-500">CLP/kWp</span></div></label>
                <button type="button" onClick={() => updatePartida(partida.id, { activa: !partida.activa })} aria-pressed={partida.activa} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${partida.activa ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-600'}`}>{partida.activa && <Check className="h-4 w-4" aria-hidden="true" />}{partida.activa ? 'Incluida' : 'Excluida'}</button>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
