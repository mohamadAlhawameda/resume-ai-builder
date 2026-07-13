import React from 'react';
import type { SectionKey } from '@/lib/types';
import {
  TemplateProps,
  getCustomization,
  visibleSections,
  densityScale,
  bulletLines,
  contactLine,
} from './shared';

/** Traditional serif resume — timeless, ATS-safe single column. */
export default function ClassicTemplate({ data }: TemplateProps) {
  const custom = getCustomization(data);
  const scale = densityScale(custom.density);
  const accent = custom.accentColor;
  const font = "Georgia, 'Times New Roman', serif";

  const sectionTitle: React.CSSProperties = {
    fontSize: '1.15rem',
    fontWeight: 700,
    fontFamily: font,
    borderBottom: `1.5px solid ${accent}`,
    paddingBottom: '0.25rem',
    marginBottom: `${0.75 * scale}rem`,
    color: '#111111',
    letterSpacing: '0.02em',
  };
  const sectionStyle: React.CSSProperties = { marginBottom: `${1.5 * scale}rem` };
  const body: React.CSSProperties = { fontSize: '0.875rem', lineHeight: 1.5, color: '#1f2937' };

  const sections: Record<SectionKey, React.ReactNode> = {
    summary: data.summary?.trim() ? (
      <section style={sectionStyle} key="summary">
        <h2 style={sectionTitle}>Professional Summary</h2>
        <p style={{ ...body, whiteSpace: 'pre-line' }}>{data.summary}</p>
      </section>
    ) : null,

    experience:
      data.experience.length > 0 ? (
        <section style={sectionStyle} key="experience">
          <h2 style={sectionTitle}>Experience</h2>
          <div>
            {data.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: `${1 * scale}rem` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
                  <span style={{ ...body, fontWeight: 700 }}>
                    {exp.role || 'Role'}, {exp.company || 'Company'}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#4b5563' }}>
                    {exp.from || 'Start'} – {exp.to || 'End'}
                  </span>
                </div>
                {bulletLines(exp.description).length > 0 && (
                  <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', listStyle: 'disc' }}>
                    {bulletLines(exp.description).map((line, j) => (
                      <li key={j} style={{ ...body, marginBottom: '0.2rem' }}>
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null,

    education:
      data.education.length > 0 ? (
        <section style={sectionStyle} key="education">
          <h2 style={sectionTitle}>Education</h2>
          {data.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: `${0.75 * scale}rem` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
                <span style={{ ...body, fontWeight: 700 }}>
                  {edu.degree || 'Degree'}, {edu.school || 'School'}
                </span>
                <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#4b5563' }}>
                  {edu.from || 'Start'} – {edu.to || 'End'}
                </span>
              </div>
              {bulletLines(edu.achievements).length > 0 && (
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.3rem', listStyle: 'disc' }}>
                  {bulletLines(edu.achievements).map((line, j) => (
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

    skills:
      data.skills.filter(Boolean).length > 0 ? (
        <section style={sectionStyle} key="skills">
          <h2 style={sectionTitle}>Skills</h2>
          <ul
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.25rem 1rem',
              paddingLeft: '1.1rem',
              listStyle: 'disc',
              ...body,
            }}
          >
            {data.skills.filter(Boolean).map((skill, i) => (
              <li key={i}>{skill}</li>
            ))}
          </ul>
        </section>
      ) : null,
  };

  return (
    <div style={{ fontFamily: font, color: '#111111' }}>
      <header style={{ marginBottom: `${1.5 * scale}rem`, borderBottom: '2px solid #111111', paddingBottom: '0.6rem' }}>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 700, fontFamily: font }}>{data.fullName || 'Your Name'}</h1>
        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', marginTop: '0.3rem', color: '#374151' }}>
          {contactLine(data).join(' | ')}
          {data.linkedIn && (
            <>
              {contactLine(data).length > 0 && ' | '}
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
