// "use client";

// import React, { TextareaHTMLAttributes } from "react";
// import clsx from "clsx";

// interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
//   id: string;
//   label: string;
//   value: string;
//   onChange: (value: string) => void;
//   className?: string;
// }

// const FloatingTextarea: React.FC<Props> = ({ id, label, value, onChange, className = "", ...rest }) => {
//   return (
//     <div className={clsx("relative w-full", className)}>
//       <textarea
//         id={id}
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         {...rest}
//         className={clsx(
//           "peer w-full border border-gray-300 rounded-md px-3 pt-5 pb-2 text-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-500",
//           rest.disabled && "bg-gray-100 text-gray-500",
//           className
//         )}
//         placeholder={label}
//         rows={rest.rows || 4}
//       />
//       <label
//         htmlFor={id}
//         className="absolute left-3 top-2 text-gray-500 text-xs transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600"
//       >
//         {label}
//       </label>
//     </div>
//   );
// };

// export default FloatingTextarea;
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
          "peer w-full border border-gray-300 rounded-md px-3 pt-5 pb-2 text-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-500",
          rest.disabled && "bg-gray-100 text-gray-500",
          className
        )}
        placeholder={label}
        rows={rest.rows || 4}
      />
      <label
        htmlFor={id}
        className="absolute left-3 top-2 text-gray-500 text-xs transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600"
      >
        {label}
      </label>
    </div>
  );
};

export default FloatingTextarea;
