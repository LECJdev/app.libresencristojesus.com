import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { RoleName, type PaginationMeta } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import { countReport, runReport, type ReportCellValue } from './report-definitions';
import type { ReportPreviewDto, ReportQueryDto, ReportType } from './dto/report.dto';

/**
 * Hard ceiling on an export, so one filter cannot try to stream years of
 * national attendance into a single sheet and exhaust the server's memory.
 * Excel itself stops at 1.048.576 rows; this stops long before that, at a
 * size a human can actually open.
 */
const MAX_EXPORT_ROWS = 50_000;

/** Brand colours (doc18 §28 / official identity guide) for the header row. */
const HEADER_FILL = 'FF0B3D6D'; // Azul Profundo — "Primario"
const HEADER_FONT = 'FFFFFFFF';

/**
 * Reportes consolidados y su exportación (doc05: "Exportar Excel" ✅✅✅✅).
 *
 * BOTH SURFACES READ THE SAME DEFINITION. `runReport` owns the columns and
 * the query; this service only decides how to render them — as JSON for the
 * screen, or as a worksheet for the download. Neither renderer knows what
 * columns a report has until it asks, which is why adding one cannot leave
 * the spreadsheet behind.
 *
 * SCOPE IS NOT OPTIONAL HERE. An export is the single most dangerous read
 * in the product: it produces a file that leaves the system and is forwarded
 * by e-mail. Every definition starts from `peaceHouseScopeFilter`, so a
 * Líder downloading "Ofrendas" gets their own Casa de Paz and nothing else.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(
    type: ReportType,
    query: ReportQueryDto,
    actor: JwtPayload,
  ): Promise<{ data: ReportPreviewDto; meta: PaginationMeta }> {
    const context = {
      prisma: this.prisma,
      query,
      actor,
      take: query.pageSize,
      skip: (query.page - 1) * query.pageSize,
    };

    const [report, total] = await Promise.all([
      runReport(type, context),
      countReport(type, context),
    ]);

    return {
      data: {
        type,
        title: report.title,
        columns: report.columns.map(({ key, header, format }) => ({ key, header, format })),
        rows: report.rows,
        scopeLabel: scopeLabelFor(actor.role),
      },
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  /**
   * The same report as a `.xlsx` buffer.
   *
   * UNPAGINATED BY DESIGN — an export of "page 1 of 47" is not a report,
   * it is a screenshot. `MAX_EXPORT_ROWS` is what keeps that from becoming
   * unbounded.
   */
  async export(
    type: ReportType,
    query: ReportQueryDto,
    actor: JwtPayload,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const report = await runReport(type, {
      prisma: this.prisma,
      query,
      actor,
      take: MAX_EXPORT_ROWS,
    });

    const workbook = new Workbook();
    workbook.creator = 'LCJ Connect';
    workbook.created = new Date();

    // Excel rejects / * ? : [ ] in a sheet name and caps it at 31 chars —
    // a title like "Asistencia por reunión" is fine, but the sanitising has
    // to exist or a future report title silently corrupts the file.
    const sheet = workbook.addWorksheet(sanitizeSheetName(report.title));

    sheet.columns = report.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: HEADER_FONT } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    headerRow.alignment = { vertical: 'middle' };
    headerRow.height = 20;

    for (const row of report.rows) {
      sheet.addRow(row);
    }

    // Applied after the rows exist, so the formats cover them all.
    report.columns.forEach((column, index) => {
      const sheetColumn = sheet.getColumn(index + 1);
      if (column.format === 'currency') {
        // Colombian grouping with no decimals: offerings are whole pesos.
        sheetColumn.numFmt = '#,##0';
        sheetColumn.alignment = { horizontal: 'right' };
      } else if (column.format === 'number') {
        sheetColumn.alignment = { horizontal: 'right' };
      }
    });

    // Freezing the header is the difference between a usable sheet and one
    // where row 900 is a row of anonymous numbers.
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: report.columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      filename: buildFilename(report.title),
    };
  }
}

/**
 * Excel forbids `\ / ? * [ ] :` in a sheet name and truncates past 31
 * characters — it does not warn, it produces a file that will not open.
 */
function sanitizeSheetName(title: string): string {
  return title.replace(/[\\/?*[\]:]/g, '-').slice(0, 31);
}

/**
 * `asistencia-por-reunion-2026-07-29.xlsx` — dated, because a folder full
 * of files all called "reporte.xlsx" is how the wrong month gets sent.
 */
function buildFilename(title: string): string {
  const slug = title
    .normalize('NFD')
    // Strips the diacritic marks NFD just separated, so "reunión" becomes
    // "reunion" instead of losing the character entirely.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`;
}

function scopeLabelFor(role: RoleName): string {
  switch (role) {
    case RoleName.ADMIN:
    case RoleName.GENERAL_PASTOR:
      return 'Nacional';
    case RoleName.DISTRICT_PASTOR:
      return 'Su distrito';
    default:
      return 'Su Casa de Paz';
  }
}

export type { ReportCellValue };
