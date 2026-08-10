import { Body, Controller, Get, NotFoundException, Param, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators';

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB cap (Vercel body limit)

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly prisma: PrismaService) {}

  /** Public read endpoint so Image <source> works without auth. */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Fetch an uploaded media asset (public, cache-friendly)' })
  async get(@Param('id') id: string, @Res() res: Response) {
    const upload = await this.prisma.upload.findUnique({ where: { id } });
    if (!upload) throw new NotFoundException('Upload not found');
    res.setHeader('Content-Type', upload.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(upload.bytes));
  }
}

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Upload an image (base64) — serverless-friendly' })
  async create(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: { mime?: string; base64?: string; kind?: string; width?: number; height?: number },
  ) {
    const userId = (req as any).user?.userId as string | undefined;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const mime = body.mime ?? 'image/jpeg';
    if (!mime.startsWith('image/')) {
      res.status(400).json({ message: 'Only image/* uploads are accepted' });
      return;
    }
    if (!body.base64) {
      res.status(400).json({ message: 'Missing base64 payload' });
      return;
    }
    const cleanBase64 = body.base64.replace(/^data:[^;]+;base64,/, '');
    const bytes = Buffer.from(cleanBase64, 'base64');
    if (!bytes.length) {
      res.status(400).json({ message: 'Empty payload' });
      return;
    }
    if (bytes.length > MAX_BYTES) {
      res.status(413).json({ message: `Image too large (max ${MAX_BYTES / 1024 / 1024} MB)` });
      return;
    }
    const created = await this.prisma.upload.create({
      data: {
        ownerId: userId,
        kind: body.kind ?? 'PHOTO',
        mime,
        bytes,
        url: '', // filled below
        width: body.width,
        height: body.height,
      },
    });
    const url = `${this.publicBase(req)}/media/${created.id}`;
    await this.prisma.upload.update({ where: { id: created.id }, data: { url } });
    res.json({ id: created.id, url, mime, bytes: bytes.length });
  }

  private publicBase(req: Request) {
    const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
    const host = req.headers['x-forwarded-host'] ?? req.headers.host;
    return `${proto}://${host}`;
  }
}
