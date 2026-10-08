import { Grid, GridItem } from '@lcj/ui';

/**
 * `Container` is already demonstrated by this very page — it is the outer
 * wrapper in `page.tsx`. This section only shows the responsive `Grid`:
 * 4 columns on mobile, 8 on tablet, 12 on desktop (doc18 §6).
 */
export function LayoutSection() {
  return (
    <Grid>
      <GridItem
        cols={{ mobile: 4, tablet: 4, desktop: 4 }}
        className="rounded-md bg-primary-50 p-4 text-center text-small"
      >
        1/3 en desktop
      </GridItem>
      <GridItem
        cols={{ mobile: 4, tablet: 4, desktop: 4 }}
        className="rounded-md bg-primary-50 p-4 text-center text-small"
      >
        1/3 en desktop
      </GridItem>
      <GridItem
        cols={{ mobile: 4, tablet: 8, desktop: 4 }}
        className="rounded-md bg-primary-50 p-4 text-center text-small"
      >
        1/3 en desktop, full en tablet
      </GridItem>
    </Grid>
  );
}
