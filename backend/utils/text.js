// Shared text utilities for the analysis engine.

export const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','been','but','by','for','from','has','have','had','he','her','his','i','in','is','it','its','me','my','of','on','or','our','she','so','that','the','their','them','they','this','to','was','we','were','will','with','you','your','yours','us','am','do','does','did','not','no','yes','if','then','than','these','those','there','here','what','which','who','whom','when','where','why','how','all','any','both','each','more','most','other','some','such','only','own','same','too','very','can','just','about','into','over','under','again','once','also','out','up','down','off','above','below','between','through','during','before','after','while','because','until','against','per','via','etc','eg','ie','within','across','around','including','include','includes','ability','strong','work','working','works','worked','team','teams','experience','experienced','years','year','plus','required','requirements','preferred','qualifications','responsibilities','role','position','job','candidate','candidates','skills','skill','knowledge','familiarity','proficiency','understanding','excellent','good','great','well','new','using','use','used','uses','must','should','would','could','may','might','ideal','looking','join','opportunity','company','organization','business','environment','fast','paced','benefits','salary','equal','employer','apply','application'
]);

// Common technical + professional skills. Multi-word entries are matched as phrases.
export const KNOWN_SKILLS = [
  // Programming languages
  'javascript','typescript','python','java','c++','c#','go','golang','rust','ruby','php','swift','kotlin','scala','r','matlab','perl','sql','html','css','sass','bash','powershell','objective-c','dart','elixir','haskell','lua','solidity',
  // Frontend
  'react','react native','next.js','nextjs','vue','vue.js','nuxt','angular','svelte','redux','tailwind','tailwind css','bootstrap','material ui','webpack','vite','jquery','d3.js','three.js','storybook','figma','responsive design','accessibility','web performance','pwa','webgl',
  // Backend
  'node.js','nodejs','express','nestjs','django','flask','fastapi','spring','spring boot','rails','ruby on rails','laravel','asp.net','.net','graphql','rest','rest api','restful apis','grpc','microservices','websockets','oauth','jwt','api design','serverless',
  // Data / DB
  'mongodb','postgresql','postgres','mysql','sqlite','redis','elasticsearch','dynamodb','cassandra','oracle','sql server','firebase','supabase','prisma','mongoose','kafka','rabbitmq','spark','hadoop','airflow','dbt','etl','data modeling','data warehousing','snowflake','bigquery','redshift','tableau','power bi','looker','excel','pandas','numpy','data analysis','data visualization','statistics','a/b testing',
  // AI/ML
  'machine learning','deep learning','nlp','natural language processing','computer vision','tensorflow','pytorch','scikit-learn','keras','llm','large language models','prompt engineering','openai','langchain','hugging face','mlops','recommendation systems','reinforcement learning','generative ai',
  // Cloud / DevOps
  'aws','amazon web services','azure','gcp','google cloud','docker','kubernetes','terraform','ansible','jenkins','ci/cd','github actions','gitlab ci','circleci','linux','nginx','cloudformation','lambda','ec2','s3','cloudflare','devops','sre','monitoring','prometheus','grafana','datadog','new relic','infrastructure as code','load balancing','vpc','iam',
  // Mobile
  'ios','android','flutter','xamarin','swiftui','jetpack compose','mobile development',
  // Testing
  'jest','cypress','playwright','selenium','mocha','pytest','junit','unit testing','integration testing','test automation','tdd','qa',
  // Security
  'cybersecurity','penetration testing','security auditing','encryption','network security','owasp','soc 2','compliance','gdpr','hipaa',
  // Tools & practice
  'git','github','gitlab','bitbucket','jira','confluence','agile','scrum','kanban','code review','pair programming','technical documentation','system design','object oriented programming','oop','functional programming','design patterns','algorithms','data structures',
  // Design
  'ui design','ux design','ui/ux','user research','wireframing','prototyping','adobe photoshop','adobe illustrator','adobe xd','sketch','design systems','usability testing','interaction design',
  // Business / PM
  'project management','product management','stakeholder management','roadmapping','market research','business analysis','requirements gathering','budgeting','forecasting','financial analysis','financial modeling','accounting','bookkeeping','quickbooks','sap','salesforce','crm','erp','supply chain','logistics','procurement','operations management','lean','six sigma','pmp','risk management','strategic planning','okrs','kpis','vendor management',
  // Marketing / Sales
  'seo','sem','google analytics','google ads','facebook ads','content marketing','email marketing','social media marketing','copywriting','brand management','digital marketing','marketing automation','hubspot','lead generation','sales','negotiation','account management','customer success','customer service','cold calling','b2b sales','b2c',
  // Healthcare / other
  'patient care','clinical research','medical terminology','phlebotomy','nursing','cpr','first aid','emr','epic','pharmacology',
  // HR / admin
  'recruiting','talent acquisition','onboarding','payroll','hris','employee relations','performance management','training and development',
  // Education
  'curriculum development','lesson planning','classroom management','tutoring','instructional design','e-learning',
  // Soft skills
  'communication','leadership','teamwork','collaboration','problem solving','critical thinking','time management','adaptability','creativity','attention to detail','public speaking','presentation','mentoring','coaching','conflict resolution','decision making','emotional intelligence','organization','multitasking','analytical thinking','initiative','customer focus','cross-functional collaboration',
  // Languages
  'spanish','french','german','mandarin','arabic','portuguese','japanese','bilingual','multilingual',
];

export const ACTION_VERBS = [
  'accelerated','achieved','administered','analyzed','architected','automated','boosted','built','centralized','championed','coached','collaborated','conceived','conducted','consolidated','coordinated','created','cut','decreased','delivered','designed','developed','devised','directed','doubled','drove','earned','eliminated','engineered','enhanced','established','evaluated','exceeded','executed','expanded','expedited','facilitated','forecasted','founded','generated','grew','guided','identified','implemented','improved','increased','initiated','innovated','instituted','integrated','introduced','launched','led','leveraged','managed','maximized','mentored','migrated','minimized','modernized','negotiated','optimized','orchestrated','overhauled','oversaw','pioneered','planned','produced','programmed','proposed','published','ran','rebuilt','redesigned','reduced','refactored','reorganized','researched','resolved','restructured','revamped','saved','scaled','secured','shipped','simplified','slashed','spearheaded','standardized','streamlined','strengthened','supervised','surpassed','taught','tested','trained','transformed','tripled','upgraded','won','wrote'
];

export const WEAK_PHRASES = [
  { term: 'responsible for', advice: 'Replace with a strong action verb, e.g. "Managed" or "Led".' },
  { term: 'duties included', advice: 'Lead with what you achieved, not what the job description said.' },
  { term: 'worked on', advice: 'Use a specific verb: "Built", "Designed", "Shipped".' },
  { term: 'helped', advice: 'Say exactly what you did: "Co-developed", "Supported X by doing Y".' },
  { term: 'helped with', advice: 'Say exactly what you did and quantify the outcome.' },
  { term: 'assisted', advice: 'If you owned part of the work, claim it with a direct verb.' },
  { term: 'participated in', advice: 'State your specific contribution instead.' },
  { term: 'involved in', advice: 'Describe your role concretely: what did you deliver?' },
  { term: 'tasked with', advice: 'Focus on the result, not the assignment.' },
  { term: 'in charge of', advice: 'Use "Led", "Managed" or "Owned" instead.' },
  { term: 'familiar with', advice: 'List it as a skill or drop it — "familiar with" reads as weak.' },
  { term: 'hard worker', advice: 'Show it with a measurable achievement instead of claiming it.' },
  { term: 'team player', advice: 'Demonstrate collaboration with a concrete example.' },
  { term: 'go-getter', advice: 'Buzzword — replace with a specific accomplishment.' },
  { term: 'think outside the box', advice: 'Cliché — describe the creative solution you produced.' },
  { term: 'detail-oriented', advice: 'Prove it with an example (e.g. "caught X before launch").' },
  { term: 'self-starter', advice: 'Show initiative with something you started or launched.' },
  { term: 'results-driven', advice: 'Buzzword — the results themselves are more convincing.' },
  { term: 'synergy', advice: 'Corporate jargon — use plain language.' },
  { term: 'various', advice: 'Vague — name the actual items or drop the word.' },
  { term: 'etc', advice: 'Vague — either list the items that matter or end the sentence.' },
  { term: 'stuff', advice: 'Too informal for a resume — name the actual work.' },
  { term: 'things', advice: 'Vague — name the specific deliverables.' },
];

export const FILLER_WORDS = [
  'very','really','extremely','basically','actually','literally','just','quite','somewhat','definitely','totally','absolutely','highly','incredibly','truly','simply','rather','fairly','pretty much','kind of','sort of','a lot of','lots of','many','several','some','successfully'
];

export const PASSIVE_HINTS = [
  'was made','was given','was done','was created','was developed','was managed','was led','were made','were given','was used','were used','was awarded','has been','have been','had been','was assigned','were assigned','is being','was being'
];

// Small dictionary of frequent resume misspellings.
export const COMMON_MISSPELLINGS = {
  'recieve': 'receive', 'recieved': 'received', 'seperate': 'separate', 'definately': 'definitely',
  'managment': 'management', 'enviroment': 'environment', 'acheive': 'achieve', 'acheived': 'achieved',
  'occured': 'occurred', 'untill': 'until', 'sucessful': 'successful', 'succesful': 'successful',
  'sucessfully': 'successfully', 'succesfully': 'successfully', 'experiance': 'experience',
  'independant': 'independent', 'liason': 'liaison', 'maintainance': 'maintenance', 'maintenence': 'maintenance',
  'neccessary': 'necessary', 'occassion': 'occasion', 'persistant': 'persistent', 'proffesional': 'professional',
  'responsibilty': 'responsibility', 'responsable': 'responsible', 'strenght': 'strength', 'commited': 'committed',
  'comittee': 'committee', 'garantee': 'guarantee', 'knowlege': 'knowledge', 'lenght': 'length',
  'oppurtunity': 'opportunity', 'prefered': 'preferred', 'refered': 'referred', 'relevent': 'relevant',
  'shedule': 'schedule', 'techical': 'technical', 'tecnical': 'technical', 'wich': 'which',
  'accross': 'across', 'agressive': 'aggressive', 'apparant': 'apparent', 'begining': 'beginning',
  'beleive': 'believe', 'buisness': 'business', 'calender': 'calendar', 'catagory': 'category',
  'cemetary': 'cemetery', 'collegue': 'colleague', 'comming': 'coming', 'commision': 'commission',
  'completly': 'completely', 'concious': 'conscious', 'curiculum': 'curriculum', 'developement': 'development',
  'diffrent': 'different', 'dissapoint': 'disappoint', 'embarass': 'embarrass', 'existance': 'existence',
  'familar': 'familiar', 'finaly': 'finally', 'foriegn': 'foreign', 'goverment': 'government',
  'gaurd': 'guard', 'happend': 'happened', 'immediatly': 'immediately', 'incidently': 'incidentally',
  'interupt': 'interrupt', 'irrelevent': 'irrelevant', 'labratory': 'laboratory',
  'libary': 'library', 'lisence': 'license', 'noticable': 'noticeable', 'occurence': 'occurrence',
  'paralel': 'parallel', 'posession': 'possession', 'privelege': 'privilege',
  'reccomend': 'recommend', 'refrence': 'reference', 'repitition': 'repetition', 'secratary': 'secretary',
  'similiar': 'similar', 'supercede': 'supersede', 'tommorow': 'tomorrow', 'tounge': 'tongue',
  'wierd': 'weird', 'writting': 'writing', 'acommodate': 'accommodate', 'accomodate': 'accommodate',
};

/** Flatten a resume `data` object into plain text. */
export function resumeToText(data = {}) {
  const parts = [];
  if (data.fullName) parts.push(data.fullName);
  if (data.summary) parts.push(data.summary);
  for (const exp of data.experience || []) {
    parts.push([exp.role, exp.company].filter(Boolean).join(' at '));
    if (exp.description) parts.push(exp.description);
  }
  for (const edu of data.education || []) {
    parts.push([edu.degree, edu.school].filter(Boolean).join(' at '));
    if (edu.achievements) parts.push(edu.achievements);
  }
  if (Array.isArray(data.skills)) parts.push(data.skills.join(', '));
  return parts.filter(Boolean).join('\n');
}

/** All experience bullets (non-empty lines of every description). */
export function extractBullets(data = {}) {
  const bullets = [];
  for (const exp of data.experience || []) {
    if (!exp.description) continue;
    for (const line of exp.description.split('\n')) {
      const t = line.trim().replace(/^[-•*]\s*/, '');
      if (t) bullets.push(t);
    }
  }
  return bullets;
}

export function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9+#./-]+/g) || []).filter(
    (w) => w.length > 1 && !STOPWORDS.has(w)
  );
}

/** Find KNOWN_SKILLS phrases present in the given text (lowercased match). */
export function findSkillsInText(text) {
  const lower = ` ${text.toLowerCase().replace(/[\n\r]/g, ' ')} `;
  const found = new Set();
  for (const skill of KNOWN_SKILLS) {
    // word-boundary-ish phrase match that tolerates punctuation
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i');
    if (re.test(lower)) found.add(skill);
  }
  return [...found];
}

export function countWords(text) {
  return (text.match(/\b[\w'-]+\b/g) || []).length;
}

export function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const matches = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '')
    .match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/** Flesch Reading Ease over resume text; bullets are treated as sentences. */
export function fleschReadingEase(text) {
  const sentences = text.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length > 2);
  const words = text.match(/\b[\w'-]+\b/g) || [];
  if (sentences.length === 0 || words.length === 0) return null;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const wps = words.length / sentences.length;
  const spw = syllables / words.length;
  return 206.835 - 1.015 * wps - 84.6 * spw;
}

export function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}
