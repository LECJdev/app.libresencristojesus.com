'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { CreateSermonThemeInput, SermonTheme, UpdateSermonThemeInput } from '@lcj/types';
import {
  createSermonTheme,
  deleteSermonTheme,
  listSermonThemeSeries,
  listSermonThemes,
  updateSermonTheme,
  type ListSermonThemesParams,
} from '@/lib/api/sermon-themes';
import type { PaginatedResult } from '@/lib/http-client';

export const sermonThemeKeys = {
  all: ['sermon-themes'] as const,
  list: (params: ListSermonThemesParams) => [...sermonThemeKeys.all, 'list', params] as const,
  series: ['sermon-theme-series'] as const,
};

export function useSermonThemes(
  params: ListSermonThemesParams,
): UseQueryResult<PaginatedResult<SermonTheme[]>, Error> {
  return useQuery({
    queryKey: sermonThemeKeys.list(params),
    queryFn: () => listSermonThemes(params),
    placeholderData: (previous) => previous,
  });
}

export function useSermonThemeSeries(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: sermonThemeKeys.series,
    queryFn: listSermonThemeSeries,
  });
}

/**
 * Invalidates the catalog AND the series list: creating a theme under a
 * brand-new series has to make that series selectable straight away, or the
 * next meeting cannot be filed under it.
 */
function useInvalidateSermonThemes(): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: sermonThemeKeys.all }),
      queryClient.invalidateQueries({ queryKey: sermonThemeKeys.series }),
    ]);
  };
}

export function useCreateSermonTheme(): UseMutationResult<
  SermonTheme,
  Error,
  CreateSermonThemeInput
> {
  const invalidate = useInvalidateSermonThemes();
  return useMutation({ mutationFn: createSermonTheme, onSuccess: invalidate });
}

export function useUpdateSermonTheme(): UseMutationResult<
  SermonTheme,
  Error,
  { id: string; input: UpdateSermonThemeInput }
> {
  const invalidate = useInvalidateSermonThemes();
  return useMutation({
    mutationFn: ({ id, input }) => updateSermonTheme(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSermonTheme(): UseMutationResult<null, Error, string> {
  const invalidate = useInvalidateSermonThemes();
  return useMutation({ mutationFn: deleteSermonTheme, onSuccess: invalidate });
}
