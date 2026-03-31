import { useState } from 'react';
import { Plus, Trash, CalendarBlank, Clock, Truck, FlagCheckered, Circle } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ScheduleMilestone } from '../lib/types';
import { Badge } from './ui/badge';

interface ScheduleSectionProps {
  milestones: ScheduleMilestone[];
  onChange: (milestones: ScheduleMilestone[]) => void;
  disabled?: boolean;
}

const MILESTONE_TYPES = [
  { value: 'start', label: 'Aloitus', icon: CalendarBlank, color: 'bg-blue-500' },
  { value: 'deadline', label: 'Määräaika', icon: Clock, color: 'bg-orange-500' },
  { value: 'delivery', label: 'Toimitus', icon: Truck, color: 'bg-green-500' },
  { value: 'completion', label: 'Valmistuminen', icon: FlagCheckered, color: 'bg-purple-500' },
  { value: 'other', label: 'Muu', icon: Circle, color: 'bg-muted-foreground' },
] as const;

export default function ScheduleSection({ milestones, onChange, disabled }: ScheduleSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAddMilestone = () => {
    const newMilestone: ScheduleMilestone = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      targetDate: '',
      type: 'deadline',
    };
    onChange([...milestones, newMilestone]);
    setExpandedId(newMilestone.id);
  };

  const handleUpdateMilestone = (id: string, updates: Partial<ScheduleMilestone>) => {
    onChange(milestones.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleDeleteMilestone = (id: string) => {
    onChange(milestones.filter(m => m.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
    }
  };

  const getMilestoneTypeConfig = (type: ScheduleMilestone['type']) => {
    return MILESTONE_TYPES.find(t => t.value === type) || MILESTONE_TYPES[4];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Aikataulu ja määräajat</Label>
        {!disabled && (
          <Button onClick={handleAddMilestone} size="sm" variant="outline" className="gap-2">
            <Plus weight="bold" className="h-4 w-4" />
            Lisää määräaika
          </Button>
        )}
      </div>

      {milestones.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <CalendarBlank className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Ei määräaikoja. Lisää aikataulutietoja tarjoukseen.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone, index) => {
            const typeConfig = getMilestoneTypeConfig(milestone.type);
            const Icon = typeConfig.icon;
            const isExpanded = expandedId === milestone.id;

            return (
              <Card key={milestone.id} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : milestone.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-md ${typeConfig.color.replace('bg-', 'bg-opacity-10 text-')}`}>
                      <Icon className="h-5 w-5" weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">
                              {milestone.title || `${typeConfig.label} ${index + 1}`}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {typeConfig.label}
                            </Badge>
                          </div>
                          {milestone.targetDate && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <CalendarBlank className="h-3 w-3" />
                              {new Date(milestone.targetDate).toLocaleDateString('fi-FI', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                          {milestone.description && !isExpanded && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {milestone.description}
                            </p>
                          )}
                        </div>
                        {!disabled && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMilestone(milestone.id);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border bg-muted/20">
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      <div className="space-y-2">
                        <Label htmlFor={`milestone-type-${milestone.id}`}>Tyyppi</Label>
                        <Select
                          value={milestone.type}
                          onValueChange={(value) =>
                            handleUpdateMilestone(milestone.id, { type: value as ScheduleMilestone['type'] })
                          }
                          disabled={disabled}
                        >
                          <SelectTrigger id={`milestone-type-${milestone.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MILESTONE_TYPES.map((type) => {
                              const TypeIcon = type.icon;
                              return (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <TypeIcon className="h-4 w-4" />
                                    {type.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`milestone-date-${milestone.id}`}>Päivämäärä</Label>
                        <Input
                          id={`milestone-date-${milestone.id}`}
                          type="date"
                          value={milestone.targetDate || ''}
                          onChange={(e) =>
                            handleUpdateMilestone(milestone.id, { targetDate: e.target.value })
                          }
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`milestone-title-${milestone.id}`}>Otsikko</Label>
                      <Input
                        id={`milestone-title-${milestone.id}`}
                        value={milestone.title}
                        onChange={(e) =>
                          handleUpdateMilestone(milestone.id, { title: e.target.value })
                        }
                        placeholder={`Esim. ${typeConfig.label} viikolla 42`}
                        disabled={disabled}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`milestone-description-${milestone.id}`}>Kuvaus (valinnainen)</Label>
                      <Textarea
                        id={`milestone-description-${milestone.id}`}
                        value={milestone.description || ''}
                        onChange={(e) =>
                          handleUpdateMilestone(milestone.id, { description: e.target.value })
                        }
                        placeholder="Lisätietoja määräajasta..."
                        rows={2}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
