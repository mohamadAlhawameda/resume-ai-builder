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

/** Contemporary single-column layout with accent-colored headings and skill pills. */
export default function ModernTemplate({ data }: TemplateProps) {
  const custom = getCustomization(data);
  const scale = densityScale(custom.density);
  const accent = custom.accentColor;
  const font = fontStack(custom.fontFamily);

  const sectionTitle: React.CSSProperties = {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: accent,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '0.35rem',
    marginBottom: `${0.8 * scale}rem`,
  };
  const sectionStyle: React.CSSProperties = { marginBottom: `${1.6 * scale}rem` };
  const body: React.CSSProperties = { fontSize: '0.875rem', lineHeight: 1.55, color: '#374151' };

  const sections: Record<SectionKey, React.ReactNode> = {
    summary: data.summary?.trim() ? (
      <section style={sectionStyle} key="summary">
        <h2 style={sectionTitle}>Summary</h2>
        <p style={{ ...body, whiteSpace: 'pre-line' }}>{data.summary}</p>
      </section>
    ) : null,

    experience:
      data.experience.length > 0 ? (
        <section style={sectionStyle} key="experience">
          <h2 style={sectionTitle}>Experience</h2>
          {data.experience.map((item, index) => (
            <div key={index} style={{ marginBottom: `${1.05 * scale}rem` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>
                  {item.role || 'Role'}{' '}
                  <span style={{ fontWeight: 400, color: '#4b5563' }}>@ {item.company || 'Company'}</span>
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  {item.from || 'Start'} – {item.to || 'End'}
                </span>
              </div>
              {bulletLines(item.description).length > 0 && (
                <ul style={{ marginTop: '0.4rem', paddingLeft: '1.2rem', listStyle: 'disc' }}>
                  {bulletLines(item.description).map((point, i) => (
                    <li key={i} style={{ ...body, marginBottom: '0.2rem' }}>
                      {point}
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
          {data.education.map((item, index) => (
            <div key={index} style={{ marginBottom: `${0.7 * scale}rem` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>
                  {item.degree || 'Degree'}{' '}
                  <span style={{ fontWeight: 400, color: '#4b5563' }}>@ {item.school || 'School'}</span>
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  {item.from || 'Start'} – {item.to || 'End'}
                </span>
              </div>
              {bulletLines(item.achievements).length > 0 && (
                <ul style={{ marginTop: '0.3rem', paddingLeft: '1.2rem', listStyle: 'disc' }}>
                  {bulletLines(item.achievements).map((point, i) => (
                    <li key={i} style={{ ...body }}>
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ) : null,

    skills:
      data.skills.filter(Boolean).length > 0 ? (
        <section style={sectionStyle} key="skills">
          <h2 style={sectionTitle}>Skills</h2>
          <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', listStyle: 'none', padding: 0 }}>
            {data.skills.filter(Boolean).map((skill, index) => (
              <li
                key={index}
                style={{
                  backgroundColor: '#f3f4f6',
                  border: `1px solid ${accent}33`,
                  padding: '0.3rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: '#111827',
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
    <div style={{ fontFamily: font, color: '#111827' }}>
      <header style={{ borderBottom: `3px solid ${accent}`, paddingBottom: '0.85rem', marginBottom: `${1.6 * scale}rem` }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.5px', color: '#111827' }}>
          {data.fullName || 'Your Name'}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: '0.3rem' }}>
          {contactLine(data).join('  ·  ')}
          {data.linkedIn && (
            <>
              {'  ·  '}
              <a href={data.linkedIn} style={{ color: accent }} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </>
          )}
          {data.isDeveloper && data.github && (
            <>
              {'  ·  '}
              <a href={data.github} style={{ color: accent }} target="_blank" rel="noreferrer">
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
