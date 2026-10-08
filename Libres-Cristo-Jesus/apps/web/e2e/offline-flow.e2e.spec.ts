import { expect, test, type Page } from '@playwright/test';

/**
 * Prueba de navegador real del flujo offline (Fase 10, RN-1202/RN-1203).
 *
 * Regla aprobada del proyecto: la desconexión se simula con
 * `page.context().setOffline(true)`, nunca mockeando `fetch` ni el service
 * worker — estas pruebas manejan un Chromium real contra `apps/api` y
 * `apps/web` real (arrancados por `webServer` en `playwright.config.ts`).
 *
 * DECISIÓN: cada caso hace su propio login (en vez de un único
 * `test.describe.serial` con una sola sesión de navegador para las cuatro
 * letras a/b/c/d del pedido original). Con `describe.serial`, si un caso
 * falla, Playwright saltea automáticamente los siguientes — y con
 * `test.describe.serial` eso hubiera dejado ESCRITURA y RECONEXIÓN sin
 * correr nunca cada vez que LECTURA fallara. Con tests independientes, cada
 * uno reporta su propio resultado real.
 *
 * ALCANCE DE b) (RN-1202): cubre la lectura con conectividad limitada
 * MIENTRAS LA SESIÓN SIGUE ACTIVA EN MEMORIA (sin recargar la página), no un
 * arranque en frío totalmente offline — ver el comentario dentro del propio
 * test y la nota en `Documentos/00_PROYECTO_MASTER.md`.
 */

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*';

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  // Selectores por `name` (no por label): el toggle "Mostrar contraseña" de
  // `PasswordInput` también expone "Contraseña" en su accesible-name (es
  // substring de su propio aria-label), así que `getByLabel('Contraseña')`
  // resuelve a dos elementos y rompe el modo estricto de Playwright.
  await page.locator('input[name="username"]').fill(ADMIN_USERNAME);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'INGRESAR' }).click();
  await page.waitForURL('**/dashboard');
}

/** Nombre único por corrida, con prefijo alfabético para caer en la página 1 (orden por apellido asc). */
function uniquePersonName(tag: string): { firstName: string; lastName: string; fullName: string } {
  const firstName = 'QA';
  const lastName = `AAA-Offline-${tag}-${Date.now()}`;
  // `PersonCard` (rediseño visual) muestra "Nombre Apellido", no la vieja
  // convención "Apellido, Nombre" de la DataTable — el texto buscado en el
  // DOM tiene que coincidir con lo que la tarjeta realmente renderiza.
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

interface QueuedOperationShape {
  operationId: string;
  operationType: string;
  payload: Record<string, unknown>;
}

/** Lee la cola de mutaciones offline directamente de IndexedDB (`lcj-offline`). */
async function readOfflineQueue(page: Page): Promise<QueuedOperationShape[]> {
  return page.evaluate(
    () =>
      new Promise<QueuedOperationShape[]>((resolve, reject) => {
        const request = indexedDB.open('lcj-offline');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('operations', 'readonly');
          const store = tx.objectStore('operations');
          const getAll = store.getAll();
          getAll.onsuccess = () => resolve(getAll.result as QueuedOperationShape[]);
          getAll.onerror = () => reject(getAll.error);
        };
      }),
  );
}

test.describe('Flujo offline — Personas', () => {
  test('a) login real como admin abre el dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('b) RN-1202: los datos ya vistos siguen disponibles con conectividad limitada, sin recargar', async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await loginAsAdmin(page);

    // Dato conocido: se registra una persona EN LÍNEA para tener contenido
    // determinístico que después se busca en el caché de React Query.
    const person = uniquePersonName('read');
    await page.goto('/personas');
    await page.getByRole('button', { name: 'Nueva persona' }).click();
    await page.getByLabel('Nombres').fill(person.firstName);
    await page.getByLabel('Apellidos').fill(person.lastName);
    await page.getByRole('button', { name: 'Registrar persona' }).click();

    // El drawer se cierra solo al confirmar el servidor (ver
    // person-form-drawer.tsx) — es la señal de que el registro es real.
    await expect(page.getByRole('heading', { name: 'Nueva persona' })).toBeHidden();
    await expect(page.getByText(person.fullName)).toBeVisible();

    await page.context().setOffline(true);

    // SIN `page.reload()`: RN-1202 cubre la lectura con conectividad
    // limitada MIENTRAS LA SESIÓN SIGUE ACTIVA EN MEMORIA, no un arranque en
    // frío totalmente offline. Una recarga completa dispara
    // `useSessionBootstrap`, que intenta `POST /auth/refresh` — sin red eso
    // falla y `SessionGate` redirige a `/login` (el token vive solo en
    // memoria, ver `store/session-store.ts`), y el service worker tampoco
    // sirve hoy el shell de la app offline. Esas dos piezas son decisiones
    // de seguridad/arquitectura mayores que quedan fuera de esta fase (ver
    // nota en `Documentos/00_PROYECTO_MASTER.md`).
    //
    // NAVEGACIÓN ENTRE RUTAS DESCARTADA A PROPÓSITO: el menú (Dashboard,
    // Reuniones, …) navega con `router.push` de Next.js App Router, que pide
    // el payload RSC de la ruta destino por red SIEMPRE — incluso a una ruta
    // visitada segundos antes en la misma sesión — y sin conexión eso nunca
    // resuelve (`net::ERR_INTERNET_DISCONNECTED`, comprobado al escribir
    // este test). Cambiar el filtro de búsqueda tampoco sirve para probar
    // esto: `usePeople` usa `placeholderData: (previous) => previous`, y
    // `@tanstack/react-query` con su `networkMode` por defecto NI SIQUIERA
    // intenta la nueva consulta mientras el navegador está offline — se
    // queda "pausada" mostrando el placeholder anterior, así que cambiar el
    // texto de búsqueda no demuestra nada distinto de no tocar nada.
    //
    // Lo que sí es una navegación real dentro de la SPA, sin depender de
    // ninguno de esos dos mecanismos: abrir el panel de detalle de la
    // persona (una ruta secundaria dentro de la pantalla, RF entra en un
    // `usePersonHistory` NUNCA antes solicitado) y volver a cerrarlo. Sin
    // red, esa consulta también queda pausada — el panel debe mostrar su
    // estado de carga sin romperse — y la lista de fondo, que si tiene
    // datos ya vistos, debe seguir intacta durante y después del recorrido.
    await page.getByRole('button', { name: `Ver ${person.firstName} ${person.lastName}` }).click();
    await expect(page.getByText('Historial de Casas de Paz')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByText('Historial de Casas de Paz')).toBeHidden();

    // El dato original nunca dejó de estar en el caché de React Query
    // (reforzado por la persistencia en IndexedDB para el resto de esta
    // sesión): sigue visible después del recorrido, sin haber pasado por la
    // red en ningún momento.
    await expect(page.getByText(person.fullName)).toBeVisible({ timeout: 15_000 });
    expect(pageErrors, `Errores de JS no controlados: ${pageErrors.join('; ')}`).toHaveLength(0);

    await page.context().setOffline(false);
  });

  test('c) escritura offline: la mutación queda en la cola local y se sincroniza al reconectar', async ({
    page,
    request,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/personas');
    await expect(page.getByRole('button', { name: 'Nueva persona' })).toBeVisible();

    // Sin `reload()` de por medio: el token de sesión vive solo en memoria
    // (store/session-store.ts) y una recarga completa dispara
    // `useSessionBootstrap`, que intenta `POST /auth/refresh` — sin red eso
    // falla y `SessionGate` redirige a /login. Navegar dentro de la SPA, sin
    // recargar, evita ese problema y deja probar la cola de escritura de
    // forma aislada.
    await page.context().setOffline(true);

    const person = uniquePersonName('write');
    await page.getByRole('button', { name: 'Nueva persona' }).click();
    await page.getByLabel('Nombres').fill(person.firstName);
    await page.getByLabel('Apellidos').fill(person.lastName);
    await page.getByRole('button', { name: 'Registrar persona' }).click();

    // Sin conexión, `createPerson` rechaza con `QueuedOfflineError`
    // (with-offline-fallback.ts): el dato ya quedó capturado en la cola
    // local, así que el drawer se cierra solo (nada que reintentar ahí) y el
    // aviso llega por el toast único del design system, no por una alerta
    // de error dentro del formulario — ver person-form-drawer.tsx.
    //
    // Timeout generoso: `page.context().setOffline(true)` (CDP) no cambia
    // `navigator.onLine` (sigue en `true`), así que el atajo inmediato de
    // `withOfflineFallback` no aplica — el primer POST después de
    // desconectar sí sale a intentar la red real y tarda unos segundos en
    // fallar (`net::ERR_INTERNET_DISCONNECTED`) antes de encolarse. En esta
    // máquina (Windows + OneDrive, ver también los timeouts de `webServer`
    // en playwright.config.ts) esa detección real de red caída midió más de
    // 15s, así que el margen se sube a 30s en vez de asumir un valor tuneado
    // en otro entorno.
    // `exact: true` porque el toast se anuncia dos veces: el título visual
    // ("Guardado sin conexión") y la región `aria-live` para lectores de
    // pantalla concatena título + descripción en un solo texto más largo.
    await expect(page.getByText('Guardado sin conexión', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: 'Nueva persona' })).toBeHidden();

    const queueAfterWrite = await readOfflineQueue(page);
    const queuedOperation = queueAfterWrite.find(
      (operation) =>
        operation.operationType === 'PERSON_CREATE' &&
        operation.payload.firstName === person.firstName &&
        operation.payload.lastName === person.lastName,
    );
    expect(
      queuedOperation,
      `Operación PERSON_CREATE para "${person.fullName}" no encontrada en IndexedDB lcj-offline`,
    ).toBeDefined();

    // Reconexión (RN-1203): vuelve la red, se dispara el evento `online` que
    // escucha use-sync.ts, y la cola se debe vaciar sola.
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    await expect
      .poll(
        async () => {
          const queue = await readOfflineQueue(page);
          return queue.some((operation) => operation.operationId === queuedOperation!.operationId);
        },
        {
          timeout: 20_000,
          message: 'La operación encolada nunca salió de IndexedDB tras reconectar',
        },
      )
      .toBe(false);

    // Verificación independiente contra el servidor real, sin pasar por la
    // UI: la persona debe existir de verdad del lado de la API.
    const loginResponse = await request.post('http://localhost:3001/auth/login', {
      data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD, rememberMe: false },
    });
    expect(loginResponse.ok()).toBe(true);
    const loginBody = (await loginResponse.json()) as { data: { accessToken: string } };
    const accessToken = loginBody.data.accessToken;

    const peopleResponse = await request.get(
      `http://localhost:3001/people?search=${encodeURIComponent(person.lastName)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(peopleResponse.ok()).toBe(true);
    const peopleBody = (await peopleResponse.json()) as {
      data: Array<{ firstName: string; lastName: string }>;
    };
    expect(
      peopleBody.data.some(
        (candidate) =>
          candidate.firstName === person.firstName && candidate.lastName === person.lastName,
      ),
      `La persona "${person.fullName}" no llegó al servidor tras sincronizar`,
    ).toBe(true);
  });
});
