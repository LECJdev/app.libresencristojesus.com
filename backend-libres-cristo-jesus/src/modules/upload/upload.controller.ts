import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      // Usamos memory storage para no guardar nada en el disco del servidor
      limits: { fileSize: 25 * 1024 * 1024 }, // Aumentamos a 25 MB para soportar videos cortos/docs
      fileFilter: (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        // Permitimos imágenes, videos y documentos comunes
        if (
          !file.mimetype.match(
            /\/(jpg|jpeg|png|gif|webp|mp4|mpeg|quicktime|pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document)$/,
          )
        ) {
          cb(
            new BadRequestException(
              'Tipo de archivo no soportado. Se permiten imágenes, videos (mp4) y documentos (pdf, docx)',
            ),
            false,
          );
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    try {
      const result = await this.uploadService.uploadFile(file);
      return {
        url: result.secure_url,
        originalName: file.originalname,
        size: file.size,
        format: result.format,
        resource_type: result.resource_type,
      };
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new BadRequestException('Error al subir el archivo a Cloudinary');
    }
  }
}
