import React from 'react';
import type { SectionKey } from '@/lib/types';
import {
  TemplateProps,
  getCustomization,
  visibleSections,
  fontStack,
  densityScale,
  bulletLines,
  contactLine,
} from './shared';

/** Airy, understated layout — maximum content density with minimum decoration. */
export default function MinimalTemplate({ data }: TemplateProps) {
  const custom = getCustomization(data);
  const scale = densityScale(custom.density);
  const accent = custom.accentColor;
  const font = fontStack(custom.fontFamily);

  const headingStyle: React.CSSProperties = {
    fontSize: '0.95rem',
    fontWeight: 600,
    borderBottom: '1px solid #d1d5db',
    paddingBottom: '0.25rem',
    marginBottom: `${0.55 * scale}rem`,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#111111',
  };
  const sectionStyle: React.CSSProperties = { marginBottom: `${1.4 * scale}rem` };
  const body: React.CSSProperties = { fontSize: '0.83rem', lineHeight: 1.5, color: '#1f2937' };

  const sections: Record<SectionKey, React.ReactNode> = {
    summary: data.summary?.trim() ? (
      <section style={sectionStyle} key="summary">
        <h2 style={headingStyle}>Summary</h2>
        <p style={{ ...body, whiteSpace: 'pre-line' }}>{data.summary}</p>
      </section>
    ) : null,

    experience:
      data.experience.length > 0 ? (
        <section style={sectionStyle} key="experience">
          <h2 style={headingStyle}>Experience</h2>
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: `${0.8 * scale}rem` }}>
              <div style={{ fontWeight: 600, ...body }}>
                {exp.role || 'Role'}, {exp.company || 'Company'}
                <span style={{ fontSize: '0.72rem', fontStyle: 'italic', marginLeft: '0.5rem', color: '#6b7280', fontWeight: 400 }}>
                  ({exp.from || 'Start'} – {exp.to || 'End'})
                </span>
              </div>
              {bulletLines(exp.description).length > 0 && (
                <ul style={{ paddingLeft: '1.15rem', marginTop: '0.25rem', listStyle: 'disc' }}>
                  {bulletLines(exp.description).map((line, j) => (
                    <li key={j} style={{ ...body, marginBottom: '0.15rem' }}>
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
        <section style={sectionStyle} key="education">
          <h2 style={headingStyle}>Education</h2>
          <ul style={{ paddingLeft: '1.15rem', listStyle: 'disc', margin: 0 }}>
            {data.education.map((edu, i) => (
              <li key={i} style={{ ...body, marginBottom: '0.4rem' }}>
                <strong>{edu.degree || 'Degree'}</strong>, {edu.school || 'School'}{' '}
                <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                  ({edu.from || 'Start'} – {edu.to || 'End'})
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null,

    skills:
      data.skills.filter(Boolean).length > 0 ? (
        <section style={sectionStyle} key="skills">
          <h2 style={headingStyle}>Skills</h2>
          <p style={{ ...body }}>{data.skills.filter(Boolean).join('  ·  ')}</p>
        </section>
      ) : null,
  };

  return (
    <div style={{ fontFamily: font, fontSize: '0.9rem', color: '#111111' }}>
      <header style={{ marginBottom: `${1.2 * scale}rem` }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111111' }}>{data.fullName || 'Your Name'}</h1>
        <p style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '0.2rem' }}>
          {contactLine(data).join(' | ')}
          {data.linkedIn && (
            <>
              {' | '}
              <a href={data.linkedIn} style={{ color: accent, textDecoration: 'underline' }} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </>
          )}
          {data.isDeveloper && data.github && (
            <>
              {' | '}
              <a href={data.github} style={{ color: accent, textDecoration: 'underline' }} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </>
          )}
        </p>
      </header>
      {visibleSections(data).map((key) => sections[key])}
    </div>
  );
}
