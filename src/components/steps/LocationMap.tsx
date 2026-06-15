'use client';

import { useEffect, useRef } from 'react';
import { useCotizadorStore } from '@/lib/store';

declare global {
  interface Window {
    google?: any;
    __ggInitGoogleMaps?: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

// Centro por defecto: Providencia, Santiago de Chile.
const DEFAULT_CENTER = { lat: -33.4263, lng: -70.6112 };

/**
 * Mapa interactivo con pin arrastrable.
 *
 * Comportamiento según configuración:
 * - Con `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` → Google Maps (v3) + Places Autocomplete.
 * - Sin API key (por defecto) → Leaflet + CartoDB Dark Matter tiles (OpenStreetMap).
 *
 * En ambos casos el pin es arrastrable y sincroniza `lat`/`lng` en el store.
 * Al seleccionar una dirección con `NominatimAutocomplete`, el mapa centra y
 * mueve el pin automáticamente.
 */
export function LocationMap() {
  return GOOGLE_MAPS_API_KEY ? <GoogleMap /> : <LeafletMap />;
}

// ─── Mapa Google ──────────────────────────────────────────────────────────────

function GoogleMap() {
  const ubicacion = useCotizadorStore((s) => s.data.ubicacion);
  const updateUbicacion = useCotizadorStore((s) => s.updateUbicacion);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (window.google?.maps) {
      initGoogleMap();
      return;
    }

    const existing = document.getElementById('gg-google-maps-script');
    if (existing) return;

    window.__ggInitGoogleMaps = () => {
      readyRef.current = true;
      initGoogleMap();
    };

    const script = document.createElement('script');
    script.id = 'gg-google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=__ggInitGoogleMaps`;
    script.async = true;
    document.head.appendChild(script);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function initGoogleMap() {
    if (!mapDivRef.current || !window.google?.maps) return;

    const center =
      ubicacion.lat != null && ubicacion.lng != null
        ? { lat: ubicacion.lat, lng: ubicacion.lng }
        : DEFAULT_CENTER;

    const map = new window.google.maps.Map(mapDivRef.current, {
      center,
      zoom: 16,
      disableDefaultUI: true,
      zoomControl: true,
      styles: DARK_MAP_STYLE,
    });

    const marker = new window.google.maps.Marker({
      position: center,
      map,
      draggable: true,
    });

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (pos) updateUbicacion({ lat: pos.lat(), lng: pos.lng() });
    });

    (window as any).__ggMapMarker = marker;
    (window as any).__ggMapInstance = map;
  }

  // Mueve el pin si la dirección cambia desde el autocomplete.
  useEffect(() => {
    const marker = (window as any).__ggMapMarker;
    const map = (window as any).__ggMapInstance;
    if (marker && map && ubicacion.lat != null && ubicacion.lng != null) {
      const pos = { lat: ubicacion.lat, lng: ubicacion.lng };
      marker.setPosition(pos);
      map.panTo(pos);
    }
  }, [ubicacion.lat, ubicacion.lng]);

  return (
    <div className="relative h-36 w-full overflow-hidden rounded-xl border border-slate-200">
      <div ref={mapDivRef} className="h-full w-full" />
    </div>
  );
}

// ─── Mapa Leaflet (OpenStreetMap) ─────────────────────────────────────────────

/**
 * Mapa basado en Leaflet + CartoDB Dark Matter tiles.
 * Sin API key. Pin arrastrable con color ámbar de marca.
 */
function LeafletMap() {
  const ubicacion = useCotizadorStore((s) => s.data.ubicacion);
  const updateUbicacion = useCotizadorStore((s) => s.updateUbicacion);

  const containerRef = useRef<HTMLDivElement>(null);
  // Guardamos las instancias en refs para que no se re-creen en cada render.
  // Tipamos como `any` porque @types/leaflet se instala vía `npm install` en
  // el proyecto del usuario; en tiempo de compilación de tsc no es necesario.
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Inicializa el mapa la primera vez (importación dinámica para evitar SSR).
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((mod: any) => {
      const L = mod.default ?? mod;
      if (!containerRef.current || mapRef.current) return;

      const center: [number, number] =
        ubicacion.lat != null && ubicacion.lng != null
          ? [ubicacion.lat, ubicacion.lng]
          : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

      const map = L.map(containerRef.current, {
        center,
        zoom: 15,
        zoomControl: true,
        attributionControl: true,
      });

      // CartoDB Positron — coherente con la paleta clara del cotizador.
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20,
        },
      ).addTo(map);

      // Pin con color ámbar de marca GG Electrics.
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:32px;height:44px;filter:drop-shadow(0 3px 8px rgba(238,159,30,0.5))">
            <div style="
              width:32px;height:32px;
              background:#EE9F1E;
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              display:flex;align-items:center;justify-content:center;
            ">
              <div style="
                width:11px;height:11px;
                background:#050b14;
                border-radius:50%;
                transform:rotate(45deg);
              "></div>
            </div>
          </div>`,
        iconSize: [32, 44],
        iconAnchor: [16, 44],
        popupAnchor: [0, -44],
      });

      const marker = L.marker(center, { draggable: true, icon }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        updateUbicacion({ lat: pos.lat, lng: pos.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;
    });

    // Limpieza: destruye el mapa al desmontar el componente.
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mueve el pin y centra el mapa cuando la dirección cambia vía autocomplete.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (ubicacion.lat != null && ubicacion.lng != null) {
      const latlng: [number, number] = [ubicacion.lat, ubicacion.lng];
      markerRef.current.setLatLng(latlng);
      mapRef.current.setView(latlng, 16, { animate: true });
    }
  }, [ubicacion.lat, ubicacion.lng]);

  return (
    <div className="relative h-36 w-full overflow-hidden rounded-xl border border-slate-200">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

// ─── Estilo oscuro para Google Maps ──────────────────────────────────────────

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0e2238' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#050b14' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9fb4c8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#15324e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a578f' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0e2238' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#1e4566' }],
  },
];
