// "use client";

// import React, { InputHTMLAttributes } from "react";
// import clsx from "clsx";

// interface Props extends InputHTMLAttributes<HTMLInputElement> {
//   id: string;
//   label: string;
//   value: string;
//   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
//   className?: string;
// }

// const FloatingInput: React.FC<Props> = ({
//   id,
//   label,
//   value,
//   onChange,
//   className = "",
//   ...rest
// }) => {
//   return (
//     <div className={clsx("relative w-full", className)}>
//       <input
//         id={id}
//         value={value}
//         onChange={onChange}
//         {...rest}
//         className={clsx(
//           "peer h-12 w-full border border-gray-300 rounded-md px-3 pt-5 pb-2 text-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-500",
//           rest.disabled && "bg-gray-100 text-gray-500"
//         )}
//         placeholder={label}
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

// export default FloatingInput;
'use client';

import React, { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  helperText?: string;
  error?: boolean;
}

const FloatingInput: React.FC<Props> = ({
  id,
  label,
  value,
  onChange,
  className = '',
  helperText,
  error = false,
  ...rest
}) => {
  return (
    <div className={clsx('relative w-full', className)}>
      <input
        id={id}
        value={value}
        onChange={onChange}
        {...rest}
        aria-describedby={helperText ? `${id}-helper-text` : undefined}
        aria-invalid={error}
        className={clsx(
          'peer h-12 w-full border rounded-md px-3 pt-5 pb-2 text-sm placeholder-transparent focus:outline-none',
          error
            ? 'border-red-500 focus:ring-2 focus:ring-red-400'
            : 'border-gray-300 focus:ring-2 focus:ring-blue-500',
          rest.disabled && 'bg-gray-100 text-gray-500 cursor-not-allowed'
        )}
        placeholder={label}
      />

      <label
        htmlFor={id}
        className={clsx(
          'absolute left-3 text-xs text-gray-500 transition-all',
          'peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400',
          'peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600'
        )}
      >
        {label}
      </label>

      {helperText && (
        <p
          id={`${id}-helper-text`}
          className={clsx(
            'mt-1 text-xs',
            error ? 'text-red-500' : 'text-gray-500'
          )}
        >
          {helperText}
        </p>
      )}
    </div>
  );
};

export default FloatingInput;
