'use client';

import { MeetingCard, OrganizationCard, PeaceHouseCard, PersonCard } from '@lcj/ui';

const LEADERS = [{ name: 'Carlos Gómez' }, { name: 'Beatriz Ríos' }];

export function DomainCardsSection() {
  return (
    <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
      <OrganizationCard
        name="Distrito Norte"
        type="Distrito"
        leaders={LEADERS}
        location="Bogotá, Colombia"
        status="active"
        metrics={[{ label: 'Casas de Paz', value: 12 }]}
      />
      <PeaceHouseCard
        name="Casa de Paz Betania"
        district="Distrito Norte"
        leaders={LEADERS}
        address="Calle 45 # 12-30"
        municipality="Bogotá"
        meetingDay="Miércoles"
        meetingTime="7:00 p. m."
        status="active"
        attendanceAverage={18}
      />
      <MeetingCard
        date={new Date('2026-07-22')}
        topic="La fe que vence"
        status="reported"
        attendanceCount={18}
        offeringAmount={250000}
        photoCount={4}
      />
      <PersonCard
        firstName="Ana"
        lastName="Torres"
        phone="300 111 2222"
        email="ana@example.com"
        stage="Discípulo"
        peaceHouse="Betania"
        status="active"
      />
    </div>
  );
}
