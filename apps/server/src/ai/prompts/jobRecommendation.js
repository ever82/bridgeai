/**
 * Job Recommendation Prompts
 *
 * Provides prompt templates for LLM-based job recommendation engine:
 * - Job-to-seeker matching
 * - Candidate-to-job matching (recruiter side)
 * - Recommendation explanation generation
 */
// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------
const JOB_RECOMMENDATION_SYSTEM_PROMPT = `You are an expert job recommendation engine. Your role is to match job seekers with the most relevant job opportunities based on their profile and preferences.

For each recommendation, you must:
1. **Score relevance** - provide a 0-100 match score based on skills, experience, location, salary, and preferences
2. **Identify skill alignment** - list matched skills and skill gaps
3. **Explain the match** - provide specific reasons why this job is (or isn't) a good fit
4. **Be objective** - base scores on concrete evidence, not guesses

Consider these factors in order of importance:
- Skill match (required skills first, then preferred)
- Experience level alignment
- Salary range compatibility
- Location and remote preferences
- Job type preferences

Respond in JSON format only.`;
const CANDIDATE_RECOMMENDATION_SYSTEM_PROMPT = `You are an expert recruitment recommendation engine. Your role is to match job postings with the most qualified candidates from a given pool.

For each candidate recommendation, you must:
1. **Score fit** - provide a 0-100 match score based on skills, experience, and job requirements
2. **Identify skill alignment** - list matched and missing skills relative to the job
3. **Explain the fit** - provide specific reasons why this candidate is (or isn't) a good match
4. **Be objective** - base scores on concrete evidence from the candidate's profile

Consider these factors in order of importance:
- Required skill match
- Experience level adequacy
- Preferred skill match
- Location compatibility
- Education relevance

Respond in JSON format only.`;
// ---------------------------------------------------------------------------
// Job recommendation prompt (for seekers)
// ---------------------------------------------------------------------------
export function getJobRecommendationPrompt(seekerProfile, jobs) {
    const jobsText = jobs
        .map((job, i) => `### Job ${i + 1} (ID: ${job.jobId}):
- Title: ${job.title}
- Company: ${job.companyName || 'not specified'}
- Required Skills: ${job.requiredSkills.join(', ') || 'not specified'}
${job.preferredSkills ? `- Preferred Skills: ${job.preferredSkills.join(', ')}` : ''}
- Location: ${job.location || 'not specified'}
- Remote: ${job.isRemote ? 'Yes' : 'No'}
${job.salary ? `- Salary Range: ${job.salary.min || '?'}-${job.salary.max || '?'} ${job.salary.currency || 'CNY'}` : ''}
${job.description ? `- Description: ${job.description}` : ''}`)
        .join('\n\n');
    const userPrompt = `## Job Seeker Profile:
- User ID: ${seekerProfile.userId}
- Skills: ${seekerProfile.skills.join(', ') || 'not specified'}
- Experience: ${seekerProfile.experienceYears} years
- Education: ${seekerProfile.educationLevel || 'not specified'}
- Current Title: ${seekerProfile.currentTitle || 'not specified'}
- Location: ${seekerProfile.location || 'not specified'}
${seekerProfile.preferredSalary ? `- Preferred Salary: ${seekerProfile.preferredSalary.min || '?'}-${seekerProfile.preferredSalary.max || '?'} ${seekerProfile.preferredSalary.currency || 'CNY'}` : ''}
${seekerProfile.preferredJobTypes ? `- Preferred Job Types: ${seekerProfile.preferredJobTypes.join(', ')}` : ''}
${seekerProfile.preferredLocations ? `- Preferred Locations: ${seekerProfile.preferredLocations.join(', ')}` : ''}

## Available Jobs:
${jobsText}

## Output Format (JSON array):
[
  {
    "itemId": "jobId from the job listing",
    "score": number,
    "reasons": ["string (specific reason 1)", "string (specific reason 2)"],
    "skillMatch": {
      "matched": ["skill1", "skill2"],
      "gaps": ["missingSkill1"]
    }
  }
]

Score each job from 0-100 based on how well it matches the seeker's profile. Return ALL jobs with their scores, sorted by score descending.`;
    return {
        system: JOB_RECOMMENDATION_SYSTEM_PROMPT,
        user: userPrompt,
    };
}
// ---------------------------------------------------------------------------
// Candidate recommendation prompt (for recruiters)
// ---------------------------------------------------------------------------
export function getCandidateRecommendationPrompt(jobCriteria, candidates) {
    const candidatesText = candidates
        .map((candidate, i) => `### Candidate ${i + 1} (ID: ${candidate.userId}):
- Name: ${candidate.name || 'not specified'}
- Skills: ${candidate.skills.join(', ') || 'not specified'}
- Experience: ${candidate.experienceYears} years
- Education: ${candidate.educationLevel || 'not specified'}
- Current Title: ${candidate.currentTitle || 'not specified'}
- Location: ${candidate.location || 'not specified'}`)
        .join('\n\n');
    const userPrompt = `## Job Criteria:
- Job ID: ${jobCriteria.jobId}
- Title: ${jobCriteria.title}
- Company: ${jobCriteria.companyName || 'not specified'}
- Required Skills: ${jobCriteria.requiredSkills.join(', ') || 'not specified'}
${jobCriteria.preferredSkills ? `- Preferred Skills: ${jobCriteria.preferredSkills.join(', ')}` : ''}
- Location: ${jobCriteria.location || 'not specified'}
- Remote: ${jobCriteria.isRemote ? 'Yes' : 'No'}
${jobCriteria.salary ? `- Salary Range: ${jobCriteria.salary.min || '?'}-${jobCriteria.salary.max || '?'} ${jobCriteria.salary.currency || 'CNY'}` : ''}
${jobCriteria.description ? `- Description: ${jobCriteria.description}` : ''}

## Candidate Pool:
${candidatesText}

## Output Format (JSON array):
[
  {
    "itemId": "userId from the candidate",
    "score": number,
    "reasons": ["string (specific reason 1)", "string (specific reason 2)"],
    "skillMatch": {
      "matched": ["skill1", "skill2"],
      "gaps": ["missingSkill1"]
    }
  }
]

Score each candidate from 0-100 based on how well they match the job criteria. Return ALL candidates with their scores, sorted by score descending.`;
    return {
        system: CANDIDATE_RECOMMENDATION_SYSTEM_PROMPT,
        user: userPrompt,
    };
}
// ---------------------------------------------------------------------------
// Recommendation explanation prompt
// ---------------------------------------------------------------------------
export function getRecommendationExplanationPrompt(recommendation) {
    const userPrompt = `## Recommendation to Explain:
- Item ID: ${recommendation.itemId}
- Match Score: ${recommendation.score}/100
- Reasons: ${recommendation.reasons.join('; ') || 'not specified'}
- Matched Skills: ${recommendation.skillMatch.matched.join(', ') || 'none'}
- Skill Gaps: ${recommendation.skillMatch.gaps.join(', ') || 'none'}

## Output Format (JSON):
{
  "summary": "string (2-3 sentence overview of the recommendation)",
  "details": "string (detailed paragraph explaining the match quality, strengths, and weaknesses)",
  "advice": "string (actionable advice for the user - what to do next with this recommendation)"
}`;
    return {
        system: `You are an AI recruitment assistant. Generate clear, specific explanations for recommendation matches. Focus on providing actionable insights that help users understand why a match was made and what to do next.`,
        user: userPrompt,
    };
}
//# sourceMappingURL=jobRecommendation.js.map