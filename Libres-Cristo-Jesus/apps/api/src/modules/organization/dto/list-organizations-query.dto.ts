import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * `GET /organizations` query params: the generic `PaginationQueryDto`
 * (page/pageSize/sort/order/search) — `search` matches against `Church.name`.
 * No extra domain-specific filter today (only one `Church` row exists), kept as
 * its own class so a future filter (e.g. by `status`) doesn't touch the
 * controller/service signatures.
 */
export class ListOrganizationsQueryDto extends PaginationQueryDto {}
