import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireSupabaseMock } = vi.hoisted(() => ({
  requireSupabaseMock: vi.fn(),
}));

vi.mock('./supabase', async () => {
  const actual = await vi.importActual<typeof import('./supabase')>('./supabase');
  return {
    ...actual,
    requireSupabase: requireSupabaseMock,
    isSupabaseConfigured: true,
    getSupabaseConfigError: () => '',
  };
});

import { listCurrentUserLegalAcceptances } from './legal';

describe('listCurrentUserLegalAcceptances', () => {
  beforeEach(() => {
    requireSupabaseMock.mockReset();
    vi.restoreAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('scopes the login legal-check query to the current user before sorting', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    requireSupabaseMock.mockReturnValue({ from });

    await expect(listCurrentUserLegalAcceptances('user-123')).resolves.toEqual([]);

    expect(from).toHaveBeenCalledWith('legal_document_acceptances');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(order).toHaveBeenCalledWith('accepted_at', { ascending: false });
  });

  it('fails fast when the caller does not provide a current user id', async () => {
    await expect(listCurrentUserLegalAcceptances('   ')).rejects.toThrow(
      'Hyväksyntätietojen lataus epäonnistui.'
    );

    expect(requireSupabaseMock).not.toHaveBeenCalled();
  });

  it('returns a controlled message when the scoped acceptances query still fails', async () => {
    const backendError = { message: 'canceling statement due to statement timeout' };
    const order = vi.fn().mockResolvedValue({ data: null, error: backendError });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    requireSupabaseMock.mockReturnValue({ from });

    await expect(listCurrentUserLegalAcceptances('user-123')).rejects.toThrow(
      'Hyväksyntätietojen lataus epäonnistui.'
    );

    expect(console.error).toHaveBeenCalledWith(
      '[legal-check] acceptances query failed.',
      expect.objectContaining({ durationMs: expect.any(Number) }),
      backendError
    );
  });
});