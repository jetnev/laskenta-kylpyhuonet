import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const deadlineHooks = vi.hoisted(() => ({
  useDeadlineNotifications: vi.fn(),
}));

vi.mock('../hooks/use-deadline-notifications', () => ({
  useDeadlineNotifications: deadlineHooks.useDeadlineNotifications,
}));

import DeadlineNotifications from './DeadlineNotifications';

function createDeadline(index: number) {
  return {
    id: `deadline-${index}`,
    quoteId: `quote-${index}`,
    projectId: `project-${index}`,
    milestoneId: `milestone-${index}`,
    milestoneName: 'deadline',
    targetDate: `2026-04-${String(10 + index).padStart(2, '0')}`,
    daysUntil: index - 1,
    projectName: `Kohde ${index}`,
    customerName: `Asiakas ${index}`,
    notifiedAt: '2026-04-01T08:00:00.000Z',
  };
}

describe('DeadlineNotifications', () => {
  beforeEach(() => {
    deadlineHooks.useDeadlineNotifications.mockReturnValue({
      settings: {
        enabled: true,
        emailEnabled: false,
        emailAddress: '',
        notifyDaysBefore: [7, 3, 1],
      },
      updateSettings: vi.fn(),
      upcomingDeadlines: [],
      notifiedDeadlines: [],
      clearNotificationHistory: vi.fn(),
      sendEmailNotification: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the settings trigger in compact mode while limiting the visible deadlines', () => {
    deadlineHooks.useDeadlineNotifications.mockReturnValue({
      settings: {
        enabled: true,
        emailEnabled: false,
        emailAddress: '',
        notifyDaysBefore: [7, 3, 1],
      },
      updateSettings: vi.fn(),
      upcomingDeadlines: [createDeadline(1), createDeadline(2), createDeadline(3), createDeadline(4)],
      notifiedDeadlines: [createDeadline(5)],
      clearNotificationHistory: vi.fn(),
      sendEmailNotification: vi.fn(),
    });

    const markup = renderToStaticMarkup(<DeadlineNotifications compact />);

    expect(markup).toContain('data-testid="deadline-settings-button"');
    expect(markup).toContain('Kohde 1');
    expect(markup).toContain('Kohde 2');
    expect(markup).toContain('Kohde 3');
    expect(markup).not.toContain('Kohde 4');
    expect(markup).toContain('Näytetään 3 lähintä määräaikaa 4 kohteesta.');
    expect(markup).not.toContain('>Asetukset<');
    expect(markup).not.toContain('Ilmoitushistoria');
  });

  it('shows the full settings label and notification history outside compact mode', () => {
    deadlineHooks.useDeadlineNotifications.mockReturnValue({
      settings: {
        enabled: true,
        emailEnabled: false,
        emailAddress: '',
        notifyDaysBefore: [7, 3, 1],
      },
      updateSettings: vi.fn(),
      upcomingDeadlines: [createDeadline(1), createDeadline(2), createDeadline(3), createDeadline(4)],
      notifiedDeadlines: [createDeadline(5)],
      clearNotificationHistory: vi.fn(),
      sendEmailNotification: vi.fn(),
    });

    const markup = renderToStaticMarkup(<DeadlineNotifications />);

    expect(markup).toContain('data-testid="deadline-settings-button"');
    expect(markup).toContain('>Asetukset<');
    expect(markup).toContain('Ilmoitushistoria');
    expect(markup).toContain('Kohde 4');
  });
});