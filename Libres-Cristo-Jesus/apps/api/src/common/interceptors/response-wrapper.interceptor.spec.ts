import { StreamableFile, type CallHandler, type ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ResponseWrapperInterceptor } from './response-wrapper.interceptor';

/**
 * The `StreamableFile` case is here because it was a REAL BUG, caught by
 * downloading a report from the running API and finding a 24 KB file whose
 * first bytes were `{"success":true,…}`.
 *
 * It is the nastiest shape of failure this codebase has produced so far: the
 * response carried the correct `Content-Type`, the correct
 * `Content-Disposition` and a plausible byte count, so every check upstream
 * passed. Only Excel disagreed, at the user, with "the file is corrupt".
 * Unit tests over the workbook buffer could not see it either — the buffer
 * was always fine; the envelope was applied afterwards, in transit.
 */
describe('ResponseWrapperInterceptor', () => {
  const context = {} as ExecutionContext;
  const handlerOf = <T>(value: T): CallHandler<T> => ({ handle: () => of(value) });

  let interceptor: ResponseWrapperInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseWrapperInterceptor();
  });

  it('wraps a plain payload in the standard envelope', async () => {
    const result = await firstValueFrom(interceptor.intercept(context, handlerOf({ id: 'abc' })));

    expect(result).toEqual({
      success: true,
      message: 'Operación realizada correctamente.',
      data: { id: 'abc' },
    });
  });

  it('honours a controller that supplies its own message and meta', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(
        context,
        handlerOf({
          data: [1, 2],
          message: 'Listo.',
          meta: { page: 1, pageSize: 20, total: 2, pages: 1 },
        }),
      ),
    );

    expect(result).toMatchObject({
      success: true,
      message: 'Listo.',
      data: [1, 2],
      meta: { total: 2 },
    });
  });

  it('NEVER wraps a StreamableFile — that turns a spreadsheet into JSON', async () => {
    const file = new StreamableFile(Buffer.from('PKbinary'));

    const result = await firstValueFrom(interceptor.intercept(context, handlerOf(file)));

    expect(result).toBe(file);
    expect(result).not.toHaveProperty('success');
  });

  it('passes null through as data rather than treating it as absent', async () => {
    const result = await firstValueFrom(interceptor.intercept(context, handlerOf(null)));

    expect(result).toEqual({
      success: true,
      message: 'Operación realizada correctamente.',
      data: null,
    });
  });
});
