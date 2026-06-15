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
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Autocompletado de direcciones (Places) y mapa interactivo con pin arrastrable en la Etapa 4 |

### Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica el esquema de `supabase/migrations/0001_init.sql` (pégalo en el SQL
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
    estimaciones.ts     # Lógica de estimación de ahorro/capacidad (PLACEHOLDER)
    submitCotizacion.ts # Envío del formulario a Supabase (o modo demo)
    supabase.ts         # Cliente de Supabase
supabase/
  migrations/0001_init.sql  # Esquema SQL de la tabla `cotizaciones`
```

## TODOs / pendientes a definir contigo (Hugo)

Estos puntos están marcados con comentarios `TODO(Hugo)` en el código:

- **`src/lib/estimaciones.ts`** — las fórmulas de conversión CLP↔kWh, tamaño
  de sistema sugerido, ahorro estimado e inversión referencial son
  placeholders ilustrativos. Reemplazar con la lógica real de negocio.
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
- **Notificaciones de nuevo lead** (email/WhatsApp al equipo comercial al
  recibir una cotización) — no implementado todavía; se sugiere una Supabase
  Edge Function o un webhook desde la tabla `cotizaciones`.

## Diseño visual

La paleta combina el azul (#0E6FB6) y ámbar (#EE9F1E) extraídos del logo de
GG Electrics, sobre un fondo oscuro inmersivo con overlays degradados,
resplandores animados y una textura de cuadrícula sutil — buscando una
estética "tech / solar" moderna y confiable.
