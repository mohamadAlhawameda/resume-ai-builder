"use client";

import React from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GraduationCap, XCircle } from "lucide-react";
import FloatingInput from "../ui/FloatingInput";
import FloatingTextarea from "../ui/FloatingTextarea"; // Assuming you have this component
import { useLocale } from "@/i18n/LocaleProvider";

// Updated type with optional achievements
type EducationEntry = {
  school: string;
  degree: string;
  from: string;
  to: string;
  achievements?: string;  // <-- new optional field
};

type EducationStepProps = {
  education: EducationEntry[];
  onChange: (index: number, field: keyof EducationEntry, value: string) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
};

export default function EducationStep({
  education,
  onChange,
  addItem,
  removeItem,
}: EducationStepProps) {
  const { t } = useLocale();
  const dragControls = useDragControls();

  const handleReorder = (newOrder: EducationEntry[]) => {
    newOrder.forEach((item, i) => {
      onChange(i, "school", item.school);
      onChange(i, "degree", item.degree);
      onChange(i, "from", item.from);
      onChange(i, "to", item.to);
      onChange(i, "achievements", item.achievements || "");
    });
  };

  return (
    <section className="bg-surface p-6 rounded-2xl shadow-soft-lg border border-border">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">{t('builderPage.stepEducation')}</h2>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="px-4 py-2 min-h-11 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:brightness-110 transition"
        >
          {t('builderPage.addEducation')}
        </button>
      </div>

      {education.length === 0 && (
        <p className="text-sm text-muted-foreground text-center italic py-6">{t('builderPage.noEducationYet')}</p>
      )}

      <Reorder.Group axis="y" values={education} onReorder={handleReorder} className="space-y-6">
        {education.map((item, index) => (
          <Reorder.Item
            key={index}
            value={item}
            dragListener={false}
            dragControls={dragControls}
            className="rounded-xl border border-border bg-muted/40 px-6 py-5 shadow-sm space-y-4 relative"
          >
            <div
              className="text-xs text-muted-foreground font-mono absolute top-0.5 start-3 cursor-move"
              onPointerDown={(e) => dragControls.start(e)}
            >
              {t('builderPage.dragHandle')}
            </div>

            <FloatingInput
              id={`school-${index}`}
              label={t('builderPage.schoolNameLabel')}
              value={item.school}
              onChange={(e) => onChange(index, "school", e.target.value)}
            />

            <FloatingInput
              id={`degree-${index}`}
              label={t('builderPage.degreeProgramLabel')}
              value={item.degree}
              onChange={(e) => onChange(index, "degree", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <FloatingInput
                id={`from-${index}`}
                label={t('builderPage.startYearLabel')}
                value={item.from}
                onChange={(e) => onChange(index, "from", e.target.value)}
              />

              <FloatingInput
                id={`to-${index}`}
                label={t('builderPage.endYearLabel')}
                value={item.to}
                onChange={(e) => onChange(index, "to", e.target.value)}
              />
            </div>

            {/* New optional achievements field */}
            <FloatingTextarea
              id={`achievements-${index}`}
              label={t('builderPage.achievementsOptionalLabel')}
              value={item.achievements || ""}
              onChange={(e) => onChange(index, "achievements", e.target.value)}
            />

            <button
              type="button"
              onClick={() => removeItem(index)}
              className="flex items-center gap-1 text-danger text-sm hover:underline mt-1 min-h-11"
            >
              <XCircle className="w-4 h-4" /> {t('builderPage.removeButton')}
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </section>
  );
}
