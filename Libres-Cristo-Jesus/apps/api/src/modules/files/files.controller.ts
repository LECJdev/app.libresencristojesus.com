import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { StorageService } from '../../common/storage/storage.service';
import {
  UPLOADABLE_CATEGORIES,
  UploadFileDto,
  UploadedFileResponseDto,
} from './dto/upload-file.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';

/**
 * Upload and download for every stored file (doc04 §15: the database keeps
 * the path, never the binary).
 *
 * WHY UPLOAD IS SEPARATE FROM THE ENTITY THAT USES THE FILE
 * A Casa de Paz photo, a church logo and a leadership portrait all follow
 * the same two-step flow: upload here, receive a `path`, then save that
 * path on the entity through its own endpoint. The alternative —
 * multipart on every entity's PATCH — would spread file handling across
 * six controllers and make every one of them re-implement size and MIME
 * checks.
 *
 * This controller holds no storage logic of its own: it delegates entirely
 * to `StorageService`, which is the only component allowed to touch a
 * provider.
 */
@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly storageService: StorageService) {}

  @RequirePermission('file', 'create')
  @Audit('File', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @Post('upload')
  // `memoryStorage` (multer's default here) keeps the bytes in a Buffer
  // instead of writing a temp file, so `StorageService` owns the only
  // write that happens — and a rejected upload leaves nothing on disk.
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'category'],
      properties: {
        file: { type: 'string', format: 'binary' },
        category: { type: 'string', enum: [...UPLOADABLE_CATEGORIES] },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a file and receive the path to persist on an entity.' })
  @ApiResponse({ status: 201, description: 'File stored.', type: UploadedFileResponseDto })
  @ApiResponse({ status: 400, description: 'Missing file, disallowed type, or size exceeded.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFileDto,
  ): Promise<UploadedFileResponseDto> {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo en el campo "file".');
    }

    // The MIME type comes from the client and is therefore a claim, not a
    // fact — `StorageService` still checks it against the category's
    // allowlist, which is what actually constrains what gets stored.
    return this.storageService.upload({
      category: dto.category,
      fileName: file.originalname,
      mimeType: file.mimetype,
      content: file.buffer,
    });
  }

  @RequirePermission('file', 'read')
  @Get('*path')
  @ApiOperation({ summary: 'Download a stored file by its path.' })
  @ApiResponse({ status: 200, description: 'File contents.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'File not found.' })
  async download(@Param('path') path: string[] | string, @Res() response: Response): Promise<void> {
    // Nest gives wildcard segments as an array; the stored path is the
    // slash-joined form.
    const storedPath = Array.isArray(path) ? path.join('/') : path;
    const content = await this.storageService.download(storedPath);

    // `nosniff` matters here specifically: these bytes were uploaded by a
    // user and are served from our own origin, so letting a browser guess
    // the type is how an "image" becomes a script.
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', 'inline');
    response.send(content);
  }
}
