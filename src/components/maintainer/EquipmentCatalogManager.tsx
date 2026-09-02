'use client';

import { useMemo, useState } from 'react';
import { Archive, Check, Pencil, Plus, RotateCcw, Search, Star, X } from 'lucide-react';
import type { ConfigCotizador, ReglaInversorPorPaneles } from '@/lib/config';
import type { EquipmentStatus, InverterCatalogItem, PanelCatalogItem } from '@/lib/equipmentCatalog';
import { formatCLP } from '@/lib/estimaciones';

type Kind = 'panels' | 'inverters';
type Equipment = PanelCatalogItem | InverterCatalogItem;

const STATUS_LABEL: Record<EquipmentStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  archived: 'Archivado',
};

const STATUS_STYLE: Record<EquipmentStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-slate-200 text-slate-700',
  archived: 'bg-amber-100 text-amber-800',
};

function slug(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function newId(kind: Kind, name: string): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Date.now().toString(36);
  return `${kind === 'panels' ? 'panel' : 'inverter'}-${slug(name) || 'nuevo'}-${suffix}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function salePrice(cost: number, margin: number): number {
  return margin >= 1 ? 0 : Math.ceil(cost / 1_000 / (1 - margin)) * 1_000;
}

function emptyPanel(): PanelCatalogItem {
  return {
    id: '', nombre: '', marca: '', potenciaW: 620, corrienteA: null, espesorMm: null,
    anchoMm: null, costoNetoClp: 0, precioVentaClp: 0, margen: 0.2111,
    garantiaAnios: 12, estado: 'active', actualizadoEl: today(), fichaUrl: null,
  };
}

function emptyInverter(): InverterCatalogItem {
  return {
    id: '', nombre: '', marca: '', stock: true, acCoupling: false, linea: 'On-Grid',
    fases: 1, paralelizable: false, soportaBateria: false, potenciaDcKw: 4.2,
    potenciaAcKw: 3, voltajeBateriaV: null, prioridad: 1, strings: 2,
    costoNetoClp: 0, precioVentaClp: 0, margen: 0.2111, garantiaAnios: 10,
    estado: 'active', actualizadoEl: today(), fichaUrl: null,
  };
}

function inputClass(): string {
  return 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100';
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5 text-sm font-semibold text-slate-800"><span>{label}</span>{children}</label>;
}

function NumberInput({ value, onChange, min = 0, step = 'any' }: { value: number | null; onChange: (value: number | null) => void; min?: number; step?: number | 'any' }) {
  return <input className={inputClass()} type="number" inputMode="decimal" min={min} step={step} value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))} />;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 rounded border-slate-300" />
      {label}
    </label>
  );
}

export function EquipmentCatalogManager({ config, onChange }: { config: ConfigCotizador; onChange: (config: ConfigCotizador) => void }) {
  const [kind, setKind] = useState<Kind>('panels');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EquipmentStatus>('active');
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const activeMonoInverters = config.catalogoInversores.filter((item) => item.estado === 'active' && item.stock && item.fases === 1);

  function updateRange(id: string, patch: Partial<ReglaInversorPorPaneles>): void {
    onChange({
      ...config,
      reglasInversorPorPaneles: config.reglasInversorPorPaneles.map((rule) => rule.id === id ? { ...rule, ...patch } : rule),
    });
  }

  const items: Equipment[] = kind === 'panels' ? config.catalogoPaneles : config.catalogoInversores;
  const defaultId = kind === 'panels' ? config.panelActivoId : config.inversorActivoId;
  const counts = useMemo(() => ({
    panels: config.catalogoPaneles.filter((item) => item.estado === 'active').length,
    inverters: config.catalogoInversores.filter((item) => item.estado === 'active').length,
  }), [config.catalogoInversores, config.catalogoPaneles]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es-CL');
    return items.filter((item) => (statusFilter === 'all' || item.estado === statusFilter)
      && (!needle || `${item.nombre} ${item.marca} ${item.id}`.toLocaleLowerCase('es-CL').includes(needle)));
  }, [items, query, statusFilter]);

  function syncPanels(panels: PanelCatalogItem[], activeId = config.panelActivoId): void {
    const active = panels.find((item) => item.id === activeId && item.estado === 'active')
      ?? panels.find((item) => item.estado === 'active');
    onChange({
      ...config,
      catalogoPaneles: panels,
      panelActivoId: active?.id ?? activeId,
      panelMarcaModelo: active?.nombre ?? config.panelMarcaModelo,
      panelPotenciaW: active?.potenciaW ?? config.panelPotenciaW,
    });
  }

  function syncInverters(inverters: InverterCatalogItem[], activeId = config.inversorActivoId): void {
    const active = inverters.find((item) => item.id === activeId && item.estado === 'active')
      ?? inverters.find((item) => item.estado === 'active');
    onChange({
      ...config,
      catalogoInversores: inverters,
      inversorActivoId: active?.id ?? activeId,
      inversorMarcaModelo: active?.nombre ?? config.inversorMarcaModelo,
      inversorPotenciaMinKw: active?.potenciaAcKw ?? config.inversorPotenciaMinKw,
    });
  }

  function setDefault(item: Equipment): void {
    if (item.estado !== 'active') {
      setNotice('Activa el equipo antes de seleccionarlo como predeterminado.');
      return;
    }
    if (kind === 'panels') syncPanels(config.catalogoPaneles, item.id);
    else syncInverters(config.catalogoInversores, item.id);
    setNotice(`${item.nombre} quedó seleccionado para nuevas simulaciones.`);
  }

  function changeStatus(item: Equipment, next: EquipmentStatus): void {
    if (item.id === defaultId && next !== 'active') {
      setNotice('Selecciona otro equipo predeterminado antes de retirar este equipo.');
      return;
    }
    if (next === 'archived' && !window.confirm(`¿Archivar ${item.nombre}? Podrás restaurarlo después.`)) return;
    if (kind === 'panels') {
      syncPanels(config.catalogoPaneles.map((current) => current.id === item.id ? { ...current, estado: next } : current));
    } else {
      syncInverters(config.catalogoInversores.map((current) => current.id === item.id ? { ...current, estado: next } : current));
    }
    setNotice(next === 'archived' ? 'Equipo archivado.' : next === 'active' ? 'Equipo activado.' : 'Equipo desactivado.');
  }

  function openCreate(): void {
    setCreating(true);
    setEditing(kind === 'panels' ? emptyPanel() : emptyInverter());
    setFormError('');
  }

  function saveEditor(): void {
    if (!editing) return;
    const name = editing.nombre.trim();
    const brand = editing.marca.trim();
    if (!name || !brand) {
      setFormError('Completa la marca y el modelo.');
      return;
    }
    const duplicate = items.some((item) => item.id !== editing.id && item.nombre.trim().toLocaleLowerCase('es-CL') === name.toLocaleLowerCase('es-CL'));
    if (duplicate) {
      setFormError('Ya existe un equipo con ese nombre.');
      return;
    }
    if (editing.costoNetoClp < 0 || editing.precioVentaClp < 0 || editing.garantiaAnios < 0 || (editing.estado === 'active' && editing.costoNetoClp === 0)) {
      setFormError('Costos, precios y garantía deben ser valores positivos.');
      return;
    }
    if (editing.id === defaultId && editing.estado !== 'active') {
      setFormError('Selecciona otro equipo predeterminado antes de desactivar este equipo.');
      return;
    }
    const id = editing.id || newId(kind, name);
    const prepared = {
      ...editing,
      id,
      nombre: name,
      marca: brand,
      margen: config.margen,
      precioVentaClp: salePrice(editing.costoNetoClp, config.margen),
      actualizadoEl: today(),
    };
    if (kind === 'panels') {
      const panel = prepared as PanelCatalogItem;
      if (!(panel.potenciaW > 0)) { setFormError('La potencia del panel debe ser mayor que cero.'); return; }
      syncPanels(creating ? [...config.catalogoPaneles, panel] : config.catalogoPaneles.map((item) => item.id === panel.id ? panel : item));
    } else {
      const inverter = prepared as InverterCatalogItem;
      if (!(inverter.potenciaAcKw > 0) || !(inverter.potenciaDcKw > 0)) { setFormError('Las potencias del inversor deben ser mayores que cero.'); return; }
      syncInverters(creating ? [...config.catalogoInversores, inverter] : config.catalogoInversores.map((item) => item.id === inverter.id ? inverter : item));
    }
    setEditing(null);
    setCreating(false);
    setFormError('');
    setNotice(creating ? 'Equipo creado correctamente.' : 'Cambios del equipo guardados.');
  }

  const selectedPanel = kind === 'panels' && editing ? editing as PanelCatalogItem : null;
  const selectedInverter = kind === 'inverters' && editing ? editing as InverterCatalogItem : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Catálogo de equipos</h2>
            <p className="mt-1 text-sm text-slate-600">Administra los equipos disponibles y selecciona los que usa el cotizador.</p>
          </div>
          <button type="button" onClick={openCreate} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Nuevo {kind === 'panels' ? 'panel' : 'inversor'}
          </button>
        </div>
        <div className="mt-5 flex gap-2 border-b border-slate-200" role="tablist" aria-label="Tipos de equipo">
          <button type="button" role="tab" aria-selected={kind === 'panels'} onClick={() => { setKind('panels'); setQuery(''); }} className={`min-h-11 border-b-2 px-3 text-sm font-bold ${kind === 'panels' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500'}`}>Paneles <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{counts.panels}</span></button>
          <button type="button" role="tab" aria-selected={kind === 'inverters'} onClick={() => { setKind('inverters'); setQuery(''); }} className={`min-h-11 border-b-2 px-3 text-sm font-bold ${kind === 'inverters' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500'}`}>Inversores <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{counts.inverters}</span></button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <label className="relative">
            <span className="sr-only">Buscar equipos</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por marca o modelo" className={`${inputClass()} pl-10`} />
          </label>
          <select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | EquipmentStatus)} className={inputClass()}>
            <option value="active">Activos</option><option value="inactive">Inactivos</option><option value="archived">Archivados</option><option value="all">Todos</option>
          </select>
        </div>
        {notice && <div role="status" className="mt-3 flex items-start justify-between gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800"><span>{notice}</span><button type="button" aria-label="Cerrar mensaje" onClick={() => setNotice('')}><X className="h-4 w-4" /></button></div>}
      </div>

      <div className="grid gap-3 p-4 sm:p-6 xl:grid-cols-2">
        {filtered.map((item) => {
          const isDefault = item.id === defaultId;
          const inverter = kind === 'inverters' ? item as InverterCatalogItem : null;
          const panel = kind === 'panels' ? item as PanelCatalogItem : null;
          return (
            <article key={item.id} className={`rounded-2xl border p-4 ${isDefault ? 'border-sky-300 bg-sky-50/40' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="truncate font-bold text-slate-950">{item.nombre}</p><p className="text-sm text-slate-500">{item.marca}</p></div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${STATUS_STYLE[item.estado]}`}>{STATUS_LABEL[item.estado]}</span>
                  {isDefault && <span className="flex items-center gap-1 text-xs font-bold text-sky-700"><Star className="h-3.5 w-3.5 fill-current" /> Predeterminado</span>}
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-slate-500">Potencia</dt><dd className="font-semibold">{panel ? `${panel.potenciaW} W` : `${inverter?.potenciaAcKw} kW AC`}</dd></div>
                <div><dt className="text-slate-500">Costo neto</dt><dd className="font-semibold">{formatCLP(item.costoNetoClp)}</dd></div>
                <div><dt className="text-slate-500">Precio neto estimado</dt><dd className="font-semibold">{formatCLP(salePrice(item.costoNetoClp, config.margen))}</dd></div>
                <div><dt className="text-slate-500">Garantía</dt><dd className="font-semibold">{item.garantiaAnios} años</dd></div>
                {inverter && <><div><dt className="text-slate-500">Fases</dt><dd className="font-semibold">{inverter.fases}</dd></div><div><dt className="text-slate-500">Batería</dt><dd className="font-semibold">{inverter.soportaBateria ? 'Compatible' : 'No'}</dd></div></>}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                {!isDefault && item.estado === 'active' && <button type="button" onClick={() => setDefault(item)} className="flex min-h-10 items-center gap-1.5 rounded-lg border border-sky-200 px-3 text-sm font-semibold text-sky-700"><Star className="h-4 w-4" /> Usar</button>}
                <button type="button" onClick={() => { setEditing({ ...item }); setCreating(false); setFormError(''); }} className="flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-semibold"><Pencil className="h-4 w-4" /> Editar</button>
                {item.estado === 'archived'
                  ? <button type="button" onClick={() => changeStatus(item, 'inactive')} className="flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-semibold"><RotateCcw className="h-4 w-4" /> Restaurar</button>
                  : <>
                    <button type="button" onClick={() => changeStatus(item, item.estado === 'active' ? 'inactive' : 'active')} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold">{item.estado === 'active' ? 'Desactivar' : 'Activar'}</button>
                    <button type="button" onClick={() => changeStatus(item, 'archived')} className="flex min-h-10 items-center gap-1.5 rounded-lg border border-amber-200 px-3 text-sm font-semibold text-amber-800"><Archive className="h-4 w-4" /> Archivar</button>
                  </>}
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 xl:col-span-2">No hay equipos que coincidan con la búsqueda.</div>}
      </div>

      {kind === 'inverters' && (
        <div className="border-t border-slate-200 p-4 sm:p-6">
          <h3 className="font-bold text-slate-950">Activación por cantidad de paneles</h3>
          <p className="mt-1 text-sm text-slate-600">El inversor residencial se elige por estos rangos, independientemente de la potencia individual del panel.</p>
          <div className="mt-4 space-y-3">
            {config.reglasInversorPorPaneles.filter((rule) => rule.fases === 1).map((rule) => (
              <div key={rule.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[120px_120px_minmax(0,1fr)] sm:items-end">
                <FormField label="Desde"><NumberInput value={rule.minPaneles} min={1} step={1} onChange={(value) => updateRange(rule.id, { minPaneles: value ?? 1 })} /></FormField>
                <FormField label="Hasta"><NumberInput value={rule.maxPaneles} min={1} step={1} onChange={(value) => updateRange(rule.id, { maxPaneles: value ?? 1 })} /></FormField>
                <FormField label="Inversor"><select className={inputClass()} value={rule.inversorId} onChange={(event) => updateRange(rule.id, { inversorId: event.target.value })}>{activeMonoInverters.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></FormField>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="equipment-editor-title">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div><h3 id="equipment-editor-title" className="text-lg font-bold">{creating ? 'Nuevo' : 'Editar'} {kind === 'panels' ? 'panel' : 'inversor'}</h3><p className="text-sm text-slate-500">Completa los datos comerciales y técnicos.</p></div>
              <button type="button" aria-label="Cerrar" onClick={() => setEditing(null)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
              <FormField label="Marca"><input className={inputClass()} value={editing.marca} maxLength={80} onChange={(event) => setEditing({ ...editing, marca: event.target.value })} /></FormField>
              <FormField label="Modelo"><input className={inputClass()} value={editing.nombre} maxLength={180} onChange={(event) => setEditing({ ...editing, nombre: event.target.value })} /></FormField>
              {selectedPanel && <>
                <FormField label="Potencia (W)"><NumberInput value={selectedPanel.potenciaW} min={1} onChange={(value) => setEditing({ ...selectedPanel, potenciaW: value ?? 0 })} /></FormField>
                <FormField label="Corriente (A)"><NumberInput value={selectedPanel.corrienteA} onChange={(value) => setEditing({ ...selectedPanel, corrienteA: value })} /></FormField>
                <FormField label="Ancho (mm)"><NumberInput value={selectedPanel.anchoMm} onChange={(value) => setEditing({ ...selectedPanel, anchoMm: value })} /></FormField>
                <FormField label="Espesor (mm)"><NumberInput value={selectedPanel.espesorMm} onChange={(value) => setEditing({ ...selectedPanel, espesorMm: value })} /></FormField>
              </>}
              {selectedInverter && <>
                <FormField label="Potencia AC (kW)"><NumberInput value={selectedInverter.potenciaAcKw} min={0.1} onChange={(value) => setEditing({ ...selectedInverter, potenciaAcKw: value ?? 0 })} /></FormField>
                <FormField label="Potencia DC admitida (kW)"><NumberInput value={selectedInverter.potenciaDcKw} min={0.1} onChange={(value) => setEditing({ ...selectedInverter, potenciaDcKw: value ?? 0 })} /></FormField>
                <FormField label="Fases"><select className={inputClass()} value={selectedInverter.fases} onChange={(event) => setEditing({ ...selectedInverter, fases: Number(event.target.value) })}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></FormField>
                <FormField label="Línea"><input className={inputClass()} value={selectedInverter.linea} onChange={(event) => setEditing({ ...selectedInverter, linea: event.target.value })} /></FormField>
                <FormField label="Strings"><NumberInput value={selectedInverter.strings} min={1} step={1} onChange={(value) => setEditing({ ...selectedInverter, strings: value ?? 1 })} /></FormField>
                <FormField label="Voltaje de batería (V)"><NumberInput value={selectedInverter.voltajeBateriaV} onChange={(value) => setEditing({ ...selectedInverter, voltajeBateriaV: value })} /></FormField>
                <Toggle label="Disponible" checked={selectedInverter.stock} onChange={(value) => setEditing({ ...selectedInverter, stock: value })} />
                <Toggle label="Compatible con batería" checked={selectedInverter.soportaBateria} onChange={(value) => setEditing({ ...selectedInverter, soportaBateria: value })} />
                <Toggle label="AC Coupling" checked={selectedInverter.acCoupling} onChange={(value) => setEditing({ ...selectedInverter, acCoupling: value })} />
                <Toggle label="Paralelizable" checked={selectedInverter.paralelizable} onChange={(value) => setEditing({ ...selectedInverter, paralelizable: value })} />
              </>}
              <FormField label="Costo neto (CLP)"><NumberInput value={editing.costoNetoClp} onChange={(value) => { const cost = value ?? 0; setEditing({ ...editing, costoNetoClp: cost, precioVentaClp: salePrice(cost, config.margen) }); }} /></FormField>
              <FormField label="Precio neto estimado"><div className={`${inputClass()} flex items-center bg-slate-50 font-semibold`}>{formatCLP(salePrice(editing.costoNetoClp, config.margen))}</div></FormField>
              <FormField label="Garantía (años)"><NumberInput value={editing.garantiaAnios} min={0} step={1} onChange={(value) => setEditing({ ...editing, garantiaAnios: value ?? 0 })} /></FormField>
              <FormField label="Estado"><select className={inputClass()} value={editing.estado === 'archived' ? 'inactive' : editing.estado} onChange={(event) => setEditing({ ...editing, estado: event.target.value as EquipmentStatus })}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></FormField>
              <FormField label="Ficha técnica (URL)"><input className={inputClass()} type="url" value={editing.fichaUrl ?? ''} onChange={(event) => setEditing({ ...editing, fichaUrl: event.target.value || null })} /></FormField>
              {formError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800 sm:col-span-2">{formError}</p>}
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4 sm:px-6">
              <button type="button" onClick={() => setEditing(null)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold">Cancelar</button>
              <button type="button" onClick={saveEditor} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"><Check className="h-4 w-4" /> Guardar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
