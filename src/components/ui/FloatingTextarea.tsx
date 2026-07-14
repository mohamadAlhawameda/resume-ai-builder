"use client";

import React, { TextareaHTMLAttributes } from "react";
import clsx from "clsx";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
}

const FloatingTextarea: React.FC<Props> = ({
  id,
  label,
  value,
  onChange,
  className = "",
  ...rest
}) => {
  return (
    <div className={clsx("relative w-full", className)}>
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        {...rest}
        className={clsx(
          "peer w-full border border-border-strong rounded-md px-3 pt-5 pb-2 text-sm bg-surface text-foreground placeholder-transparent focus:outline-none focus:ring-2 focus:ring-primary",
          rest.disabled && "bg-muted text-muted-foreground",
          className
        )}
        placeholder={label}
        rows={rest.rows || 4}
      />
      <label
        htmlFor={id}
        className="absolute start-3 top-2 text-muted-foreground text-xs transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary"
      >
        {label}
      </label>
    </div>
  );
};

export default FloatingTextarea;
