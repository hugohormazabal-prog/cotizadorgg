/* eslint-disable @next/next/no-img-element */

import type { BusinessSettings } from "@/lib/config";
import type { MarketDataSnapshot } from "@/lib/market-data";
import {
  buildQuoteDocumentModel,
  type QuoteDocumentModel,
  type QuoteExpansionOption,
} from "@/lib/quote-document-model";
import type {
  CustomerDraft,
  QuickStartInput,
  QuoteResult,
  TechnicalConfig,
} from "@/lib/quote-engine";
import { formatCurrency, formatNumber } from "@/lib/utils";
import styles from "./quote-pdf-document.module.css";

type QuotePdfDocumentProps = {
  quote: QuoteResult;
  settings: BusinessSettings;
  customer: CustomerDraft;
  quickStart: QuickStartInput;
  technical: TechnicalConfig;
  marketData: MarketDataSnapshot | null;
};

const companyAddress = "Laguna Sur 9600 B432, Pudahuel, Santiago";

function signedCurrency(value: number) {
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}${formatCurrency(Math.abs(value))}`;
}

function shortName(value: string, maximum = 46) {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1).trim()}…`;
}

function SectionBar({ children, orange = false }: { children: React.ReactNode; orange?: boolean }) {
  return <div className={orange ? styles.sectionBarOrange : styles.sectionBar}>{children}</div>;
}

function Footer({ settings, page }: { settings: BusinessSettings; page: number }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContact}>
        <span>www.ggelectrics.cl</span>
        <i>·</i>
        <span>{settings.contactPhone}</span>
        <i>·</i>
        <span>{settings.contactEmail}</span>
      </div>
      <div className={styles.footerAddress}>
        {companyAddress}
        <i>·</i>
        <span>{page} / 2</span>
      </div>
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
        {title}
        <span>· {included ? "incluido" : "no incluido"}</span>
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

function UpgradeCard({ option }: { option: QuoteExpansionOption }) {
  return (
    <div className={styles.upgradeCard}>
      <div className={styles.upgradeHeader}>
        <span>{option.title}</span>
        <b>{option.capacityLabel}</b>
      </div>
      <div className={styles.upgradeVisual}>
        <img src={option.image} alt="" />
        <div>
          <strong>{shortName(option.name, 58)}</strong>
          <span>Energía disponible de noche y ante cortes de luz</span>
        </div>
      </div>
      <div className={styles.upgradePrice}>
        <span>Valor adicional</span>
        <b>{option.additionalPrice > 0 ? formatCurrency(option.additionalPrice) : "Consultar"}</b>
      </div>
    </div>
  );
}

function PageOne({
  model,
  quote,
  settings,
}: {
  model: QuoteDocumentModel;
  quote: QuoteResult;
  settings: BusinessSettings;
}) {
  const inverterLabel = `${quote.selectedInverter.brand} ${formatNumber(quote.selectedInverter.acPowerKw)} kW`;

  return (
    <section className={styles.page} aria-label="Resumen de la cotización">
      <header className={styles.pageOneHeader}>
        <img className={styles.logo} src="/quote-assets/logo-ggelectrics.png" alt="GGelectrics" />
        <div className={styles.headerFact}>
          <span>Proyecto</span>
          <b>{model.projectName}</b>
        </div>
        <div className={styles.headerFact}>
          <span>Cliente</span>
          <b>{model.customerName}</b>
        </div>
        <div className={styles.headerFact}>
          <span>Ubicación</span>
          <b>{shortName(model.location, 40)}</b>
        </div>
        <div className={styles.headerFact}>
          <span>N° cotización</span>
          <b>{model.quoteNumber}</b>
        </div>
        <div className={styles.headerFact}>
          <span>Validez</span>
          <b>{model.validityLabel}</b>
        </div>
      </header>

      <div className={styles.heroGrid}>
        <div className={styles.savingsHero}>
          <span className={styles.heroEyebrow}>Tu ahorro mensual hasta.</span>
          <strong>{formatCurrency(model.monthlySavings)}</strong>
          <div className={styles.heroCopy}>
            <span>Hoy pagas {formatCurrency(model.monthlyBill)} al mes de electricidad.</span>
            <b>Con esta propuesta pagarías alrededor de {formatCurrency(model.remainingMonthlyBill)}.</b>
          </div>
          <div className={styles.savingsBar}>
            <span style={{ width: `${Math.max(2, model.offsetPercent * 100)}%` }} />
            <b>-{formatNumber(model.offsetPercent * 100, 0)}% de tu gasto</b>
          </div>
        </div>
        <div className={styles.financeHero}>
          <div className={styles.financeOffer}>
            <span>48 cuotas sin interés</span>
            <strong>{formatCurrency(model.santanderInstallment)}</strong>
            <b>Diferencia real: {signedCurrency(model.santanderDifference)} al mes</b>
            <small>el ahorro cubre gran parte de la cuota</small>
          </div>
          <div className={styles.financeOffer}>
            <span>Crédito a {model.creditMonths} cuotas</span>
            <strong>
              {model.creditInstallmentUf === null
                ? "Consultar"
                : `${formatNumber(model.creditInstallmentUf, 1)} UF`}
            </strong>
            <b>
              Diferencia real: {model.creditDifference === null ? "por calcular" : `${signedCurrency(model.creditDifference)} al mes`}
            </b>
            <small>tu proyecto se paga con el ahorro</small>
          </div>
          <div className={styles.visitCta}>Agendar visita técnica (valor $30.000)</div>
        </div>
      </div>

      <SectionBar>Qué incluye tu proyecto</SectionBar>
      <div className={styles.featureGrid}>
        <FeatureCard title={`Planta fotovoltaica · ${formatNumber(quote.installedPowerKw, 2)} kWp`} included>
          <div className={styles.solarEquipment}>
            <div className={styles.panelGroup}>
              <span>{quote.panelCount} paneles<br />{quote.selectedPanel.watts} [Wp]</span>
              <img src="/quote-assets/solar-panel.png" alt="Panel solar" />
            </div>
            <div className={styles.panelGroup}>
              <span>1 inversor<br />{shortName(inverterLabel, 22)}</span>
              <img src="/quote-assets/inverter-huawei.png" alt="Inversor" />
            </div>
          </div>
          <strong className={styles.featureLead}>Genera {formatNumber(quote.annualGenerationKwh, 0)} kWh al año</strong>
          <p>Instalación · Trámite y certificación SEC TE4 · App de monitoreo incluida.</p>
        </FeatureCard>

        <FeatureCard title="Batería de respaldo" included={model.batteryIncluded}>
          <img className={styles.productWide} src="/quote-assets/battery-pylontech.png" alt="Batería" />
          <p>{shortName(model.batteryName, 52)} · {model.batteryCapacityLabel}</p>
          <b>Respaldo ante cortes de luz</b>
          {!model.batteryIncluded ? <em>→ Consúltanos para incluirla</em> : null}
        </FeatureCard>

        <FeatureCard title="Bomba de calor ACS" included={model.gasSystemIncluded}>
          <img className={styles.productTall} src="/quote-assets/heat-pump.png" alt="Bomba de calor" />
          <p>{shortName(model.gasServiceName, 52)}</p>
          <b>Ahorra gas calentando el agua con electricidad.</b>
          {!model.gasSystemIncluded ? <em>→ Consúltanos para incluirla</em> : null}
        </FeatureCard>

        <FeatureCard title="Otros servicios" included={model.otherServicesIncluded}>
          <div className={styles.servicesImages}>
            <img src="/quote-assets/ev-charger.png" alt="Cargador de auto" />
            <img src="/quote-assets/air-conditioner.png" alt="Aire acondicionado" />
            <img src="/quote-assets/pool-heat-pump.png" alt="Bomba de calor para piscina" />
          </div>
          <b>{shortName(model.otherServicesLabel, 70)}</b>
          {!model.otherServicesIncluded ? <em>→ Consúltanos para incluirlos</em> : null}
        </FeatureCard>
      </div>

      <SectionBar>Formas de pago</SectionBar>
      <div className={styles.paymentGrid}>
        <div className={styles.transferBox}>
          <span>Transferencia · 15,5% de descuento</span>
          <del>{formatCurrency(model.transferListPrice)}</del>
          <strong>{formatCurrency(model.transferPrice)}</strong>
          <small>ahorras {formatCurrency(model.transferSavings)}</small>
        </div>
        <div className={styles.paymentBox}>
          <div><img src="/quote-assets/mercado-pago.png" alt="Mercado Pago" /><b>· 12 cuotas sin interés</b></div>
          <strong>{formatCurrency(model.cardInstallment)}</strong>
          <small>Todas las tarjetas</small>
        </div>
        <div className={styles.paymentBox}>
          <div><img src="/quote-assets/santander.png" alt="Santander" /><b>48 cuotas sin interés</b></div>
          <strong>{formatCurrency(model.santanderInstallment)}</strong>
          <small>Solo tarjetas de crédito Santander</small>
        </div>
      </div>
      <p className={styles.disclaimer}>Todos los valores incluyen IVA. Las cuotas y el crédito son referenciales y están sujetos a evaluación y condiciones vigentes.</p>
      <Footer settings={settings} page={1} />
    </section>
  );
}

function PageTwo({
  model,
  quote,
  settings,
}: {
  model: QuoteDocumentModel;
  quote: QuoteResult;
  settings: BusinessSettings;
}) {
  const upgrades = model.batteryUpgrades.slice(0, 3);

  return (
    <section className={styles.page} aria-label="Detalle del ahorro y retorno">
      <header className={styles.pageTwoHeader}>
        <img className={styles.logo} src="/quote-assets/logo-ggelectrics.png" alt="GGelectrics" />
        <h1>De dónde sale el ahorro y por qué elegirnos</h1>
        <b>Cotización N° {model.quoteNumber}</b>
      </header>

      <SectionBar>De dónde sale tu ahorro</SectionBar>
      <div className={styles.sourceGrid}>
        <div className={styles.sourceCard}>
          <h2>Menos cuenta de luz</h2>
          <p>Hoy: {formatCurrency(model.annualBill)} al año ({formatCurrency(model.monthlyBill)} mensual)</p>
          <strong>-{formatCurrency(model.annualSavings)}</strong>
          <span>Promedio {formatCurrency(model.monthlySavings)} al mes</span>
          <small>Autoconsumo {formatNumber(model.annualAutoconsumptionKwh, 0)} kWh · Inyección {formatNumber(model.annualInjectionKwh, 0)} kWh</small>
        </div>
        <div className={styles.sourceCard}>
          <h2>Menos cuenta de gas · {model.gasSystemIncluded ? "incluido" : "no incluido"}</h2>
          <p>{model.gasSystemIncluded ? shortName(model.gasServiceName, 58) : "La bomba de calor puede reemplazar parte del gasto en gas."}</p>
          <strong>{model.gasSystemIncluded ? "Ahorro adicional" : "Por calcular"}</strong>
          <span>Depende del consumo y del combustible actual.</span>
          <small>Se confirma durante la visita técnica.</small>
        </div>
        <div className={styles.sourceCardTogether}>
          <h2>Por qué conviene junto</h2>
          <p>La bomba de calor sube tu consumo eléctrico. Los paneles pueden cubrir ese aumento.</p>
          <p>Por separado cada uno tiene un pero. Juntos se resuelven.</p>
        </div>
      </div>

      <SectionBar>Cuándo recuperas tu inversión</SectionBar>
      <div className={styles.metricGrid}>
        <MetricBox title="Retorno de la inversión" value={`${formatNumber(model.paybackYears, 1)} años`} caption="cálculo sin considerar alzas de tarifa" />
        <MetricBox title="Ahorro acumulado en 25 años" value={formatCurrency(model.savingsIn25Years)} caption="vida útil estimada de los paneles" />
        <MetricBox title="Si no haces nada" value={formatCurrency(model.costOfDoingNothing)} caption="es lo que pagarías en 25 años sin quedarte con nada" alert />
      </div>

      <SectionBar orange>Cómo puede crecer tu sistema más adelante</SectionBar>
      <div className={styles.growthGrid}>
        {model.hybridUpgrade ? (
          <div className={styles.hybridCard}>
            <div>
              <span>{model.hybridUpgrade.title}</span>
              <strong>{model.hybridUpgrade.capacityLabel}</strong>
              <small>{shortName(model.hybridUpgrade.name, 48)}</small>
              <b>Respaldo de emergencia y listo para crecer</b>
            </div>
            <img src={model.hybridUpgrade.image} alt="Inversor híbrido" />
            <div className={styles.hybridPrice}>
              <span>Valor adicional</span>
              <b>{model.hybridUpgrade.additionalPrice > 0 ? formatCurrency(model.hybridUpgrade.additionalPrice) : "Consultar"}</b>
            </div>
          </div>
        ) : (
          <div className={styles.hybridCard}>
            <div><span>Inversor híbrido</span><strong>{formatNumber(quote.selectedInverter.acPowerKw)} kW</strong><small>Preparado para almacenamiento</small></div>
            <img src="/quote-assets/hybrid-inverter.png" alt="Inversor híbrido" />
            <div className={styles.hybridPrice}><span>Valor adicional</span><b>Consultar</b></div>
          </div>
        )}
        {upgrades.map((option) => <UpgradeCard key={option.name} option={option} />)}
        {Array.from({ length: Math.max(0, 3 - upgrades.length) }, (_, index) => (
          <UpgradeCard
            key={`placeholder-${index}`}
            option={{
              title: `Opción ${upgrades.length + index + 1}`,
              name: "Sistema de almacenamiento compatible",
              capacityLabel: "a definir",
              additionalPrice: 0,
              image: "/quote-assets/battery-tower.png",
            }}
          />
        ))}
      </div>
      <p className={styles.growthNote}>Todos los valores incluyen IVA e instalación. Puedes incorporarlos ahora o más adelante: el sistema puede quedar preparado desde el primer día.</p>

      <SectionBar>Por qué GG Electrics</SectionBar>
      <div className={styles.reasonsGrid}>
        <div><b>Soporte remoto sin costo</b><span>Asistencia tras temporales y reconexión del monitoreo. Siempre, sin costo.</span></div>
        <div><b>2 años de garantía full</b><span>Gestión completa durante 2 años. Paneles e inversor con respaldo local.</span></div>
        <div><b>+200 casas y 2.000 kWp</b><span>Experiencia comprobable en proyectos residenciales y comerciales.</span></div>
        <div><b>Resolvemos todo</b><span>Solar, baterías, climatización, cargadores EV y bombas. Un solo proveedor.</span></div>
      </div>
      <Footer settings={settings} page={2} />
    </section>
  );
}

export function QuotePdfDocument(props: QuotePdfDocumentProps) {
  const model = buildQuoteDocumentModel(props);

  return (
    <div className={`${styles.document} quote-print-document`} aria-hidden="true">
      <PageOne model={model} quote={props.quote} settings={props.settings} />
      <PageTwo model={model} quote={props.quote} settings={props.settings} />
    </div>
  );
}
