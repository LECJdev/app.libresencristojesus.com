import { Container } from '@lcj/ui';
import type { Metadata } from 'next';
import { DataDisplaySection } from './_components/data-display-section';
import { DomainCardsSection } from './_components/domain-cards-section';
import { FeedbackSection } from './_components/feedback-section';
import { FormsSection } from './_components/forms-section';
import { LayoutSection } from './_components/layout-section';
import { NavigationSection } from './_components/navigation-section';
import { OverlaysSection } from './_components/overlays-section';
import { PrimitivesSection } from './_components/primitives-section';

export const metadata: Metadata = {
  title: 'Design System — LCJ Connect',
  description: 'Vitrina interna de los componentes de @lcj/ui. No es una pantalla de negocio.',
};

/**
 * Internal showcase of every `@lcj/ui` component (Fase 3 — Design System).
 * Hardcoded example data only: this route has no business logic and is not
 * linked from the public navigation.
 */
export default function DesignSystemPage() {
  return (
    <Container size="lg" className="flex flex-col gap-12 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2 font-bold text-foreground desktop:text-h1">Design System</h1>
        <p className="max-w-2xl text-body text-foreground-muted">
          Vitrina interna de los componentes de <code>@lcj/ui</code>. Sirve como referencia visual
          para el equipo; no representa ninguna pantalla real del producto.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-semibold text-foreground">Primitives</h2>
        <PrimitivesSection />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-semibold text-foreground">Forms</h2>
        <FormsSection />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-semibold text-foreground">Feedback</h2>
        <FeedbackSection />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-semibold text-foreground">Overlays</h2>
        <OverlaysSection />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-semibold text-foreground">Navigation</h2>
        <NavigationSection />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-semibold text-foreground">Data Display</h2>
        <DataDisplaySection />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-semibold text-foreground">Domain Cards</h2>
        <DomainCardsSection />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-semibold text-foreground">Layout</h2>
        <LayoutSection />
      </section>
    </Container>
  );
}
