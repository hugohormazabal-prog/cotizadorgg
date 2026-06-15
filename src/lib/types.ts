// Tipos centrales del cotizador. Esta forma de datos es la que finalmente
// se persiste en Supabase (ver supabase/migrations/0001_init.sql).

export type Step = 1 | 2 | 3 | 4 | 5 | 6;

export type ComoNosEncontraste =
  | 'google'
  | 'redes_sociales'
  | 'recomendacion'
  | 'mailing'
  | 'otros';

export type TipoPropiedad = 'casa' | 'casa_construccion' | 'departamento' | 'empresa';

export type UbicacionPaneles = 'techo' | 'carport' | 'suelo';

export type TipoTecho =
  | 'mediterraneo_zinc'
  | 'teja_asfaltica'
  | 'teja_cemento'
  | 'pizarreno'
  | 'teja_chilena'
  | 'otro';

export type UnidadConsumo = 'clp' | 'kwh';

export interface ContactoData {
  nombreCompleto: string;
  telefono: string;
  email: string;
  comoNosEncontraste: ComoNosEncontraste | '';
}

export interface PropiedadData {
  tipoPropiedad: TipoPropiedad | '';
}

export interface InstalacionData {
  ubicacionPaneles: UbicacionPaneles | '';
  tipoTecho: TipoTecho | '';
}

export interface UbicacionData {
  direccion: string;
  infoAdicional: string;
  lat: number | null;
  lng: number | null;
  region: import('./config').Region | '';
}

export interface ConsumoData {
  unidad: UnidadConsumo;
  montoClp: number | null;
  consumoKwh: number | null;
}

export interface ResumenData {
  aceptaTerminos: boolean;
}

export interface CotizadorState {
  contacto: ContactoData;
  propiedad: PropiedadData;
  instalacion: InstalacionData;
  ubicacion: UbicacionData;
  consumo: ConsumoData;
  resumen: ResumenData;
}

export const initialCotizadorState: CotizadorState = {
  contacto: {
    nombreCompleto: '',
    telefono: '',
    email: '',
    comoNosEncontraste: '',
  },
  propiedad: {
    tipoPropiedad: '',
  },
  instalacion: {
    ubicacionPaneles: '',
    tipoTecho: '',
  },
  ubicacion: {
    direccion: '',
    infoAdicional: '',
    lat: null,
    lng: null,
    region: '',
  },
  consumo: {
    unidad: 'clp',
    montoClp: null,
    consumoKwh: null,
  },
  resumen: {
    aceptaTerminos: false,
  },
};
