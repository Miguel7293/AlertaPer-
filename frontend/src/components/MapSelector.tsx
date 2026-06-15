import { useEffect, useRef, useState } from 'react';

interface MapSelectorProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

declare global {
  interface Window {
    L: any;
  }
}

export function MapSelector({ onLocationSelect, initialLat, initialLng }: MapSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLat, setSelectedLat] = useState<number | null>(initialLat || null);
  const [selectedLng, setSelectedLng] = useState<number | null>(initialLng || null);

  // Cargar Leaflet CSS y JS desde public
  useEffect(() => {
    if (window.L) {
      setIsLoaded(true);
      return;
    }

    // Cargar CSS primero
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/maps/tiles/leaflet.css';
    link.onload = () => console.log('Leaflet CSS cargado');
    link.onerror = () => {
      console.error('Error al cargar Leaflet CSS');
      setError('Error cargando estilos del mapa');
    };
    document.head.appendChild(link);

    // Cargar JS
    const script = document.createElement('script');
    script.src = '/maps/tiles/leaflet-src.js';
    script.async = true;
    script.onload = () => {
      console.log('Leaflet JS cargado, window.L:', typeof window.L);
      setIsLoaded(true);
    };
    script.onerror = () => {
      console.error('Error al cargar Leaflet JS');
      setError('Error cargando biblioteca de mapa');
    };
    document.body.appendChild(script);
  }, []);

  // Inicializar mapa una vez que Leaflet esté cargado
  useEffect(() => {
    if (!isLoaded || !mapContainer.current || mapInstance.current) return;

    try {
      const L = window.L;
      if (!L || !L.map) {
        setError('Leaflet no se cargó correctamente');
        return;
      }

      console.log('Inicializando mapa...');

      // Centro de Perú
      const peruCenter = [-9.19, -75.01];
      const zoom = 5;

      // Crear mapa
      mapInstance.current = L.map(mapContainer.current, {
        center: peruCenter,
        zoom: zoom,
      });

      console.log('Mapa creado:', mapInstance.current);

      // Intentar cargar tiles locales primero, fallback a OSM si no funcionan
      const tileUrl = '/maps/tiles/{z}/{x}/{y}.png';
      console.log('Intentando cargar tiles desde:', tileUrl);

      // Crear layer de tiles locales
      const localTiles = L.tileLayer(tileUrl, {
        minZoom: 0,
        maxZoom: 14,
        tms: false,
        attribution: 'Mapa local',
      });

      // Crear layer de fallback (OSM)
      const fallbackTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      });

      // Usar tiles locales si están disponibles, si no usar OSM
      let tilesLoaded = false;
      localTiles.on('tileerror', () => {
        console.warn('No se pueden cargar tiles locales, usando OSM en línea');
        if (!tilesLoaded) {
          localTiles.remove();
          fallbackTiles.addTo(mapInstance.current);
          tilesLoaded = true;
        }
      });

      localTiles.on('tileload', () => {
        console.log('Tile local cargado correctamente');
        tilesLoaded = true;
      });

      localTiles.addTo(mapInstance.current);

      // Agregar marcador inicial si existe
      if (selectedLat !== null && selectedLng !== null) {
        markerInstance.current = L.marker([selectedLat, selectedLng])
          .addTo(mapInstance.current)
          .bindPopup(`<div style="font-size: 12px"><strong>Ubicación</strong><br/>${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}</div>`)
          .openPopup();
        // Centrar mapa en el marcador
        mapInstance.current.setView([selectedLat, selectedLng], 13);
      }

      // Click en mapa para seleccionar ubicación
      mapInstance.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        console.log('Click en mapa:', lat, lng);

        // Remover marcador anterior
        if (markerInstance.current) {
          mapInstance.current.removeLayer(markerInstance.current);
        }

        // Crear nuevo marcador
        markerInstance.current = L.marker([lat, lng])
          .addTo(mapInstance.current)
          .bindPopup(`<div style="font-size: 12px"><strong>Ubicación seleccionada</strong><br/>${lat.toFixed(4)}, ${lng.toFixed(4)}</div>`)
          .openPopup();

        // Centrar mapa en la nueva ubicación con zoom más cercano
        mapInstance.current.setView([lat, lng], 13);

        setSelectedLat(lat);
        setSelectedLng(lng);
        onLocationSelect(lat, lng);
      });

      setError(null);
    } catch (err: any) {
      console.error('Error inicializando mapa:', err);
      setError(`Error: ${err.message}`);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [isLoaded, selectedLat, selectedLng, onLocationSelect]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">Ubicación en mapa</label>
      {error && (
        <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div
        ref={mapContainer}
        className="h-80 w-full rounded-xl border border-slate-300 bg-indigo-50 shadow-sm"
        style={{
          minHeight: '320px',
          position: 'relative',
        }}
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-100/80 text-sm text-slate-500">
            Cargando mapa...
          </div>
        )}
      </div>
      {selectedLat !== null && selectedLng !== null && (
        <div className="rounded-xl bg-brand-50 p-3 text-sm">
          <p className="font-semibold text-brand-700">Ubicación seleccionada:</p>
          <p className="mt-1 text-slate-600">
            <span className="font-mono text-slate-800">{selectedLat.toFixed(6)}</span>
            {' '}(Lat) · {' '}
            <span className="font-mono text-slate-800">{selectedLng.toFixed(6)}</span>
            {' '}(Lng)
          </p>
        </div>
      )}
      <p className="text-xs leading-relaxed text-slate-500">
        Haz clic en el mapa para seleccionar la ubicación exacta del hecho. Se guardará la latitud y longitud.
      </p>
    </div>
  );
}
