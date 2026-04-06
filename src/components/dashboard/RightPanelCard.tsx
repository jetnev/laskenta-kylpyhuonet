import { type ReactNode } from 'react';

import DashboardCard from './DashboardCard';

interface RightPanelCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function RightPanelCard({ title, description, children }: RightPanelCardProps) {
  return (
    <DashboardCard title={title} description={description} className="border-border/70 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.26)]" contentClassName="pt-5">
      {children}
    </DashboardCard>
  );
}