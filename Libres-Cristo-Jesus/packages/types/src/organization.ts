import type { LeadershipUnitStatus } from './auth';
import type { RoleName } from './role';

/**
 * Wire shapes of the Organización module, shared by `apps/api` and
 * `apps/web`.
 *
 * Mirrors of the Nest DTOs rather than re-exports of them, for the same
 * reason `auth.ts` gives: those classes carry `@nestjs/swagger` decorators
 * and `@prisma/client` types, neither of which `apps/web` may take on.
 * The mirror is deliberate duplication of a *contract*, not of logic —
 * and the API's own response DTO is what keeps it honest.
 */

/** `RecordStatus` in Prisma — structural records are a two-state toggle. */
export type RecordStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Fields every "tabla principal" carries (doc04 §13/§14).
 *
 * Dates are `string`, not `Date`: these describe the JSON actually
 * received over the wire. `JSON.parse` never revives a Date, so typing
 * them as `Date` would compile happily and then blow up the first time
 * anyone called `.toLocaleDateString()` on them.
 */
export interface AuditableRecord {
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  /** Optimistic locking counter — must be echoed back on update. */
  version: number;
}

/** `Church` — the single Iglesia (doc06 module 1). */
export interface Church extends AuditableRecord {
  id: string;
  name: string;
  /** Stored path/URL only — never the binary (doc04 §15). */
  logo: string | null;
  description: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: RecordStatus;
}

export interface UpdateChurchInput {
  name?: string;
  logo?: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  address?: string;
  phone?: string;
  email?: string;
  version: number;
}

/** `SystemSetting` — "Configuración general" (doc04 "Mejoras" §3). */
export interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  version: number;
}

export interface UpsertSettingInput {
  value: string;
  description?: string;
}

export interface District extends AuditableRecord {
  id: string;
  churchId: string;
  number: number;
  name: string;
  description: string | null;
  leadershipUnitId: string | null;
  status: RecordStatus;
}

export interface CreateDistrictInput {
  churchId: string;
  number: number;
  name: string;
  description?: string;
  leadershipUnitId?: string;
}

export interface UpdateDistrictInput {
  number?: number;
  name?: string;
  description?: string;
  leadershipUnitId?: string;
  version: number;
}

/** `CatDepartment` as `GET /geography/departments` returns it. */
export interface Department {
  id: string;
  name: string;
  /** Official DANE code, or null when the source did not publish one. */
  codeDane: string | null;
  status: RecordStatus;
}

/** `CatMunicipality` as `GET /geography/municipalities` returns it. */
export interface Municipality {
  id: string;
  departmentId: string;
  name: string;
  codeDane: string | null;
  status: RecordStatus;
}

export interface PeaceHouse extends AuditableRecord {
  id: string;
  districtId: string;
  leadershipUnitId: string;
  name: string;
  code: string | null;
  departmentId: string | null;
  municipalityId: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  meetingDay: string | null;
  /** 24h `HH:mm`. */
  meetingHour: string | null;
  status: RecordStatus;
}

export interface CreatePeaceHouseInput {
  districtId: string;
  leadershipUnitId: string;
  name: string;
  code?: string;
  departmentId?: string;
  municipalityId?: string;
  neighborhood?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  meetingDay?: string;
  meetingHour?: string;
}

export interface UpdatePeaceHouseInput extends Partial<Omit<CreatePeaceHouseInput, 'districtId'>> {
  districtId?: string;
  version: number;
}

/**
 * One period of a Casa de Paz's leadership (doc06 §10/§14). The open
 * period is the entry whose `endDate` is null.
 */
export interface LeadershipHistoryEntry {
  id: string;
  leadershipUnitId: string;
  members: { firstName: string; lastName: string; photo: string | null }[];
  startDate: string;
  endDate: string | null;
  reason: string | null;
  /** LeadershipUnit id of whoever recorded the change. */
  createdBy: string | null;
  createdAt: string;
}

/** `CatRole` as `GET /roles` returns it. */
export interface Role {
  id: string;
  /** Spanish label stored in `CatRole.name`, e.g. "Pastor Distrito". */
  name: string;
  /**
   * The English enum the API resolves from `name`. Prefer this over
   * `name` when matching a role in code: it is ASCII and stable, whereas
   * matching the Spanish label makes correctness depend on accents
   * surviving every hop between the database and the browser.
   */
  roleName: RoleName;
  description: string | null;
}

/**
 * A `LeadershipMember` as `GET /users` returns it — unlike
 * `AuthenticatedMember`, this DOES carry `username`/`mustChangePassword`:
 * this shape is for the admin "manage accounts" screen, not the
 * logged-in user's own profile.
 */
export interface LeadershipMemberAccount {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  birthDate: string | null;
  username: string;
  mustChangePassword: boolean;
}

/**
 * `LeadershipUnit` as `GET /users` returns it — the couple's shared
 * account (doc06 §3). Used to populate the "who leads this" selector on
 * the District and Casa de Paz forms.
 */
export interface LeadershipUnit extends AuditableRecord {
  id: string;
  type: string;
  photo: string | null;
  roleId: string;
  role: RoleName;
  status: LeadershipUnitStatus;
  members: LeadershipMemberAccount[];
}

/** One member of a couple, as `POST`/`PATCH /users` accepts it. */
export interface LeadershipMemberInput {
  /** Present = update that row. Absent = create. Omitted from the array = soft-delete. */
  id?: string;
  firstName: string;
  lastName: string;
  gender: string;
  phone?: string;
  email?: string;
  /** Stored PATH returned by `POST /files/upload`, never a URL. */
  photo?: string;
  birthDate?: string;
  /**
   * Required when `id` is absent (new member), optional to rename when
   * `id` is present. The API enforces the exact rule — this shared type
   * only needs to permit sending it.
   */
  username?: string;
  /**
   * Required when `id` is absent (new member); must be omitted when `id`
   * is present — an existing member's password changes through the
   * separate `PATCH /users/:id/password` endpoint instead.
   */
  password?: string;
}

export interface CreateLeadershipUnitInput {
  type: string;
  roleId: string;
  members: LeadershipMemberInput[];
}

export interface UpdateLeadershipUnitInput {
  type?: string;
  roleId?: string;
  status?: LeadershipUnitStatus;
  members?: LeadershipMemberInput[];
  version: number;
}

export interface LeadershipMemberSummary {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
}

/**
 * A Leadership Unit as the organigrama shows it (doc06 §3): the couple
 * sharing the same scope, never a single person. Login credentials
 * (`username`) live per-member now, not on the unit — this shape carries
 * no `username` of its own for that reason.
 */
export interface LeadershipSummary {
  id: string;
  /** Spanish `CatRole.name`, e.g. "Pastor Distrito". */
  role: string;
  status: LeadershipUnitStatus;
  photo: string | null;
  members: LeadershipMemberSummary[];
}

export interface PeaceHouseNode {
  id: string;
  name: string;
  code: string | null;
  status: RecordStatus;
  departmentName: string | null;
  municipalityName: string | null;
  neighborhood: string | null;
  meetingDay: string | null;
  meetingHour: string | null;
  leadership: LeadershipSummary | null;
}

export interface DistrictNode {
  id: string;
  number: number;
  name: string;
  description: string | null;
  status: RecordStatus;
  leadership: LeadershipSummary | null;
  peaceHouseCount: number;
  peaceHouses: PeaceHouseNode[];
}

/** The four summary cards of doc06 §6. */
export interface OrganizationSummary {
  districts: number;
  peaceHouses: number;
  leaderships: number;
  municipalities: number;
}

/** One hit of the global search (doc06 §12). */
export interface SearchHit {
  id: string;
  title: string;
  subtitle: string | null;
  /** Frontend route, when the entity has a screen. */
  href: string | null;
}

export interface OrganizationSearchResult {
  districts: SearchHit[];
  peaceHouses: SearchHit[];
  leaderships: SearchHit[];
  municipalities: SearchHit[];
  departments: SearchHit[];
  total: number;
  scoped: boolean;
}

export interface OrganizationTree {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  status: RecordStatus;
  generalPastors: LeadershipSummary[];
  summary: OrganizationSummary;
  districts: DistrictNode[];
  /**
   * True when the API narrowed the tree to the caller's own scope (Pastor
   * de Distrito, Líder). The UI must say so — otherwise a pastor seeing a
   * single district would reasonably conclude the church has only one.
   */
  scoped: boolean;
}

/**
 * Full name of a Leadership Unit for display: the couple joined the way
 * Spanish reads them ("Jorge y Johanna"), or the role name when no member
 * has been registered yet.
 */
export function leadershipDisplayName(leadership: LeadershipSummary): string {
  if (leadership.members.length === 0) {
    return leadership.role;
  }
  return leadership.members
    .map((member) => `${member.firstName} ${member.lastName}`.trim())
    .join(' y ');
}

/** `CatPersonStage` — etapa del proceso pastoral (doc04 §3). */
export interface PersonStage {
  id: string;
  name: string;
  sortOrder: number;
}

/** `Person` as `GET /people` returns it (doc04 §5). */
export interface Person extends AuditableRecord {
  id: string;
  firstName: string;
  lastName: string;
  document: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  /** ISO date string — `JSON.parse` never revives a Date. */
  birthDate: string | null;
  address: string | null;
  /** Stored path returned by `POST /files/upload`, never a URL. */
  photo: string | null;
  notes: string | null;
  personStageId: string | null;
  personStageName: string | null;
  /**
   * The Casa de Paz whose membership period is still open. Null for someone
   * registered but not yet assigned.
   */
  currentPeaceHouseId: string | null;
  status: RecordStatus;
}

export interface CreatePersonInput {
  firstName: string;
  lastName: string;
  document?: string;
  gender?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  address?: string;
  photo?: string;
  notes?: string;
  personStageId?: string;
  peaceHouseId?: string;
}

export interface UpdatePersonInput extends CreatePersonInput {
  status?: RecordStatus;
  transferReason?: string;
  version: number;
}

/** One meeting of a person's Casa de Paz, exhaustive since they joined it. */
export interface PersonAttendanceRow {
  meetingDate: string;
  present: boolean;
}

/** A roster member's attendance rate — null while their Casa de Paz has no meetings yet. */
export interface PersonAttendanceRate {
  personId: string;
  rate: number | null;
}

/** One period of a person's membership in a Casa de Paz. */
export interface PersonHistoryEntry {
  id: string;
  peaceHouseId: string;
  peaceHouseName: string;
  startDate: string;
  endDate: string | null;
  reason: string | null;
  createdBy: string | null;
}

/**
 * Why an attendance sheet is (or is not) editable (doc11 RN-407/RN-503).
 *
 * `current-week`: the meeting belongs to the ISO week in progress.
 * `role-exempt`: the caller is not subject to the calendar (Administrador,
 *   Pastor de Distrito) — they are the ones who can reopen it.
 * `unlocked`: a past week with a reopening still in force.
 * `past-week`: closed, and no reopening.
 */
export type AttendanceLockReason = 'current-week' | 'role-exempt' | 'unlocked' | 'past-week';

export interface AttendanceLockState {
  editable: boolean;
  reason: AttendanceLockReason;
  /** Sunday 23:59:59.999 of the meeting's own ISO week. */
  editableUntil: string | null;
  /** Expiry of the reopening in force, when there is one. */
  unlockedUntil: string | null;
}

export interface ChecklistRow {
  personId: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  present: boolean;
  comments: string | null;
  personStageName: string | null;
}

/** The weekly attendance sheet of one Casa de Paz. */
export interface AttendanceChecklist {
  meetingId: string;
  peaceHouseId: string;
  meetingDate: string;
  /** ISO year — not the calendar year. */
  isoYear: number;
  isoWeek: number;
  status: string;
  lock: AttendanceLockState;
  rows: ChecklistRow[];
  presentCount: number;
}

/**
 * `SermonTheme` — catálogo global de temas de predicación (doc04 §6).
 *
 * Deliberately NOT `extends AuditableRecord`: unlike `Person` or `District`,
 * `SermonThemeResponseDto` does not expose `createdBy`/`updatedBy`. Claiming
 * them here would type as `string | null` two fields that are always
 * `undefined` over the wire.
 */
export interface SermonTheme {
  id: string;
  title: string;
  description: string | null;
  series: string | null;
  status: RecordStatus;
  /** Optimistic locking counter — must be echoed back on update. */
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSermonThemeInput {
  title: string;
  description?: string;
  series?: string;
}

export interface UpdateSermonThemeInput extends Partial<CreateSermonThemeInput> {
  status?: RecordStatus;
  /** Required: the catalog is shared, so two editors at once is realistic. */
  version: number;
}

/**
 * The offering of one meeting (doc02 RN-039..RN-042).
 *
 * Exactly one per meeting, which is why the write endpoint is a PUT and
 * this is a single object rather than a list.
 */
export interface MeetingOffering {
  id: string;
  meetingId: string;
  /** Value in COP. */
  amount: number;
  currency: string;
  notes: string | null;
  registeredBy: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** A photograph attached to a meeting (doc01 RF-025, doc02 RN-043/RN-044). */
export interface MeetingPhoto {
  id: string;
  /** Stored path returned by `POST /files/upload`, never a URL. */
  path: string;
  caption: string | null;
  sortOrder: number;
  /** Taken out of the gallery, never destroyed. */
  hidden: boolean;
  createdAt: string;
  version: number;
}

/** Everything the "Reunión" screen shows besides the attendance sheet. */
export interface MeetingReport {
  meetingId: string;
  peaceHouseId: string;
  peaceHouseName: string;
  meetingDate: string;
  /** ISO year — not the calendar year. */
  isoYear: number;
  isoWeek: number;
  status: string;
  themeId: string | null;
  themeTitle: string | null;
  themeSeries: string | null;
  preacher: string | null;
  notes: string | null;
  offering: MeetingOffering | null;
  photos: MeetingPhoto[];
  /** The SAME lock as the attendance sheet. One meeting, one rule. */
  lock: AttendanceLockState;
  presentCount: number;
  rosterCount: number;
}

/** Every field is optional: the report is filled in over the week. */
export interface UpdateMeetingReportInput {
  /** `null` unlinks the theme. */
  themeId?: string | null;
  preacher?: string;
  notes?: string;
}

export interface UpsertOfferingInput {
  /** Value in COP. Never negative (RN-041). */
  amount: number;
  notes?: string;
}

export interface AddMeetingPhotoInput {
  path: string;
  caption?: string;
  sortOrder?: number;
}

export interface UpdateMeetingPhotoInput {
  caption?: string;
  sortOrder?: number;
  hidden?: boolean;
}

/**
 * One dashboard indicator with its month-over-month comparison.
 *
 * `changePercent` is `null`, never a number, when the previous period was
 * zero: growing from nothing has no percentage, and "+100 %" would be an
 * invented figure. The screen says "sin comparativo" instead.
 */
export interface DashboardKpi {
  current: number;
  previous: number;
  changePercent: number | null;
}

/** `GET /dashboard/summary` — the four indicators of the panel. */
export interface DashboardSummary {
  attendees: DashboardKpi;
  offerings: DashboardKpi;
  activePeaceHouses: DashboardKpi;
  meetingsThisWeek: DashboardKpi;
  /** What the figures cover, given the role: "Nacional", "Su distrito"… */
  scopeLabel: string;
}

/** One month of both dashboard series. */
export interface DashboardTrendPoint {
  year: number;
  /** 1-12. */
  month: number;
  /** Short Spanish label for the axis, e.g. "Mar". */
  label: string;
  attendance: number;
  /** COP. */
  offerings: number;
}

/**
 * `GET /dashboard/trends`
 *
 * Both series in one payload, over exactly the same months — two requests
 * could return different windows and put two charts side by side that
 * disagree about what "Marzo" means.
 */
export interface DashboardTrends {
  months: DashboardTrendPoint[];
}

/** A Casa de Paz as the map plots it. */
export interface MapPoint {
  id: string;
  label: string;
  subLabel: string | null;
  /** People in the roster. The cluster badge counts MARKERS, not this. */
  count: number;
  latitude: number;
  longitude: number;
  /**
   * True when the point is the municipality's centroid rather than the
   * house's own pin. Screens must distinguish the two: promising precision
   * that does not exist is worse than admitting the approximation.
   */
  approximate: boolean;
}

/** `GET /dashboard/map` */
export interface MapStats {
  points: MapPoint[];
  /** Houses in scope with no pin and an ungeocoded municipality. */
  unlocated: number;
}

/** The consolidated reports of doc11, and what `GET /reports/:type` accepts. */
export type ReportType = 'attendance' | 'offerings' | 'people' | 'peace-houses';

export type ReportCellFormat = 'text' | 'number' | 'currency' | 'date';

export interface ReportColumn {
  key: string;
  header: string;
  format: ReportCellFormat;
}

/**
 * A report preview.
 *
 * IT CARRIES ITS OWN COLUMNS. The screen renders whatever the definition
 * declares instead of hardcoding headers per report type — and it is the
 * same list the Excel export writes, which is what stops the sheet and the
 * table from drifting the first time a column is added.
 */
export interface ReportPreview {
  type: ReportType;
  title: string;
  columns: ReportColumn[];
  /** Values already flattened to primitives, keyed by column. */
  rows: Record<string, string | number | null>[];
  scopeLabel: string;
}

/** One row of `GET /offerings` — an offering with its meeting's context. */
export interface OfferingHistoryRow {
  id: string;
  meetingId: string;
  peaceHouseId: string;
  peaceHouseName: string;
  meetingDate: string;
  isoYear: number;
  isoWeek: number;
  amount: number;
  notes: string | null;
}

export interface OfferingPeriod {
  isoYear: number;
  isoWeek: number;
  total: number;
  count: number;
}

/**
 * `GET /offerings/summary` — aggregated over the WHOLE filter, not over the
 * page on screen. `average` is per registered offering: an unreported week
 * is missing data, not a zero.
 */
export interface OfferingSummary {
  total: number;
  count: number;
  average: number;
  min: number | null;
  max: number | null;
  byWeek: OfferingPeriod[];
}
