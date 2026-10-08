import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './common/config/app-config.module';
import { AppLoggerModule } from './common/logger/logger.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { SecurityModule } from './common/security/security.module';
import { AuditModule } from './common/audit/audit.module';
import { CommonModule } from './common/common.module';
import { StorageModule } from './common/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { DistrictsModule } from './modules/districts/districts.module';
import { PeaceHousesModule } from './modules/peace-houses/peace-houses.module';
import { GeographyModule } from './modules/geography/geography.module';
import { SettingsModule } from './modules/settings/settings.module';
import { FilesModule } from './modules/files/files.module';
import { PeopleModule } from './modules/people/people.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { SermonThemesModule } from './modules/sermon-themes/sermon-themes.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SyncModule } from './modules/sync/sync.module';
import { KidsSchoolsModule } from './modules/kids-schools/kids-schools.module';
import { KidsChildrenModule } from './modules/kids-children/kids-children.module';
import { KidsAttendanceModule } from './modules/kids-attendance/kids-attendance.module';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    RedisModule,
    SecurityModule,
    AuditModule,
    CommonModule,
    StorageModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    OrganizationModule,
    DistrictsModule,
    PeaceHousesModule,
    GeographyModule,
    SettingsModule,
    FilesModule,
    PeopleModule,
    AttendanceModule,
    MeetingsModule,
    SermonThemesModule,
    DashboardModule,
    ReportsModule,
    SyncModule,
    KidsSchoolsModule,
    KidsChildrenModule,
    KidsAttendanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
