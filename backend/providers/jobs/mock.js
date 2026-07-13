// Development job data. Every job is flagged `isSampleData: true` so the UI
// can clearly separate it from production feeds. Used automatically when no
// real provider is configured.

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const JOBS = [
  {
    externalId: '1', title: 'Frontend Developer', company: 'Northwind Labs',
    location: 'Toronto, ON', remote: 'hybrid', workType: 'full-time',
    salaryMin: 85000, salaryMax: 110000, postedAt: daysAgo(2),
    skills: ['react', 'typescript', 'next.js', 'tailwind css', 'rest api', 'jest'],
    description: `We are looking for a Frontend Developer to build customer-facing dashboards.\n- 2+ years of experience with React and TypeScript\n- Experience with Next.js and modern CSS (Tailwind)\n- Familiarity with REST APIs and testing (Jest)\n- Strong communication and collaboration skills`,
  },
  {
    externalId: '2', title: 'Full Stack Engineer', company: 'BlueRiver Software',
    location: 'Remote — Canada', remote: 'remote', workType: 'full-time',
    salaryMin: 100000, salaryMax: 135000, postedAt: daysAgo(1),
    skills: ['node.js', 'react', 'mongodb', 'aws', 'docker', 'graphql'],
    description: `Join our platform team building APIs and web apps used by 40k businesses.\n- 3+ years with Node.js and React\n- Experience with MongoDB or PostgreSQL\n- AWS deployment experience (Docker a plus)\n- GraphQL or REST API design experience\n- Bachelor's degree in Computer Science or equivalent experience`,
  },
  {
    externalId: '3', title: 'Junior Software Developer', company: 'Maple Analytics',
    location: 'Waterloo, ON', remote: 'onsite', workType: 'full-time',
    salaryMin: 65000, salaryMax: 80000, postedAt: daysAgo(4),
    skills: ['javascript', 'python', 'sql', 'git', 'agile'],
    description: `Great first role for a recent graduate.\n- Solid fundamentals in JavaScript or Python\n- Understanding of SQL and relational databases\n- Comfortable with Git and agile teams\n- Recent graduate or up to 2 years of experience`,
  },
  {
    externalId: '4', title: 'React Native Developer', company: 'Finch Mobile',
    location: 'Vancouver, BC', remote: 'remote', workType: 'contract',
    salaryMin: 90000, salaryMax: 120000, postedAt: daysAgo(3),
    skills: ['react native', 'typescript', 'ios', 'android', 'redux'],
    description: `6-month contract building our consumer fintech app.\n- 2+ years with React Native and TypeScript\n- Shipped at least one app to the App Store or Play Store\n- Experience with Redux and mobile CI/CD`,
  },
  {
    externalId: '5', title: 'Backend Engineer (Node.js)', company: 'Harbor Health Tech',
    location: 'Toronto, ON', remote: 'hybrid', workType: 'full-time',
    salaryMin: 95000, salaryMax: 125000, postedAt: daysAgo(6),
    skills: ['node.js', 'express', 'postgresql', 'redis', 'microservices', 'jest'],
    description: `Build secure healthcare integrations.\n- 3+ years of backend experience with Node.js/Express\n- PostgreSQL and Redis experience\n- Understanding of microservices and message queues\n- HIPAA or healthcare data experience is a plus`,
  },
  {
    externalId: '6', title: 'DevOps Engineer', company: 'Skyline Cloud',
    location: 'Remote — North America', remote: 'remote', workType: 'full-time',
    salaryMin: 110000, salaryMax: 145000, postedAt: daysAgo(2),
    skills: ['aws', 'kubernetes', 'terraform', 'ci/cd', 'linux', 'python'],
    description: `Own our infrastructure as we scale.\n- 4+ years in DevOps or SRE roles\n- Deep AWS knowledge, Kubernetes in production\n- Terraform and CI/CD pipeline experience\n- Scripting with Python or Bash`,
  },
  {
    externalId: '7', title: 'Data Analyst', company: 'Beacon Retail Group',
    location: 'Mississauga, ON', remote: 'hybrid', workType: 'full-time',
    salaryMin: 70000, salaryMax: 90000, postedAt: daysAgo(5),
    skills: ['sql', 'excel', 'power bi', 'python', 'data visualization', 'statistics'],
    description: `Turn sales data into decisions.\n- 2+ years of analytics experience\n- Advanced SQL and Excel\n- Power BI or Tableau dashboarding\n- Python (pandas) is a strong plus\n- Bachelor's degree in a quantitative field`,
  },
  {
    externalId: '8', title: 'Machine Learning Engineer', company: 'Quanta AI',
    location: 'Toronto, ON', remote: 'hybrid', workType: 'full-time',
    salaryMin: 130000, salaryMax: 170000, postedAt: daysAgo(1),
    skills: ['python', 'pytorch', 'machine learning', 'nlp', 'aws', 'mlops'],
    description: `Ship LLM-powered features to production.\n- 3+ years building ML systems in Python\n- PyTorch or TensorFlow experience\n- NLP / LLM fine-tuning experience\n- MLOps: model deployment, monitoring, AWS Sagemaker\n- Master's degree or PhD preferred`,
  },
  {
    externalId: '9', title: 'Product Manager', company: 'Atlas Workflows',
    location: 'Remote — Global', remote: 'remote', workType: 'full-time',
    salaryMin: 105000, salaryMax: 140000, postedAt: daysAgo(7),
    skills: ['product management', 'roadmapping', 'stakeholder management', 'agile', 'a/b testing'],
    description: `Drive our automation platform roadmap.\n- 3+ years of product management in B2B SaaS\n- Experience running discovery and A/B tests\n- Strong stakeholder management and communication\n- Technical background is a plus`,
  },
  {
    externalId: '10', title: 'UX/UI Designer', company: 'Copper Studio',
    location: 'Montreal, QC', remote: 'hybrid', workType: 'full-time',
    salaryMin: 75000, salaryMax: 95000, postedAt: daysAgo(3),
    skills: ['figma', 'ui design', 'ux design', 'prototyping', 'user research', 'design systems'],
    description: `Design polished product experiences for startup clients.\n- 3+ years of product design experience\n- Expert in Figma, prototyping, and design systems\n- Portfolio demonstrating user-centered process\n- User research and usability testing experience`,
  },
  {
    externalId: '11', title: 'QA Automation Engineer', company: 'Verity Systems',
    location: 'Ottawa, ON', remote: 'onsite', workType: 'full-time',
    salaryMin: 80000, salaryMax: 100000, postedAt: daysAgo(8),
    skills: ['test automation', 'cypress', 'playwright', 'javascript', 'ci/cd'],
    description: `Own quality for our release pipeline.\n- 2+ years in QA automation\n- Cypress or Playwright expertise\n- JavaScript/TypeScript test development\n- CI/CD integration experience`,
  },
  {
    externalId: '12', title: 'Digital Marketing Specialist', company: 'Brightpath Agency',
    location: 'Toronto, ON', remote: 'hybrid', workType: 'full-time',
    salaryMin: 55000, salaryMax: 70000, postedAt: daysAgo(4),
    skills: ['seo', 'google analytics', 'google ads', 'content marketing', 'email marketing'],
    description: `Run campaigns for a portfolio of B2C brands.\n- 2+ years in digital marketing\n- Hands-on with Google Ads and Analytics\n- SEO and content strategy experience\n- Email marketing automation (HubSpot a plus)`,
  },
  {
    externalId: '13', title: 'Software Engineering Intern', company: 'Northwind Labs',
    location: 'Toronto, ON', remote: 'hybrid', workType: 'internship',
    salaryMin: 45000, salaryMax: 55000, postedAt: daysAgo(2),
    skills: ['javascript', 'react', 'git', 'html', 'css'],
    description: `4-month internship on the web platform team.\n- Currently pursuing a degree in CS or related field\n- Coursework or projects with JavaScript and React\n- Familiar with Git workflows\n- Curiosity and strong communication`,
  },
  {
    externalId: '14', title: 'Customer Success Manager', company: 'Atlas Workflows',
    location: 'Remote — Canada', remote: 'remote', workType: 'full-time',
    salaryMin: 65000, salaryMax: 85000, postedAt: daysAgo(9),
    skills: ['customer success', 'crm', 'salesforce', 'communication', 'account management'],
    description: `Own onboarding and retention for mid-market accounts.\n- 2+ years in customer success or account management\n- CRM experience (Salesforce preferred)\n- Excellent written and verbal communication\n- SaaS background preferred`,
  },
  {
    externalId: '15', title: 'Cybersecurity Analyst', company: 'Sentinel Financial',
    location: 'Toronto, ON', remote: 'onsite', workType: 'full-time',
    salaryMin: 90000, salaryMax: 115000, postedAt: daysAgo(6),
    skills: ['cybersecurity', 'network security', 'penetration testing', 'compliance', 'linux'],
    description: `Defend a regulated financial environment.\n- 3+ years in security operations\n- Network security monitoring and incident response\n- Compliance frameworks (SOC 2, PCI-DSS)\n- Security certification (Security+, CISSP) preferred`,
  },
  {
    externalId: '16', title: 'Technical Writer', company: 'BlueRiver Software',
    location: 'Remote — Global', remote: 'remote', workType: 'part-time',
    salaryMin: 40000, salaryMax: 60000, postedAt: daysAgo(11),
    skills: ['technical documentation', 'markdown', 'api design', 'communication'],
    description: `Document our developer platform.\n- 2+ years writing developer documentation\n- Comfortable reading API specs and code samples\n- Clear, concise writing style\n- Markdown and docs-as-code workflows`,
  },
  {
    externalId: '17', title: 'Senior React Developer', company: 'Vantage Commerce',
    location: 'Calgary, AB', remote: 'remote', workType: 'full-time',
    salaryMin: 120000, salaryMax: 150000, postedAt: daysAgo(1),
    skills: ['react', 'typescript', 'next.js', 'graphql', 'performance', 'mentoring'],
    description: `Lead frontend architecture for our e-commerce platform.\n- 5+ years of React experience, 2+ with TypeScript\n- Next.js at scale, web performance optimization\n- GraphQL experience\n- Mentoring junior developers\n- Bachelor's degree or equivalent experience`,
  },
  {
    externalId: '18', title: 'IT Support Specialist', company: 'Harbor Health Tech',
    location: 'Toronto, ON', remote: 'onsite', workType: 'full-time',
    salaryMin: 50000, salaryMax: 62000, postedAt: daysAgo(5),
    skills: ['customer service', 'windows', 'networking', 'troubleshooting'],
    description: `First line of support for 300 staff.\n- 1+ years in IT support or helpdesk\n- Windows and basic networking troubleshooting\n- Patient, clear communicator\n- A+ or Network+ certification a plus`,
  },
];

const mockProvider = {
  name: 'mock',
  isConfigured: () => true,
  async fetchJobs() {
    return JOBS.map((j) => ({
      id: `mock:${j.externalId}`,
      provider: 'mock',
      url: '',
      isSampleData: true,
      ...j,
    }));
  },
};

export default mockProvider;
