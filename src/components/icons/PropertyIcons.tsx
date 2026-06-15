// Iconos SVG personalizados (trazo, estilo coherente) para las tarjetas de
// selección de tipo de propiedad y tipo de instalación.
// TODO(Hugo): si tienes ilustraciones de marca, se pueden reemplazar aquí
// manteniendo el viewBox 0 0 28 28 para conservar el layout.

import { SVGProps } from 'react';

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 26,
  height: 26,
  viewBox: '0 0 28 28',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export function HouseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 12.5 14 4l10 8.5" />
      <path d="M6 11v11h16V11" />
      <path d="M11.5 22v-6h5v6" />
    </svg>
  );
}

export function HouseConstructionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 12.5 14 4l10 8.5" />
      <path d="M6 11v11h7" />
      <path d="M16.5 22v-7" />
      <path d="M16.5 15h6.5" />
      <path d="M19 18.5h4" />
      <circle cx="9.5" cy="17" r="1.4" />
    </svg>
  );
}

export function ApartmentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="4" width="16" height="20" rx="1.4" />
      <path d="M9.5 8h2M9.5 12h2M9.5 16h2M16.5 8h2M16.5 12h2M16.5 16h2" />
      <path d="M11.5 24v-4h5v4" />
    </svg>
  );
}

export function CompanyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5 24V8l7-3 7 3v16" />
      <path d="M19 24v-9l4 1.5V24" />
      <path d="M9 12h2M9 16h2M9 20h2M14 12h2M14 16h2M14 20h2" />
    </svg>
  );
}

export function RoofIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 14 14 6l10 8" />
      <rect x="9" y="14" width="10" height="3.4" rx="0.6" transform="rotate(0 9 14)" />
      <path d="M9 18.4h10M9 21.8h10" />
    </svg>
  );
}

export function CarportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 11 14 6l10 5" />
      <path d="M6 11v3M22 11v3" />
      <rect x="5" y="14" width="18" height="2.6" rx="0.6" />
      <path d="M8 19.5c0-2 1.6-3 4-3h4c2.4 0 4 1 4 3" />
      <circle cx="10.5" cy="21.5" r="1.3" />
      <circle cx="17.5" cy="21.5" r="1.3" />
    </svg>
  );
}

export function GroundIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 23h20" />
      <path d="M7 23v-6l7-4 7 4v6" />
      <path d="M9 17.5 14 15l5 2.5" />
      <path d="M14 15v8" />
    </svg>
  );
}
