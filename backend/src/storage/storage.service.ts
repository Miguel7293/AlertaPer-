import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';

// Sube evidencias (fotos/videos) a un bucket de Supabase Storage usando la
// service_role key (server-side). Guarda la URL pública en la base de datos.
@Injectable()
export class StorageService {
  private client: SupabaseClient | null = null;
  private readonly bucket = process.env.SUPABASE_BUCKET || 'evidencias';
  private readonly logger = new Logger('Storage');

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.client = createClient(url, key, { auth: { persistSession: false } });
    } else {
      this.logger.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configurados: la subida de evidencias está deshabilitada.');
    }
  }

  get habilitado() {
    return !!this.client;
  }

  async subir(denunciaId: string, file: { buffer: Buffer; mimetype: string; originalname: string }) {
    if (!this.client) throw new InternalServerErrorException('El almacenamiento de evidencias no está configurado');
    const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
    const path = `denuncias/${denunciaId}/${uuid()}.${ext}`;
    const { error } = await this.client.storage.from(this.bucket).upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (error) {
      this.logger.error(`Error al subir evidencia: ${error.message}`);
      throw new InternalServerErrorException('No se pudo subir el archivo');
    }
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return { path, url: data.publicUrl };
  }

  async eliminarPorUrl(urlArchivo: string) {
    if (!this.client) return;
    const marker = '/object/public/';
    const idx = urlArchivo.indexOf(marker);
    if (idx < 0) return;
    const bucketYPath = urlArchivo.slice(idx + marker.length); // bucket/denuncias/...
    const path = bucketYPath.split('/').slice(1).join('/');
    if (path) await this.client.storage.from(this.bucket).remove([path]);
  }
}
