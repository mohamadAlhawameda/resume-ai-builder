"use client";

import React from "react";
import { LayoutTemplate } from "lucide-react";

const templates = [
  { id: "modern", label: "Modern" },
  { id: "classic", label: "Classic" },
  { id: "minimal", label: "Minimal" },
];

export default function TemplateSelector({ template, setTemplate }) {
  return (
    <div className="relative">
      <label className="text-sm font-medium mr-2 flex items-center">
        <LayoutTemplate className="w-4 h-4 mr-1" /> Template:
      </label>
      <select
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        className="ml-2 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white"
      >
        {templates.map((tpl) => (
          <option key={tpl.id} value={tpl.id}>
            {tpl.label}
          </option>
        ))}
      </select>
    </div>
  );
}
