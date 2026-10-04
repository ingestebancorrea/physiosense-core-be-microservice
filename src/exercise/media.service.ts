import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { writeFile } from 'fs/promises';
import { ErrorMessages } from 'src/common/enum/error-messages.enum';

const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const DEFAULT_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
const DEFAULT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Guarda los archivos de los ejercicios en disco y devuelve una URL.
 *
 * La app espera `{ url, duration? }` en la respuesta de
 * `POST /exercises/media/{video,image}` (ver `UploadedMedia` en
 * exerciseService.ts). Los límites de tamaño salen de MEDIA_LIMITS del
 * cliente: 100 MB para video, 5 MB para imagen.
 *
 * En producción conviene montar un volumen o delegar en un bucket (S3 /
 * Supabase Storage) y dejar la URL apuntando ahí: el resto de la API no
 * depende de dónde se guarde el archivo.
 */
@Injectable()
export class MediaService {
  constructor(private readonly configService: ConfigService) {}

  async storeVideo(file?: Express.Multer.File, duration?: number) {
    const maxBytes = Number(
      this.configService.get<string>('MEDIA_VIDEO_MAX_BYTES') || DEFAULT_VIDEO_MAX_BYTES,
    );

    return this.store(file, VIDEO_MIME_TYPES, maxBytes, 'videos', duration);
  }

  async storeCoverImage(file?: Express.Multer.File) {
    const maxBytes = Number(
      this.configService.get<string>('MEDIA_IMAGE_MAX_BYTES') || DEFAULT_IMAGE_MAX_BYTES,
    );

    return this.store(file, IMAGE_MIME_TYPES, maxBytes, 'images');
  }

  private async store(
    file: Express.Multer.File,
    allowedMimeTypes: string[],
    maxBytes: number,
    folder: string,
    duration?: number,
  ) {
    if (!file) {
      throw new BadRequestException(ErrorMessages.MEDIA_UNSUPPORTED);
    }

    if (file.size > maxBytes) {
      throw new PayloadTooLargeException(ErrorMessages.MEDIA_TOO_LARGE);
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(ErrorMessages.MEDIA_UNSUPPORTED);
    }

    const basePath = this.configService.get<string>('MEDIA_STORAGE_PATH') || './storage/media';
    const targetDir = join(basePath, folder);

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // El nombre lo genera el servidor: el que manda el cliente nunca decide
    // la ruta final.
    const filename = `${Date.now()}-${randomBytes(8).toString('hex')}${extname(
      file.originalname ?? '',
    )}`;

    await writeFile(join(targetDir, filename), file.buffer);

    const baseUrl = this.configService.get<string>('MEDIA_PUBLIC_URL') ?? '/media';

    return {
      url: `${baseUrl}/${folder}/${filename}`,
      ...(duration !== undefined ? { duration } : {}),
    };
  }
}