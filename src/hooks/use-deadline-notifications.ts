import { useCallback, useEffect, useRef, useState } from 'react';
import { useKV } from './use-kv';
import { useQuotes, useProjects, useCustomers } from './use-data';
import { Quote, ScheduleMilestone } from '../lib/types';
import { toast } from 'sonner';

interface DeadlineProjectLookup {
  customerId: string;
  name: string;
}

interface DeadlineCustomerLookup {
  name: string;
}

type GetDeadlineProject = (projectId: string) => DeadlineProjectLookup | undefined;
type GetDeadlineCustomer = (customerId: string) => DeadlineCustomerLookup | undefined;

export interface DeadlineNotification {
  id: string;
  quoteId: string;
  projectId: string;
  milestoneId: string;
  milestoneName: string;
  targetDate: string;
  daysUntil: number;
  projectName: string;
  customerName: string;
  notifiedAt: string;
}

export interface NotificationSettings {
  enabled: boolean;
  emailEnabled: boolean;
  emailAddress: string;
  notifyDaysBefore: number[];
  lastCheck?: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  emailEnabled: false,
  emailAddress: '',
  notifyDaysBefore: [7, 3, 1],
  lastCheck: undefined,
};

export const calculateDaysUntil = (targetDate: string, currentDate = new Date()): number => {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

function shouldSkipDeadlineQuote(quote: Quote) {
  return quote.status === 'draft' || quote.status === 'rejected';
}

function buildDeadlineNotification(args: {
  quote: Quote;
  milestone: ScheduleMilestone;
  project: DeadlineProjectLookup;
  customerName: string;
  daysUntil: number;
  notifiedAt: string;
  id: string;
}): DeadlineNotification {
  const { quote, milestone, project, customerName, daysUntil, notifiedAt, id } = args;

  return {
    id,
    quoteId: quote.id,
    projectId: quote.projectId,
    milestoneId: milestone.id,
    milestoneName: milestone.title || milestone.type,
    targetDate: milestone.targetDate || '',
    daysUntil,
    projectName: project.name,
    customerName,
    notifiedAt,
  };
}

export function collectNewDeadlineNotifications(args: {
  quotes: Quote[];
  getProject: GetDeadlineProject;
  getCustomer: GetDeadlineCustomer;
  notifiedDeadlines: DeadlineNotification[];
  notifyDaysBefore: number[];
  nowIso?: string;
  currentDate?: Date;
}) {
  const {
    quotes,
    getProject,
    getCustomer,
    notifiedDeadlines,
    notifyDaysBefore,
    nowIso = new Date().toISOString(),
    currentDate = new Date(),
  } = args;

  const newNotifications: DeadlineNotification[] = [];

  quotes.forEach((quote) => {
    if (shouldSkipDeadlineQuote(quote)) return;

    const milestones = quote.scheduleMilestones || [];
    const project = getProject(quote.projectId);
    if (!project) return;

    const customer = getCustomer(project.customerId);

    milestones.forEach((milestone) => {
      if (!milestone.targetDate) return;

      const daysUntil = calculateDaysUntil(milestone.targetDate, currentDate);
      if (daysUntil < 0) return;
      if (!notifyDaysBefore.some((days) => daysUntil === days)) return;

      const notificationId = `${quote.id}-${milestone.id}-${daysUntil}`;
      const alreadyNotified = notifiedDeadlines.some((notification) => notification.id === notificationId);
      if (alreadyNotified) return;

      newNotifications.push(
        buildDeadlineNotification({
          quote,
          milestone,
          project,
          customerName: customer?.name || 'Ei asiakasta',
          daysUntil,
          notifiedAt: nowIso,
          id: notificationId,
        })
      );
    });
  });

  return newNotifications;
}

export function collectUpcomingDeadlines(args: {
  quotes: Quote[];
  getProject: GetDeadlineProject;
  getCustomer: GetDeadlineCustomer;
  currentDate?: Date;
  maxDaysUntil?: number;
}) {
  const {
    quotes,
    getProject,
    getCustomer,
    currentDate = new Date(),
    maxDaysUntil = 30,
  } = args;

  const upcoming: DeadlineNotification[] = [];

  quotes.forEach((quote) => {
    if (shouldSkipDeadlineQuote(quote)) return;

    const milestones = quote.scheduleMilestones || [];
    const project = getProject(quote.projectId);
    if (!project) return;

    const customer = getCustomer(project.customerId);

    milestones.forEach((milestone) => {
      if (!milestone.targetDate) return;

      const daysUntil = calculateDaysUntil(milestone.targetDate, currentDate);
      if (daysUntil < 0 || daysUntil > maxDaysUntil) return;

      upcoming.push(
        buildDeadlineNotification({
          quote,
          milestone,
          project,
          customerName: customer?.name || 'Ei asiakasta',
          daysUntil,
          notifiedAt: '',
          id: `${quote.id}-${milestone.id}`,
        })
      );
    });
  });

  return upcoming.sort((left, right) => left.daysUntil - right.daysUntil);
}

export function useDeadlineNotifications() {
  const [settings, setSettings] = useKV<NotificationSettings>('deadline-notification-settings', DEFAULT_SETTINGS);
  const [notifiedDeadlines, setNotifiedDeadlines] = useKV<DeadlineNotification[]>('notified-deadlines', []);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<DeadlineNotification[]>([]);
  const notifiedDeadlinesRef = useRef<DeadlineNotification[]>(notifiedDeadlines);
  
  const { quotes } = useQuotes();
  const { getProject } = useProjects();
  const { getCustomer } = useCustomers();
  const enabled = settings?.enabled ?? DEFAULT_SETTINGS.enabled;
  const notifyDaysBefore = settings?.notifyDaysBefore ?? DEFAULT_SETTINGS.notifyDaysBefore;

  useEffect(() => {
    notifiedDeadlinesRef.current = notifiedDeadlines || [];
  }, [notifiedDeadlines]);

  const checkDeadlines = useCallback(() => {
    if (!enabled) return;

    const now = new Date().toISOString();
    const currentNotifications = notifiedDeadlinesRef.current || [];
    const newNotifications = collectNewDeadlineNotifications({
      quotes,
      getProject,
      getCustomer,
      notifiedDeadlines: currentNotifications,
      notifyDaysBefore,
      nowIso: now,
    });

    if (newNotifications.length > 0) {
      const nextNotifications = [...currentNotifications, ...newNotifications];
      setNotifiedDeadlines(nextNotifications);
      notifiedDeadlinesRef.current = nextNotifications;
      
      newNotifications.forEach(notification => {
        const daysText = notification.daysUntil === 0 
          ? 'TÄNÄÄN' 
          : notification.daysUntil === 1 
          ? 'huomenna' 
          : `${notification.daysUntil} päivän kuluttua`;
        
        toast.warning(
          `Määräaika: ${notification.milestoneName} ${daysText}`,
          {
            description: `${notification.projectName} - ${notification.customerName}`,
            duration: 10000,
          }
        );
      });
    }

    setSettings((current = DEFAULT_SETTINGS) => ({ ...current, lastCheck: now }));
  }, [enabled, getCustomer, getProject, notifiedDeadlinesRef, notifyDaysBefore, quotes, setNotifiedDeadlines, setSettings]);

  const getAllUpcomingDeadlines = useCallback(() => {
    setUpcomingDeadlines(
      collectUpcomingDeadlines({
        quotes,
        getProject,
        getCustomer,
      })
    );
  }, [getCustomer, getProject, quotes, setUpcomingDeadlines]);

  useEffect(() => {
    if (enabled) {
      checkDeadlines();
      getAllUpcomingDeadlines();
      
      const interval = setInterval(() => {
        checkDeadlines();
        getAllUpcomingDeadlines();
      }, 60 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [enabled, checkDeadlines, getAllUpcomingDeadlines]);

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings((current = DEFAULT_SETTINGS) => ({ ...current, ...newSettings }));
  };

  const clearNotificationHistory = () => {
    setNotifiedDeadlines([]);
    notifiedDeadlinesRef.current = [];
    toast.success('Ilmoitushistoria tyhjennetty');
  };

  const sendEmailNotification = async (notification: DeadlineNotification) => {
    if (!settings || !settings.emailEnabled || !settings.emailAddress) {
      toast.error('Sähköposti-ilmoitukset eivät ole käytössä');
      return;
    }

    try {
      const subject = `Määräaika lähestyy: ${notification.milestoneName}`;
      const body = [
        'Hei,',
        '',
        `Projektin "${notification.projectName}" määräaika lähestyy.`,
        `Asiakas: ${notification.customerName}`,
        `Määräaika: ${notification.milestoneName}`,
        `Päivämäärä: ${notification.targetDate}`,
        `Aikaa jäljellä: ${notification.daysUntil} päivää`,
      ].join('\n');

      window.location.href = `mailto:${encodeURIComponent(settings.emailAddress)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      toast.success('Sähköpostiluonnos avattiin oletussähköpostiohjelmaan.', {
        description: subject,
      });
    } catch (error) {
      console.error('Email notification error:', error);
      toast.error('Sähköpostiluonnoksen avaus epäonnistui');
    }
  };

  return {
    settings,
    updateSettings,
    upcomingDeadlines,
    notifiedDeadlines,
    clearNotificationHistory,
    checkDeadlines,
    sendEmailNotification,
  };
}
