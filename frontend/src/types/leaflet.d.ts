// Declaración de tipos para Leaflet cargado desde /public/maps/tiles/leaflet-src.js

declare global {
  interface Window {
    L: {
      map(element: string | HTMLElement): L.Map;
      tileLayer(urlTemplate: string, options?: L.TileLayerOptions): L.TileLayer;
      marker(latlng: L.LatLngExpression, options?: L.MarkerOptions): L.Marker;
      [key: string]: any;
    };
  }
}

namespace L {
  interface Map {
    setView(center: LatLngExpression, zoom: number): Map;
    addTo(map: Map): Layer;
    remove(): void;
    on(type: string, fn: (e: any) => void): Map;
  }

  interface TileLayer extends Layer {
    addTo(map: Map): TileLayer;
  }

  interface Marker extends Layer {
    addTo(map: Map): Marker;
    bindPopup(content: string | HTMLElement): Marker;
    openPopup(): Marker;
  }

  interface Layer {
    addTo(map: Map): Layer;
    remove?(): void;
  }

  interface TileLayerOptions {
    minZoom?: number;
    maxZoom?: number;
    tms?: boolean;
    attribution?: string;
  }

  interface MarkerOptions {
    [key: string]: any;
  }

  type LatLngExpression = [number, number] | { lat: number; lng: number } | LatLng;

  interface LatLng {
    lat: number;
    lng: number;
  }
}

export {};
