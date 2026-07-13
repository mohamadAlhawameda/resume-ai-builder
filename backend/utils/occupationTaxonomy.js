// Lightweight local occupation-family taxonomy used to power adjacent-career
// suggestions and skill normalization.
//
// This is a hand-curated structure inspired by the way O*NET/ESCO/NOC group
// occupations by core skill sets — it is NOT the official O*NET, ESCO, or NOC
// dataset (those require licensed data feeds or live API integration this
// deployment does not have configured). Treat "adjacent path" results as a
// heuristic starting point, not an authoritative classification. ESCO's
// public REST API (https://ec.europa.eu/esco/api) requires no key and is a
// documented drop-in upgrade path — see README follow-up notes.

export const OCCUPATION_FAMILIES = [
  {
    id: 'frontend-engineering',
    title: 'Frontend Engineering',
    coreSkills: ['javascript', 'typescript', 'react', 'vue.js', 'angular', 'html', 'css', 'tailwind', 'next.js', 'accessibility', 'web performance'],
  },
  {
    id: 'backend-engineering',
    title: 'Backend Engineering',
    coreSkills: ['node.js', 'express', 'django', 'flask', 'spring boot', 'rest api', 'graphql', 'microservices', 'sql', 'postgresql', 'api design'],
  },
  {
    id: 'data-engineering',
    title: 'Data Engineering & Analytics',
    coreSkills: ['sql', 'python', 'spark', 'airflow', 'etl', 'data modeling', 'data warehousing', 'snowflake', 'bigquery', 'tableau', 'power bi', 'pandas'],
  },
  {
    id: 'ai-ml',
    title: 'Machine Learning & AI',
    coreSkills: ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp', 'computer vision', 'llm', 'prompt engineering', 'mlops', 'python'],
  },
  {
    id: 'cloud-devops',
    title: 'Cloud & DevOps',
    coreSkills: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'linux', 'devops', 'sre', 'monitoring', 'infrastructure as code'],
  },
  {
    id: 'mobile-engineering',
    title: 'Mobile Engineering',
    coreSkills: ['ios', 'android', 'flutter', 'react native', 'swiftui', 'jetpack compose', 'mobile development'],
  },
  {
    id: 'qa-testing',
    title: 'QA & Test Automation',
    coreSkills: ['jest', 'cypress', 'playwright', 'selenium', 'test automation', 'qa', 'unit testing', 'integration testing'],
  },
  {
    id: 'security',
    title: 'Security Engineering',
    coreSkills: ['cybersecurity', 'penetration testing', 'security auditing', 'encryption', 'network security', 'owasp', 'soc 2', 'compliance'],
  },
  {
    id: 'product-design',
    title: 'Product & UX Design',
    coreSkills: ['ui design', 'ux design', 'user research', 'wireframing', 'prototyping', 'figma', 'design systems', 'usability testing'],
  },
  {
    id: 'product-management',
    title: 'Product Management',
    coreSkills: ['product management', 'roadmapping', 'stakeholder management', 'market research', 'okrs', 'kpis', 'requirements gathering'],
  },
  {
    id: 'project-ops-management',
    title: 'Project & Operations Management',
    coreSkills: ['project management', 'agile', 'scrum', 'kanban', 'budgeting', 'vendor management', 'operations management', 'risk management', 'pmp'],
  },
  {
    id: 'business-financial-analysis',
    title: 'Business & Financial Analysis',
    coreSkills: ['business analysis', 'financial analysis', 'financial modeling', 'forecasting', 'accounting', 'excel', 'data analysis'],
  },
  {
    id: 'marketing-growth',
    title: 'Marketing & Growth',
    coreSkills: ['seo', 'sem', 'google analytics', 'content marketing', 'email marketing', 'digital marketing', 'marketing automation', 'social media marketing'],
  },
  {
    id: 'sales-customer-success',
    title: 'Sales & Customer Success',
    coreSkills: ['sales', 'negotiation', 'account management', 'customer success', 'customer service', 'b2b sales', 'crm', 'lead generation'],
  },
  {
    id: 'hr-talent',
    title: 'HR & Talent Acquisition',
    coreSkills: ['recruiting', 'talent acquisition', 'onboarding', 'employee relations', 'performance management', 'hris'],
  },
  {
    id: 'supply-chain-logistics',
    title: 'Supply Chain & Logistics',
    coreSkills: ['supply chain', 'logistics', 'procurement', 'operations management', 'lean', 'six sigma', 'erp'],
  },
];

const FAMILY_BY_ID = new Map(OCCUPATION_FAMILIES.map((f) => [f.id, f]));

/** Score how well a set of (lowercased) skills fits each occupation family. */
export function matchFamilies(skillsLower) {
  const skillSet = new Set(skillsLower);
  return OCCUPATION_FAMILIES.map((family) => {
    const overlap = family.coreSkills.filter((s) => skillSet.has(s));
    return {
      id: family.id,
      title: family.title,
      overlapRatio: overlap.length / family.coreSkills.length,
      matchedSkills: overlap,
    };
  }).sort((a, b) => b.overlapRatio - a.overlapRatio);
}

/** Given a user's primary family, return other families with meaningful skill overlap. */
export function adjacentFamilies(skillsLower, excludeId, limit = 3) {
  return matchFamilies(skillsLower)
    .filter((f) => f.id !== excludeId && f.overlapRatio >= 0.15 && f.overlapRatio < 0.6)
    .slice(0, limit);
}

export function familyById(id) {
  return FAMILY_BY_ID.get(id) || null;
}
