import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

interface MapSelectorProps {
  departamento: string;
  provincia: string;
  distrito: string;
  onLocationSelect: (lat: number, lng: number, referencia?: string) => void;
  initialLat?: number;
  initialLng?: number;
}

type GeocodeResult = {
  latitud: number;
  longitud: number;
  nombre: string;
  limites: number[] | null;
};

type ReverseResult = {
  referencia: string;
  direccionCompleta: string;
};

declare global {
  interface Window {
    L: any;
  }
}

export function MapSelector({
  departamento,
  provincia,
  distrito,
  onLocationSelect,
  initialLat,
  initialLng,
}: MapSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const selectedRef = useRef<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null,
  );
  const areaKey = `${departamento}|${provincia}|${distrito}`;
  const previousAreaKey = useRef(areaKey);
  const [isLoaded, setIsLoaded] = useState(Boolean(window.L));
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(selectedRef.current);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    if (window.L) {
      setIsLoaded(true);
      return;
    }

    if (!document.getElementById('leaflet-denunciape-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-denunciape-css';
      link.rel = 'stylesheet';
      link.href = '/maps/tiles/leaflet.css';
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById('leaflet-denunciape-js') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'leaflet-denunciape-js';
    script.src = '/maps/tiles/leaflet-src.js';
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError('No se pudo cargar el mapa');
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapContainer.current || mapInstance.current) return;

    const L = window.L;
    const map = L.map(mapContainer.current, {
      center: [-9.19, -75.01],
      zoom: 5,
    });
    mapInstance.current = map;

    const localTiles = L.tileLayer('/maps/tiles/{z}/{x}/{y}.png', {
      minZoom: 0,
      maxZoom: 14,
      attribution: 'Mapa local · © OpenStreetMap contributors',
    });
    const onlineTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 0,
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    });
    let fallbackApplied = false;
    localTiles.on('tileerror', () => {
      if (fallbackApplied) return;
      fallbackApplied = true;
      localTiles.remove();
      onlineTiles.addTo(map);
    });
    localTiles.addTo(map);

    const placeMarker = (lat: number, lng: number, title: string) => {
      if (markerInstance.current) map.removeLayer(markerInstance.current);
      markerInstance.current = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(
          `<div style="font-size:12px"><strong>${title}</strong><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}</div>`,
        )
        .openPopup();
    };

    if (selectedRef.current) {
      const { lat, lng } = selectedRef.current;
      placeMarker(lat, lng, 'Ubicación seleccionada');
      map.setView([lat, lng], 16);
    }

    map.on('click', async (event: any) => {
      const lat = Number(event.latlng.lat);
      const lng = Number(event.latlng.lng);
      selectedRef.current = { lat, lng };
      setSelected({ lat, lng });
      placeMarker(lat, lng, 'Ubicación seleccionada');
      map.setView([lat, lng], Math.max(map.getZoom(), 16));
      setStatus('Buscando la dirección del punto seleccionado...');
      setError(null);

      try {
        const params = new URLSearchParams({
          latitud: String(lat),
          longitud: String(lng),
        });
        const result = await api.get<ReverseResult>(`/ubicacion/direccion?${params.toString()}`);
        const referencia = result.referencia.slice(0, 200);
        onLocationSelectRef.current(lat, lng, referencia);
        setStatus(`Referencia sugerida: ${referencia}`);
      } catch {
        onLocationSelectRef.current(lat, lng);
        setStatus('Coordenadas guardadas. Escribe una referencia manual para este punto.');
      }
    });

    setError(null);
    return () => {
      map.remove();
      mapInstance.current = null;
      markerInstance.current = null;
    };
  }, [isLoaded]);

  useEffect(() => {
    if (previousAreaKey.current === areaKey) return;
    previousAreaKey.current = areaKey;
    selectedRef.current = null;
    setSelected(null);
    if (mapInstance.current && markerInstance.current) {
      mapInstance.current.removeLayer(markerInstance.current);
      markerInstance.current = null;
    }
  }, [areaKey]);

  useEffect(() => {
    if (
      initialLat == null ||
      initialLng == null ||
      !mapInstance.current
    ) return;
    selectedRef.current = { lat: initialLat, lng: initialLng };
    setSelected({ lat: initialLat, lng: initialLng });
    const L = window.L;
    if (markerInstance.current) mapInstance.current.removeLayer(markerInstance.current);
    markerInstance.current = L.marker([initialLat, initialLng])
      .addTo(mapInstance.current)
      .bindPopup('Ubicación seleccionada');
    mapInstance.current.setView([initialLat, initialLng], 16);
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (!mapInstance.current || !departamento || !provincia || !distrito) return;
    if (selectedRef.current) return;

    let cancelled = false;
    setStatus(`Ubicando ${distrito} en el mapa...`);
    setError(null);
    const params = new URLSearchParams({ departamento, provincia, distrito });
    api.get<GeocodeResult>(`/ubicacion/geocodificar?${params.toString()}`)
      .then((result) => {
        if (cancelled || !mapInstance.current) return;
        if (result.limites?.length === 4) {
          const [sur, norte, oeste, este] = result.limites;
          mapInstance.current.fitBounds([[sur, oeste], [norte, este]], { padding: [20, 20] });
        } else {
          mapInstance.current.setView([result.latitud, result.longitud], 14);
        }
        setStatus(`Mapa centrado en ${distrito}. Selecciona el punto exacto.`);
      })
      .catch((requestError: any) => {
        if (cancelled) return;
        setError(requestError.message || 'No se pudo ubicar el distrito automáticamente');
        setStatus('Puedes mover el mapa y seleccionar el punto manualmente.');
      });
    return () => {
      cancelled = true;
    };
  }, [departamento, provincia, distrito, isLoaded]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-slate-700">Ubicación exacta en el mapa</label>
        {status && <span className="text-right text-xs text-slate-500">{status}</span>}
      </div>
      {error && (
        <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
          {error}
        </div>
      )}
      <div
        ref={mapContainer}
        className="h-80 w-full rounded-xl border border-slate-300 bg-slate-100 shadow-sm"
        style={{ minHeight: '320px', position: 'relative' }}
      >
        {!isLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
            Cargando mapa...
          </div>
        )}
      </div>
      {selected && (
        <div className="rounded-xl bg-brand-50 p-3 text-sm">
          <p className="font-semibold text-brand-700">Punto seleccionado</p>
          <p className="mt-1 text-slate-600">
            <span className="font-mono text-slate-800">{selected.lat.toFixed(6)}</span> (Lat) ·{' '}
            <span className="font-mono text-slate-800">{selected.lng.toFixed(6)}</span> (Lng)
          </p>
        </div>
      )}
      <p className="text-xs leading-relaxed text-slate-500">
        El mapa se centra al completar departamento, provincia y distrito. Haz clic en el punto exacto del hecho para guardar las coordenadas y sugerir una referencia.
      </p>
    </div>
  );
}
