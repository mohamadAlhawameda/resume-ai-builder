import React from 'react';
import type { SectionKey } from '@/lib/types';
import {
  TemplateProps,
  getCustomization,
  visibleSections,
  fontStack,
  densityScale,
  bulletLines,
} from './shared';

/** Two-column executive layout — dark sidebar for contact & skills, main column for narrative. */
export default function ExecutiveTemplate({ data }: TemplateProps) {
  const custom = getCustomization(data);
  const scale = densityScale(custom.density);
  const accent = custom.accentColor;
  const font = fontStack(custom.fontFamily);

  const sidebarHeading: React.CSSProperties = {
    fontSize: '0.78rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#ffffff',
    borderBottom: '1px solid rgba(255,255,255,0.3)',
    paddingBottom: '0.3rem',
    marginBottom: '0.6rem',
  };
  const mainHeading: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#1e293b',
    marginBottom: `${0.7 * scale}rem`,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };
  const body: React.CSSProperties = { fontSize: '0.85rem', lineHeight: 1.55, color: '#334155' };

  const mainSections: Partial<Record<SectionKey, React.ReactNode>> = {
    summary: data.summary?.trim() ? (
      <section key="summary" style={{ marginBottom: `${1.5 * scale}rem` }}>
        <h2 style={mainHeading}>
          <span style={{ width: '1.4rem', height: '3px', backgroundColor: accent, display: 'inline-block' }} />
          Profile
        </h2>
        <p style={{ ...body, whiteSpace: 'pre-line' }}>{data.summary}</p>
      </section>
    ) : null,

    experience:
      data.experience.length > 0 ? (
        <section key="experience" style={{ marginBottom: `${1.5 * scale}rem` }}>
          <h2 style={mainHeading}>
            <span style={{ width: '1.4rem', height: '3px', backgroundColor: accent, display: 'inline-block' }} />
            Experience
          </h2>
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: `${1.05 * scale}rem`, paddingLeft: '0.9rem', borderLeft: `2px solid ${accent}55` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{exp.role || 'Role'}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {exp.from || 'Start'} – {exp.to || 'End'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: accent, marginBottom: '0.3rem' }}>
                {exp.company || 'Company'}
              </p>
              {bulletLines(exp.description).length > 0 && (
                <ul style={{ paddingLeft: '1.1rem', listStyle: 'disc' }}>
                  {bulletLines(exp.description).map((line, j) => (
                    <li key={j} style={{ ...body, marginBottom: '0.2rem' }}>
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ) : null,

    education:
      data.education.length > 0 ? (
        <section key="education" style={{ marginBottom: `${1.5 * scale}rem` }}>
          <h2 style={mainHeading}>
            <span style={{ width: '1.4rem', height: '3px', backgroundColor: accent, display: 'inline-block' }} />
            Education
          </h2>
          {data.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: `${0.7 * scale}rem` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <span style={{ ...body, fontWeight: 700, color: '#0f172a' }}>{edu.degree || 'Degree'}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {edu.from || 'Start'} – {edu.to || 'End'}
                </span>
              </div>
              <p style={{ ...body }}>{edu.school || 'School'}</p>
            </div>
          ))}
        </section>
      ) : null,
  };

  const orderedMain = visibleSections(data).filter((k) => k !== 'skills');
  const showSkills = visibleSections(data).includes('skills') && data.skills.filter(Boolean).length > 0;

  return (
    <div style={{ fontFamily: font, display: 'flex', minHeight: '100%', color: '#0f172a' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '32%',
          backgroundColor: '#1e293b',
          color: '#ffffff',
          padding: `${1.6 * scale}rem 1.2rem`,
          boxSizing: 'border-box',
        }}
      >
        <h1 style={{ fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.4rem', color: '#ffffff' }}>
          {data.fullName || 'Your Name'}
        </h1>
        {data.targetRole && (
          <p style={{ fontSize: '0.8rem', color: accent, fontWeight: 600, marginBottom: '1.2rem' }}>{data.targetRole}</p>
        )}

        <div style={{ marginBottom: '1.4rem', marginTop: data.targetRole ? 0 : '1rem' }}>
          <h2 style={sidebarHeading}>Contact</h2>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.75rem', lineHeight: 1.9, color: '#e2e8f0' }}>
            {data.email && <li style={{ wordBreak: 'break-all' }}>{data.email}</li>}
            {data.phone && <li>{data.phone}</li>}
            {data.city && <li>{[data.city, data.postalCode].filter(Boolean).join(' ')}</li>}
            {data.linkedIn && (
              <li style={{ wordBreak: 'break-all' }}>
                <a href={data.linkedIn} style={{ color: '#93c5fd' }} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </li>
            )}
            {data.isDeveloper && data.github && (
              <li style={{ wordBreak: 'break-all' }}>
                <a href={data.github} style={{ color: '#93c5fd' }} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </li>
            )}
          </ul>
        </div>

        {showSkills && (
          <div>
            <h2 style={sidebarHeading}>Skills</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {data.skills.filter(Boolean).map((skill, i) => (
                <li key={i} style={{ fontSize: '0.75rem', color: '#e2e8f0', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: accent, display: 'inline-block', flexShrink: 0 }} />
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* Main column */}
      <div style={{ width: '68%', padding: `${1.6 * scale}rem 1.5rem`, boxSizing: 'border-box' }}>
        {orderedMain.map((key) => mainSections[key])}
      </div>
    </div>
  );
}
