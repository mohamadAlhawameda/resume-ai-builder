'use client';

import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Eye, EyeOff, Palette, Type, AlignVerticalSpaceAround } from 'lucide-react';
import clsx from 'clsx';
import {
  SECTION_LABELS,
  DEFAULT_SECTION_ORDER,
  type SectionKey,
  type TemplateCustomization,
} from '@/lib/types';

const ACCENT_PRESETS = ['#2563eb', '#0f766e', '#7c3aed', '#b91c1c', '#c2410c', '#0f172a'];

interface SectionManagerProps {
  sectionOrder: SectionKey[];
  hiddenSections: SectionKey[];
  customization: TemplateCustomization;
  onOrderChange: (order: SectionKey[]) => void;
  onToggleSection: (section: SectionKey) => void;
  onCustomizationChange: (c: TemplateCustomization) => void;
}

/** Drag-to-reorder sections, hide/show them, and tune the template look. */
export default function SectionManager({
  sectionOrder,
  hiddenSections,
  customization,
  onOrderChange,
  onToggleSection,
  onCustomizationChange,
}: SectionManagerProps) {
  const order = sectionOrder.length > 0 ? sectionOrder : DEFAULT_SECTION_ORDER;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const next = Array.from(order);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    onOrderChange(next);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Section order</h3>
        <p className="text-xs text-slate-500 mb-3">Drag to reorder. Toggle the eye to hide a section from the resume.</p>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <ul ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                {order.map((key, index) => {
                  const hidden = hiddenSections.includes(key);
                  return (
                    <Draggable key={key} draggableId={key} index={index}>
                      {(prov, snapshot) => (
                        <li
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          className={clsx(
                            'flex items-center gap-2 px-3 py-2.5 bg-white border rounded-xl text-sm transition',
                            snapshot.isDragging ? 'border-blue-400 shadow-lg' : 'border-slate-200',
                            hidden && 'opacity-50'
                          )}
                        >
                          <span
                            {...prov.dragHandleProps}
                            className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
                            aria-label={`Drag to reorder ${SECTION_LABELS[key]}`}
                          >
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <span className={clsx('flex-1 font-medium', hidden ? 'text-slate-400 line-through' : 'text-slate-700')}>
                            {SECTION_LABELS[key]}
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleSection(key)}
                            aria-label={hidden ? `Show ${SECTION_LABELS[key]}` : `Hide ${SECTION_LABELS[key]}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          >
                            {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-slate-400" aria-hidden /> Accent color
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {ACCENT_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Accent color ${color}`}
              onClick={() => onCustomizationChange({ ...customization, accentColor: color })}
              className={clsx(
                'w-8 h-8 rounded-full border-2 transition-transform hover:scale-110',
                customization.accentColor === color ? 'border-slate-900 scale-110' : 'border-transparent'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          <label className="relative w-8 h-8 rounded-full border-2 border-dashed border-slate-300 cursor-pointer overflow-hidden hover:border-slate-500 transition" title="Custom color">
            <input
              type="color"
              value={customization.accentColor}
              onChange={(e) => onCustomizationChange({ ...customization, accentColor: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Custom accent color"
            />
            <span className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">+</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="fontFamily" className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
            <Type className="w-4 h-4 text-slate-400" aria-hidden /> Font
          </label>
          <select
            id="fontFamily"
            value={customization.fontFamily}
            onChange={(e) => onCustomizationChange({ ...customization, fontFamily: e.target.value as TemplateCustomization['fontFamily'] })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="sans">Sans-serif</option>
            <option value="serif">Serif</option>
            <option value="mono">Monospace</option>
          </select>
        </div>
        <div>
          <label htmlFor="density" className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
            <AlignVerticalSpaceAround className="w-4 h-4 text-slate-400" aria-hidden /> Spacing
          </label>
          <select
            id="density"
            value={customization.density}
            onChange={(e) => onCustomizationChange({ ...customization, density: e.target.value as TemplateCustomization['density'] })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="relaxed">Relaxed</option>
          </select>
        </div>
      </div>
    </div>
  );
}
