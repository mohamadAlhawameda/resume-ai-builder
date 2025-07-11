'use client';

import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import FloatingInput from '../ui/FloatingInput';
import { Sparkles } from 'lucide-react';

interface SkillsStepProps {
  skills: string[];
  onChange: (field: string, index: number, key: string | null, value: string) => void;
  addItem: (field: string) => void;
  removeItem: (field: string, index: number) => void;
  getSkillSuggestions?: () => void;
  aiSkillSuggestions?: string[];
  aiLoading?: boolean;
}

export default function SkillsStep({
  skills,
  onChange,
  addItem,
  removeItem,
  getSkillSuggestions,
  aiSkillSuggestions = [],
  aiLoading = false,
}: SkillsStepProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(skills);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    reordered.forEach((item, index) => {
      onChange('skills', index, null, item);
    });
  };

  return (
    <div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="skillsList">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-6 relative"
            >
              {skills.map((skill, index) => (
                <Draggable
                  key={index.toString()}
                  draggableId={index.toString()}
                  index={index}
                >
                  {(provided) => (
                    <div
                      className="relative bg-white border rounded-lg p-5 shadow hover:shadow-md transition"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      {/* Floating Remove Button */}
                      <button
                        type="button"
                        title="Remove Skill"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem('skills', index);
                        }}
                        className="absolute -top-3 -right-3 z-10 bg-white border border-red-300 text-red-600 text-xs px-2 py-0.5 rounded-full shadow hover:bg-red-50 hover:scale-105 transition"
                      >
                        ✕
                      </button>

                      <FloatingInput
                        id={`skill-${index}`}
                        label={`Skill #${index + 1}`}
                        value={skill}
                        onChange={(e) => onChange('skills', index, null, e.target.value)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-4 mt-6">
        <button
          onClick={() => addItem('skills')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          + Add Skill
        </button>

        {getSkillSuggestions && (
          <button
            onClick={getSkillSuggestions}
            disabled={aiLoading}
            className={`inline-flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md transition ${
              aiLoading
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {aiLoading ? 'Generating...' : 'Suggest Skills'}
          </button>
        )}
      </div>

      {/* AI Suggested Skills */}
      {aiSkillSuggestions.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {aiSkillSuggestions.map((skill, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange('skills', skills.length, null, skill)}
              className="bg-gray-100 hover:bg-blue-100 text-sm text-gray-700 border border-gray-300 rounded-full px-4 py-1 transition cursor-pointer shadow-sm hover:shadow"
            >
              {skill}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
