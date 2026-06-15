import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CacheEntry = { expiresAt: number; value: unknown };

@Injectable()
export class UbicacionService {
  private readonly cache = new Map<string, CacheEntry>();
  private nextRequestAt = 0;
  private queue = Promise.resolve();

  constructor(private readonly config: ConfigService) {}

  async geocodificar(departamento: string, provincia: string, distrito: string) {
    const partes = [distrito, provincia, departamento, 'Perú'].map((value) => value.trim());
    if (partes.some((value) => value.length < 2)) {
      throw new BadRequestException('Completa departamento, provincia y distrito');
    }

    const key = `search:${partes.join('|').toLowerCase()}`;
    const cached = this.getCached<any>(key);
    if (cached) return cached;

    const params = new URLSearchParams({
      q: partes.join(', '),
      format: 'jsonv2',
      addressdetails: '1',
      limit: '1',
      countrycodes: 'pe',
    });
    const results = await this.request<any[]>(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    );
    const result = results[0];
    if (!result) throw new NotFoundException('No se pudo ubicar el distrito en el mapa');

    const value = {
      latitud: Number(result.lat),
      longitud: Number(result.lon),
      nombre: result.display_name,
      limites: Array.isArray(result.boundingbox)
        ? result.boundingbox.map(Number)
        : null,
    };
    this.setCached(key, value);
    return value;
  }

  async direccion(latitud: number, longitud: number) {
    if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
      throw new BadRequestException('Latitud inválida');
    }
    if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
      throw new BadRequestException('Longitud inválida');
    }

    const key = `reverse:${latitud.toFixed(5)}:${longitud.toFixed(5)}`;
    const cached = this.getCached<any>(key);
    if (cached) return cached;

    const params = new URLSearchParams({
      lat: String(latitud),
      lon: String(longitud),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
    });
    const result = await this.request<any>(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    );
    const address = result.address ?? {};
    const via = address.road ?? address.pedestrian ?? address.footway ?? address.path;
    const numero = address.house_number;
    const referencia = [via && [via, numero].filter(Boolean).join(' '), address.neighbourhood ?? address.suburb]
      .filter(Boolean)
      .join(', ') || result.display_name;

    const value = {
      latitud,
      longitud,
      referencia,
      direccionCompleta: result.display_name ?? referencia,
      departamento: address.state ?? address.region ?? null,
      provincia: address.city ?? address.province ?? address.county ?? null,
      distrito: address.city_district ?? address.town ?? address.suburb ?? null,
    };
    this.setCached(key, value);
    return value;
  }

  private async request<T>(url: string): Promise<T> {
    const task = this.queue.then(async () => {
      const wait = Math.max(0, this.nextRequestAt - Date.now());
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      this.nextRequestAt = Date.now() + 1100;

      const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://denunciape.gob.pe';
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'es-PE,es;q=0.9',
          'User-Agent': `DenunciaPE-MVP/1.0 (${frontendUrl})`,
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        throw new BadGatewayException('El servicio de ubicación no está disponible');
      }
      return response.json() as Promise<T>;
    });
    this.queue = task.then(() => undefined, () => undefined);
    try {
      return await task;
    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadGatewayException('No se pudo consultar el servicio de ubicación');
    }
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private setCached(key: string, value: unknown) {
    if (this.cache.size >= 500) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
  }
}
