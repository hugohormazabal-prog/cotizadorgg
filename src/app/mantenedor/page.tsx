'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BarChart3, BookOpenCheck, CheckCircle2, ChevronRight,
  CircleDollarSign, Cloud, Download, FileClock, KeyRound, Loader2,
  PanelTop, RotateCcw, Save, Search, Settings2, Sun, Upload, Zap,
} from 'lucide-react';
import {
  CONFIG_DEFAULT,
  EXCEL_SHEET_COVERAGE,
  GENERACION_POR_ZONA,
  REGIONES,
  cachePublishedBundle,
  calcularCreditoAlza,
  costoBasePorKwpNeto,
  getConfig,
  getFactorGeneracion,
  getGeneracionPorZona,
  normalizeConfig,
  normalizeGeneration,
  precioInyeccionKwhClp,
  precioVentaPorKwpIva,
  saveConfig,
  saveGenZona,
  type ConfigBundle,
  type ConfigCotizador,
  type GeneracionMensual,
  type GeneracionPorZona,
  type Region,
} from '@/lib/config';
import { calcularCotizacion, formatCLP } from '@/lib/estimaciones';
import { hasErrors, validateConfig, type ConfigIssue } from '@/lib/configValidation';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type SectionId = 'resumen' | 'energia' | 'equipos' | 'financiamiento' | 'proyeccion' | 'generacion' | 'cobertura';

const SECTIONS: { id: SectionId; label: string; icon: typeof Zap }[] = [
  { id: 'resumen', label: 'Resumen e impacto', icon: BarChart3 },
  { id: 'energia', label: 'Energía y cálculo', icon: Zap },
  { id: 'equipos', label: 'Equipos y precio', icon: PanelTop },
  { id: 'financiamiento', label: 'Financiamiento', icon: CircleDollarSign },
  { id: 'proyeccion', label: 'Proyección y garantías', icon: FileClock },
  { id: 'generacion', label: 'Generación regional', icon: Sun },
  { id: 'cobertura', label: 'Cobertura del Excel', icon: BookOpenCheck },
];

function cloneGeneration(source: GeneracionPorZona): GeneracionPorZona {
  return Object.fromEntries(REGIONES.map((region) => [region, [...source[region]]])) as GeneracionPorZona;
}

function fingerprint(config: ConfigCotizador, genZona: GeneracionPorZona): string {
  return JSON.stringify({ config, genZona });
}

function fieldChangeCount(
  config: ConfigCotizador,
  genZona: GeneracionPorZona,
  baseConfig: ConfigCotizador,
  baseGeneration: GeneracionPorZona,
): number {
  let count = (Object.keys(config) as (keyof ConfigCotizador)[])
    .filter((key) => config[key] !== baseConfig[key]).length;
  for (const region of REGIONES) {
    count += genZona[region].filter((value, month) => value !== baseGeneration[region][month]).length;
  }
  return count;
}

function apiHeaders(accessKey: string): Record<string, string> {
  return accessKey ? { 'x-mantenedor-key': accessKey } : {};
}

function FieldShell({ label, htmlFor, hint, reference, error, children }: {
  label: string;
  htmlFor?: string;
  hint?: string;
  reference?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-1">
        {htmlFor
          ? <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">{label}</label>
          : <span className="text-sm font-semibold text-slate-800">{label}</span>}
        {reference && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{reference}</span>}
      </div>
      {children}
      {error
        ? <p id={htmlFor ? `${htmlFor}-help` : undefined} className="text-xs text-rose-700">{error}</p>
        : hint
          ? <p id={htmlFor ? `${htmlFor}-help` : undefined} className="text-xs leading-relaxed text-slate-500">{hint}</p>
          : null}
    </div>
  );
}

function NumberField({ id, label, value, onChange, unit, hint, reference, min, max, integer, percent, issue }: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  hint?: string;
  reference?: string;
  min?: number;
  max?: number;
  integer?: boolean;
  percent?: boolean;
  issue?: ConfigIssue;
}) {
  const displayed = Number.isFinite(value)
    ? (percent ? Number((value * 100).toFixed(6)) : value)
    : '';
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} reference={reference} error={issue?.message}>
      <div className="relative">
        <input
          id={id}
          aria-invalid={issue?.severity === 'error' || undefined}
          aria-describedby={issue || hint ? `${id}-help` : undefined}
          type="number"
          inputMode={integer ? 'numeric' : 'decimal'}
          value={displayed}
          min={percent && min != null ? min * 100 : min}
          max={percent && max != null ? max * 100 : max}
          step="any"
          onChange={(event) => {
            const next = event.target.value === '' ? Number.NaN : Number(event.target.value);
            onChange(percent ? next / 100 : next);
          }}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-20 text-base text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
        />
        {(unit || percent) && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
            {percent ? '%' : unit}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

function TextField({ id, label, value, onChange, hint, reference, issue }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  reference?: string;
  issue?: ConfigIssue;
}) {
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} reference={reference} error={issue?.message}>
      <input
        id={id}
        type="text"
        maxLength={120}
        value={value}
        aria-invalid={issue?.severity === 'error' || undefined}
        aria-describedby={issue || hint ? `${id}-help` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
      />
    </FieldShell>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        {description && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, detail, tone = 'slate' }: { label: string; value: string; detail?: string; tone?: 'slate' | 'amber' | 'emerald' | 'sky' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50',
    amber: 'border-amber-200 bg-amber-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    sky: 'border-sky-200 bg-sky-50',
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-600">{detail}</p>}
    </div>
  );
}

export default function MantenedorPage() {
  const [section, setSection] = useState<SectionId>('resumen');
  const [config, setConfig] = useState<ConfigCotizador>(CONFIG_DEFAULT);
  const [genZona, setGenZona] = useState<GeneracionPorZona>(() => cloneGeneration(GENERACION_POR_ZONA));
  const [published, setPublished] = useState<ConfigBundle>({ config: CONFIG_DEFAULT, genZona: GENERACION_POR_ZONA, version: 0, status: 'local' });
  const [savedFingerprint, setSavedFingerprint] = useState(() => fingerprint(CONFIG_DEFAULT, GENERACION_POR_ZONA));
  const [baseVersion, setBaseVersion] = useState(0);
  const [history, setHistory] = useState<ConfigBundle[]>([]);
  const [mode, setMode] = useState<'loading' | 'local' | 'central'>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [comment, setComment] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<Region>('Metropolitana');
  const [scenarioSpend, setScenarioSpend] = useState(70_000);
  const [scenarioRegion, setScenarioRegion] = useState<Region>('Metropolitana');
  const [accessKey, setAccessKey] = useState('');
  const [needsKey, setNeedsKey] = useState(false);
  const [search, setSearch] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (key = accessKey) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/config?scope=admin', { cache: 'no-store', headers: apiHeaders(key) });
      if (response.status === 401) {
        setNeedsKey(true);
        setMode('local');
        return;
      }
      if (!response.ok) throw new Error('No se pudo cargar la configuración.');
      const payload = await response.json() as {
        published: ConfigBundle;
        latestDraft: ConfigBundle | null;
        history: ConfigBundle[];
        mode: 'local' | 'central';
        warning?: string;
      };
      const localBundle: ConfigBundle = {
        config: getConfig(), genZona: getGeneracionPorZona(), version: 0, status: 'local',
      };
      const active = payload.mode === 'central'
        ? payload.latestDraft ?? payload.published
        : localBundle;
      setConfig(normalizeConfig(active.config));
      setGenZona(cloneGeneration(normalizeGeneration(active.genZona)));
      setPublished(payload.mode === 'central' ? payload.published : localBundle);
      setSavedFingerprint(fingerprint(normalizeConfig(active.config), normalizeGeneration(active.genZona)));
      setHistory(payload.history ?? []);
      setBaseVersion(Math.max(active.version, payload.published.version, ...(payload.history ?? []).map((item) => item.version)));
      setMode(payload.mode);
      setNeedsKey(false);
      if (key) sessionStorage.setItem('gg-mantenedor-key', key);
      if (payload.warning) setMessage({ type: 'info', text: payload.warning });
    } catch (error) {
      setMode('local');
      const localConfig = getConfig();
      const localGeneration = getGeneracionPorZona();
      setConfig(localConfig);
      setGenZona(cloneGeneration(localGeneration));
      setPublished({ config: localConfig, genZona: localGeneration, version: 0, status: 'local' });
      setSavedFingerprint(fingerprint(localConfig, localGeneration));
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error inesperado.' });
    } finally {
      setBusy(false);
    }
  }, [accessKey]);

  useEffect(() => {
    const savedKey = sessionStorage.getItem('gg-mantenedor-key') ?? '';
    setAccessKey(savedKey);
    void load(savedKey);
    // Se ejecuta una vez al montar; load recibe la clave de sessionStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const issues = useMemo(() => validateConfig(config, genZona), [config, genZona]);
  const issueFor = (field: keyof ConfigCotizador) => issues.find((issue) => issue.field === field);
  const currentFingerprint = useMemo(() => fingerprint(config, genZona), [config, genZona]);
  const dirty = currentFingerprint !== savedFingerprint;
  const changesVsPublished = useMemo(() => fieldChangeCount(
    config, genZona, published.config, published.genZona,
  ), [config, genZona, published]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const patch = <K extends keyof ConfigCotizador>(key: K, value: ConfigCotizador[K]) => {
    setConfig((previous) => ({ ...previous, [key]: value }));
  };

  const preview = useMemo(() => calcularCotizacion({
    montoClp: scenarioSpend,
    consumoKwh: null,
    unidad: 'clp',
    region: scenarioRegion,
    config,
    generacionPorZona: genZona,
  }), [scenarioSpend, scenarioRegion, config, genZona]);

  const publishedPreview = useMemo(() => calcularCotizacion({
    montoClp: scenarioSpend,
    consumoKwh: null,
    unidad: 'clp',
    region: scenarioRegion,
    config: published.config,
    generacionPorZona: published.genZona,
  }), [scenarioSpend, scenarioRegion, published]);

  const persist = async (action: 'saveDraft' | 'publish') => {
    if (hasErrors(issues)) {
      setMessage({ type: 'error', text: 'Corrige los errores antes de guardar o publicar.' });
      return;
    }
    if (action === 'publish' && !window.confirm(`Se publicarán ${changesVsPublished} cambios para todos los visitantes. ¿Continuar?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'central') {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...apiHeaders(accessKey) },
          body: JSON.stringify({ action, config, genZona, expectedVersion: baseVersion, comment }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'No fue posible guardar.');
        const bundle = payload.bundle as ConfigBundle;
        setBaseVersion(bundle.version);
        setSavedFingerprint(currentFingerprint);
        setHistory((previous) => [bundle, ...previous].slice(0, 20));
        if (action === 'publish') {
          setPublished(bundle);
          cachePublishedBundle(bundle);
        }
      } else {
        saveConfig(config);
        saveGenZona(genZona);
        setPublished({ config, genZona, version: 0, status: 'local' });
        setSavedFingerprint(currentFingerprint);
      }
      setComment('');
      setMessage({
        type: 'success',
        text: action === 'publish'
          ? mode === 'central' ? 'Configuración publicada para toda la web.' : 'Configuración aplicada en este navegador.'
          : 'Borrador guardado correctamente.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error inesperado.' });
    } finally {
      setBusy(false);
    }
  };

  const restoreDefaults = () => {
    if (!window.confirm('¿Restaurar todos los campos y la matriz regional a los valores auditados del Excel?')) return;
    setConfig(CONFIG_DEFAULT);
    setGenZona(cloneGeneration(GENERACION_POR_ZONA));
    setMessage({ type: 'info', text: 'Defaults cargados como borrador. Aún no se han publicado.' });
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify({ config, genZona, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cotizador-config-v${baseVersion || 'local'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as { config?: unknown; genZona?: unknown };
      if (!parsed.config || typeof parsed.config !== 'object' || !parsed.genZona || typeof parsed.genZona !== 'object') {
        throw new Error('Estructura incompleta.');
      }
      const rawGeneration = parsed.genZona as Record<string, unknown>;
      const completeMatrix = REGIONES.every((region) => {
        const row = rawGeneration[region];
        return Array.isArray(row) && row.length === 12 && row.every((value) => typeof value === 'number' && Number.isFinite(value));
      });
      if (!completeMatrix) throw new Error('La matriz regional está incompleta.');
      const importedConfig = normalizeConfig(parsed.config);
      const importedGeneration = normalizeGeneration(parsed.genZona);
      const importIssues = validateConfig(importedConfig, importedGeneration);
      if (hasErrors(importIssues)) throw new Error(importIssues.find((issue) => issue.severity === 'error')?.message);
      setConfig(importedConfig);
      setGenZona(cloneGeneration(importedGeneration));
      setMessage({ type: 'info', text: 'Archivo importado como borrador. Revísalo antes de publicar.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error && error.message ? `No se pudo importar: ${error.message}` : 'El archivo no contiene una configuración JSON válida.' });
    }
  };

  const alzaPreview = preview ? calcularCreditoAlza(preview.precioProyectoClp, config) : null;
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;

  if (needsKey) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
        <form className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl" onSubmit={(event) => { event.preventDefault(); void load(accessKey); }}>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700"><KeyRound /></div>
          <h1 className="mt-5 text-2xl font-bold text-slate-950">Acceso al mantenedor</h1>
          <p className="mt-2 text-sm text-slate-600">La protección ya está preparada en servidor. Ingresa la clave configurada para continuar.</p>
          <label htmlFor="access-key" className="mt-5 block text-sm font-semibold text-slate-800">Clave</label>
          <input id="access-key" type="password" value={accessKey} onChange={(event) => setAccessKey(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" autoFocus />
          <button type="submit" disabled={busy} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 font-semibold text-white disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Entrar</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-3 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-amber-300"><Settings2 className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold sm:text-lg">Mantenedor del cotizador</h1>
              <p className="truncate text-xs text-slate-500">{mode === 'central' ? `Versión ${published.version} publicada` : mode === 'loading' ? 'Cargando…' : 'Modo local · falta configurar publicación central'}</p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button type="button" onClick={() => void persist('saveDraft')} disabled={busy || !dirty || errorCount > 0} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-45 sm:flex-none"><Save className="h-4 w-4" /> Guardar borrador</button>
            <button type="button" onClick={() => void persist('publish')} disabled={busy || errorCount > 0 || changesVsPublished === 0} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-sm font-bold text-slate-950 shadow-sm disabled:opacity-45 sm:flex-none">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />} {mode === 'central' ? 'Publicar' : 'Aplicar local'}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
          <nav aria-label="Secciones del mantenedor" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" onClick={() => setSection(item.id)} aria-current={section === item.id ? 'page' : undefined} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold transition lg:w-full ${section === item.id ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                  <Icon className={`h-4 w-4 ${section === item.id ? 'text-amber-300' : 'text-slate-400'}`} />
                  {item.label}
                  {section === item.id && <ChevronRight className="ml-auto hidden h-4 w-4 lg:block" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 hidden rounded-2xl border border-slate-200 bg-white p-4 lg:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado del borrador</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span>Cambios</span><b>{changesVsPublished}</b></div>
              <div className="flex justify-between"><span>Errores</span><b className={errorCount ? 'text-rose-700' : 'text-emerald-700'}>{errorCount}</b></div>
              <div className="flex justify-between"><span>Advertencias</span><b className={warningCount ? 'text-amber-700' : ''}>{warningCount}</b></div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          {message && (
            <div role="status" className={`flex items-start gap-2 rounded-2xl border p-3 text-sm ${message.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-sky-200 bg-sky-50 text-sky-800'}`}>
              {message.type === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {errorCount > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4" role="alert">
              <p className="font-bold text-rose-900">Hay {errorCount} errores que bloquean la publicación</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-800">{issues.filter((issue) => issue.severity === 'error').slice(0, 6).map((issue) => <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>)}</ul>
            </div>
          )}

          {section === 'resumen' && (
            <>
              <SectionCard title="Impacto antes de publicar" description="Prueba un caso patrón y compara el borrador con la versión que hoy ve la web.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField id="scenario-spend" label="Cuenta eléctrica del caso" value={scenarioSpend} onChange={setScenarioSpend} unit="CLP/mes" min={1} integer />
                  <FieldShell label="Región del caso" htmlFor="scenario-region">
                    <select id="scenario-region" value={scenarioRegion} onChange={(event) => setScenarioRegion(event.target.value as Region)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100">{REGIONES.map((region) => <option key={region}>{region}</option>)}</select>
                  </FieldShell>
                </div>
                {preview && publishedPreview && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric label="Paneles" value={`${preview.sistema.numeroPaneles}`} detail={`Publicado: ${publishedPreview.sistema.numeroPaneles}`} tone="amber" />
                    <Metric label="Sistema" value={`${preview.sistema.capacidadKwp.toLocaleString('es-CL')} kWp`} detail={`Publicado: ${publishedPreview.sistema.capacidadKwp.toLocaleString('es-CL')} kWp`} tone="sky" />
                    <Metric label="Precio" value={formatCLP(preview.precioProyectoClp)} detail={`Δ ${formatCLP(preview.precioProyectoClp - publishedPreview.precioProyectoClp)}`} tone="slate" />
                    <Metric label="Ahorro mensual" value={formatCLP(preview.ahorro.ahorroMensualProm)} detail={`Δ ${formatCLP(preview.ahorro.ahorroMensualProm - publishedPreview.ahorro.ahorroMensualProm)}`} tone="emerald" />
                    <Metric label="Payback simple" value={`${preview.paybackAnios.toLocaleString('es-CL')} años`} detail={`Publicado: ${publishedPreview.paybackAnios.toLocaleString('es-CL')}`} />
                    <Metric label={`Ahorro ${config.periodoEvaluacionAnios} años`} value={formatCLP(preview.proyeccion.ahorroAcumuladoClp)} detail={`VAN: ${formatCLP(preview.proyeccion.vanClp)}`} />
                    <Metric label="Cuota Santander" value={formatCLP(preview.opcionesFinanciamiento.find((item) => item.id === 'santander')?.cuotaMensual ?? 0)} detail={`${config.cuotasSantander} cuotas`} />
                    <Metric label="Cuota ALZA" value={formatCLP(alzaPreview?.cuotaMensual ?? 0)} detail={`${(alzaPreview?.cuotaUf ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 2 })} UF · ${config.cuotasALZA} meses`} />
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Control de cambios" description="Guarda un borrador, documenta el motivo y publica solo cuando la validación y el impacto estén correctos.">
                <label htmlFor="change-comment" className="text-sm font-semibold text-slate-800">Motivo del cambio</label>
                <textarea id="change-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} rows={3} placeholder="Ej.: actualización de tarifas y costos de instalación de agosto" className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={exportConfig} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold"><Download className="h-4 w-4" /> Exportar JSON</button>
                  <button type="button" onClick={() => importRef.current?.click()} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold"><Upload className="h-4 w-4" /> Importar JSON</button>
                  <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importConfig(file); event.target.value = ''; }} />
                  <button type="button" onClick={restoreDefaults} className="flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 px-3 text-sm font-semibold text-rose-700"><RotateCcw className="h-4 w-4" /> Restaurar defaults</button>
                </div>
                {history.length > 0 && (
                  <div className="mt-6 border-t border-slate-200 pt-5">
                    <h3 className="font-bold">Historial reciente</h3>
                    <div className="mt-3 space-y-2">{history.slice(0, 8).map((item) => (
                      <div key={`${item.version}-${item.status}`} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Versión {item.version} · {item.status === 'published' ? 'publicada' : item.status === 'draft' ? 'borrador' : 'archivada'}</p><p className="truncate text-xs text-slate-500">{item.comment || 'Sin comentario'}{item.updatedAt ? ` · ${new Date(item.updatedAt).toLocaleString('es-CL')}` : ''}</p></div>
                        <button type="button" onClick={() => { setConfig(normalizeConfig(item.config)); setGenZona(cloneGeneration(normalizeGeneration(item.genZona))); setMessage({ type: 'info', text: `Versión ${item.version} cargada como borrador.` }); }} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold">Cargar</button>
                      </div>
                    ))}</div>
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {section === 'energia' && (
            <SectionCard title="Energía y reglas de dimensionamiento" description="Variables de MAIN, INPUT y FINBACK. Los derivados son solo lectura para evitar combinaciones incoherentes.">
              <div className="grid gap-5 md:grid-cols-2">
                <NumberField id="precio-kwh" label="Tarifa de consumo" value={config.precioKwhClp} onChange={(value) => patch('precioKwhClp', value)} unit="CLP/kWh" reference="MAIN!C71" issue={issueFor('precioKwhClp')} />
                <NumberField id="precio-nudo" label="Precio de nudo sin IVA" value={config.precioNudoInyeccionClp} onChange={(value) => patch('precioNudoInyeccionClp', value)} unit="CLP/kWh" reference="MAIN!C72" issue={issueFor('precioNudoInyeccionClp')} />
                <NumberField id="iva-inyeccion" label="IVA aplicado a inyección" value={config.ivaInyeccion - 1} onChange={(value) => patch('ivaInyeccion', 1 + value)} percent min={0} max={1} reference="MAIN!C72" issue={issueFor('ivaInyeccion')} />
                <NumberField id="limite-auto" label="Límite de autoconsumo" value={config.limiteAutoconsumo} onChange={(value) => patch('limiteAutoconsumo', value)} percent min={0} max={1} reference="INPUT!B19" issue={issueFor('limiteAutoconsumo')} />
                <NumberField id="proyeccion" label="Proyección de consumo" value={config.proyeccionConsumo} onChange={(value) => patch('proyeccionConsumo', value)} unit="factor" reference="INPUT!B18" issue={issueFor('proyeccionConsumo')} />
                <NumberField id="min-paneles" label="Mínimo de paneles" value={config.minPaneles} onChange={(value) => patch('minPaneles', value)} unit="paneles" integer issue={issueFor('minPaneles')} />
                <NumberField id="max-paneles" label="Tope monofásico" value={config.maxPanelesMonofasico} onChange={(value) => patch('maxPanelesMonofasico', value)} unit="paneles" integer reference="COTBACK!D53" issue={issueFor('maxPanelesMonofasico')} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Metric label="Inyección efectiva" value={`${precioInyeccionKwhClp(config).toLocaleString('es-CL', { maximumFractionDigits: 4 })} CLP/kWh`} detail="Precio de nudo × IVA" tone="sky" />
                <Metric label="Factor de generación" value={getFactorGeneracion(config).toLocaleString('es-CL', { maximumFractionDigits: 4 })} detail="Derivado; no se edita manualmente" tone="amber" />
              </div>
            </SectionCard>
          )}

          {section === 'equipos' && (
            <SectionCard title="Equipos activos y estructura de precio" description="Controla los equipos, datos y costos que alimentan el cálculo dinámico.">
              <div className="grid gap-5 md:grid-cols-2">
                <TextField id="panel-modelo" label="Panel activo" value={config.panelMarcaModelo} onChange={(value) => patch('panelMarcaModelo', value)} reference="PAN / MAIN!C30" issue={issueFor('panelMarcaModelo')} />
                <NumberField id="panel-potencia" label="Potencia del panel" value={config.panelPotenciaW} onChange={(value) => patch('panelPotenciaW', value)} unit="W" integer reference="PAN!G" issue={issueFor('panelPotenciaW')} />
                <TextField id="inversor-modelo" label="Inversor activo" value={config.inversorMarcaModelo} onChange={(value) => patch('inversorMarcaModelo', value)} reference="INV / COTBACK!B57" issue={issueFor('inversorMarcaModelo')} />
                <NumberField id="inversor-min" label="Potencia mínima inversor" value={config.inversorPotenciaMinKw} onChange={(value) => patch('inversorPotenciaMinKw', value)} unit="kW" reference="COTBACK!B58" issue={issueFor('inversorPotenciaMinKw')} />
                <NumberField id="cost-material" label="Costo materiales por kWp" value={config.costoMaterialesPorKwpNeto} onChange={(value) => patch('costoMaterialesPorKwpNeto', value)} unit="CLP neto" reference="CUBICADOR!K4" issue={issueFor('costoMaterialesPorKwpNeto')} />
                <NumberField id="cost-service" label="Costo servicios por kWp" value={config.costoServiciosPorKwpNeto} onChange={(value) => patch('costoServiciosPorKwpNeto', value)} unit="CLP neto" reference="CUBICADOR!K5" issue={issueFor('costoServiciosPorKwpNeto')} />
                <NumberField id="margin" label="Margen objetivo" value={config.margen} onChange={(value) => patch('margen', value)} percent min={0} max={0.8} reference="MAIN!C26" issue={issueFor('margen')} />
                <NumberField id="iva-sale" label="IVA de venta" value={config.ivaVenta - 1} onChange={(value) => patch('ivaVenta', 1 + value)} percent min={0} max={1} reference="COT_ONGRID" issue={issueFor('ivaVenta')} />
                <NumberField id="round-price" label="Redondeo hacia arriba" value={config.redondeoPrecioClp} onChange={(value) => patch('redondeoPrecioClp', value)} unit="CLP" integer reference="COT_ONGRID!A77" issue={issueFor('redondeoPrecioClp')} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Metric label="Costo base por kWp" value={formatCLP(costoBasePorKwpNeto(config))} detail="Materiales + servicios, neto" />
                <Metric label="Precio venta por kWp" value={formatCLP(precioVentaPorKwpIva(config))} detail="IVA incluido, antes del redondeo del proyecto" tone="amber" />
              </div>
            </SectionCard>
          )}

          {section === 'financiamiento' && (
            <div className="space-y-5">
              <SectionCard title="Tarjetas" description="Cada medio mantiene su propio factor y plazo; cambiar Santander ya no altera Mercado Pago.">
                <div className="grid gap-5 md:grid-cols-2">
                  <NumberField id="mp-factor" label="Factor total Mercado Pago" value={config.factorMP} onChange={(value) => patch('factorMP', value)} unit="× precio" reference="FC MP" issue={issueFor('factorMP')} />
                  <NumberField id="mp-quota" label="Cuotas Mercado Pago" value={config.cuotasMP} onChange={(value) => patch('cuotasMP', value)} unit="meses" integer reference="COT_ONGRID" issue={issueFor('cuotasMP')} />
                  <NumberField id="san-factor" label="Factor total Santander" value={config.factorSantander} onChange={(value) => patch('factorSantander', value)} unit="× precio" reference="13% + IVA" issue={issueFor('factorSantander')} />
                  <NumberField id="san-quota" label="Cuotas Santander" value={config.cuotasSantander} onChange={(value) => patch('cuotasSantander', value)} unit="meses" integer reference="FC SANTANDER" issue={issueFor('cuotasSantander')} />
                </div>
              </SectionCard>
              <SectionCard title="Crédito verde ALZA" description="La cuota se recalcula automáticamente con la fórmula completa de CREDITOALZA; ya no existe un factor mensual manual.">
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <NumberField id="alza-rate" label="Tasa anual" value={config.alzaTasaAnual} onChange={(value) => patch('alzaTasaAnual', value)} percent reference="CREDITOALZA!C25" issue={issueFor('alzaTasaAnual')} />
                  <NumberField id="alza-term" label="Plazo" value={config.cuotasALZA} onChange={(value) => patch('cuotasALZA', value)} unit="meses" integer reference="CREDITOALZA!C24" issue={issueFor('cuotasALZA')} />
                  <NumberField id="alza-grace" label="Meses de gracia" value={config.alzaMesesGracia} onChange={(value) => patch('alzaMesesGracia', value)} unit="meses" integer reference="CREDITOALZA!C23" issue={issueFor('alzaMesesGracia')} />
                  <NumberField id="alza-fee" label="Financial fee" value={config.alzaFinancialFee} onChange={(value) => patch('alzaFinancialFee', value)} percent reference="CREDITOALZA!D20" issue={issueFor('alzaFinancialFee')} />
                  <NumberField id="alza-guarantee-cap" label="Garantía sobre capital" value={config.alzaGarantiaCapital} onChange={(value) => patch('alzaGarantiaCapital', value)} percent reference="CREDITOALZA!C14" issue={issueFor('alzaGarantiaCapital')} />
                  <NumberField id="alza-guarantee-exp" label="Garantía sobre gastos" value={config.alzaGarantiaGastos} onChange={(value) => patch('alzaGarantiaGastos', value)} percent reference="CREDITOALZA!C14" issue={issueFor('alzaGarantiaGastos')} />
                  <NumberField id="alza-uf-cost" label="Gastos variables" value={config.alzaGastosUf} onChange={(value) => patch('alzaGastosUf', value)} unit="UF" reference="4,27 + 3,2 UF" issue={issueFor('alzaGastosUf')} />
                  <NumberField id="alza-fixed" label="Gasto fijo" value={config.alzaGastoFijoClp} onChange={(value) => patch('alzaGastoFijoClp', value)} unit="CLP neto" reference="CREDITOALZA!C16" issue={issueFor('alzaGastoFijoClp')} />
                  <NumberField id="uf" label="Valor UF" value={config.valorUfClp} onChange={(value) => patch('valorUfClp', value)} unit="CLP/UF" reference="CREDITOALZA!C28" issue={issueFor('valorUfClp')} />
                </div>
                {alzaPreview && <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Total financiado" value={formatCLP(alzaPreview.totalFinanciado)} /><Metric label="Cuota mensual" value={formatCLP(alzaPreview.cuotaMensual)} tone="amber" /><Metric label="Cuota en UF" value={`${alzaPreview.cuotaUf.toLocaleString('es-CL', { maximumFractionDigits: 4 })} UF`} /></div>}
              </SectionCard>
            </div>
          )}

          {section === 'proyeccion' && (
            <SectionCard title="Proyección, reposiciones y garantías" description="Estas variables ahora alimentan la proyección del motor y la vista previa de impacto.">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <NumberField id="ipc" label="IPC anual" value={config.ipcAnual - 1} onChange={(value) => patch('ipcAnual', 1 + value)} percent reference="FC*!C5" issue={issueFor('ipcAnual')} />
                <NumberField id="degradation" label="Degradación anual" value={config.degradacionPaneles} onChange={(value) => patch('degradacionPaneles', value)} percent reference="FC*!C6" issue={issueFor('degradacionPaneles')} />
                <NumberField id="period" label="Horizonte de evaluación" value={config.periodoEvaluacionAnios} onChange={(value) => patch('periodoEvaluacionAnios', value)} unit="años" integer reference="FC*!B38/B41" issue={issueFor('periodoEvaluacionAnios')} />
                <NumberField id="discount" label="Tasa de descuento" value={config.tasaDescuentoAnual} onChange={(value) => patch('tasaDescuentoAnual', value)} percent reference="FC*!B39/B42" issue={issueFor('tasaDescuentoAnual')} />
                <NumberField id="replacement-year-1" label="Primera reposición" value={config.anioReposicion1} onChange={(value) => patch('anioReposicion1', value)} unit="año" integer issue={issueFor('anioReposicion1')} />
                <NumberField id="replacement-1" label="Costo primera reposición" value={config.inversionRespuesto10} onChange={(value) => patch('inversionRespuesto10', value)} unit="CLP" reference="FC Capital Propio!O30" issue={issueFor('inversionRespuesto10')} />
                <NumberField id="replacement-year-2" label="Segunda reposición" value={config.anioReposicion2} onChange={(value) => patch('anioReposicion2', value)} unit="año" integer issue={issueFor('anioReposicion2')} />
                <NumberField id="replacement-2" label="Costo segunda reposición" value={config.inversionRespuesto22} onChange={(value) => patch('inversionRespuesto22', value)} unit="CLP" reference="FC Capital Propio!Y30" issue={issueFor('inversionRespuesto22')} />
                <NumberField id="warranty-panel" label="Garantía paneles" value={config.garantiaPaneles} onChange={(value) => patch('garantiaPaneles', value)} unit="años" integer reference="PAN" issue={issueFor('garantiaPaneles')} />
                <NumberField id="warranty-inverter" label="Garantía inversor" value={config.garantiaInversor} onChange={(value) => patch('garantiaInversor', value)} unit="años" integer reference="INV" issue={issueFor('garantiaInversor')} />
                <NumberField id="warranty-install" label="Garantía instalación" value={config.garantiaInstalacion} onChange={(value) => patch('garantiaInstalacion', value)} unit="años" integer reference="FINBACK!B62" issue={issueFor('garantiaInstalacion')} />
                <NumberField id="co2" label="Factor mitigación CO₂" value={config.co2FactorKgPerKwh} onChange={(value) => patch('co2FactorKgPerKwh', value)} unit="kg/kWh" reference="FINBACK!B49" issue={issueFor('co2FactorKgPerKwh')} />
              </div>
            </SectionCard>
          )}

          {section === 'generacion' && (
            <SectionCard title="Generación mensual por región" description="Edición móvil y desktop en 12 campos grandes. El total anual es derivado y se valida antes de publicar.">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <FieldShell label="Región" htmlFor="generation-region">
                  <select id="generation-region" value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value as Region)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none sm:min-w-64">{REGIONES.map((region) => <option key={region}>{region}</option>)}</select>
                </FieldShell>
                <button type="button" onClick={() => setGenZona((previous) => ({ ...previous, [selectedRegion]: [...GENERATION_ROW(selectedRegion)] as GeneracionMensual }))} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold">Restaurar esta región</button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {genZona[selectedRegion].map((value, month) => {
                  const issue = issues.find((item) => item.field === `genZona.${selectedRegion}.${month}`);
                  return <NumberField key={MONTHS[month]} id={`generation-${month}`} label={MONTHS[month]} value={value} onChange={(next) => setGenZona((previous) => { const row = [...previous[selectedRegion]] as GeneracionMensual; row[month] = next; return { ...previous, [selectedRegion]: row }; })} unit="kWh/kWp" issue={issue} />;
                })}
              </div>
              <div className="mt-5"><Metric label="Total anual" value={`${genZona[selectedRegion].reduce((sum, value) => sum + value, 0).toLocaleString('es-CL')} kWh/kWp`} detail="Suma automática de los 12 meses" tone="sky" /></div>
            </SectionCard>
          )}

          {section === 'cobertura' && (
            <SectionCard title="Cobertura de las 38 hojas" description="Inventario explícito para evitar omisiones y facilitar futuras ampliaciones del modelo.">
              <label htmlFor="sheet-search" className="sr-only">Buscar hoja</label>
              <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input id="sheet-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar hoja o función…" className="min-h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="divide-y divide-slate-200">{EXCEL_SHEET_COVERAGE.filter(([name, role]) => `${name} ${role}`.toLowerCase().includes(search.toLowerCase())).map(([name, role, status]) => (
                  <div key={name} className="grid gap-1 bg-white p-3 sm:grid-cols-[180px_1fr_120px] sm:items-center"><b className="text-sm">{name}</b><span className="text-sm text-slate-600">{role}</span><span className={`w-fit rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${status === 'directa' ? 'bg-emerald-100 text-emerald-800' : status === 'referencia' ? 'bg-slate-100 text-slate-600' : status === 'derivada' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>{status.replace('_', ' ')}</span></div>
                ))}</div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </main>
  );
}

function GENERATION_ROW(region: Region): GeneracionMensual {
  return GENERACION_POR_ZONA[region];
}
