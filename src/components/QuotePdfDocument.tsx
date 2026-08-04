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
  phone: '+56 9 4013 4034',
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

function signedCurrency(value: number) {
  return `${value >= 0 ? '+' : '-'}${formatCLP(Math.abs(value))}`;
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
        <div className={styles.headerFact}><span>Proyecto</span><b>Residencial Solar</b></div>
        <div className={styles.headerFact}><span>Cliente</span><b>{short(customer.contacto.nombreCompleto)}</b></div>
        <div className={styles.headerFact}><span>Ubicación</span><b>{short(customer.ubicacion.direccion || `Región ${customer.ubicacion.region}`, 40)}</b></div>
        <div className={styles.headerFact}><span>N° cotización</span><b>{number}</b></div>
        <div className={styles.headerFact}><span>Validez</span><b>15 días</b></div>
      </header>

      <div className={styles.heroGrid}>
        <div className={styles.savingsHero}>
          <span className={styles.heroEyebrow}>Tu beneficio mensual estimado</span>
          <strong>{formatCLP(monthlySavings)}</strong>
          <div className={styles.heroCopy}>
            <span>Hoy pagas {formatCLP(quote.gastoCuentaClpMensual)} al mes de electricidad.</span>
            <b>Con esta propuesta tu cuenta bajaría a cerca de {formatCLP(remainingBill)}.</b>
          </div>
          <div className={styles.savingsBar}>
            <span style={{ width: `${Math.max(2, Math.min(100, coverage * 100))}%` }} />
            <b>-{Math.round(coverage * 100)}% de tu cuenta</b>
          </div>
        </div>
        <div className={styles.financeHero}>
          <div className={styles.financeOffer}>
            <span>{santander?.cuotas ?? 48} cuotas sin interés</span>
            <strong>{formatCLP(santander?.cuotaMensual ?? 0)}</strong>
            <b>Diferencia real: {signedCurrency((santander?.cuotaMensual ?? 0) - monthlySavings)} al mes</b>
            <small>el ahorro cubre gran parte de la cuota</small>
          </div>
          <div className={styles.financeOffer}>
            <span>Crédito a {alza?.cuotas ?? 300} cuotas</span>
            <strong>{formatCLP(alza?.cuotaMensual ?? 0)}</strong>
            <b>Diferencia real: {signedCurrency((alza?.cuotaMensual ?? 0) - monthlySavings)} al mes</b>
            <small>tu proyecto se paga con el ahorro</small>
          </div>
          <div className={styles.visitCta}>Agenda tu visita técnica con nuestro equipo</div>
        </div>
      </div>

      <SectionBar>Qué incluye tu proyecto</SectionBar>
      <div className={styles.featureGrid}>
        <FeatureCard title={`Planta fotovoltaica · ${quote.sistema.capacidadKwp.toLocaleString('es-CL')} kWp`} included>
          <div className={styles.solarEquipment}>
            <div className={styles.panelGroup}><span>{quote.sistema.numeroPaneles} paneles<br />{quote.sistema.potenciaPanelW} Wp</span><img src="/quote-assets/solar-panel.png" alt="Panel solar" /></div>
            <div className={styles.panelGroup}><span>1 inversor<br />Huawei híbrido</span><img src="/quote-assets/inverter-huawei.png" alt="Inversor" /></div>
          </div>
          <strong className={styles.featureLead}>Genera {formatKwh(quote.sistema.generacionAnualKwh)} al año</strong>
          <p>Instalación · Trámite SEC TE4 · App de monitoreo incluida.</p>
        </FeatureCard>
        <FeatureCard title="Batería de respaldo" included={false}>
          <img className={styles.productWide} src="/quote-assets/battery-pylontech.png" alt="Batería" />
          <p>Sistema de almacenamiento compatible</p><b>Respaldo ante cortes de luz</b><em>→ Consúltanos para incluirla</em>
        </FeatureCard>
        <FeatureCard title="Bomba de calor ACS" included={false}>
          <img className={styles.productTall} src="/quote-assets/heat-pump.png" alt="Bomba de calor" />
          <p>Agua caliente sanitaria eficiente</p><b>Ahorra gas usando energía eléctrica.</b><em>→ Consúltanos para incluirla</em>
        </FeatureCard>
        <FeatureCard title="Otros servicios" included={false}>
          <div className={styles.servicesImages}><img src="/quote-assets/ev-charger.png" alt="Cargador EV" /><img src="/quote-assets/air-conditioner.png" alt="Climatización" /><img src="/quote-assets/pool-heat-pump.png" alt="Bomba piscina" /></div>
          <b>Cargadores EV, climatización y piscinas</b><em>→ Consúltanos para incluirlos</em>
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
      <p className={styles.disclaimer}>Todos los valores incluyen IVA. Las cuotas son referenciales y están sujetas a evaluación y condiciones vigentes.</p>
      <Footer page={1} />
    </section>
  );
}

function UpgradeCard({ title, capacity, image }: { title: string; capacity: string; image: string }) {
  return (
    <div className={styles.upgradeCard}>
      <div className={styles.upgradeHeader}><span>{title}</span><b>{capacity}</b></div>
      <div className={styles.upgradeVisual}><img src={image} alt="" /><div><strong>Sistema de almacenamiento compatible</strong><span>Energía disponible de noche y ante cortes</span></div></div>
      <div className={styles.upgradePrice}><span>Valor adicional</span><b>Consultar</b></div>
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
          <h2>Producción de energía limpia</h2><p>Tu sistema de {quote.sistema.capacidadKwp.toLocaleString('es-CL')} kWp genera energía durante todo el año.</p>
          <strong>{formatKwh(quote.sistema.generacionAnualKwh)}</strong><span>{formatKwh(quote.sistema.generacionMensualPromKwh)} mensuales en promedio</span><small>Estimación según irradiancia de tu región.</small>
        </div>
        <div className={styles.sourceCardTogether}>
          <h2>Por qué conviene ahora</h2><p>Reduces tu exposición a las alzas eléctricas y transformas gasto mensual en un activo para tu hogar.</p><p>La energía que no consumes se inyecta a la red bajo Net Billing.</p>
        </div>
      </div>

      <SectionBar>Cuándo recuperas tu inversión</SectionBar>
      <div className={styles.metricGrid}>
        <MetricBox title="Retorno de la inversión" value={`${quote.paybackAnios.toLocaleString('es-CL')} años`} caption="cálculo sin considerar alzas de tarifa" />
        <MetricBox title="Ahorro acumulado en 25 años" value={formatCLP(quote.ahorro.ahorroTotalAnual * 25)} caption="vida útil estimada de los paneles" />
        <MetricBox title="Si no haces nada" value={formatCLP(annualBill * 25)} caption="pagarías esto en 25 años sin generar energía propia" alert />
      </div>

      <SectionBar orange>Cómo puede crecer tu sistema más adelante</SectionBar>
      <div className={styles.growthGrid}>
        <div className={styles.hybridCard}>
          <div><span>Inversor híbrido</span><strong>{quote.sistema.capacidadKwp.toLocaleString('es-CL')} kW</strong><small>Preparado para almacenamiento</small><b>Respaldo de emergencia y listo para crecer</b></div>
          <img src="/quote-assets/hybrid-inverter.png" alt="Inversor híbrido" /><div className={styles.hybridPrice}><span>Valor adicional</span><b>Consultar</b></div>
        </div>
        <UpgradeCard title="Opción 1" capacity="5 kWh" image="/quote-assets/battery-pylontech.png" />
        <UpgradeCard title="Opción 2" capacity="10 kWh" image="/quote-assets/battery-tower.png" />
        <UpgradeCard title="Opción 3" capacity="a definir" image="/quote-assets/sigenergy-system.png" />
      </div>
      <p className={styles.growthNote}>Puedes incorporar almacenamiento ahora o más adelante: el sistema puede quedar preparado desde el primer día.</p>

      <SectionBar>Por qué GG Electrics</SectionBar>
      <div className={styles.reasonsGrid}>
        <div><b>Soporte remoto sin costo</b><span>Asistencia y reconexión del monitoreo cuando lo necesites.</span></div>
        <div><b>Garantía de instalación</b><span>Gestión completa y equipos con respaldo local.</span></div>
        <div><b>Experiencia comprobable</b><span>Más de 200 casas y 2.000 kWp instalados.</span></div>
        <div><b>Resolvemos todo</b><span>Solar, baterías, climatización, cargadores EV y bombas.</span></div>
      </div>
      <Footer page={2} />
    </section>
  );
}

export function QuotePdfDocument(props: QuotePdfDocumentProps) {
  return <div className={styles.document}><PageOne {...props} /><PageTwo {...props} /></div>;
}
