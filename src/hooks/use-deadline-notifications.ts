import { useEffect, useState } from 'react';
import { useKV } from '@github/spark/hooks';
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

export function useDeadlineNotifications() {
  const [settings, setSettings] = useKV<NotificationSettings>('deadline-notification-settings', DEFAULT_SETTINGS);
  const [notifiedDeadlines, setNotifiedDeadlines] = useKV<DeadlineNotification[]>('notified-deadlines', []);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<DeadlineNotification[]>([]);
  
  const { quotes } = useQuotes();
  const { getProject } = useProjects();
  const { getCustomer } = useCustomers();

  const calculateDaysUntil = (targetDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const checkDeadlines = () => {
    if (!settings || !settings.enabled) return;

    const now = new Date().toISOString();
    const newNotifications: DeadlineNotification[] = [];
    const currentNotifications = notifiedDeadlines || [];
    
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
        
        const shouldNotify = settings.notifyDaysBefore.some(days => daysUntil === days);
        
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
      setNotifiedDeadlines((current = []) => [...current, ...newNotifications]);
      
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
  };

  const getAllUpcomingDeadlines = () => {
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
  };

  useEffect(() => {
    if (settings && settings.enabled) {
      checkDeadlines();
      getAllUpcomingDeadlines();
      
      const interval = setInterval(() => {
        checkDeadlines();
        getAllUpcomingDeadlines();
      }, 60 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [quotes, settings]);

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings((current = DEFAULT_SETTINGS) => ({ ...current, ...newSettings }));
  };

  const clearNotificationHistory = () => {
    setNotifiedDeadlines([]);
    toast.success('Ilmoitushistoria tyhjennetty');
  };

  const sendEmailNotification = async (notification: DeadlineNotification) => {
    if (!settings || !settings.emailEnabled || !settings.emailAddress) {
      toast.error('Sähköposti-ilmoitukset eivät ole käytössä');
      return;
    }

    try {
      const prompt = spark.llmPrompt`Luo muodollinen sähköposti-ilmoitus seuraavasta lähestyvästä määräajasta:

Projekti: ${notification.projectName}
Asiakas: ${notification.customerName}
Määräaika: ${notification.milestoneName}
Päivämäärä: ${notification.targetDate}
Aikaa jäljellä: ${notification.daysUntil} päivää

Sähköpostin tulee olla:
- Lyhyt ja ytimekäs
- Suomeksi
- Muodollinen mutta ystävällinen
- Sisältää kaikki oleelliset tiedot

Palauta JSON-muodossa: {"subject": "...", "body": "..."}`;

      const result = await spark.llm(prompt, 'gpt-4o-mini', true);
      const emailData = JSON.parse(result);

      toast.info('Sähköposti-ominaisuus tulossa', {
        description: `Aihe: ${emailData.subject}`,
      });

      return emailData;
    } catch (error) {
      console.error('Email notification error:', error);
      toast.error('Sähköpostin lähetys epäonnistui');
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
