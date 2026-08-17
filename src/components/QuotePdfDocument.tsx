/* eslint-disable @next/next/no-img-element */

import type { CotizacionCompleta, FinanciamientoOpcion } from '@/lib/estimaciones';
import { formatCLP, formatKwh } from '@/lib/estimaciones';
import type { CotizadorState } from '@/lib/types';
import styles from './quote-pdf-document.module.css';

type QuotePdfDocumentProps = {
  quote: CotizacionCompleta;
  customer: CotizadorState;
};

const COMPANY = {
  phone: '+569 7564 4930',
  email: 'cmartinez@ggelectrics.cl',
  address: 'Laguna Sur 9600 B432, Pudahuel, Santiago',
};

function option(quote: CotizacionCompleta, id: string): FinanciamientoOpcion | undefined {
  return quote.opcionesFinanciamiento.find((item) => item.id === id);
}

function quoteNumber(customer: CotizadorState, quote: CotizacionCompleta) {
  const seed = [
    customer.contacto.nombreCompleto,
    customer.contacto.email,
    customer.ubicacion.direccion,
    quote.precioProyectoClp,
    quote.sistema.numeroPaneles,
  ].join('|');
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return String(10000 + (Math.abs(hash) % 90000));
}

function differenceCurrency(value: number) {
  return `${value < 0 ? '-' : ''}${formatCLP(Math.abs(value))}`;
}

function formatUf(value: number | undefined) {
  return `${(value ?? 0).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} UF`;
}

function inverterCapacity(capacityKwp: number) {
  const commercialSizes = [3, 5, 6, 8, 10, 12, 15, 20];
  return commercialSizes.reduce((closest, size) => (
    Math.abs(size - capacityKwp) < Math.abs(closest - capacityKwp) ? size : closest
  ));
}

function short(value: string, maximum = 46) {
  const normalized = value.trim();
  if (!normalized) return 'Por confirmar';
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1).trim()}…`;
}

function SectionBar({ children, orange = false }: { children: React.ReactNode; orange?: boolean }) {
  return <div className={orange ? styles.sectionBarOrange : styles.sectionBar}>{children}</div>;
}

function Footer({ page }: { page: number }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContact}>
        <span>www.ggelectrics.cl</span><i>·</i><span>{COMPANY.phone}</span><i>·</i><span>{COMPANY.email}</span>
      </div>
      <div className={styles.footerAddress}>{COMPANY.address}<i>·</i><span>{page} / 2</span></div>
    </footer>
  );
}

function FeatureCard({
  title,
  included,
  children,
}: {
  title: string;
  included: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.featureCard}>
      <div className={included ? styles.featureTitle : styles.featureTitleMuted}>
        {title}<span> · {included ? 'incluido' : 'no incluido'}</span>
      </div>
      <div className={styles.featureBody}>{children}</div>
    </div>
  );
}

function MetricBox({
  title,
  value,
  caption,
  alert = false,
}: {
  title: string;
  value: string;
  caption: string;
  alert?: boolean;
}) {
  return (
    <div className={alert ? styles.metricBoxAlert : styles.metricBox}>
      <div className={styles.metricTitle}>{title}</div>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricCaption}>{caption}</div>
    </div>
  );
}

function PageOne({ quote, customer }: QuotePdfDocumentProps) {
  const transfer = option(quote, 'transferencia');
  const mercadoPago = option(quote, 'mercadopago');
  const santander = option(quote, 'santander');
  const alza = option(quote, 'alza');
  const monthlySavings = quote.ahorro.ahorroMensualProm;
  const billReduction = Math.min(quote.gastoCuentaClpMensual, Math.round(quote.ahorro.ahorroAutoconsumoAnual / 12));
  const remainingBill = Math.max(0, quote.gastoCuentaClpMensual - billReduction);
  const coverage = quote.gastoCuentaClpMensual > 0 ? billReduction / quote.gastoCuentaClpMensual : 0;
  const listPrice = mercadoPago?.montoTotal ?? quote.precioProyectoClp;
  const number = quoteNumber(customer, quote);

  return (
    <section className={styles.page} aria-label="Resumen de la cotización">
      <header className={styles.pageOneHeader}>
        <img className={styles.logo} src="/quote-assets/logo-ggelectrics.png" alt="GG Electrics" />
        <div className={styles.headerFact}><span>Proyecto</span><b>Residencial Solar + ACS</b></div>
        <div className={styles.headerFact}><span>Cliente</span><b>{short(customer.contacto.nombreCompleto)}</b></div>
        <div className={styles.headerFact}><span>Ubicación</span><b>{short(customer.ubicacion.direccion || `Región ${customer.ubicacion.region}`, 40)}</b></div>
        <div className={styles.headerFact}><span>N° cotización</span><b>{number}</b></div>
        <div className={styles.headerFact}><span>Validez</span><b>15 días</b></div>
      </header>

      <div className={styles.heroGrid}>
        <div className={styles.savingsHero}>
          <span className={styles.heroEyebrow}>Tu ahorro mensual hasta.</span>
          <strong>{formatCLP(monthlySavings)}</strong>
          <div className={styles.heroCopy}>
            <span>Hoy pagas {formatCLP(quote.gastoCuentaClpMensual)} al mes de electricidad.</span>
            <b>Con esta propuesta pagarías alrededor de {formatCLP(remainingBill)}.</b>
          </div>
          <div className={styles.savingsBar}>
            <span style={{ width: `${Math.max(2, Math.min(100, coverage * 100))}%` }} />
            <b>-{Math.round(coverage * 100)}% de tu gasto</b>
          </div>
        </div>
        <div className={styles.financeHero}>
          <div className={styles.financeOffer}>
            <span>Compra en {santander?.cuotas ?? 48} cuotas sin interés</span>
            <strong>{formatCLP(santander?.cuotaMensual ?? 0)}</strong>
            <b>Diferencia real: {differenceCurrency((santander?.cuotaMensual ?? 0) - monthlySavings)} al mes</b>
          </div>
          <div className={styles.financeOffer}>
            <span>Compra mediante crédito verde a 25 años</span>
            <strong>{formatUf(alza?.cuotaUf)}</strong>
            <b>Diferencia real: {differenceCurrency((alza?.cuotaMensual ?? 0) - monthlySavings)} al mes</b>
          </div>
          <div className={styles.visitCta}>Agenda tu visita técnica</div>
        </div>
      </div>

      <SectionBar>Qué incluye tu proyecto</SectionBar>
      <div className={styles.featureGrid}>
        <FeatureCard title={`Planta solar FV - On Grid · ${quote.sistema.capacidadKwp.toLocaleString('es-CL')} kWp`} included>
          <div className={styles.solarEquipment}>
            <div className={styles.panelGroup}><img src="/quote-assets/solar-panel.png" alt="Panel solar Tier 1" /></div>
            <div className={styles.panelGroup}><img src="/quote-assets/warranty-10.png" alt="10 años de garantía" /></div>
            <div className={styles.panelGroup}><img src="/quote-assets/inverter-sigen.png" alt="Inversor Sigen" /></div>
          </div>
          <strong className={styles.featureLead}>{quote.sistema.numeroPaneles} paneles de {quote.sistema.potenciaPanelW} W y 1 inversor Sigen {inverterCapacity(quote.sistema.capacidadKwp)} kW</strong>
          <p>Paneles TIER 1 e inversor on-grid con 10 años de garantía. Instalación, trámite y certificación SEC TE4, app de monitoreo.</p>
        </FeatureCard>
        <FeatureCard title="Batería de respaldo" included={false}>
          <img className={styles.productWide} src="/quote-assets/battery-pylontech.png" alt="Batería" />
          <p>1 batería Pylontech Fidus 5,12 kWh IP65</p><b>Respaldo ante cortes de luz</b><em>→ Consúltanos para incluirlo</em>
        </FeatureCard>
        <FeatureCard title="Bomba de calor ACS" included={false}>
          <img className={styles.productTall} src="/quote-assets/heat-pump.png" alt="Bomba de calor" />
          <p>Bomba de calor Sidevent 270 L · R290</p><b>Ahorra gas calentando el agua con electricidad.</b><em>→ Consúltanos para incluirlo</em>
        </FeatureCard>
        <FeatureCard title="Otros servicios" included={false}>
          <div className={styles.servicesImages}><img src="/quote-assets/ev-charger.png" alt="Cargador EV" /><img src="/quote-assets/air-conditioner.png" alt="Climatización" /><img src="/quote-assets/pool-heat-pump.png" alt="Bomba piscina" /></div>
          <b>Cargador de auto eléctrico, AC y bombas de calor para calefacción y piscina.</b><em>→ Consúltanos para incluirlo</em>
        </FeatureCard>
      </div>

      <SectionBar>Formas de pago</SectionBar>
      <div className={styles.paymentGrid}>
        <div className={styles.transferBox}>
          <span>Transferencia · {transfer?.badge ?? 'precio preferente'}</span><del>{formatCLP(listPrice)}</del>
          <strong>{formatCLP(transfer?.montoTotal ?? quote.precioProyectoClp)}</strong>
          <small>ahorras {formatCLP(Math.max(0, listPrice - (transfer?.montoTotal ?? quote.precioProyectoClp)))}</small>
        </div>
        <div className={styles.paymentBox}>
          <div><img src="/quote-assets/mercado-pago.png" alt="Mercado Pago" /><b>· {mercadoPago?.cuotas ?? 12} cuotas sin interés</b></div>
          <strong>{formatCLP(mercadoPago?.cuotaMensual ?? 0)}</strong><small>Todas las tarjetas</small>
        </div>
        <div className={styles.paymentBox}>
          <div><img src="/quote-assets/santander.png" alt="Santander" /><b>{santander?.cuotas ?? 48} cuotas sin interés</b></div>
          <strong>{formatCLP(santander?.cuotaMensual ?? 0)}</strong><small>Solo tarjetas de crédito Santander</small>
        </div>
      </div>
      <p className={styles.disclaimer}>(*) CAE 1,54% a 48 cuotas sobre monto referencial de $1.000.000. Todos los valores incluyen IVA. Sistema On-Grid ofertado no incluye baterías y no da respaldo ante cortes de luz. Cotización referencial sujeta a evaluación técnica.</p>
      <Footer page={1} />
    </section>
  );
}

function UpgradeCard({ title, product, detail, price, image }: { title: string; product: string; detail: string; price: string; image: string }) {
  return (
    <div className={styles.upgradeCard}>
      <div className={styles.upgradeHeader}><span>{title}</span></div>
      <div className={styles.upgradeVisual}><img src={image} alt="" /><div><strong>{product}</strong><span>{detail}</span></div></div>
      <div className={styles.upgradePrice}><span>Valor adicional</span><b>{price}</b></div>
    </div>
  );
}

function PageTwo({ quote, customer }: QuotePdfDocumentProps) {
  const annualBill = quote.gastoCuentaClpMensual * 12;
  const number = quoteNumber(customer, quote);

  return (
    <section className={styles.page} aria-label="Detalle del ahorro y retorno">
      <header className={styles.pageTwoHeader}>
        <img className={styles.logo} src="/quote-assets/logo-ggelectrics.png" alt="GG Electrics" />
        <h1>De dónde sale el ahorro y por qué elegirnos</h1><b>Cotización N° {number}</b>
      </header>
      <SectionBar>De dónde sale tu ahorro</SectionBar>
      <div className={styles.sourceGrid}>
        <div className={styles.sourceCard}>
          <h2>Menos cuenta de luz</h2><p>Hoy: {formatCLP(annualBill)} al año ({formatCLP(quote.gastoCuentaClpMensual)} mensual)</p>
          <strong>-{formatCLP(quote.ahorro.ahorroTotalAnual)}</strong><span>Promedio {formatCLP(quote.ahorro.ahorroMensualProm)} al mes</span>
          <small>Autoconsumo {formatKwh(quote.sistema.autoconsumoAnualKwh)} · Inyección {formatKwh(quote.sistema.inyeccionAnualKwh)}</small>
        </div>
        <div className={styles.sourceCard}>
          <h2>Menos cuenta de gas · no incluido</h2><p>Ejemplo de un hogar que hoy gasta {formatCLP(1_200_000)} al año</p>
          <strong>-{formatCLP(960_000)}</strong><span>Ahorro promedio de {formatCLP(80_000)} al mes en gas después de instalar una bomba de calor de 270 L de ACS</span>
        </div>
        <div className={styles.sourceCardTogether}>
          <h2>Por qué conviene junto</h2><p>La bomba de calor sube tu consumo eléctrico. Los paneles cubren exactamente ese aumento.</p><p>Por separado cada uno tiene un pero. Juntos se resuelven.</p>
        </div>
      </div>

      <SectionBar>Cuándo recuperas tu inversión</SectionBar>
      <div className={styles.metricGrid}>
        <MetricBox title="Retorno de la inversión" value={`${quote.paybackAnios.toLocaleString('es-CL')} años`} caption="cálculo sin considerar alzas de tarifa" />
        <MetricBox title="Ahorro acumulado en 25 años" value={formatCLP(quote.ahorro.ahorroTotalAnual * 25)} caption="vida útil estimada de los paneles" />
        <MetricBox title="Si no haces nada" value={formatCLP(annualBill * 25)} caption="es lo que pagarás en 25 años sin quedarte con nada" alert />
      </div>

      <SectionBar orange>Cómo puede crecer tu sistema más adelante si cambias a un inversor híbrido</SectionBar>
      <div className={styles.growthGrid}>
        <div className={styles.hybridCard}>
          <div><span>Cambia a un inversor GoodWe híbrido</span><strong>{inverterCapacity(quote.sistema.capacidadKwp)} kW</strong><small>GoodWe</small><b>Respaldo de emergencia (*) listo para crecer en almacenamiento</b></div>
          <img src="/quote-assets/inverter-goodwe.png" alt="Inversor híbrido GoodWe" /><div className={styles.hybridPrice}><span>Valor adicional</span><b>{formatCLP(1_100_000)}</b></div>
        </div>
        <UpgradeCard title="Opción 1 al comprar inversor híbrido" product="Suma una batería Pylontech Fidus de 5,12 kWh" detail="Energía disponible de noche y ante cortes de luz" price={formatCLP(2_428_600)} image="/quote-assets/battery-pylontech.png" />
        <UpgradeCard title="Opción 2 al comprar inversor híbrido" product="Suma una batería Pylontech de 16 kWh" detail="Mayor energía disponible de noche y ante cortes de luz" price={formatCLP(3_107_090)} image="/quote-assets/battery-tower.png" />
        <UpgradeCard title="Opción 3 compra lo más premium y elegante" product="Cambia a un inversor SigenStor Neo con 7,5 kWh" detail="Diseño premium, ultra compacto y estético" price={formatCLP(3_845_310)} image="/quote-assets/sigenergy-system.png" />
      </div>
      <p className={styles.growthNote}>Todos los valores incluyen IVA e instalación. Puedes incorporarlos ahora o en el futuro.<br />(*) El inversor permite dar respaldo ante cortes de luz sin baterías siempre que la generación sea mayor al consumo (respaldo de emergencia con limitaciones).</p>

      <SectionBar>Por qué GG Electrics</SectionBar>
      <div className={styles.reasonsGrid}>
        <div><b>Soporte remoto sin costo</b><span>Asistencia tras temporales y reconexión del monitoreo. Siempre, sin costo.</span></div>
        <div><b>2 años de garantía full</b><span>Gestión completa durante 2 años. Paneles 12 años e inversor 10 años con proveedor local.</span></div>
        <div><b>+200 casas y 2.000 kWp en proyectos</b><span>Testimonios reales en videos: youtube.com/@ggelectrics7932</span></div>
        <div><b>Resolvemos todo</b><span>Aire acondicionado, cargador EV, bomba de piscina y calefacción. Un solo proveedor.</span></div>
      </div>
      <Footer page={2} />
    </section>
  );
}

export function QuotePdfDocument(props: QuotePdfDocumentProps) {
  return <div className={styles.document}><PageOne {...props} /><PageTwo {...props} /></div>;
}
