'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BarChart3, CheckCircle2, ChevronRight,
  CircleDollarSign, Cloud, Download, FileClock, History, KeyRound, Loader2,
  PanelTop, RotateCcw, Ruler, Save, Settings2, Sun, Upload, Zap,
} from 'lucide-react';
import {
  CONFIG_DEFAULT,
  GENERACION_POR_ZONA,
  REGIONES,
  cachePublishedBundle,
  calcularCreditoAlza,
  getConfig,
  getFactorGeneracion,
  getGeneracionPorZona,
  normalizeConfig,
  normalizeGeneration,
  precioInyeccionKwhClp,
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
import { EquipmentCatalogManager } from '@/components/maintainer/EquipmentCatalogManager';
import { KwpVariablesManager } from '@/components/maintainer/KwpVariablesManager';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type SectionId = 'resumen' | 'energia' | 'variables' | 'equipos' | 'financiamiento' | 'proyeccion' | 'generacion' | 'cambios';

const SECTIONS: { id: SectionId; label: string; icon: typeof Zap }[] = [
  { id: 'resumen', label: 'Resumen e impacto', icon: BarChart3 },
  { id: 'energia', label: 'Energía y cálculo', icon: Zap },
  { id: 'variables', label: 'Partidas y costos', icon: Ruler },
  { id: 'equipos', label: 'Equipos y precio', icon: PanelTop },
  { id: 'financiamiento', label: 'Financiamiento', icon: CircleDollarSign },
  { id: 'proyeccion', label: 'Proyección y garantías', icon: FileClock },
  { id: 'generacion', label: 'Generación regional', icon: Sun },
  { id: 'cambios', label: 'Cambios e historial', icon: History },
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
    .filter((key) => {
      const current = config[key];
      const base = baseConfig[key];
      return typeof current === 'object' || typeof base === 'object'
        ? JSON.stringify(current) !== JSON.stringify(base)
        : current !== base;
    }).length;
  for (const region of REGIONES) {
    count += genZona[region].filter((value, month) => value !== baseGeneration[region][month]).length;
  }
  return count;
}

function apiHeaders(username: string, password: string): Record<string, string> {
  if (username || password) {
    return {
      'x-mantenedor-user': username,
      'x-mantenedor-password': password,
      // Mantiene funcionando instalaciones con MANTENEDOR_ACCESS_KEY.
      'x-mantenedor-key': password,
    };
  }
  return {};
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
      <div className="flex flex-wrap items-center gap-1">
        {htmlFor
          ? <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">{label}</label>
          : <span className="text-sm font-semibold text-slate-800">{label}</span>}
        {reference && <span id={htmlFor ? `${htmlFor}-reference` : undefined} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{reference}</span>}
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
          aria-describedby={[
            reference ? `${id}-reference` : '',
            issue || hint ? `${id}-help` : '',
          ].filter(Boolean).join(' ') || undefined}
          type="number"
          inputMode={integer ? 'numeric' : 'decimal'}
          value={displayed}
          min={percent && min != null ? min * 100 : min}
          max={percent && max != null ? max * 100 : max}
          step={integer ? 1 : 'any'}
          onChange={(event) => {
            const next = event.target.value === '' ? Number.NaN : Number(event.target.value);
            onChange(percent ? next / 100 : next);
          }}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-32 text-base text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
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

/** Sección del mantenedor donde se corrige cada campo, para que el banner de
 *  errores lleve directo al ajuste en vez de dejar al usuario buscándolo. */
function seccionDelCampo(field: string): SectionId {
  const raiz = field.split('.')[0];
  if (raiz === 'reglasInversorPorPaneles' || raiz === 'catalogoInversores' || raiz === 'catalogoPaneles'
    || raiz === 'panelActivoId' || raiz === 'inversorActivoId' || raiz === 'margen' || raiz === 'ivaVenta'
    || raiz === 'redondeoPrecioClp') return 'equipos';
  if (raiz === 'partidasCostoKwp' || raiz === 'variablesVinculantesKwp'
    || raiz === 'costoMaterialesGeneralesPorKwpNeto' || raiz === 'costoServiciosPorKwpNeto') return 'variables';
  if (raiz.startsWith('alza') || raiz === 'cuotasALZA' || raiz === 'valorUfClp' || raiz === 'factorMP'
    || raiz === 'factorSantander' || raiz === 'cuotasMP' || raiz === 'cuotasSantander') return 'financiamiento';
  if (raiz === 'genZona') return 'generacion';
  if (raiz === 'mpcAnualClpKwh' || raiz === 'ipcAnual' || raiz === 'degradacionPaneles'
    || raiz === 'tasaDescuentoAnual' || raiz === 'periodoEvaluacionAnios' || raiz.startsWith('anioReposicion')
    || raiz.startsWith('inversionRespuesto') || raiz === 'garantiaInstalacion' || raiz === 'factorCo2') return 'proyeccion';
  return 'energia';
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
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [needsKey, setNeedsKey] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (user = username, secret = password) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/config?scope=admin', { cache: 'no-store', headers: apiHeaders(user, secret) });
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
      if (user || secret) {
        sessionStorage.setItem('gg-mantenedor-user', user);
        sessionStorage.setItem('gg-mantenedor-password', secret);
      }
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
  }, [username, password]);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('gg-mantenedor-user') ?? 'admin';
    const savedPassword = sessionStorage.getItem('gg-mantenedor-password') ?? '';
    setUsername(savedUser);
    setPassword(savedPassword);
    void load(savedUser, savedPassword);
    // Se ejecuta una vez al montar; load recibe la clave de sessionStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const issues = useMemo(() => validateConfig(config, genZona), [config, genZona]);
  const issueFor = (field: string) => issues.find((issue) => issue.field === field);
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
          headers: { 'content-type': 'application/json', ...apiHeaders(username, password) },
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
    if (!window.confirm('¿Restaurar toda la configuración a sus valores iniciales?')) return;
    setConfig(CONFIG_DEFAULT);
    setGenZona(cloneGeneration(GENERACION_POR_ZONA));
    setMessage({ type: 'info', text: 'Valores iniciales cargados como borrador. Aún no se han publicado.' });
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
        <form className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl" onSubmit={(event) => { event.preventDefault(); void load(username, password); }}>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700"><KeyRound /></div>
          <h1 className="mt-5 text-2xl font-bold text-slate-950">Acceso al mantenedor</h1>
          <p className="mt-2 text-sm text-slate-600">Ingresa una cuenta autorizada para administrar los cálculos y equipos.</p>
          <label htmlFor="access-user" className="mt-5 block text-sm font-semibold text-slate-800">Usuario</label>
          <input id="access-user" type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" autoFocus />
          <label htmlFor="access-password" className="mt-4 block text-sm font-semibold text-slate-800">Contraseña</label>
          <input id="access-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
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
              <p className="truncate text-xs text-slate-500">{mode === 'central' ? `Versión ${published.version} publicada` : mode === 'loading' ? 'Cargando…' : 'Modo local'}</p>
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
              <ul className="mt-2 space-y-1.5 text-sm text-rose-800">{issues.filter((issue) => issue.severity === 'error').slice(0, 6).map((issue) => {
                const destino = seccionDelCampo(issue.field);
                const etiqueta = SECTIONS.find((item) => item.id === destino)?.label ?? 'Revisar';
                return (
                  <li key={`${issue.field}-${issue.message}`}>
                    <button
                      type="button"
                      onClick={() => { setSection(destino); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="group flex w-full items-start gap-2 rounded-lg px-2 py-1 text-left transition hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                      <span>
                        {issue.message}{' '}
                        <span className="whitespace-nowrap font-bold underline decoration-rose-400 underline-offset-2 group-hover:decoration-rose-700">
                          Ir a {etiqueta} →
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}</ul>
            </div>
          )}

          {section === 'resumen' && (
            <SectionCard title="Vista previa de resultados" description="Comprueba el resultado de una simulación antes de publicar los cambios.">
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
          )}

          {section === 'cambios' && (
            <div className="space-y-5">
              <SectionCard title="Publicación y respaldo" description="Administra borradores, respaldos y restauraciones de la configuración.">
                <label htmlFor="change-comment" className="text-sm font-semibold text-slate-800">Motivo del cambio</label>
                <textarea id="change-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} rows={3} placeholder="Ej.: actualización de tarifas y costos de instalación de agosto" className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-base outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={exportConfig} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold"><Download className="h-4 w-4" /> Exportar JSON</button>
                  <button type="button" onClick={() => importRef.current?.click()} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold"><Upload className="h-4 w-4" /> Importar JSON</button>
                  <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importConfig(file); event.target.value = ''; }} />
                  <button type="button" onClick={restoreDefaults} className="flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 px-3 text-sm font-semibold text-rose-700"><RotateCcw className="h-4 w-4" /> Restaurar valores iniciales</button>
                </div>
              </SectionCard>

              <SectionCard title="Historial de versiones" description="Consulta versiones publicadas y borradores guardados.">
                {history.length > 0 ? (
                  <div className="space-y-2">{history.slice(0, 20).map((item) => (
                    <div key={`${item.version}-${item.status}`} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Versión {item.version} · {item.status === 'published' ? 'publicada' : item.status === 'draft' ? 'borrador' : 'archivada'}</p><p className="truncate text-xs text-slate-500">{item.comment || 'Sin comentario'}{item.updatedAt ? ` · ${new Date(item.updatedAt).toLocaleString('es-CL')}` : ''}</p></div>
                      <button type="button" onClick={() => { setConfig(normalizeConfig(item.config)); setGenZona(cloneGeneration(normalizeGeneration(item.genZona))); setMessage({ type: 'info', text: `Versión ${item.version} cargada como borrador.` }); }} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold">Cargar como borrador</button>
                    </div>
                  ))}</div>
                ) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aún no hay versiones guardadas.</p>}
              </SectionCard>
            </div>
          )}

          {section === 'energia' && (
            <SectionCard title="Energía y dimensionamiento" description="Configura las tarifas, el autoconsumo y los límites usados en cada simulación.">
              <div className="grid gap-5 md:grid-cols-2">
                <NumberField id="precio-kwh" label="Tarifa de consumo" value={config.precioKwhClp} onChange={(value) => patch('precioKwhClp', value)} unit="CLP/kWh" reference="MAIN!C71" issue={issueFor('precioKwhClp')} />
                <NumberField id="precio-nudo" label="Precio de inyección (IVA incluido)" value={config.precioNudoInyeccionClp} onChange={(value) => patch('precioNudoInyeccionClp', value)} unit="CLP/kWh" reference="MAIN!C72" hint="Ingresa el valor final con IVA. El motor no vuelve a aplicarlo." issue={issueFor('precioNudoInyeccionClp')} />
                <NumberField id="limite-auto" label="Límite de autoconsumo" value={config.limiteAutoconsumo} onChange={(value) => patch('limiteAutoconsumo', value)} percent min={0} max={1} reference="INPUT!B19" issue={issueFor('limiteAutoconsumo')} />
                <NumberField id="proyeccion" label="Proyección de consumo" value={config.proyeccionConsumo} onChange={(value) => patch('proyeccionConsumo', value)} unit="factor" reference="INPUT!B18" issue={issueFor('proyeccionConsumo')} />
                <NumberField id="min-paneles" label="Mínimo de paneles" value={config.minPaneles} onChange={(value) => patch('minPaneles', value)} unit="paneles" integer issue={issueFor('minPaneles')} />
                <NumberField id="max-paneles" label="Tope monofásico" value={config.maxPanelesMonofasico} onChange={(value) => patch('maxPanelesMonofasico', value)} unit="paneles" integer reference="COTBACK!D53" issue={issueFor('maxPanelesMonofasico')} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Metric label="Inyección efectiva" value={`${precioInyeccionKwhClp(config).toLocaleString('es-CL', { maximumFractionDigits: 4 })} CLP/kWh`} detail="Valor final con IVA incluido" tone="sky" />
                <Metric label="Factor de generación" value={getFactorGeneracion(config).toLocaleString('es-CL', { maximumFractionDigits: 4 })} detail="Calculado automáticamente" tone="amber" />
              </div>
            </SectionCard>
          )}

          {section === 'variables' && (
            <KwpVariablesManager config={config} onChange={setConfig} preview={preview} issues={issues} region={scenarioRegion} onRegionChange={setScenarioRegion} />
          )}

          {section === 'equipos' && (
            <div className="space-y-5">
              <EquipmentCatalogManager config={config} onChange={setConfig} />
              <SectionCard title="Reglas comerciales del precio" description="Las partidas se administran en Partidas y costos. Aquí se mantienen el margen, IVA y redondeo final.">
                <div className="grid gap-5 md:grid-cols-2">
                  <NumberField id="margin" label="Margen efectivo" value={config.margen} onChange={(value) => patch('margen', value)} percent min={0} max={0.8} reference="CUBICADOR!L6" hint="El objetivo MAIN!C26 es 19%; los precios unitarios redondeados dejan 19,4089% efectivo en el caso patrón." issue={issueFor('margen')} />
                  <NumberField id="iva-sale" label="IVA de venta" value={config.ivaVenta - 1} onChange={(value) => patch('ivaVenta', 1 + value)} percent min={0} max={1} reference="COT_ONGRID!G293" issue={issueFor('ivaVenta')} />
                  <NumberField id="round-price" label="Redondeo hacia arriba" value={config.redondeoPrecioClp} onChange={(value) => patch('redondeoPrecioClp', value)} unit="CLP" integer reference="COT_ONGRID!A77" issue={issueFor('redondeoPrecioClp')} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric label="Equipos seleccionados" value={formatCLP((preview?.desgloseCostos.panelesNeto ?? 0) + (preview?.desgloseCostos.inversorNeto ?? 0))} detail="Paneles + inversor del caso" tone="sky" />
                  <Metric label="Materiales aplicados" value={formatCLP(preview?.desgloseCostos.materialesGeneralesNeto ?? 0)} detail="Fijo + variable por kWp" />
                  <Metric label="Servicios regionales" value={formatCLP(preview?.desgloseCostos.serviciosNeto ?? 0)} detail={`Valores de ${scenarioRegion}`} />
                  <Metric label="Costo neto total" value={formatCLP(preview?.desgloseCostos.totalNeto ?? 0)} detail={`Equipos + partidas de ${scenarioRegion}`} tone="amber" />
                </div>
              </SectionCard>
            </div>
          )}

          {section === 'financiamiento' && (
            <div className="space-y-5">
              <SectionCard title="Tarjetas" description="Configura el recargo total y el número de cuotas de cada medio de pago.">
                <div className="grid gap-5 md:grid-cols-2">
                  <NumberField id="mp-factor" label="Recargo Mercado Pago" value={config.factorMP - 1} onChange={(value) => patch('factorMP', 1 + value)} percent min={0} max={4} reference="COT_GRANEL!D153" issue={issueFor('factorMP')} />
                  <NumberField id="mp-quota" label="Cuotas Mercado Pago" value={config.cuotasMP} onChange={(value) => patch('cuotasMP', value)} unit="meses" integer reference="COT_GRANEL!D153" issue={issueFor('cuotasMP')} />
                  <NumberField id="san-factor" label="Recargo Santander" value={config.factorSantander - 1} onChange={(value) => patch('factorSantander', 1 + value)} percent min={0} max={4} reference="COT_ONGRID!E77" issue={issueFor('factorSantander')} />
                  <NumberField id="san-quota" label="Cuotas Santander" value={config.cuotasSantander} onChange={(value) => patch('cuotasSantander', value)} unit="meses" integer reference="COT_ONGRID!E76:E77" issue={issueFor('cuotasSantander')} />
                </div>
              </SectionCard>
              <SectionCard title="Crédito verde ALZA" description="Configura la tasa, el plazo, los gastos y las garantías del financiamiento.">
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <NumberField id="alza-rate" label="Tasa anual" value={config.alzaTasaAnual} onChange={(value) => patch('alzaTasaAnual', value)} percent reference="CREDITOALZA!C26" issue={issueFor('alzaTasaAnual')} />
                  <NumberField id="alza-term" label="Plazo" value={config.cuotasALZA} onChange={(value) => patch('cuotasALZA', value)} unit="meses" integer reference="CREDITOALZA!C25" issue={issueFor('cuotasALZA')} />
                  <NumberField id="alza-grace" label="Meses de gracia" value={config.alzaMesesGracia} onChange={(value) => patch('alzaMesesGracia', value)} unit="meses" integer reference="CREDITOALZA!C24" issue={issueFor('alzaMesesGracia')} />
                  <NumberField id="alza-fee" label="Costo financiero" value={config.alzaFinancialFee} onChange={(value) => patch('alzaFinancialFee', value)} percent reference="CREDITOALZA!D21" issue={issueFor('alzaFinancialFee')} />
                  <NumberField id="alza-guarantee" label="Garantía" value={config.alzaGarantiaPctTotal} onChange={(value) => patch('alzaGarantiaPctTotal', value)} percent reference="CREDITOALZA!E14" hint="Porcentaje del total del proyecto financiado. Reemplaza los antiguos 11,9% sobre capital y 10% sobre gastos: eran el mismo parámetro escrito de dos formas." issue={issueFor('alzaGarantiaPctTotal')} />
                  <NumberField id="alza-expense-count" label="Cantidad de gastos" value={config.alzaCantidadGastos} onChange={(value) => patch('alzaCantidadGastos', value)} unit="unidades" integer reference="CREDITOALZA!C16" issue={issueFor('alzaCantidadGastos')} />
                  <NumberField id="alza-expense-unit" label="Costo unitario" value={config.alzaCostoUnitarioClp} onChange={(value) => patch('alzaCostoUnitarioClp', value)} unit="CLP neto" integer reference="CREDITOALZA!C16" issue={issueFor('alzaCostoUnitarioClp')} />
                  <NumberField id="alza-down-payment" label="Pie" value={config.alzaPieClp} onChange={(value) => patch('alzaPieClp', value)} unit="CLP IVA incluido" integer reference="CREDITOALZA!C18" issue={issueFor('alzaPieClp')} />
                  <NumberField id="uf" label="Valor UF" value={config.valorUfClp} onChange={(value) => patch('valorUfClp', value)} unit="CLP/UF" reference="CREDITOALZA!C29" issue={issueFor('valorUfClp')} />
                </div>
                {alzaPreview && <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Total financiado" value={formatCLP(alzaPreview.totalFinanciado)} /><Metric label="Cuota mensual" value={formatCLP(alzaPreview.cuotaMensual)} tone="amber" /><Metric label="Cuota en UF" value={`${alzaPreview.cuotaUf.toLocaleString('es-CL', { maximumFractionDigits: 4 })} UF`} /></div>}
              </SectionCard>
            </div>
          )}

          {section === 'proyeccion' && (
            <SectionCard title="Proyección, reposiciones y garantías" description="Configura los supuestos usados para proyectar ahorro, reposiciones y garantías.">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <NumberField id="ipc" label="IPC anual" value={config.ipcAnual - 1} onChange={(value) => patch('ipcAnual', 1 + value)} percent reference="FC*!C5" issue={issueFor('ipcAnual')} />
                <NumberField id="degradation" label="Degradación anual" value={config.degradacionPaneles} onChange={(value) => patch('degradacionPaneles', value)} percent reference="FC*!C6" issue={issueFor('degradacionPaneles')} />
                <NumberField id="period" label="Horizonte de evaluación" value={config.periodoEvaluacionAnios} onChange={(value) => patch('periodoEvaluacionAnios', value)} unit="años" integer reference="FC*!B38/B41" issue={issueFor('periodoEvaluacionAnios')} />
                <NumberField id="discount" label="Tasa de descuento" value={config.tasaDescuentoAnual} onChange={(value) => patch('tasaDescuentoAnual', value)} percent reference="FC*!B39/B42" issue={issueFor('tasaDescuentoAnual')} />
                <NumberField id="replacement-year-1" label="Primera reposición" value={config.anioReposicion1} onChange={(value) => patch('anioReposicion1', value)} unit="año" integer reference="FC Capital Propio!O30" issue={issueFor('anioReposicion1')} />
                <NumberField id="replacement-1" label="Costo primera reposición" value={config.inversionRespuesto10} onChange={(value) => patch('inversionRespuesto10', value)} unit="CLP" reference="FC Capital Propio!O30" issue={issueFor('inversionRespuesto10')} />
                <NumberField id="replacement-year-2" label="Segunda reposición" value={config.anioReposicion2} onChange={(value) => patch('anioReposicion2', value)} unit="año" integer reference="FC Capital Propio!Y30" issue={issueFor('anioReposicion2')} />
                <NumberField id="replacement-2" label="Costo segunda reposición" value={config.inversionRespuesto22} onChange={(value) => patch('inversionRespuesto22', value)} unit="CLP" reference="FC Capital Propio!Y30" issue={issueFor('inversionRespuesto22')} />
                <NumberField id="warranty-install" label="Garantía instalación" value={config.garantiaInstalacion} onChange={(value) => patch('garantiaInstalacion', value)} unit="años" integer reference="FINBACK!B62" issue={issueFor('garantiaInstalacion')} />
                <NumberField id="co2" label="Factor mitigación CO₂" value={config.co2FactorKgPerKwh} onChange={(value) => patch('co2FactorKgPerKwh', value)} unit="kg/kWh" reference="FINBACK!B49" issue={issueFor('co2FactorKgPerKwh')} />
              </div>
              <details className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-bold text-slate-900">Serie MPC anual · FC*!E4:AC4</summary>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">La variación anual de esta serie se suma al precio de energía después de aplicar IPC, igual que en las hojas de flujo del Excel.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                  {Array.from({ length: config.periodoEvaluacionAnios }, (_, index) => (
                    <NumberField
                      key={index}
                      id={`mpc-${index + 1}`}
                      label={`Año ${index + 1}`}
                      value={config.mpcAnualClpKwh[index] ?? 0}
                      onChange={(value) => setConfig((previous) => {
                        const series = [...previous.mpcAnualClpKwh];
                        series[index] = value;
                        return { ...previous, mpcAnualClpKwh: series };
                      })}
                      unit="CLP/kWh"
                      reference="FC*!E4:AC4"
                      issue={issueFor(`mpcAnualClpKwh.${index}`)}
                    />
                  ))}
                </div>
              </details>
              {preview && (
                <div className="mt-6 border-t border-slate-200 pt-5" aria-label="Proyección calculada">
                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">Proyección calculada</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Vista inmediata para {scenarioRegion}, con una cuenta de {formatCLP(scenarioSpend)} al mes.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Metric
                      label="Energía sin proyecto"
                      value={formatCLP(preview.proyeccion.costoEnergiaSinProyectoClp)}
                      detail={`Lo que costaría la cuenta en ${preview.proyeccion.periodoAnios} años`}
                    />
                    <Metric
                      label="Cuenta que se sigue pagando"
                      value={formatCLP(preview.proyeccion.costoEnergiaConProyectoClp)}
                      detail="Consumo que el sistema no alcanza a cubrir"
                    />
                    <Metric
                      label="Ahorro en la cuenta"
                      value={formatCLP(preview.proyeccion.ahorroCuentaClp)}
                      detail="Autoconsumo: lo que deja de pagarse"
                      tone="emerald"
                    />
                    <Metric
                      label="Ingreso por inyección"
                      value={formatCLP(preview.proyeccion.ingresoInyeccionClp)}
                      detail="Excedentes vendidos a la red, no baja la cuenta"
                      tone="amber"
                    />
                    <Metric
                      label={`Beneficio neto en ${preview.proyeccion.periodoAnios} años`}
                      value={formatCLP(preview.proyeccion.ahorroAcumuladoClp)}
                      detail={`Ahorro + inyección − ${formatCLP(preview.proyeccion.reposicionesClp)} de reposiciones`}
                      tone="emerald"
                    />
                    <Metric
                      label="VAN del proyecto"
                      value={formatCLP(preview.proyeccion.vanClp)}
                      detail={`Tasa de descuento: ${((config.tasaDescuentoAnual) * 100).toLocaleString('es-CL', { maximumFractionDigits: 2 })}%`}
                      tone="sky"
                    />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    Energía sin proyecto = cuenta que se sigue pagando + ahorro en la cuenta. El ingreso por
                    inyección va aparte: es dinero que entra, no cuenta que baja. Por eso el beneficio neto
                    puede superar el costo de la energía.
                  </p>
                </div>
              )}
            </SectionCard>
          )}

          {section === 'generacion' && (
            <SectionCard title="Generación mensual por región" description="Ingresa la generación específica de cada mes. El total anual se calcula automáticamente.">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <FieldShell label="Región" htmlFor="generation-region">
                  <select id="generation-region" value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value as Region)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none sm:min-w-64">{REGIONES.map((region) => <option key={region}>{region}</option>)}</select>
                </FieldShell>
                <button type="button" onClick={() => setGenZona((previous) => ({ ...previous, [selectedRegion]: [...GENERATION_ROW(selectedRegion)] as GeneracionMensual }))} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold">Restaurar esta región</button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {genZona[selectedRegion].map((value, month) => {
                  const issue = issues.find((item) => item.field === `genZona.${selectedRegion}.${month}`);
                  return <NumberField key={MONTHS[month]} id={`generation-${month}`} label={MONTHS[month]} value={value} onChange={(next) => setGenZona((previous) => { const row = [...previous[selectedRegion]] as GeneracionMensual; row[month] = next; return { ...previous, [selectedRegion]: row }; })} unit="kWh/kWp" reference="GEN Zona!B:O" issue={issue} />;
                })}
              </div>
              <div className="mt-5"><Metric label="Total anual" value={`${genZona[selectedRegion].reduce((sum, value) => sum + value, 0).toLocaleString('es-CL')} kWh/kWp`} detail="Suma automática de los 12 meses" tone="sky" /></div>
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
