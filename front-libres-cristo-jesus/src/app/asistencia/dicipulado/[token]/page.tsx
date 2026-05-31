import PublicAttendanceFlow from '@/components/public-attendance/PublicAttendanceFlow';
import { publicAttendanceConfigs } from '@/components/public-attendance/publicAttendanceConfigs';


export default function RegistroDicipuladoPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <PublicAttendanceFlow
      params={params}
      attendanceLabel="Registro Dicipulado"
      successMessage="Tu asistencia de dicipulado quedó registrada correctamente."
      config={publicAttendanceConfigs.dicipulado}
    />
  );
}
