import DominicalAttendanceFlow from '@/components/public-attendance/DominicalAttendanceFlow';
import { publicAttendanceConfigs } from '@/components/public-attendance/publicAttendanceConfigs';

export default function RegistroDominicalPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <DominicalAttendanceFlow
      params={params}
      attendanceLabel="Registro Dominical"
      successMessage="Tu asistencia dominical quedó registrada correctamente."
      config={publicAttendanceConfigs.dominical}
    />
  );
}
