'use client';

import { useMemo, useEffect, useState } from 'react';
import Image from 'next/image';
import { useCotizadorStore } from '@/lib/store';
import { calcularCotizacion, formatCLP, formatKwh } from '@/lib/estimaciones';
import { getConfig } from '@/lib/config';
import type { Region } from '@/lib/config';
import type { CotizacionCompleta } from '@/lib/estimaciones';

// ─── Datos fijos de la empresa (editables en /mantenedor en el futuro) ────────
const EMPRESA = {
  nombre: 'GG Electrics SpA',
  rut: '76.859.313-2',
  razonSocial: 'Empresas de servicios de ingeniería para la industria solar SpA',
  direccion: 'Laguna Sur 9600 B432, Pudahuel, Santiago, Región Metropolitana',
  web: 'www.ggelectrics.cl',
  email: 'cmartinez@ggelectrics.cl',
  bancos: [
    {
      banco: 'Banco de Chile',
      tipo: 'Cuenta Corriente',
      numero: '8013476906',
      nombre: 'GG Electrics',
    },
    {
      banco: 'Banco Santander',
      tipo: 'Cuenta Corriente',
      numero: '98375198',
      nombre: 'GG Electrics',
    },
  ],
};

const TERMINOS = [
  {
    titulo: '1. Visita Técnica Remota Sin Costo',
    cuerpo:
      'Queremos simplificar este proceso para usted. Por ello, no cobramos por la visita técnica remota. Lo único que pedimos es que nos considere seriamente en su decisión y que exista una verdadera intención de compra. Durante esta visita, validaremos todos los aspectos de la instalación y nos aseguraremos de que todo esté listo para ejecutar el proyecto sin inconvenientes.',
  },
  {
    titulo: '2. Garantía Completa de Instalación por 1 Año',
    cuerpo:
      'En GG Electrics, nos destacamos por ofrecer un respaldo total. Nuestra garantía de instalación cubre la gestión, cambio y/o la reparación de cualquier desperfecto que pueda presentarse durante este período, sin costos adicionales para usted. Esto le garantiza tranquilidad y confianza en el rendimiento de su sistema durante los próximos años.',
  },
  {
    titulo: '3. Claridad y Transparencia en Costos',
    cuerpo:
      'La cotización no incluye: obras civiles, canalizaciones soterradas ni refuerzos estructurales de techos. El costo del medidor bidireccional deberá ser abonado directamente a la distribuidora (aprox. $3.000 CLP/mes). Trabajos adicionales por aumento de capacidad del empalme serán traspasados directamente al cliente final (aprox. $350.000 CLP + IVA). El valor de la cotización puede ajustarse dependiendo de lo que se observe durante la visita técnica.',
  },
];

// ─── Componentes de layout ────────────────────────────────────────────────────

function DocSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, green }: { title: string; green?: boolean }) {
  return (
    <div className={`flex items-center gap-2 mb-3 pb-1 border-b-2 ${green ? 'border-[#2E7D32]' : 'border-[#1B2B4B]'}`}>
      <span className={`text-xs font-bold uppercase tracking-widest ${green ? 'text-[#2E7D32]' : 'text-[#1B2B4B]'}`}>
        {title}
      </span>
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-4 text-center border ${accent ? 'bg-[#1B2B4B] border-[#1B2B4B] text-white' : 'bg-[#f4f7f4] border-[#e0e8e0]'}`}>
      <div className={`text-2xl font-bold ${accent ? 'text-white' : 'text-[#1B2B4B]'}`}>{value}</div>
      <div className={`text-xs mt-1 font-medium ${accent ? 'text-blue-200' : 'text-gray-500'}`}>{label}</div>
      {sub && <div className={`text-[11px] mt-0.5 ${accent ? 'text-blue-300' : 'text-gray-400'}`}>{sub}</div>}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CotizacionPage() {
  const { contacto, ubicacion, consumo } = useCotizadorStore((s) => s.data);
  const [mounted, setMounted] = useState(false);
  const [cotNum] = useState(() => Math.floor(15000 + Math.random() * 1000));

  useEffect(() => { setMounted(true); }, []);

  const cotizacion: CotizacionCompleta | null = useMemo(() => {
    if (!mounted || !ubicacion.region) return null;
    return calcularCotizacion({
      ...consumo,
      region: ubicacion.region as Region,
      config: getConfig(),
    });
  }, [mounted, consumo, ubicacion.region]);

  const fecha = new Date().toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const nombreCliente = contacto.nombreCompleto || 'Cliente';

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      {/* Botón imprimir — solo en pantalla */}
      <div className="flex justify-center gap-4 mb-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-[#1B2B4B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2d3f6b] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / Guardar PDF
        </button>
        <a
          href="/"
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← Volver al cotizador
        </a>
      </div>

      {/* ── DOCUMENTO ──────────────────────────────────────────────────────── */}
      <div
        id="cotizacion-doc"
        className="mx-auto bg-white shadow-xl print:shadow-none"
        style={{ width: '210mm', minHeight: '297mm', padding: '14mm 16mm' }}
      >

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-[#2E7D32]">
          <div className="flex items-center gap-4">
            <Image src="/images/logo-gg.png" alt="GG Electrics" width={90} height={90} className="object-contain" />
            <div>
              <div className="text-lg font-bold text-[#1B2B4B]">GG Electrics</div>
              <div className="text-xs text-[#2E7D32] font-semibold tracking-wider uppercase">Energía Solar</div>
              <div className="text-[10px] text-gray-500 mt-1">{EMPRESA.web}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-[#1B2B4B]">COTIZACIÓN N° {cotNum}</div>
            <div className="text-xs text-gray-500 mt-1">{fecha}</div>
            <div className="inline-block mt-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Preliminar
            </div>
          </div>
        </div>

        {/* ── DATOS CLIENTE ──────────────────────────────────────────────── */}
        <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg bg-[#f4f7f4] border border-[#c8dbc8] p-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#2E7D32] mb-1">Cliente</div>
            <div className="text-sm font-semibold text-[#1B2B4B]">{nombreCliente}</div>
            <div className="text-xs text-gray-500">{contacto.email || '—'}</div>
            <div className="text-xs text-gray-500">{contacto.telefono || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#2E7D32] mb-1">Dirección del proyecto</div>
            <div className="text-xs text-gray-700">{ubicacion.direccion || '—'}</div>
            <div className="text-xs text-gray-500">Región {ubicacion.region || '—'}</div>
          </div>
        </div>

        {/* ── SITUACIÓN ACTUAL ───────────────────────────────────────────── */}
        <DocSection>
          <SectionHeader title="🏢 Situación Actual" green />
          <p className="text-[11px] text-gray-500 mb-3">
            Basado en análisis energético según consumo de electricidad suministrado.
          </p>
          <div className="grid grid-cols-4 gap-3">
            <StatBox
              label="Consumo Anual"
              value={cotizacion ? `${(cotizacion.consumoKwhAnual / 1000).toFixed(2)} MWh` : '—'}
              sub={cotizacion ? formatKwh(cotizacion.consumoKwhAnual) : ''}
            />
            <StatBox
              label="Consumo Mensual Prom."
              value={cotizacion ? formatKwh(cotizacion.consumoKwhMensual) : '—'}
            />
            <StatBox
              label="Gasto Anual"
              value={cotizacion ? formatCLP(cotizacion.gastoCuentaClpMensual * 12) : '—'}
              accent
            />
            <StatBox
              label="Gasto Mensual"
              value={cotizacion ? formatCLP(cotizacion.gastoCuentaClpMensual) : '—'}
            />
          </div>
        </DocSection>

        {/* ── SISTEMA PROPUESTO ──────────────────────────────────────────── */}
        <DocSection>
          <SectionHeader title="🔆 Sistema Fotovoltaico Propuesto" green />
          <div className="grid grid-cols-2 gap-4">
            {/* Equipos */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#1B2B4B] mb-3">Equipos Principales</div>
              {cotizacion && (
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500 w-8 text-center font-bold">{cotizacion.sistema.numeroPaneles}</td>
                      <td className="py-1.5 text-gray-700">{cotizacion.sistema.marcaPanel}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500 w-8 text-center font-bold">1</td>
                      <td className="py-1.5 text-gray-700">Inversor Huawei Híbrido</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500 w-8 text-center font-bold">1</td>
                      <td className="py-1.5 text-gray-700">Estructura {cotizacion.sistema.capacidadKwp.toFixed(2)} kWp</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-gray-500 w-8 text-center font-bold">1</td>
                      <td className="py-1.5 text-gray-700">Sistema de monitoreo</td>
                    </tr>
                  </tbody>
                </table>
              )}
              <div className="mt-3 text-[9px] text-gray-400 italic">
                * Los equipos que finalmente se instalen dependerán de la Visita Técnica.
              </div>
            </div>

            {/* Specs técnicos */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#1B2B4B] mb-3">Especificaciones Técnicas</div>
              {cotizacion && (
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      ['Potencia total paneles', `${cotizacion.sistema.capacidadKwp.toFixed(2)} kWp`],
                      ['Cant. paneles', `${cotizacion.sistema.numeroPaneles} × ${cotizacion.sistema.potenciaPanelW} Wp`],
                      ['Generación anual est.', formatKwh(cotizacion.sistema.generacionAnualKwh)],
                      ['Generación mensual prom.', formatKwh(cotizacion.sistema.generacionMensualPromKwh)],
                      ['Autoconsumo anual', formatKwh(cotizacion.sistema.autoconsumoAnualKwh)],
                      ['Inyección anual', formatKwh(cotizacion.sistema.inyeccionAnualKwh)],
                    ].map(([k, v]) => (
                      <tr key={k} className="border-b border-gray-100 last:border-none">
                        <td className="py-1.5 text-gray-500">{k}</td>
                        <td className="py-1.5 text-right font-semibold text-[#1B2B4B]">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </DocSection>

        {/* ── BENEFICIOS NET-BILLING ─────────────────────────────────────── */}
        <DocSection>
          <SectionHeader title="💰 Beneficios Económicos — Esquema Net-Billing" green />

          {cotizacion && (
            <>
              {/* Diagrama de flujo de energía */}
              <div className="rounded-lg bg-[#1B2B4B] text-white p-4 mb-4">
                <div className="text-center text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-4">
                  ¿Cómo funciona?
                </div>
                <div className="flex items-stretch justify-between gap-2 text-center text-xs">
                  <div className="flex-1 rounded-lg bg-white/10 p-3">
                    <div className="text-2xl font-bold text-amber-300">{formatKwh(cotizacion.consumoKwhAnual)}</div>
                    <div className="text-[10px] text-blue-200 mt-1">Consumo Actual</div>
                    <div className="text-[10px] text-blue-300">{formatCLP(cotizacion.gastoCuentaClpMensual * 12)}/año</div>
                  </div>
                  <div className="flex flex-col justify-center text-blue-400 font-bold text-lg px-1">→</div>
                  <div className="flex-1 rounded-lg bg-[#2E7D32]/40 border border-[#2E7D32] p-3">
                    <div className="text-[10px] text-green-200 font-bold uppercase tracking-wider mb-1">Autoconsumo Solar</div>
                    <div className="text-xl font-bold text-green-300">{formatCLP(cotizacion.ahorro.ahorroAutoconsumoAnual)}</div>
                    <div className="text-[10px] text-green-400">{formatKwh(cotizacion.sistema.autoconsumoAnualKwh)}</div>
                  </div>
                  <div className="flex flex-col justify-center text-blue-400 font-bold text-lg px-1">+</div>
                  <div className="flex-1 rounded-lg bg-blue-900/40 border border-blue-700 p-3">
                    <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-1">Inyección a la Red</div>
                    <div className="text-xl font-bold text-blue-300">{formatCLP(cotizacion.ahorro.ahorroInyeccionAnual)}</div>
                    <div className="text-[10px] text-blue-400">{formatKwh(cotizacion.sistema.inyeccionAnualKwh)}</div>
                  </div>
                  <div className="flex flex-col justify-center text-amber-400 font-bold text-lg px-1">=</div>
                  <div className="flex-1 rounded-lg bg-amber-400 p-3">
                    <div className="text-[10px] text-amber-900 font-bold uppercase tracking-wider mb-1">Ahorro Anual Total</div>
                    <div className="text-xl font-bold text-amber-900">{formatCLP(cotizacion.ahorro.ahorroTotalAnual)}</div>
                    <div className="text-[10px] text-amber-800">≈ {formatCLP(cotizacion.ahorro.ahorroMensualProm)}/mes</div>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-4 gap-3">
                <StatBox label="Precio del Proyecto" value={formatCLP(cotizacion.precioProyectoClp)} accent />
                <StatBox label="Precio por kWp" value={formatCLP(cotizacion.precioPorKwp)} sub="IVA incluido" />
                <StatBox label="Retorno de Inversión" value={`${cotizacion.paybackAnios} años`} sub={`${cotizacion.paybackMeses} meses`} />
                <StatBox label="Días de Instalación" value="2–3 días" />
              </div>

              <p className="mt-2 text-[9px] text-gray-400 italic">
                Todos los cálculos son estimativos calculados en base a valores típicos de orientación, irradiancia y consumo.
              </p>
            </>
          )}
        </DocSection>

        {/* ── INCLUYE Y GARANTÍAS ───────────────────────────────────────── */}
        <DocSection>
          <SectionHeader title="✅ Incluye y Garantías" green />
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#1B2B4B] mb-2">Incluye</div>
              {[
                'Instalación completa',
                'Certificación SEC TE4',
                'Tramitación eléctrica',
                'App de Monitoreo',
                'Ahorro desde el día 0',
              ].map((i) => (
                <div key={i} className="flex items-center gap-1.5 py-0.5">
                  <span className="text-[#2E7D32] font-bold">✓</span>
                  <span className="text-xs text-gray-700">{i}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#1B2B4B] mb-2">Garantías</div>
              {cotizacion?.garantias.map((g) => (
                <div key={g.label} className="flex items-center justify-between py-0.5 border-b border-gray-100 last:border-none">
                  <span className="text-xs text-gray-600">{g.label}</span>
                  <span className="text-xs font-bold text-[#2E7D32]">{g.valor}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#1B2B4B] mb-2">Proceso de Compra</div>
              {['Cotización preliminar', 'Visita técnica (remota, sin costo)', 'Cotización vinculante', 'Firma contrato', 'Instalación (2–3 días)', 'Tramitación SEC (~4 meses)', '¡Sistema operando!'].map((step, i) => (
                <div key={step} className="flex items-start gap-1.5 py-0.5">
                  <span className="shrink-0 text-[9px] font-bold text-[#2E7D32] w-3">{i + 1}.</span>
                  <span className="text-[10px] text-gray-700 leading-tight">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </DocSection>

        {/* PAGE BREAK */}
        <div className="print:break-before-page" />

        {/* ── OPCIONES DE FINANCIAMIENTO ────────────────────────────────── */}
        <DocSection>
          <SectionHeader title="💳 Opciones de Financiamiento" />
          <div className="grid grid-cols-4 gap-3">
            {/* Opción 1 — Transferencia */}
            <div className="rounded-lg border-2 border-[#1B2B4B] p-4 flex flex-col items-center text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Opción 1</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/icon-transferencia.svg" alt="Transferencia" width={48} height={48} className="object-contain my-2" />
              <div className="text-xs font-bold text-[#1B2B4B]">Transferencia</div>
              <div className="text-[10px] text-gray-500 mb-2">Solo transferencia electrónica</div>
              <div className="mt-auto">
                <div className="text-lg font-bold text-[#1B2B4B]">
                  {cotizacion ? formatCLP(cotizacion.precioProyectoClp) : '—'}
                </div>
                <div className="text-[10px] text-gray-400">pago único</div>
                {cotizacion?.opcionesFinanciamiento[0]?.badge && (
                  <div className="mt-1 text-[9px] font-semibold text-[#2E7D32] bg-green-50 rounded px-1.5 py-0.5">
                    {cotizacion.opcionesFinanciamiento[0].badge}
                  </div>
                )}
              </div>
            </div>

            {/* Opción 2 — Mercado Pago */}
            <div className="rounded-lg border border-gray-200 p-4 flex flex-col items-center text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Opción 2</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-mercadopago.svg" alt="Mercado Pago" width={120} height={40} className="object-contain my-2" />
              <div className="text-xs font-bold text-[#1B2B4B]">Mercado Pago</div>
              <div className="text-[10px] text-gray-500 mb-2">
                {cotizacion?.opcionesFinanciamiento[1]?.cuotas ?? 12} cuotas sin interés
              </div>
              <div className="mt-auto">
                <div className="text-lg font-bold text-[#1B2B4B]">
                  {cotizacion ? formatCLP(cotizacion.opcionesFinanciamiento[1]?.cuotaMensual ?? 0) : '—'}
                </div>
                <div className="text-[10px] text-gray-400">/mes · Todas las tarjetas</div>
              </div>
            </div>

            {/* Opción 3 — Santander */}
            <div className="rounded-lg border border-gray-200 p-4 flex flex-col items-center text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Opción 3</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-santander.svg" alt="Santander" width={120} height={40} className="object-contain my-2" />
              <div className="text-xs font-bold text-[#1B2B4B]">Santander</div>
              <div className="text-[10px] text-gray-500 mb-2">
                {cotizacion?.opcionesFinanciamiento[2]?.cuotas ?? 48} cuotas sin interés
              </div>
              <div className="mt-auto">
                <div className="text-lg font-bold text-[#1B2B4B]">
                  {cotizacion ? formatCLP(cotizacion.opcionesFinanciamiento[2]?.cuotaMensual ?? 0) : '—'}
                </div>
                <div className="text-[10px] text-gray-400">/mes · Tarjeta Crédito Santander</div>
                <div className="text-[9px] text-gray-400 mt-1">(*) CAE 1,54% a 48 cuotas</div>
              </div>
            </div>

            {/* Opción 4 — ALZA */}
            <div className="rounded-lg border border-gray-200 p-4 flex flex-col items-center text-center bg-[#f4f7f4]">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Opción 4</div>
              <div className="my-2 rounded-full bg-[#2E7D32] w-12 h-12 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold text-center leading-tight">Crédito<br/>Solar</span>
              </div>
              <div className="text-xs font-bold text-[#1B2B4B]">Crédito Largo Plazo</div>
              <div className="text-[10px] text-gray-500 mb-2">
                {cotizacion?.opcionesFinanciamiento[3]?.cuotas ?? 300} cuotas fijas
              </div>
              <div className="mt-auto">
                <div className="text-lg font-bold text-[#1B2B4B]">
                  {cotizacion ? formatCLP(cotizacion.opcionesFinanciamiento[3]?.cuotaMensual ?? 0) : '—'}
                </div>
                <div className="text-[10px] text-gray-400">/mes</div>
                {cotizacion?.opcionesFinanciamiento[3]?.badge && (
                  <div className="mt-1 text-[9px] font-semibold text-[#2E7D32] bg-green-50 rounded px-1.5 py-0.5">
                    {cotizacion.opcionesFinanciamiento[3].badge}
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="mt-2 text-[9px] text-gray-400 text-center font-medium">
            TODOS LOS VALORES MOSTRADOS SON IVA INCLUIDO
          </p>
        </DocSection>

        {/* ── DATOS DE TRANSFERENCIA ────────────────────────────────────── */}
        <DocSection>
          <SectionHeader title="🏦 Datos de Transferencia" />
          <div className="grid grid-cols-2 gap-4">
            {EMPRESA.bancos.map((b) => (
              <div key={b.banco} className="rounded-lg border border-gray-200 p-4">
                <div className="text-[10px] font-bold text-[#1B2B4B] mb-2">{b.banco}</div>
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      ['Nombre', b.nombre],
                      ['RUT', EMPRESA.rut],
                      ['Razón Social', EMPRESA.razonSocial],
                      ['Banco', b.banco],
                      ['Tipo de Cuenta', b.tipo],
                      ['N° Cuenta', b.numero],
                      ['Correo', EMPRESA.email],
                    ].map(([k, v]) => (
                      <tr key={k} className="border-b border-gray-100 last:border-none">
                        <td className="py-1 text-gray-500 w-24">{k}</td>
                        <td className="py-1 font-medium text-gray-800 break-all">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </DocSection>

        {/* ── TÉRMINOS Y CONDICIONES ────────────────────────────────────── */}
        <DocSection>
          <SectionHeader title="📋 Términos y Condiciones" />
          <div className="space-y-3">
            {TERMINOS.map((t) => (
              <div key={t.titulo}>
                <div className="text-xs font-bold text-[#1B2B4B] mb-1">{t.titulo}</div>
                <p className="text-[10px] text-gray-600 leading-relaxed">{t.cuerpo}</p>
              </div>
            ))}
            <p className="text-[10px] text-gray-600 leading-relaxed mt-2">
              <strong>¿Por qué elegirnos?</strong> Porque en GG Electrics no solo le ofrecemos un sistema
              fotovoltaico de alta calidad, sino también un respaldo completo: garantía de instalación y
              ahorro inmediato en su factura eléctrica. Estamos a su disposición para coordinar la visita
              técnica o resolver cualquier duda. ¡Estamos aquí para ayudarlo a dar el siguiente paso hacia
              un futuro más sostenible y eficiente!
            </p>
          </div>
        </DocSection>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div className="border-t-2 border-[#2E7D32] pt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/images/logo-gg.png" alt="GG Electrics" width={36} height={36} className="object-contain" />
            <div>
              <div className="text-xs font-bold text-[#1B2B4B]">GG Electrics SpA</div>
              <div className="text-[9px] text-gray-500">{EMPRESA.web} · {EMPRESA.email}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-gray-500">{EMPRESA.direccion}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">Cotización N° {cotNum} · {fecha}</div>
          </div>
        </div>

      </div>

      {/* CSS de impresión */}
      <style jsx global>{`
        @media print {
          html, body { background: white; margin: 0; padding: 0; }
          #cotizacion-doc {
            width: 210mm !important;
            min-height: 297mm;
            padding: 12mm 15mm !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .print\\:hidden { display: none !important; }
          .print\\:break-before-page { break-before: page; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}
