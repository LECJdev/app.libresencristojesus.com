import PublicAttendanceFlow from '@/components/public-attendance/PublicAttendanceFlow';
import { publicAttendanceConfigs } from '@/components/public-attendance/publicAttendanceConfigs';

export default function RegistroDominicalPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <PublicAttendanceFlow
      params={params}
      attendanceLabel="Registro Dominical"
      successMessage="Tu asistencia dominical quedó registrada correctamente."
      config={publicAttendanceConfigs.dominical}
    />
  );
}
