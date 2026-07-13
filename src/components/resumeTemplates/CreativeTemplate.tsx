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

/** Bold accent-banner layout for design-forward roles. */
export default function CreativeTemplate({ data }: TemplateProps) {
  const custom = getCustomization(data);
  const scale = densityScale(custom.density);
  const accent = custom.accentColor;
  const font = fontStack(custom.fontFamily);

  const sectionTitle: React.CSSProperties = {
    display: 'inline-block',
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#ffffff',
    backgroundColor: accent,
    padding: '0.25rem 0.8rem',
    borderRadius: '4px',
    marginBottom: `${0.8 * scale}rem`,
  };
  const sectionStyle: React.CSSProperties = { marginBottom: `${1.6 * scale}rem` };
  const body: React.CSSProperties = { fontSize: '0.86rem', lineHeight: 1.55, color: '#334155' };

  const sections: Record<SectionKey, React.ReactNode> = {
    summary: data.summary?.trim() ? (
      <section style={sectionStyle} key="summary">
        <h2 style={sectionTitle}>About Me</h2>
        <p style={{ ...body, whiteSpace: 'pre-line' }}>{data.summary}</p>
      </section>
    ) : null,

    experience:
      data.experience.length > 0 ? (
        <section style={sectionStyle} key="experience">
          <h2 style={sectionTitle}>Experience</h2>
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: `${1 * scale}rem` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  {exp.role || 'Role'} <span style={{ color: accent }}>/</span>{' '}
                  <span style={{ fontWeight: 500 }}>{exp.company || 'Company'}</span>
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: accent,
                    border: `1px solid ${accent}66`,
                    borderRadius: '9999px',
                    padding: '0.1rem 0.6rem',
                  }}
                >
                  {exp.from || 'Start'} – {exp.to || 'End'}
                </span>
              </div>
              {bulletLines(exp.description).length > 0 && (
                <ul style={{ paddingLeft: '1.15rem', marginTop: '0.4rem', listStyle: 'disc' }}>
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
        <section style={sectionStyle} key="education">
          <h2 style={sectionTitle}>Education</h2>
          {data.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: `${0.6 * scale}rem`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
              <span style={{ ...body }}>
                <strong style={{ color: '#0f172a' }}>{edu.degree || 'Degree'}</strong> — {edu.school || 'School'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {edu.from || 'Start'} – {edu.to || 'End'}
              </span>
            </div>
          ))}
        </section>
      ) : null,

    skills:
      data.skills.filter(Boolean).length > 0 ? (
        <section style={sectionStyle} key="skills">
          <h2 style={sectionTitle}>Skills</h2>
          <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', listStyle: 'none', padding: 0 }}>
            {data.skills.filter(Boolean).map((skill, i) => (
              <li
                key={i}
                style={{
                  backgroundColor: `${accent}15`,
                  color: '#0f172a',
                  border: `1px solid ${accent}44`,
                  padding: '0.28rem 0.7rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                {skill}
              </li>
            ))}
          </ul>
        </section>
      ) : null,
  };

  return (
    <div style={{ fontFamily: font, color: '#0f172a' }}>
      {/* Accent banner header */}
      <header
        style={{
          backgroundColor: accent,
          color: '#ffffff',
          padding: `${1.6 * scale}rem 1.8rem`,
          marginBottom: `${1.6 * scale}rem`,
        }}
      >
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
          {data.fullName || 'Your Name'}
        </h1>
        {data.targetRole && (
          <p style={{ fontSize: '0.95rem', fontWeight: 500, opacity: 0.9, marginTop: '0.15rem' }}>{data.targetRole}</p>
        )}
        <p style={{ fontSize: '0.78rem', marginTop: '0.6rem', opacity: 0.85 }}>
          {contactLine(data).join('   ·   ')}
          {data.linkedIn && (
            <>
              {'   ·   '}
              <a href={data.linkedIn} style={{ color: '#ffffff', textDecoration: 'underline' }} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </>
          )}
          {data.isDeveloper && data.github && (
            <>
              {'   ·   '}
              <a href={data.github} style={{ color: '#ffffff', textDecoration: 'underline' }} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </>
          )}
        </p>
      </header>
      <div style={{ padding: '0 1.8rem 1rem' }}>{visibleSections(data).map((key) => sections[key])}</div>
    </div>
  );
}
