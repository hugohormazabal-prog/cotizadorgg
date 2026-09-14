# Cotizador Solar — GG Electrics

Cotizador web inmersivo y animado de 6 etapas para GG Electrics
([ggelectrics.cl](https://www.ggelectrics.cl/)), construido con Next.js 14
(App Router + TypeScript), Tailwind CSS, Framer Motion, Zustand y Supabase.

## Primeros pasos

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

El cotizador funciona en **modo demo** sin configuración adicional: guarda el
progreso en `localStorage`, calcula estimaciones de referencia y simula el
envío final con una animación de éxito. Para conectarlo a servicios reales,
sigue los pasos de configuración abajo.

## Configuración

Copia `.env.example` a `.env.local` y completa:

| Variable | Para qué sirve |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Guardar las solicitudes de cotización en Supabase (tabla `cotizaciones`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Persistencia central y versionada del mantenedor; solo servidor |
| `MANTENEDOR_ACCOUNTS` | Login simple del único administrador, en formato `usuario:contraseña` |
| `MANTENEDOR_ACCESS_KEY` | Compatibilidad opcional con el acceso antiguo por una sola clave |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Autocompletado de direcciones (Places) y mapa interactivo con pin arrastrable en la Etapa 4 |

### Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica en orden las migraciones de `supabase/migrations` (pégalas en el SQL
   Editor del dashboard, o usa `supabase db push` si trabajas con la CLI).
3. Copia la URL y la `anon key` desde *Project Settings → API* a `.env.local`.

La tabla `cotizaciones` queda con Row Level Security activado: cualquiera
puede **insertar** (es un formulario público), pero la lectura queda reservada
al backend / dashboard (rol `service_role`). Ajusta las políticas si luego
agregas un panel interno con autenticación.

### Google Maps

1. Habilita **Maps JavaScript API** y **Places API** en Google Cloud Console.
2. Genera una API key restringida a tu dominio.

Sin esta key, la Etapa 4 muestra un mapa de demostración totalmente animado e
interactivo (pin con micro-animación) para que el resto del flujo se pueda
probar sin depender de la integración externa.

## Estructura

```
src/
  app/                  # Layout, estilos globales y página principal
  components/
    Cotizador.tsx       # Orquestador del flujo de 6 etapas
    ui/                 # Sistema de diseño: Button, FormField, SelectCard, ProgressBar...
    steps/              # Una carpeta por etapa del flujo
    icons/              # Iconos SVG personalizados de las tarjetas de selección
  lib/
    store.ts            # Estado global (Zustand) + persistencia en localStorage
    types.ts            # Tipos del modelo de datos del cotizador
    config.ts           # Variables auditadas del Excel y valores publicados
    configValidation.ts # Validación numérica y reglas cruzadas
    estimaciones.ts     # Motor residencial, ahorro, precio, proyección y financiamiento
    submitCotizacion.ts # Envío del formulario a Supabase (o modo demo)
    supabase.ts         # Cliente de Supabase
supabase/
  migrations/0001_init.sql  # Esquema SQL de solicitudes
  migrations/0003_cotizador_config_versions.sql # Borradores, publicación e historial
```

## Mantenedor de cálculo

Abre `/mantenedor`. Para un login rápido de demostración, define en `.env.local`
`MANTENEDOR_ACCOUNTS=admin:solar2026`. Sin credenciales de servidor funciona en modo local de
desarrollo; con Supabase configurado guarda borradores y publicaciones globales,
mantiene historial, valida los valores y bloquea conflictos entre sesiones. Cada
solicitud registra la versión y una instantánea de los parámetros usados.

La configuración se construyó mediante una auditoría de las 39 hojas de
`Cotizador Residencial (2).xlsm`. La vista “Cobertura del Excel” identifica qué hojas
alimentan el cotizador residencial, cuáles se consolidan en costos y cuáles
pertenecen a flujos granel/off-grid. La propuesta comercial derivada de la PPT se
considera un artefacto protegido y no se modifica desde el mantenedor.

El motor vigente usa **kWp como escala única** para las variables vinculantes y
los costos generales. La sección “Variables por kWp” permite administrar:

- coeficientes de canalización PAN–INV, INV–TAB y TAB–PC;
- protección general, número de mesas y reglas de redondeo;
- fases y tipo de fijación como categorías técnicas;
- ocho partidas netas por kWp de materiales y servicios que alimentan
  directamente el precio.

Las configuraciones publicadas con el esquema anterior se migran al cargar: las
dos bolsas históricas de materiales/servicios se distribuyen proporcionalmente
entre las nuevas partidas sin cambiar el total por kWp ni el precio del caso
patrón.

## TODOs / pendientes a definir contigo (Hugo)

Estos puntos están marcados con comentarios `TODO(Hugo)` en el código:

- **`src/lib/types.ts`** — enums de `comoNosEncontraste`, `tipoPropiedad`,
  `ubicacionPaneles` y `tipoTecho`: confirmar que coincidan con tus catálogos
  finales (o ajustarlos si cambian).
- **`src/components/ui/ImmersiveBackground.tsx`** — actualmente usa una
  imagen de stock de Unsplash; reemplazar por fotografías propias de
  instalaciones GG Electrics si están disponibles.
- **`src/components/icons/PropertyIcons.tsx`** — iconos SVG genéricos;
  se pueden sustituir por ilustraciones de marca personalizadas.
- **`supabase/migrations/0001_init.sql`** — ajustar `check` constraints,
  agregar columnas o políticas RLS adicionales según evolucione la lógica.
- **Notificaciones de nuevo lead** por WhatsApp al equipo comercial — no
  implementado todavía.

## Integración Odoo CRM

Al avanzar de la etapa 5 a la 6, el navegador llama a `POST /api/cotizaciones`
(`src/app/api/cotizaciones/route.ts`), que:

1. Inserta la solicitud en `cotizaciones` con la service_role key.
2. Después de responder, crea en Odoo (`src/lib/odoo.ts`, JSON-RPC):
   contacto `res.partner` (reutilizado por email), oportunidad `crm.lead`
   en el equipo `ODOO_CRM_TEAM` y la etapa `ODOO_CRM_STAGE` (o la primera del
   pipeline), etiquetas `ODOO_CRM_TAG` + tipo de propiedad e ingreso esperado
   (solo casas; empresa/departamento van "a detalle").
3. Guarda `odoo_lead_id` / `odoo_sync_error` en la fila (migración 0004) y
   envía el correo al cliente si `RESEND_API_KEY` está configurada.

Configuración en Vercel: `ODOO_URL`, `ODOO_DB`, `ODOO_USER`, `ODOO_API_KEY`
(API key de un usuario con permisos de Ventas/CRM, generada en Odoo →
Preferencias → Seguridad de la cuenta), y opcionalmente `ODOO_CRM_TEAM`,
`ODOO_CRM_STAGE`, `ODOO_CRM_TAG`, `RESEND_API_KEY`, `EMAIL_FROM`. Sin las
variables de Odoo la solicitud se guarda igual y la sincronización se omite.

Valores de GG Electrics (Odoo.sh 19.0+e, verificados contra el pipeline real):
`ODOO_URL=https://www.ggelectrics.cl`,
`ODOO_DB=matiasgeimser-geimserodoo-main-34109337`,
`ODOO_USER=fmorales@ggelectrics.cl`, `ODOO_CRM_TEAM=Sales`,
`ODOO_CRM_STAGE=Inicial`. Las oportunidades llevan las etiquetas
`Cotizador web` + `Residencial`/`Comercial` y el medio UTM `Website`.

Reintento automático: Vercel Cron (`vercel.json`) llama una vez al día a
`GET /api/cotizaciones/sincronizar`, que vuelve a enviar a Odoo las
cotizaciones de los últimos 7 días sin `odoo_lead_id`. Requiere la variable
`CRON_SECRET` (Vercel la envía como `Authorization: Bearer …`).

Solicitudes pendientes de sincronizar:
`select id, created_at, odoo_sync_error from cotizaciones where odoo_lead_id is null order by created_at desc;`

## Diseño visual

La paleta combina el azul (#0E6FB6) y ámbar (#EE9F1E) extraídos del logo de
GG Electrics, sobre un fondo oscuro inmersivo con overlays degradados,
resplandores animados y una textura de cuadrícula sutil — buscando una
estética "tech / solar" moderna y confiable.
