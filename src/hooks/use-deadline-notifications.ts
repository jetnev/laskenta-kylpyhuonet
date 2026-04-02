import { useCallback, useEffect, useRef, useState } from 'react';
import { useKV } from './use-kv';
import { useQuotes, useProjects, useCustomers } from './use-data';
import { Quote, ScheduleMilestone } from '../lib/types';
import { toast } from 'sonner';

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

const calculateDaysUntil = (targetDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

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
    const newNotifications: DeadlineNotification[] = [];
    const currentNotifications = notifiedDeadlinesRef.current || [];
    
    quotes.forEach((quote: Quote) => {
      if (quote.status === 'draft' || quote.status === 'rejected') return;
      
      const milestones = quote.scheduleMilestones || [];
      const project = getProject(quote.projectId);
      if (!project) return;
      
      const customer = getCustomer(project.customerId);
      
      milestones.forEach((milestone: ScheduleMilestone) => {
        if (!milestone.targetDate) return;
        
        const daysUntil = calculateDaysUntil(milestone.targetDate);
        
        if (daysUntil < 0) return;
        
        const shouldNotify = notifyDaysBefore.some(days => daysUntil === days);
        
        if (shouldNotify) {
          const notificationId = `${quote.id}-${milestone.id}-${daysUntil}`;
          const alreadyNotified = currentNotifications.some(n => n.id === notificationId);
          
          if (!alreadyNotified) {
            const notification: DeadlineNotification = {
              id: notificationId,
              quoteId: quote.id,
              projectId: quote.projectId,
              milestoneId: milestone.id,
              milestoneName: milestone.title || milestone.type,
              targetDate: milestone.targetDate,
              daysUntil,
              projectName: project.name,
              customerName: customer?.name || 'Ei asiakasta',
              notifiedAt: now,
            };
            
            newNotifications.push(notification);
          }
        }
      });
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
    const upcoming: DeadlineNotification[] = [];
    
    quotes.forEach((quote: Quote) => {
      if (quote.status === 'draft' || quote.status === 'rejected') return;
      
      const milestones = quote.scheduleMilestones || [];
      const project = getProject(quote.projectId);
      if (!project) return;
      
      const customer = getCustomer(project.customerId);
      
      milestones.forEach((milestone: ScheduleMilestone) => {
        if (!milestone.targetDate) return;
        
        const daysUntil = calculateDaysUntil(milestone.targetDate);
        
        if (daysUntil >= 0 && daysUntil <= 30) {
          upcoming.push({
            id: `${quote.id}-${milestone.id}`,
            quoteId: quote.id,
            projectId: quote.projectId,
            milestoneId: milestone.id,
            milestoneName: milestone.title || milestone.type,
            targetDate: milestone.targetDate,
            daysUntil,
            projectName: project.name,
            customerName: customer?.name || 'Ei asiakasta',
            notifiedAt: '',
          });
        }
      });
    });

    upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
    setUpcomingDeadlines(upcoming);
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
