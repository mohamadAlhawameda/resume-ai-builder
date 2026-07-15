'use client';

import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import Sheet from '@/components/ui/Sheet';
import { useLocale } from '@/i18n/LocaleProvider';
import { WIDGET_LABEL_KEYS, type WidgetKey } from '@/lib/dashboardWidgets';

interface Props {
  open: boolean;
  onClose: () => void;
  order: WidgetKey[];
  hidden: WidgetKey[];
  onOrderChange: (order: WidgetKey[]) => void;
  onToggleHidden: (key: WidgetKey) => void;
}

/** Drag-to-reorder + show/hide for the dashboard sidebar widgets — same
 * interaction pattern as SectionManager.tsx (resume builder), applied to
 * dashboard cards instead of resume sections. */
export default function DashboardCustomizeSheet({ open, onClose, order, hidden, onOrderChange, onToggleHidden }: Props) {
  const { t } = useLocale();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const next = Array.from(order);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    onOrderChange(next);
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('dashboardPage.customizeDashboard')}>
      <p className="text-sm text-muted-foreground mb-4">{t('dashboardPage.customizeDashboardHelper')}</p>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-widgets">
          {(provided) => (
            <ul ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
              {order.map((key, index) => {
                const isHidden = hidden.includes(key);
                return (
                  <Draggable key={key} draggableId={key} index={index}>
                    {(prov, snapshot) => (
                      <li
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2.5 bg-surface border rounded-xl text-sm transition',
                          snapshot.isDragging ? 'border-primary/50 shadow-lg' : 'border-border',
                          isHidden && 'opacity-50'
                        )}
                      >
                        <span
                          {...prov.dragHandleProps}
                          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1.5 -m-1.5"
                          aria-label={t('dashboardPage.dragToReorderAria', { widget: t(WIDGET_LABEL_KEYS[key]) })}
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <span className={clsx('flex-1 font-medium', isHidden ? 'text-muted-foreground line-through' : 'text-foreground')}>
                          {t(WIDGET_LABEL_KEYS[key])}
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleHidden(key)}
                          aria-label={
                            isHidden
                              ? t('dashboardPage.showWidgetAria', { widget: t(WIDGET_LABEL_KEYS[key]) })
                              : t('dashboardPage.hideWidgetAria', { widget: t(WIDGET_LABEL_KEYS[key]) })
                          }
                          className="p-1.5 min-w-11 min-h-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition"
                        >
                          {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </li>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </Sheet>
  );
}
