import CasaPazAttendanceFlow from '@/components/public-attendance/CasaPazAttendanceFlow';
import { publicAttendanceConfigs } from '@/components/public-attendance/publicAttendanceConfigs';


export default function RegistroCasaPazPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <CasaPazAttendanceFlow
      params={params}
      attendanceLabel="Registro Casa de Paz"
      successMessage="Tu asistencia de casa de paz quedó registrada correctamente."
      config={publicAttendanceConfigs['casa-paz']}
    />
  );
}
