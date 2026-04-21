/**
 * Resume Screening Prompts
 * AI简历筛选提示词
 *
 * Provides prompt templates for LLM-based resume deep analysis:
 * - Implicit skill inference
 * - Experience relevance evaluation
 * - Cultural fit prediction
 * - Screening recommendation generation
 */

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface ResumeScreeningContext {
  /** Raw resume text */
  resumeText: string;
  /** Extracted or provided resume fields */
  resumeProfile?: {
    skills?: string[];
    experienceYears?: number;
    educationLevel?: string;
    currentTitle?: string;
    location?: string;
    languages?: string[];
  };
  /** Job posting criteria */
  jobCriteria: {
    title: string;
    requiredSkills: string[];
    preferredSkills?: string[];
    minExperienceYears?: number;
    educationLevel?: string;
    location?: string;
    isRemote?: boolean;
    description?: string;
    salary?: { min?: number; max?: number; currency?: string };
  };
  /** Additional context */
  employerProfile?: {
    companyName?: string;
    culture?: string[];
    industry?: string;
    size?: string;
  };
  /** Whether to include cultural fit analysis */
  includeCulturalFit?: boolean;
}

export interface ScreeningPrompt {
  system: string;
  user: string;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert HR screening assistant. Your role is to perform deep resume analysis and provide structured screening recommendations.

For each resume evaluation, you must:
1. **Extract and infer implicit skills** - go beyond listed skills to infer abilities from experience descriptions
2. **Assess experience relevance** - evaluate how directly the candidate's experience maps to the role
3. **Predict cultural fit** - analyze communication style, career trajectory, and background signals
4. **Generate actionable screening suggestions** - clear GO/NO_GO/HOLD with specific reasoning
5. **Score and rank** - provide a 0-100 screening score with dimension breakdown

Be objective, data-driven, and provide specific evidence from the resume for each assessment.

Respond in JSON format only.`;

// ---------------------------------------------------------------------------
// Screening analysis prompt
// ---------------------------------------------------------------------------

export function getScreeningPrompt(context: ResumeScreeningContext): ScreeningPrompt {
  const { resumeText, resumeProfile, jobCriteria, employerProfile, includeCulturalFit = true } = context;

  const userPrompt = `## Resume to Analyze:
"""${resumeText}"""

${resumeProfile ? `## Known Resume Fields:
- Skills: ${resumeProfile.skills?.join(', ') || 'not specified'}
- Experience: ${resumeProfile.experienceYears ? `${resumeProfile.experienceYears} years` : 'not specified'}
- Education: ${resumeProfile.educationLevel || 'not specified'}
- Current Title: ${resumeProfile.currentTitle || 'not specified'}
- Location: ${resumeProfile.location || 'not specified'}
- Languages: ${resumeProfile.languages?.join(', ') || 'not specified'}` : ''}

## Job Posting:
- Title: ${jobCriteria.title}
- Required Skills: ${jobCriteria.requiredSkills.join(', ') || 'not specified'}
${jobCriteria.preferredSkills ? `- Preferred Skills: ${jobCriteria.preferredSkills.join(', ')}` : ''}
- Min Experience: ${jobCriteria.minExperienceYears ? `${jobCriteria.minExperienceYears} years` : 'not specified'}
- Education: ${jobCriteria.educationLevel || 'not specified'}
- Location: ${jobCriteria.location || 'not specified'}
- Remote: ${jobCriteria.isRemote ? 'Yes' : 'No'}
${jobCriteria.description ? `- Description: ${jobCriteria.description}` : ''}
${jobCriteria.salary ? `- Salary Range: ${jobCriteria.salary.min || '?'}-${jobCriteria.salary.max || '?'} ${jobCriteria.salary.currency || 'CNY'}` : ''}

${employerProfile ? `## Employer Profile:
- Company: ${employerProfile.companyName || 'not specified'}
- Industry: ${employerProfile.industry || 'not specified'}
- Size: ${employerProfile.size || 'not specified'}
${employerProfile.culture ? `- Culture: ${employerProfile.culture.join(', ')}` : ''}` : ''}

## Output Format (JSON):
{
  "screeningScore": number,  // 0-100 overall screening score
  "recommendation": "STRONG_GO" | "GO" | "HOLD" | "NO_GO",
  "dimensions": {
    "explicitSkillsMatch": { "score": number, "details": string },
    "implicitSkillsInferred": { "skills": string[], "details": string },
    "experienceRelevance": { "score": number, "details": string },
    "educationFit": { "score": number, "details": string },
    ${includeCulturalFit ? `"culturalFit": { "score": number, "details": string },` : ''}
    "salaryFit": { "score": number, "details": string }
  },
  "matchedSkills": string[],
  "missingSkills": string[],
  "inferredSkills": string[],
  "concerns": string[],
  "strengths": string[],
  "screeningNotes": string,
  "followUpQuestions": string[]
}`;

  return {
    system: SYSTEM_PROMPT,
    user: userPrompt,
  };
}

// ---------------------------------------------------------------------------
// Batch screening prompt (multiple resumes)
// ---------------------------------------------------------------------------

export function getBatchScreeningPrompt(
  resumes: Array<{ id: string; text: string }>,
  jobCriteria: ResumeScreeningContext['jobCriteria'],
): ScreeningPrompt {
  const resumesText = resumes
    .map((r, i) => `### Resume ${i + 1} (ID: ${r.id}):\n"""${r.text}"""\n`)
    .join('\n');

  const userPrompt = `## Job Posting:
- Title: ${jobCriteria.title}
- Required Skills: ${jobCriteria.requiredSkills.join(', ') || 'not specified'}
- Min Experience: ${jobCriteria.minExperienceYears ? `${jobCriteria.minExperienceYears} years` : 'not specified'}
- Education: ${jobCriteria.educationLevel || 'not specified'}
- Location: ${jobCriteria.location || 'not specified'}
- Remote: ${jobCriteria.isRemote ? 'Yes' : 'No'}

## Resumes to Screen:
${resumesText}

## Output Format (JSON array):
[
  {
    "resumeId": "string",
    "screeningScore": number,
    "recommendation": "STRONG_GO" | "GO" | "HOLD" | "NO_GO",
    "matchedSkills": string[],
    "missingSkills": string[],
    "concerns": string[],
    "screeningNotes": string
  },
  ...
]`;

  return {
    system: SYSTEM_PROMPT,
    user: userPrompt,
  };
}

// ---------------------------------------------------------------------------
// Recommendation explanation prompt
// ---------------------------------------------------------------------------

export function getRecommendationExplanationPrompt(
  candidateProfile: {
    name?: string;
    skills: string[];
    experienceYears: number;
    title?: string;
  },
  jobPosting: {
    title: string;
    requiredSkills: string[];
    description?: string;
    companyName?: string;
  },
  matchScore: number,
): ScreeningPrompt {
  const userPrompt = `## Candidate Profile:
- Name: ${candidateProfile.name || 'Candidate'}
- Current/Recent Title: ${candidateProfile.title || 'not specified'}
- Experience: ${candidateProfile.experienceYears} years
- Skills: ${candidateProfile.skills.join(', ') || 'not specified'}

## Job Posting:
- Title: ${jobPosting.title}
- Company: ${jobPosting.companyName || 'not specified'}
- Required Skills: ${jobPosting.requiredSkills.join(', ') || 'not specified'}
${jobPosting.description ? `- Description: ${jobPosting.description}` : ''}

## Match Score: ${matchScore}/100

## Output Format (JSON):
{
  "summary": "string (2-3 sentence summary of why this is a good match)",
  "matchingReasons": [
    "string (specific reason 1)",
    "string (specific reason 2)"
  ],
  "skillAlignment": {
    "matched": string[],
    "gaps": string[]
  },
  "careerFit": "string (assessment of career trajectory fit)",
  "recommendedNextSteps": [
    "string (specific action for recruiter)"
  ]
}`;

  return {
    system: `You are an AI recruitment assistant. Generate clear, specific explanations for why a candidate matches (or doesn't match) a job posting. Focus on concrete, actionable insights that help recruiters understand the match quality.`,
    user: userPrompt,
  };
}
