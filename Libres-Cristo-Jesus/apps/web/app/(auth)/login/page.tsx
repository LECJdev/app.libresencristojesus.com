'use client';

import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Checkbox, Input, PasswordInput } from '@lcj/ui';
import { BrandMark } from '@/components/layout/app-brand';
import { useLogin } from '@/hooks/use-auth';
import { API_URL_MISSING_MESSAGE, isApiConfigured } from '@/lib/api-base-url';

/**
 * Login — the wireframe in `Documentos/17` lines 134-168: Usuario, Contraseña,
 * "Recordarme", INGRESAR, "¿Olvidó su contraseña?", "Versión 1.0".
 *
 * The identifier is `username`, not email: `LeadershipUnit` has no email
 * column — see the note on `apps/api/.../dto/login.dto.ts` for why doc19's
 * illustrative `email` example does not match the data model.
 */
const loginSchema = z.object({
  username: z.string().trim().min(1, 'Ingrese su usuario.'),
  password: z.string().min(1, 'Ingrese su contraseña.'),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { submit, isPending, error, clearError } = useLogin();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', rememberMe: false },
  });

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center gap-3 pb-8 text-center">
        <BrandMark className="size-20" />
        <div className="flex flex-col gap-1">
          <h1 className="text-h3 font-semibold text-foreground">Libres en Cristo Jesús</h1>
          <p className="text-small text-foreground-muted">
            Gestión de Casas de Paz — Iglesia Cristiana Libres en Cristo Jesús
          </p>
        </div>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          await submit(values);
        })}
        className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 shadow-sm"
      >
        {/*
          A missing API URL used to surface as "no fue posible iniciar sesión",
          which points whoever is debugging straight at the credentials — the
          one thing that is not wrong. Named explicitly, and BEFORE the attempt,
          because no password will ever fix it.
        */}
        {isApiConfigured() ? null : (
          <p
            role="alert"
            className="rounded-md border border-warning-500 bg-warning-50 px-4 py-3 text-small text-warning-700"
          >
            {API_URL_MISSING_MESSAGE}
          </p>
        )}

        {error ? (
          // `role="alert"` so the failure is announced: a user who cannot see
          // the banner would otherwise just experience a form that did nothing.
          <p
            role="alert"
            className="rounded-md border border-error-500 bg-error-50 px-4 py-3 text-small text-error-600"
          >
            {error}
          </p>
        ) : null}

        <Input
          label="Usuario"
          autoComplete="username"
          autoFocus
          required
          error={errors.username?.message}
          {...register('username', { onChange: clearError })}
        />

        <PasswordInput
          label="Contraseña"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register('password', { onChange: clearError })}
        />

        <Controller
          control={control}
          name="rememberMe"
          render={({ field }) => (
            <Checkbox
              label="Recordarme"
              description="Mantiene la sesión abierta en este dispositivo durante 7 días."
              checked={field.value}
              onCheckedChange={(checked) => {
                // Radix reports `'indeterminate'` for tri-state checkboxes;
                // this one is binary, so anything not literally `true` is off.
                field.onChange(checked === true);
              }}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />

        <Button type="submit" size="lg" loading={isPending} className="w-full">
          INGRESAR
        </Button>

        <Link
          href="/recuperar-clave"
          className="text-center text-small font-medium text-primary-700 hover:underline"
        >
          ¿Olvidó su contraseña?
        </Link>
      </form>

      <p className="pt-6 text-center text-caption text-foreground-muted">Versión 1.0</p>
    </div>
  );
}
