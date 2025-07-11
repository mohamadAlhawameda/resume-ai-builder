// "use client";

// import React, { useState, useEffect, useCallback, useRef } from "react";
// import { useRouter } from "next/navigation";
// import jsPDF from "jspdf";
// import html2canvas from "html2canvas";
// import ModernTemplate from "@/components/resumeTemplates/ModernTemplate";
// import ClassicTemplate from "@/components/resumeTemplates/ClassicTemplate";
// import MinimalTemplate from "@/components/resumeTemplates/MinimalTemplate";
// import {
//   Mail,
//   Phone,
//   Linkedin,
//   Github,
//   User,
//   MapPin,
//   Landmark,
//   CheckCircle,
//   XCircle,
//   School,
//   Book,
//   Calendar,
//   Building2,
//   Briefcase,
//   MessageSquare
// } from 'lucide-react';

// import clsx from 'clsx';
// import { motion, AnimatePresence, Reorder } from 'framer-motion';


// function ContactStep({
//   formData,
//   onChange,
//   onSummaryChange,
//   summary,
//   getSummarySuggestions,
//   aiSummarySuggestions,
//   applySummarySuggestion,
//   aiLoading,
//   isDeveloper,
//   onDeveloperToggle,
// }) {
//   const isFilled = (val: string | undefined) => val?.trim().length > 0;
//   const fields = [
//     {
//       id: 'fullName',
//       label: 'Full Name',
//       icon: <User className="w-5 h-5" />,
//     },
//     {
//       id: 'email',
//       label: 'Email Address',
//       icon: <Mail className="w-5 h-5" />,
//     },
//     {
//       id: 'phone',
//       label: 'Phone Number',
//       icon: <Phone className="w-5 h-5" />,
//     },
//     {
//       id: 'city',
//       label: 'City',
//       icon: <MapPin className="w-5 h-5" />,
//     },
//     {
//       id: 'postalCode',
//       label: 'Postal Code',
//       icon: <Landmark className="w-5 h-5" />,
//     },
//     {
//       id: 'linkedIn',
//       label: 'LinkedIn URL',
//       icon: <Linkedin className="w-5 h-5" />,
//     },
//   ];

//   return (
//     <motion.section
//       initial={{ opacity: 0, y: 30 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.6, ease: 'easeOut' }}
//       className="bg-white p-8 rounded-2xl shadow-xl space-y-10"
//     >
//       {/* Header */}
//       <div className="text-center">
//         <h2 className="text-3xl font-bold text-gray-900 mb-1">Contact Information</h2>
//         <p className="text-gray-500 text-sm">
//           Let our AI help you build the perfect resume — starting with your details.
//         </p>
//       </div>

//       {/* Fields */}
//       <div className="grid md:grid-cols-2 gap-6">
//         {fields.map(({ id, label, icon }) => (
//           <div key={id} className="relative">
//             <div className="relative border border-gray-300 rounded-lg px-3 pt-6 pb-2 bg-white shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500">
//               {/* Floating Label */}
//               <label
//                 htmlFor={id}
//                 className={clsx(
//                   'absolute left-11 text-sm transition-all duration-200 pointer-events-none bg-white px-1',
//                   isFilled(formData[id])
//                     ? 'top-1 text-xs text-blue-600'
//                     : 'top-5 text-gray-400'
//                 )}
//               >
//                 {label}
//               </label>

//               {/* Icon + Input + Checkmark */}
//               <div className="flex items-center space-x-3 mt-1">
//                 <div className="text-blue-500">{icon}</div>
//                 <input
//                   id={id}
//                   type="text"
//                   placeholder=""
//                   value={formData[id] || ''}
//                   onChange={(e) => onChange(id, null, null, e.target.value)}
//                   className="w-full bg-transparent focus:outline-none text-gray-900 placeholder:text-transparent pt-1.5"
//                 />
//                 <AnimatePresence>
//                   {isFilled(formData[id]) && (
//                     <motion.div
//                       initial={{ scale: 0, opacity: 0 }}
//                       animate={{ scale: 1, opacity: 1 }}
//                       exit={{ scale: 0, opacity: 0 }}
//                       transition={{ type: 'spring', stiffness: 300, damping: 20 }}
//                     >
//                       <CheckCircle className="text-green-500 w-5 h-5" />
//                     </motion.div>
//                   )}
//                 </AnimatePresence>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Developer Toggle */}
//       <div className="flex items-center gap-3 mt-2">
//         <input
//           id="isDeveloper"
//           type="checkbox"
//           checked={isDeveloper}
//           onChange={(e) => onDeveloperToggle(e.target.checked)}
//           className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//         />
//         <label htmlFor="isDeveloper" className="text-sm text-gray-700">
//           I am a developer
//         </label>
//       </div>

//       {/* GitHub Field */}
//       {isDeveloper && (
//         <div className="relative">
//           <div className="relative border border-gray-300 rounded-lg px-3 pt-6 pb-2 bg-white shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500">
//             <label
//               htmlFor="github"
//               className={clsx(
//                 'absolute left-11 text-sm transition-all duration-200 pointer-events-none bg-white px-1',
//                 isFilled(formData.github)
//                   ? 'top-1 text-xs text-blue-600'
//                   : 'top-5 text-gray-400'
//               )}
//             >
//               GitHub URL
//             </label>
//             <div className="flex items-center space-x-3 mt-1">
//               <div className="text-blue-500">
//                 <Github className="w-5 h-5" />
//               </div>
//               <input
//                 id="github"
//                 type="text"
//                 placeholder=""
//                 value={formData.github || ''}
//                 onChange={(e) => onChange('github', null, null, e.target.value)}
//                 className="w-full bg-transparent focus:outline-none text-gray-900 placeholder:text-transparent pt-1.5"
//               />
//               <AnimatePresence>
//                 {isFilled(formData.github) && (
//                   <motion.div
//                     initial={{ scale: 0, opacity: 0 }}
//                     animate={{ scale: 1, opacity: 1 }}
//                     exit={{ scale: 0, opacity: 0 }}
//                     transition={{ type: 'spring', stiffness: 300, damping: 20 }}
//                   >
//                     <CheckCircle className="text-green-500 w-5 h-5" />
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Summary Section */}
//       <div className="mt-8 space-y-2">
//         <div className="flex justify-between items-center">
//           <h3 className="text-lg font-semibold text-gray-900">Professional Summary</h3>
//           <button
//             type="button"
//             onClick={getSummarySuggestions}
//             disabled={aiLoading || !summary.trim()}
//             className={`text-sm font-medium ${
//               aiLoading
//                 ? 'text-gray-400 cursor-not-allowed'
//                 : 'text-purple-600 hover:underline'
//             }`}
//           >
//             {aiLoading ? 'Generating...' : 'AI Suggestion'}
//           </button>
//         </div>
//         <textarea
//           name="summary"
//           id="summary"
//           rows={4}
//           placeholder="Briefly describe your experience and career goals..."
//           value={summary || ''}
//           onChange={(e) => onSummaryChange(e.target.value)}
//           className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
//         />
//         {aiSummarySuggestions.length > 0 && (
//           <ul className="mt-3 bg-purple-50 border border-purple-300 rounded-md p-3 space-y-2 max-h-48 overflow-auto text-sm">
//             {aiSummarySuggestions.map((sugg, i) => (
//               <li key={i}>
//                 <button
//                   onClick={() => applySummarySuggestion(sugg)}
//                   className="text-blue-600 hover:underline text-left w-full"
//                 >
//                   {sugg}
//                 </button>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//     </motion.section>
//   );
// }
// const MemoizedContactStep = React.memo(ContactStep);

// function EducationStep({ education, addItem, removeItem, onChange }) {
//   const isFilled = (val) => val?.trim().length > 0;

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <h2 className="text-xl font-semibold">Education</h2>
//         <button
//           type="button"
//           onClick={() => addItem('education')}
//           className="text-blue-600 hover:underline text-sm font-medium"
//         >
//           + Add
//         </button>
//       </div>

//       <AnimatePresence>
//         {education.map((edu, i) => (
//          <motion.div
//   key={i}
//   initial={{ opacity: 0, y: 10 }}
//   animate={{ opacity: 1, y: 0 }}
//   exit={{ opacity: 0, y: 10 }}
//   transition={{ duration: 0.25 }}
//   className="mb-4 relative border border-gray-300 rounded-lg p-6 shadow-sm bg-white"
//   style={{ overflow: 'visible' }} // allow remove button to overflow if needed
// >
//   <button
//     type="button"
//     onClick={() => removeItem('education', i)}
//     className="absolute -top-3 -right-3 text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-full bg-white p-1 shadow-lg z-10"
//     title="Remove"
//     aria-label="Remove education entry"
//   >
//     <XCircle className="w-6 h-6" />
//   </button>

//             {/* School */}
//             <FloatingInput
//               id={`school-${i}`}
//               label="School"
//               icon={<School className="w-5 h-5 text-blue-600" />}
//               value={edu.school}
//               onChange={(val) => onChange('education', i, 'school', val)}
//             />

//             {/* Degree */}
//             <FloatingInput
//               id={`degree-${i}`}
//               label="Degree"
//               icon={<Book className="w-5 h-5 text-blue-600" />}
//               value={edu.degree}
//               onChange={(val) => onChange('education', i, 'degree', val)}
//             />

//             {/* From / To */}
//             <div className="flex gap-4 mt-4">
//               <FloatingInput
//                 id={`from-${i}`}
//                 label="From"
//                 icon={<Calendar className="w-5 h-5 text-blue-600" />}
//                 value={edu.from}
//                 onChange={(val) => onChange('education', i, 'from', val)}
//                 className="flex-1"
//               />
//               <FloatingInput
//                 id={`to-${i}`}
//                 label="To"
//                 icon={<Calendar className="w-5 h-5 text-blue-600" />}
//                 value={edu.to}
//                 onChange={(val) => onChange('education', i, 'to', val)}
//                 className="flex-1"
//               />
//             </div>
//           </motion.div>
//         ))}
//       </AnimatePresence>
//     </div>
//   );
// }

// function FloatingInput({ id, label, icon, value, onChange, className = '' }) {
//   const isFilled = value?.trim().length > 0;

//   return (
//     <div className={clsx('relative', className)}>
//       <div className="relative border border-gray-300 rounded-md px-3 pt-5 pb-2 bg-white shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500">
//         <label
//           htmlFor={id}
//           className={clsx(
//             'absolute left-10 text-sm pointer-events-none bg-white px-1 transition-all duration-200',
//             isFilled ? 'top-1 text-xs text-blue-600' : 'top-4 text-gray-400'
//           )}
//         >
//           {label}
//         </label>

//         <div className="flex items-center space-x-3 mt-1">
//           <div className="text-blue-600">{icon}</div>
//           <input
//             id={id}
//             type="text"
//             placeholder=""
//             value={value}
//             onChange={(e) => onChange(e.target.value)}
//             className="w-full bg-transparent focus:outline-none text-gray-900 placeholder-transparent pt-1.5"
//           />
//           {isFilled && (
//             <motion.div
//               initial={{ scale: 0, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0, opacity: 0 }}
//               transition={{ type: 'spring', stiffness: 300, damping: 20 }}
//             >
//               <CheckCircle className="text-green-500 w-5 h-5" />
//             </motion.div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// const MemoizedEducationStep = React.memo(EducationStep);

//   function ExperienceStep({
//   experience,
//   addItem,
//   removeItem,
//   onChange,
//   getExperienceSuggestions,
//   aiExpSuggestions,
//   applyExperienceSuggestion,
//   aiLoading,
// }) {
//   // Auto-add one experience if empty
//   useEffect(() => {
//     if (experience.length === 0) {
//       addItem('experience');
//     }
//   }, [experience, addItem]);

//   const [errors, setErrors] = useState({});

//   function handleBlur(index, field, value) {
//     setErrors((prev) => ({
//       ...prev,
//       [`${index}-${field}`]: value.trim() === '',
//     }));
//   }

//   return (
//     <section className="space-y-8">
//       <div className="flex justify-between items-center">
//         <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 select-none">Experience</h2>
//         <button
//           type="button"
//           onClick={() => addItem('experience')}
//           className="text-blue-600 hover:underline font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-600 rounded"
//           aria-label="Add Experience"
//         >
//           + Add
//         </button>
//       </div>

//       <AnimatePresence>
//         {experience.map((exp, i) => (
//           <motion.div
//             key={i}
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: 20 }}
//             transition={{ duration: 0.3 }}
//             className="relative border border-gray-300 dark:border-gray-700 rounded-2xl p-6 shadow-md bg-white dark:bg-gray-800"
//           >
//             {/* Remove Button */}
//             <button
//               type="button"
//               onClick={() => removeItem('experience', i)}
//               className="absolute -top-3 -right-3 text-red-600 hover:text-red-900 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-full bg-white dark:bg-gray-900 p-1 shadow-lg z-20"
//               title="Remove"
//               aria-label="Remove experience entry"
//             >
//               <XCircle className="w-6 h-6" />
//             </button>

//             {/* Company */}
//             <FloatingInput
//               id={`company-${i}`}
//               label="Company"
//               icon={<Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
//               value={exp.company}
//               onChange={(val) => onChange('experience', i, 'company', val)}
//               error={errors[`${i}-company`]}
//               onBlur={(val) => handleBlur(i, 'company', val)}
//             />

//             {/* Role/Title */}
//             <FloatingInput
//               id={`role-${i}`}
//               label="Role / Title"
//               icon={<Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
//               value={exp.role}
//               onChange={(val) => onChange('experience', i, 'role', val)}
//               error={errors[`${i}-role`]}
//               onBlur={(val) => handleBlur(i, 'role', val)}
//             />

//             {/* From / To */}
//             <div className="flex gap-6 mt-5">
//               <FloatingInput
//                 id={`from-${i}`}
//                 label="From"
//                 icon={<Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
//                 value={exp.from}
//                 onChange={(val) => onChange('experience', i, 'from', val)}
//                 error={errors[`${i}-from`]}
//                 onBlur={(val) => handleBlur(i, 'from', val)}
//                 className="flex-1"
//               />
//               <FloatingInput
//                 id={`to-${i}`}
//                 label="To"
//                 icon={<Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
//                 value={exp.to}
//                 onChange={(val) => onChange('experience', i, 'to', val)}
//                 error={errors[`${i}-to`]}
//                 onBlur={(val) => handleBlur(i, 'to', val)}
//                 className="flex-1"
//               />
//             </div>

//             {/* Description */}
//             <FloatingTextarea
//               id={`description-${i}`}
//               label="Description"
//               icon={<MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
//               value={exp.description}
//               onChange={(val) => onChange('experience', i, 'description', val)}
//               error={errors[`${i}-description`]}
//               onBlur={(val) => handleBlur(i, 'description', val)}
//               rows={4}
//             />

//             {/* AI Suggestion Button */}
//             <button
//               type="button"
//               onClick={() => getExperienceSuggestions(i)}
//               disabled={aiLoading || !exp.description.trim()}
//               className={clsx(
//                 'mt-1 text-purple-600 hover:underline text-sm transition disabled:text-gray-400 disabled:cursor-not-allowed',
//                 aiLoading && 'animate-pulse'
//               )}
//             >
//               {aiExpSuggestions[i]?.length > 0
//                 ? 'View AI Suggestions'
//                 : aiLoading
//                 ? 'Loading...'
//                 : 'AI Suggestion'}
//             </button>

//             {/* AI Suggestions List */}
//             <AnimatePresence>
//               {aiExpSuggestions[i]?.length > 0 && (
//                 <motion.ul
//                   initial={{ opacity: 0, height: 0 }}
//                   animate={{ opacity: 1, height: 'auto' }}
//                   exit={{ opacity: 0, height: 0 }}
//                   transition={{ duration: 0.3 }}
//                   className="bg-purple-50 p-3 rounded border border-purple-300 max-h-32 overflow-auto mt-2 list-disc list-inside"
//                 >
//                   {aiExpSuggestions[i].map((sugg, idx) => (
//                     <li key={idx}>
//                       <button
//                         type="button"
//                         className="text-blue-600 hover:underline focus:outline-none"
//                         onClick={() => applyExperienceSuggestion(i, sugg)}
//                       >
//                         {sugg}
//                       </button>
//                     </li>
//                   ))}
//                 </motion.ul>
//               )}
//             </AnimatePresence>
//           </motion.div>
//         ))}
//       </AnimatePresence>
//     </section>
//   );
// }

// // Floating input with label + icon + checkmark + validation
// function ExpFloatingTextarea({ id, label, icon, value, onChange, error, onBlur, className = '' }) {
//   const [touched, setTouched] = useState(false);
//   const isFilled = value?.trim().length > 0;
//   const showError = touched && error;

//   function handleBlurInternal(e) {
//     setTouched(true);
//     onBlur && onBlur(e.target.value);
//   }

//   return (
//     <div className={clsx('relative', className)}>
//       <div
//         className={clsx(
//           'relative border rounded-md px-3 pt-5 pb-2 bg-white shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500',
//           showError
//             ? 'border-red-500 focus-within:ring-red-500'
//             : 'border-gray-300 focus-within:ring-blue-500 dark:bg-gray-800 dark:text-gray-200',
//           'dark:border-gray-700'
//         )}
//       >
//         <label
//           htmlFor={id}
//           className={clsx(
//             'absolute left-10 text-sm pointer-events-none bg-white px-1 transition-all duration-200 dark:bg-gray-800',
//             isFilled ? 'top-1 text-xs text-blue-600 dark:text-blue-400' : 'top-4 text-gray-400 dark:text-gray-400'
//           )}
//         >
//           {label}
//         </label>

//         <div className="flex items-center space-x-3 mt-1">
//           <div className="text-blue-600 dark:text-blue-400">{icon}</div>
//           <input
//             id={id}
//             type="text"
//             placeholder=""
//             value={value}
//             onChange={(e) => onChange(e.target.value)}
//             onBlur={handleBlurInternal}
//             className={clsx(
//               'w-full bg-transparent focus:outline-none placeholder-transparent pt-1.5',
//               showError ? 'text-red-700' : 'text-gray-900 dark:text-gray-100'
//             )}
//             aria-invalid={showError}
//             aria-describedby={showError ? `${id}-error` : undefined}
//           />
//           {isFilled && !showError && (
//             <motion.div
//               initial={{ scale: 0, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0, opacity: 0 }}
//               transition={{ type: 'spring', stiffness: 300, damping: 20 }}
//             >
//               <CheckCircle className="text-green-500 w-5 h-5" />
//             </motion.div>
//           )}
//         </div>
//       </div>

//       {showError && (
//         <p id={`${id}-error`} className="mt-1 text-xs text-red-600 select-none" role="alert">
//           This field is required
//         </p>
//       )}
//     </div>
//   );
// }

// // Floating textarea with label + icon + checkmark + validation
// function FloatingTextarea({ id, label, icon, value, onChange, error, onBlur, rows = 3 }) {
//   const [touched, setTouched] = useState(false);
//   const isFilled = value?.trim().length > 0;
//   const showError = touched && error;

//   function handleBlurInternal(e) {
//     setTouched(true);
//     onBlur && onBlur(e.target.value);
//   }

//   return (
//     <div className="relative mt-5">
//       <div
//         className={clsx(
//           'relative border rounded-md px-3 pt-5 pb-2 bg-white shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500',
//           showError
//             ? 'border-red-500 focus-within:ring-red-500'
//             : 'border-gray-300 focus-within:ring-blue-500 dark:bg-gray-800 dark:text-gray-200',
//           'dark:border-gray-700'
//         )}
//       >
//         <label
//           htmlFor={id}
//           className={clsx(
//             'absolute left-10 text-sm pointer-events-none bg-white px-1 transition-all duration-200 dark:bg-gray-800',
//             isFilled ? 'top-1 text-xs text-blue-600 dark:text-blue-400' : 'top-4 text-gray-400 dark:text-gray-400'
//           )}
//         >
//           {label}
//         </label>

//         <div className="flex items-start space-x-3 mt-1">
//           <div className="pt-2 text-blue-600 dark:text-blue-400">{icon}</div>
//           <textarea
//             id={id}
//             rows={rows}
//             placeholder=""
//             value={value}
//             onChange={(e) => onChange(e.target.value)}
//             onBlur={handleBlurInternal}
//             className={clsx(
//               'w-full bg-transparent focus:outline-none placeholder-transparent resize-none pt-1.5 text-gray-900 dark:text-gray-100',
//               showError && 'text-red-700'
//             )}
//             aria-invalid={showError}
//             aria-describedby={showError ? `${id}-error` : undefined}
//           />
//           {isFilled && !showError && (
//             <motion.div
//               className="mt-2"
//               initial={{ scale: 0, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0, opacity: 0 }}
//               transition={{ type: 'spring', stiffness: 300, damping: 20 }}
//             >
//               <CheckCircle className="text-green-500 w-5 h-5" />
//             </motion.div>
//           )}
//         </div>
//       </div>

//       {showError && (
//         <p id={`${id}-error`} className="mt-1 text-xs text-red-600 select-none" role="alert">
//           This field is required
//         </p>
//       )}
//     </div>
//   );
// }



// const MemoizedExperienceStep = React.memo(ExperienceStep);

// function SkillsStep({
//   skills,
//   addItem,
//   removeItem,
//   onChange,
//   getSkillSuggestions,
//   aiSkillSuggestions,
//   aiLoading,
// }) {
//   return (
//     <div className="space-y-6">
//       <h2 className="text-xl font-semibold mb-3 flex justify-between items-center">
//         Skills
//         <button
//           type="button"
//           onClick={getSkillSuggestions}
//           disabled={aiLoading}
//           className="text-purple-600 hover:underline text-sm"
//         >
//           {aiLoading ? "Loading..." : "Suggest Skills"}
//         </button>
//       </h2>

//       {skills.map((skill, i) => (
//         <div key={i} className="flex items-center mb-2 gap-2">
//           <input
//             type="text"
//             placeholder="Skill"
//             value={skill}
//             onChange={(e) => onChange("skills", i, null, e.target.value)}
//             className="flex-grow p-1 border rounded border-gray-300"
//           />
//           <button
//             type="button"
//             onClick={() => removeItem("skills", i)}
//             className="text-red-600 font-bold hover:text-red-900"
//             title="Remove"
//           >
//             ×
//           </button>
//         </div>
//       ))}

//       <button
//         type="button"
//         onClick={() => addItem("skills")}
//         className="text-blue-600 hover:underline text-sm mt-1"
//       >
//         + Add Skill
//       </button>

//       {aiSkillSuggestions.length > 0 && (
//         <div className="mt-4">
//           <h3 className="text-sm font-semibold mb-2 text-gray-700">
//             AI Suggested Skills:
//           </h3>
//           <div className="flex flex-wrap gap-2">
//             {aiSkillSuggestions
//               .filter((sugg) => {
//                 const wordCount = sugg.trim().split(/\s+/).length;
//                 return wordCount >= 1 && wordCount <= 2;
//               })
//               .map((sugg, i) => (
//                 <button
//                   key={i}
//                   onClick={() => onChange("skills", skills.length, null, sugg)}
//                   className="bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 text-sm"
//                 >
//                   {sugg}
//                 </button>
//               ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
// const MemoizedSkillsStep = React.memo(SkillsStep);

// function ResumePreview({ data = {} }) {
//   const containerRef = useRef(null);

//   const downloadPDF = async () => {
//     if (!containerRef.current) return;

//     try {
//       const canvas = await html2canvas(containerRef.current, { scale: 2 });
//       const imgData = canvas.toDataURL("image/png");
//       const pdf = new jsPDF("p", "pt", "a4");
//       const pdfWidth = pdf.internal.pageSize.getWidth();
//       const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
//       pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
//       pdf.save(`${data.fullName ? data.fullName.replace(/\s+/g, "_") : "resume"}.pdf`);
//     } catch (error) {
//       console.error("Failed to generate PDF:", error);
//       alert("Oops! Something went wrong while generating the PDF.");
//     }
//   };

//   return (
//     <div>
//       <div
//         ref={containerRef}
//         className="bg-white p-6 rounded shadow max-w-3xl mx-auto text-black"
//         style={{ fontFamily: "'Arial', sans-serif", lineHeight: 1.5 }}
//       >
//         <header className="mb-6">
//           <h1 className="text-3xl font-bold">{data.fullName || "Your Name"}</h1>
//           <p className="text-sm text-gray-800">
//             {data.email || "email@example.com"} | {data.phone || "Phone Number"} |{" "}
//             {data.linkedIn ? (
//               <a
//                 href={data.linkedIn}
//                 className="text-blue-600 underline"
//                 target="_blank"
//                 rel="noreferrer"
//               >
//                 LinkedIn
//               </a>
//             ) : (
//               "LinkedIn"
//             )}
//             {data.isDeveloper && data.github && (
//               <>
//                 {" "}
//                 |{" "}
//                 <a
//                   href={data.github}
//                   className="text-blue-600 underline"
//                   target="_blank"
//                   rel="noreferrer"
//                 >
//                   GitHub
//                 </a>
//               </>
//             )}
//           </p>
//         </header>

//         {data.summary && (
//           <section className="mb-6">
//             <h2 className="text-xl font-semibold border-b border-gray-300 pb-1 mb-2">
//               Professional Summary
//             </h2>
//             <p>{data.summary}</p>
//           </section>
//         )}

//         {data.education && data.education.length > 0 && (
//           <section className="mb-6">
//             <h2 className="text-xl font-semibold border-b border-gray-300 pb-1 mb-2">
//               Education
//             </h2>
//             <ul>
//               {data.education.map((edu, i) => (
//                 <li key={i} className="mb-2">
//                   <strong>{edu.degree || "Degree"}</strong>, {edu.school || "School"} <br />
//                   <span className="text-gray-700 text-sm">
//                     {edu.from || "Start"} - {edu.to || "End"}
//                   </span>
//                 </li>
//               ))}
//             </ul>
//           </section>
//         )}

//         {data.experience && data.experience.length > 0 && (
//           <section className="mb-6">
//             <h2 className="text-xl font-semibold border-b border-gray-300 pb-1 mb-2">
//               Experience
//             </h2>
//             <ul>
//               {data.experience.map((exp, i) => (
//                 <li key={i} className="mb-4">
//                   <strong>{exp.role || "Role"}</strong>, {exp.company || "Company"} <br />
//                   <span className="text-gray-700 text-sm">
//                     {exp.from || "Start"} - {exp.to || "End"}
//                   </span>
//                   <p className="mt-1 whitespace-pre-line">{exp.description || "Description"}</p>
//                 </li>
//               ))}
//             </ul>
//           </section>
//         )}

//         {data.skills && data.skills.length > 0 && (
//           <section>
//             <h2 className="text-xl font-semibold border-b border-gray-300 pb-1 mb-2">Skills</h2>
//             <ul className="flex flex-wrap gap-2">
//               {data.skills.map((skill, i) => (
//                 <li key={i} className="bg-gray-200 rounded px-3 py-1 text-sm">
//                   {skill}
//                 </li>
//               ))}
//             </ul>
//           </section>
//         )}
//       </div>

//       <div className="text-center mt-6">
//         <button
//           onClick={downloadPDF}
//           className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
//         >
//           Download PDF
//         </button>
//       </div>
//     </div>
//   );
// }

// export default function ResumePage() {
//   const router = useRouter();

//   const [step, setStep] = useState(0);
//   const [formData, setFormData] = useState({
//     fullName: "",
//     email: "",
//     phone: "",
//     linkedIn: "",
//     github: "",
//     isDeveloper: false,
//     summary: "",
//     education: [],
//     experience: [],
//     skills: [],
//   });

//   const [aiSummarySuggestions, setAiSummarySuggestions] = useState([]);
//   const [aiExpSuggestions, setAiExpSuggestions] = useState([]); // array per experience item
//   const [aiSkillSuggestions, setAiSkillSuggestions] = useState([]);
//   const [aiLoading, setAiLoading] = useState(false);
// const onStepChange = (newStep: number) => {
//   if (newStep < 0 || newStep > 3) return;
//   setStep(newStep);
// };

//   // Split experience ai suggestions by index
//   // Initialize experience suggestions array if empty
//   useEffect(() => {
//     if (formData.experience.length > 0 && aiExpSuggestions.length < formData.experience.length) {
//       setAiExpSuggestions((old) => {
//         const newArr = [...old];
//         while (newArr.length < formData.experience.length) {
//           newArr.push([]);
//         }
//         return newArr;
//       });
//     }
//   }, [formData.experience.length, aiExpSuggestions.length]);

//   const onChange = useCallback(
//     (field, index, key, value) => {
//       setFormData((old) => {
//         const newData = { ...old };
//         if (index === null) {
//           newData[field] = value;
//         } else if (typeof index === "number" && key) {
//           // For education or experience arrays
//           newData[field] = [...(newData[field] || [])];
//           newData[field][index] = { ...newData[field][index], [key]: value };
//         } else if (typeof index === "number") {
//           // For skills array, key is null
//           newData[field] = [...(newData[field] || [])];
//           newData[field][index] = value;
//         }
//         return newData;
//       });
//     },
//     [setFormData]
//   );

//   const addItem = (field) => {
//     setFormData((old) => {
//       const newData = { ...old };
//       if (field === "education") {
//         newData.education = [...(old.education || []), { school: "", degree: "", from: "", to: "" }];
//       } else if (field === "experience") {
//         newData.experience = [
//           ...(old.experience || []),
//           { company: "", role: "", from: "", to: "", description: "" },
//         ];
//       } else if (field === "skills") {
//         newData.skills = [...(old.skills || []), ""];
//       }
//       return newData;
//     });
//   };

//   const removeItem = (field, index) => {
//     setFormData((old) => {
//       const newData = { ...old };
//       if (Array.isArray(newData[field])) {
//         newData[field] = [...newData[field]];
//         newData[field].splice(index, 1);
//       }
//       return newData;
//     });

//     // Also clear AI suggestions for that index if experience
//     if (field === "experience") {
//       setAiExpSuggestions((old) => {
//         const newArr = [...old];
//         newArr.splice(index, 1);
//         return newArr;
//       });
//     }
//   };

//   const onSummaryChange = (val) => {
//     setFormData((old) => ({ ...old, summary: val }));
//   };

//   const onDeveloperToggle = (checked) => {
//     setFormData((old) => ({
//       ...old,
//       isDeveloper: checked,
//       github: checked ? old.github : "",
//     }));
//   };

//   // Call AI /ai/suggest endpoint for summary suggestions
// const getSummarySuggestions = async () => {
//   if (!formData.summary.trim()) return;
//   setAiLoading(true);
//   try {
//     // Get token from storage
//     const token = localStorage.getItem("token") || sessionStorage.getItem("token");
//     if (!token) {
//       alert("You are not logged in.");
//       setAiLoading(false);
//       return;
//     }

//     const response = await fetch("http://localhost:3001/ai/suggest", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,  // <-- Add token here
//       },
//       body: JSON.stringify({
//         prompt: `Suggest improvements or rewrite for this professional summary: ${formData.summary}`,
//         type: "summary",
//       }),
//     });

//     if (response.status === 401) {
//       alert("Unauthorized. Please log in again.");
//       setAiLoading(false);
//       return;
//     }

//     const data = await response.json();
//     setAiSummarySuggestions(data.suggestions || []);
//     console.log("AI summary response data:", data);
//   } catch (error) {
//     console.error("AI summary suggestion error:", error);
//     alert("Failed to get AI summary suggestions");
//   }
//   setAiLoading(false);
// };



//   const applySummarySuggestion = (sugg) => {
//     setFormData((old) => ({ ...old, summary: sugg }));
//     setAiSummarySuggestions([]);
//   };

//   // Call AI /ai/suggest endpoint for experience suggestions (for one experience description)
//  const getExperienceSuggestions = async (index) => {
//   const exp = formData.experience[index];
//   if (!exp || !exp.description.trim()) return;

//   setAiLoading(true);

//   try {
//     const token = localStorage.getItem("token") || sessionStorage.getItem("token");
//     if (!token) {
//       alert("You are not logged in.");
//       setAiLoading(false);
//       return;
//     }

//     const response = await fetch("http://localhost:3001/ai/suggest", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`, // ✅ include token
//       },
//       body: JSON.stringify({
//         prompt: `Suggest improvements or rewrite for this experience description: ${exp.description}`,
//         type: "experience",
//       }),
//     });

//     const data = await response.json();

//     setAiExpSuggestions((old) => {
//       const newArr = [...old];
//       newArr[index] = data.suggestions || [];
//       return newArr;
//     });
//   } catch (error) {
//     console.error("AI experience suggestion error:", error);
//     alert("Failed to get AI experience suggestions");
//   }

//   setAiLoading(false);
// };


//   const applyExperienceSuggestion = (index, sugg) => {
//     setFormData((old) => {
//       const newData = { ...old };
//       if (newData.experience && newData.experience[index]) {
//         newData.experience[index].description = sugg;
//       }
//       return newData;
//     });
//     setAiExpSuggestions((old) => {
//       const newArr = [...old];
//       newArr[index] = [];
//       return newArr;
//     });
//   };

//   // Call AI /ai/suggest endpoint for skill suggestions
//   const getSkillSuggestions = async () => {
//   setAiLoading(true);
//   try {
//     const token = localStorage.getItem("token") || sessionStorage.getItem("token");
//     if (!token) {
//       alert("You are not logged in.");
//       setAiLoading(false);
//       return;
//     }

//     // Create prompt using all experience descriptions & summary to help AI suggest skills
//     let prompt = "Suggest skills based on this resume content:\n";
//     if (formData.summary) prompt += `Summary: ${formData.summary}\n`;
//     formData.experience.forEach((exp, i) => {
//       if (exp.description) prompt += `Experience ${i + 1}: ${exp.description}\n`;
//     });
//     prompt += "List relevant skills separated by commas.";

//     const response = await fetch("http://localhost:3001/ai/suggest", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`, // ✅ Add token here
//       },
//       body: JSON.stringify({ prompt, type: "skills" }),
//     });

//     if (response.status === 401) {
//       alert("Unauthorized. Please log in again.");
//       setAiLoading(false);
//       return;
//     }

//     const data = await response.json();
//     // Expect array or comma-separated string
//     let skills = [];
//     if (Array.isArray(data.suggestions)) {
//       skills = data.suggestions;
//     } else if (typeof data.suggestions === "string") {
//       skills = data.suggestions.split(",").map((s) => s.trim());
//     }
//     setAiSkillSuggestions(skills);
//   } catch (error) {
//     console.error("AI skill suggestion error:", error);
//     alert("Failed to get AI skill suggestions");
//   }
//   setAiLoading(false);
// };
// const handleSubmit = async () => {
//   try {
//     const token = localStorage.getItem("token") || sessionStorage.getItem("token");

//     const response = await fetch("http://localhost:3001/resume/create", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`, // if your backend requires it
//       },
//       body: JSON.stringify({
//         data: formData, // ✅ match your backend structure
//       }),
//     });

//     if (response.ok) {
//       alert("Resume saved successfully!");
//       router.push("/dashboard");
//     } else {
//       const error = await response.text();
//       alert(`Failed to save resume: ${error}`);
//     }
//   } catch (error) {
//     console.error("Save resume error:", error);
//     alert("Failed to save resume.");
//   }
// };


// return (
//   <div className="max-w-6xl mx-auto px-6 py-10 font-sans">
//     {/* Title */}
//     <h1 className="text-4xl font-bold text-gray-900 mb-10">Create Your Resume</h1>

//     {/* Step Navigation */}
//     <nav className="flex gap-3 mb-10">
//       {["Contact", "Education", "Experience", "Skills"].map((label, i) => (
//         <button
//           key={label}
//           onClick={() => onStepChange(i)}
//           className={`px-5 py-2 rounded-full transition duration-200 text-sm font-medium ${
//             step === i
//               ? "bg-blue-700 text-white shadow"
//               : "bg-gray-100 text-gray-800 hover:bg-gray-200"
//           }`}
//         >
//           {label}
//         </button>
//       ))}
//     </nav>

//     {/* Step Forms */}
//     <div className="mb-12">
//       {step === 0 && (
//         <MemoizedContactStep
//           formData={formData}
//           onChange={onChange}
//           onSummaryChange={onSummaryChange}
//           summary={formData.summary}
//           getSummarySuggestions={getSummarySuggestions}
//           aiSummarySuggestions={aiSummarySuggestions}
//           applySummarySuggestion={applySummarySuggestion}
//           aiLoading={aiLoading}
//           isDeveloper={formData.isDeveloper}
//           onDeveloperToggle={onDeveloperToggle}
//         />
//       )}
//       {step === 1 && (
//         <MemoizedEducationStep
//           education={formData.education}
//           addItem={addItem}
//           removeItem={removeItem}
//           onChange={onChange}
//         />
//       )}
//       {step === 2 && (
//         <MemoizedExperienceStep
//           experience={formData.experience}
//           addItem={addItem}
//           removeItem={removeItem}
//           onChange={onChange}
//           getExperienceSuggestions={getExperienceSuggestions}
//           aiExpSuggestions={aiExpSuggestions}
//           applyExperienceSuggestion={applyExperienceSuggestion}
//           aiLoading={aiLoading}
//         />
//       )}
//       {step === 3 && (
//         <MemoizedSkillsStep
//           skills={formData.skills}
//           addItem={addItem}
//           removeItem={removeItem}
//           onChange={onChange}
//           getSkillSuggestions={getSkillSuggestions}
//           aiSkillSuggestions={aiSkillSuggestions}
//           aiLoading={aiLoading}
//         />
//       )}
//     </div>

//     {/* Step Controls */}
//     <div className="flex justify-between mt-4">
//       <button
//         onClick={() => setStep((s) => Math.max(0, s - 1))}
//         disabled={step === 0}
//         className="px-5 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition disabled:opacity-50"
//       >
//         Previous
//       </button>

//       {step < 3 ? (
//         <button
//           onClick={() => setStep((s) => Math.min(3, s + 1))}
//           className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
//         >
//           Next
//         </button>
//       ) : (
//         <button
//           onClick={handleSubmit}
//           className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
//         >
//           Save Resume
//         </button>
//       )}
//     </div>

//     {/* Template Previews */}
//     <div className="mt-14 space-y-12">
//       <div>
//         <h2 className="text-2xl font-semibold text-gray-800 mb-4">Modern Template</h2>
//         <ModernTemplate data={formData} />
//       </div>

//       <div>
//         <h2 className="text-2xl font-semibold text-gray-800 mb-4">Classic Template</h2>
//         <ResumePreview data={formData} />
//       </div>
//     </div>
//   </div>
// );

// // }



"use client";

import React from "react";
import ResumeBuilderLayout from "@/components/ResumeBuilderLayout";

export default function ResumePage() {
  return <ResumeBuilderLayout />;
}