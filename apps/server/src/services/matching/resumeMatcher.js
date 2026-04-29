/**
 * Resume Intelligent Matching - Core Algorithm
 *
 * Multi-dimensional matching between a candidate resume and a job posting.
 * Produces a 0-100 composite score across skill, experience, salary,
 * education, and location dimensions.
 */
// ---------------------------------------------------------------------------
// Default dimension weights
// ---------------------------------------------------------------------------
export const DEFAULT_WEIGHTS = {
    skill: 0.4,
    experience: 0.2,
    salary: 0.2,
    education: 0.1,
    location: 0.1,
};
// ---------------------------------------------------------------------------
// Skill matching
// ---------------------------------------------------------------------------
function normalizeSkill(skill) {
    return skill
        .toLowerCase()
        .trim()
        .replace(/[\s-_.]+/g, ' ');
}
function skillsMatch(resumeSkill, jobSkill) {
    const a = normalizeSkill(resumeSkill);
    const b = normalizeSkill(jobSkill);
    return a === b || a.includes(b) || b.includes(a);
}
export function calculateSkillScore(resumeSkills, jobSkills, requiredSkills = []) {
    if (jobSkills.length === 0) {
        return { score: 100, matched: [], missing: [], bonus: resumeSkills };
    }
    const matched = [];
    const missing = [];
    for (const js of jobSkills) {
        const hit = resumeSkills.some(rs => skillsMatch(rs, js));
        if (hit) {
            matched.push(js);
        }
        else {
            missing.push(js);
        }
    }
    const bonus = resumeSkills.filter(rs => !jobSkills.some(js => skillsMatch(rs, js)));
    // Required skills have higher impact — each missing required skill docks heavily
    const requiredMissing = requiredSkills.filter(rs => !resumeSkills.some(sk => skillsMatch(sk, rs)));
    // Base score: proportion of job skills matched
    let score = (matched.length / jobSkills.length) * 100;
    // Penalty for missing required skills (up to -30)
    if (requiredSkills.length > 0) {
        const penalty = (requiredMissing.length / requiredSkills.length) * 30;
        score -= penalty;
    }
    return {
        score: Math.max(0, Math.min(100, Math.round(score * 10) / 10)),
        matched,
        missing,
        bonus,
    };
}
// ---------------------------------------------------------------------------
// Experience matching
// ---------------------------------------------------------------------------
const EXPERIENCE_ORDER = ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'EXPERT'];
function experienceLevelIndex(level) {
    const idx = EXPERIENCE_ORDER.indexOf(level);
    return idx >= 0 ? idx : 2; // default to MID if unknown
}
export function calculateExperienceScore(resumeYears, jobLevel, jobMinYears, jobMaxYears, resumeLevel, resumeIndustry, jobIndustry) {
    // If no requirements at all, give neutral score
    if (jobLevel === undefined && jobMinYears === undefined) {
        return 75;
    }
    let score = 100;
    // Year-based evaluation
    if (jobMinYears !== undefined) {
        if (resumeYears < jobMinYears) {
            const gap = jobMinYears - resumeYears;
            score -= Math.min(gap * 10, 50);
        }
    }
    if (jobMaxYears !== undefined && resumeYears > jobMaxYears) {
        // Slightly over-qualified is fine, large gap is a small penalty
        const gap = resumeYears - jobMaxYears;
        score -= Math.min(gap * 5, 20);
    }
    // Level-based evaluation
    if (jobLevel && resumeLevel) {
        const jobIdx = experienceLevelIndex(jobLevel);
        const resumeIdx = experienceLevelIndex(resumeLevel);
        const diff = Math.abs(resumeIdx - jobIdx);
        if (resumeIdx < jobIdx) {
            // Under-qualified by level
            score -= diff * 15;
        }
        else if (resumeIdx > jobIdx) {
            // Over-qualified — small penalty
            score -= diff * 5;
        }
    }
    // Industry-based evaluation
    if (resumeIndustry && jobIndustry) {
        if (resumeIndustry.toLowerCase() === jobIndustry.toLowerCase()) {
            score += 5; // bonus for matching industry
        }
        else {
            score -= 10; // penalty for mismatched industry
        }
    }
    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}
// ---------------------------------------------------------------------------
// Salary matching
// ---------------------------------------------------------------------------
/** Normalize salary to monthly equivalent */
function normalizeSalary(amount, period) {
    switch (period.toUpperCase()) {
        case 'YEARLY':
            return amount / 12;
        case 'HOURLY':
            return amount * 22 * 8; // ~22 work days, 8 hours
        case 'DAILY':
            return amount * 22;
        default: // MONTHLY
            return amount;
    }
}
export function calculateSalaryScore(jobSalary, resumeExpected, resumeCurrent) {
    // No salary info from candidate — neutral
    if (!resumeExpected && !resumeCurrent) {
        return 75;
    }
    const jobMin = normalizeSalary(jobSalary.min, jobSalary.period);
    const jobMax = normalizeSalary(jobSalary.max, jobSalary.period);
    const jobRange = jobMax - jobMin || 1;
    // Use expected salary if available, otherwise current salary
    const salarySource = resumeExpected || resumeCurrent;
    const period = salarySource?.period || 'MONTHLY';
    let candidateMin;
    let candidateMax;
    if (salarySource?.min !== undefined) {
        candidateMin = normalizeSalary(salarySource.min, period);
    }
    if (salarySource?.max !== undefined) {
        candidateMax = normalizeSalary(salarySource.max, period);
    }
    // Calculate overlap
    if (candidateMin !== undefined && candidateMax !== undefined) {
        const overlapStart = Math.max(jobMin, candidateMin);
        const overlapEnd = Math.min(jobMax, candidateMax);
        if (overlapStart <= overlapEnd) {
            // There is overlap — score based on how much of both ranges overlap
            const overlapRange = overlapEnd - overlapStart;
            const candidateRange = candidateMax - candidateMin || 1;
            const overlapRatio = overlapRange / Math.max(jobRange, candidateRange);
            return Math.max(50, Math.min(100, Math.round(50 + overlapRatio * 50)));
        }
        // No overlap
        const gap = candidateMin - jobMax; // positive means candidate wants more
        if (gap > 0) {
            // Candidate expects more than job offers
            const gapRatio = gap / jobRange;
            if (jobSalary.isNegotiable) {
                return Math.max(30, Math.round(70 - gapRatio * 20));
            }
            return Math.max(0, Math.round(60 - gapRatio * 30));
        }
        else {
            // Job offers more than candidate wants — good for candidate
            return 90;
        }
    }
    // Only min or only max provided
    if (candidateMin !== undefined) {
        if (candidateMin <= jobMax) {
            return jobSalary.isNegotiable ? 80 : 70;
        }
        const gap = candidateMin - jobMax;
        const gapRatio = gap / jobRange;
        return Math.max(0, Math.round(60 - gapRatio * 30));
    }
    if (candidateMax !== undefined) {
        if (candidateMax >= jobMin) {
            return 85;
        }
        return 40;
    }
    return 75;
}
// ---------------------------------------------------------------------------
// Education matching
// ---------------------------------------------------------------------------
const EDUCATION_ORDER = ['HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE'];
function educationIndex(level) {
    const idx = EDUCATION_ORDER.indexOf(level);
    return idx >= 0 ? idx : 3; // default BACHELOR
}
export function calculateEducationScore(resumeLevel, jobLevel) {
    if (!jobLevel || jobLevel === 'NO_REQUIREMENT') {
        return 80; // No requirement → neutral-positive
    }
    if (!resumeLevel) {
        return 40; // Candidate didn't specify → below neutral
    }
    const jobIdx = educationIndex(jobLevel);
    const resumeIdx = educationIndex(resumeLevel);
    if (resumeIdx >= jobIdx) {
        // Meets or exceeds
        return Math.min(100, 80 + (resumeIdx - jobIdx) * 10);
    }
    // Below requirement
    const diff = jobIdx - resumeIdx;
    return Math.max(0, 70 - diff * 25);
}
// ---------------------------------------------------------------------------
// Location matching
// ---------------------------------------------------------------------------
export function calculateLocationScore(resumeLocation, jobLocation) {
    if (!jobLocation) {
        return 80;
    }
    if (jobLocation.isRemote) {
        return 95;
    }
    if (!resumeLocation) {
        return 50;
    }
    // Same city
    if (resumeLocation.city && jobLocation.city && resumeLocation.city === jobLocation.city) {
        return 100;
    }
    // Distance-based (using coordinates if available)
    if (resumeLocation.latitude !== undefined &&
        resumeLocation.longitude !== undefined &&
        jobLocation.latitude !== undefined &&
        jobLocation.longitude !== undefined) {
        const distanceKm = haversineKm(resumeLocation.latitude, resumeLocation.longitude, jobLocation.latitude, jobLocation.longitude);
        if (distanceKm <= 10)
            return 95;
        if (distanceKm <= 30)
            return 80;
        if (distanceKm <= 50)
            return 65;
        if (distanceKm <= 100)
            return 45;
        if (resumeLocation.willingToRelocate) {
            return 50;
        }
        return Math.max(10, 30 - Math.floor(distanceKm / 100) * 10);
    }
    if (resumeLocation.willingToRelocate) {
        return 60;
    }
    return 30;
}
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toRad(deg) {
    return (deg * Math.PI) / 180;
}
// ---------------------------------------------------------------------------
// Composite matcher
// ---------------------------------------------------------------------------
export function matchResumeToJob(resume, job, weights = DEFAULT_WEIGHTS) {
    // Skill dimension
    const skillResult = calculateSkillScore(resume.skills, job.skills, job.requiredSkills);
    const skillScore = {
        score: skillResult.score,
        weight: weights.skill,
        weighted: skillResult.score * weights.skill,
        details: formatSkillDetails(skillResult.matched.length, skillResult.missing.length, job.skills.length),
    };
    // Experience dimension
    const expScore = calculateExperienceScore(resume.experienceYears, job.experienceLevel, job.minExperienceYears, job.maxExperienceYears, resume.experienceLevel, resume.industry, job.industry);
    const experienceScore = {
        score: expScore,
        weight: weights.experience,
        weighted: expScore * weights.experience,
        details: formatExperienceDetails(resume.experienceYears, job.experienceLevel, job.minExperienceYears, resume.industry, job.industry),
    };
    // Salary dimension
    const salScore = calculateSalaryScore(job.salary, resume.expectedSalary, resume.currentSalary);
    const salaryScore = {
        score: salScore,
        weight: weights.salary,
        weighted: salScore * weights.salary,
        details: formatSalaryDetails(job.salary, resume.expectedSalary),
    };
    // Education dimension
    const eduScore = calculateEducationScore(resume.educationLevel, job.educationLevel);
    const educationScore = {
        score: eduScore,
        weight: weights.education,
        weighted: eduScore * weights.education,
        details: formatEducationDetails(resume.educationLevel, job.educationLevel),
    };
    // Location dimension
    const locScore = calculateLocationScore(resume.location, job.location);
    const locationScore = {
        score: locScore,
        weight: weights.location,
        weighted: locScore * weights.location,
        details: formatLocationDetails(resume.location, job.location),
    };
    const totalScore = Math.round((skillScore.weighted +
        experienceScore.weighted +
        salaryScore.weighted +
        educationScore.weighted +
        locationScore.weighted) *
        10) / 10;
    return {
        totalScore: Math.max(0, Math.min(100, totalScore)),
        dimensions: {
            skill: skillScore,
            experience: experienceScore,
            salary: salaryScore,
            education: educationScore,
            location: locationScore,
        },
        matchedSkills: skillResult.matched,
        missingSkills: skillResult.missing,
        bonusSkills: skillResult.bonus,
    };
}
// ---------------------------------------------------------------------------
// Detail formatters
// ---------------------------------------------------------------------------
function formatSkillDetails(matched, missing, total) {
    if (total === 0)
        return 'No skill requirements';
    return `Matched ${matched}/${total} skills, ${missing} missing`;
}
function formatExperienceDetails(years, jobLevel, minYears, resumeIndustry, jobIndustry) {
    const parts = [`${years} years experience`];
    if (jobLevel)
        parts.push(`job requires ${jobLevel}`);
    if (minYears)
        parts.push(`min ${minYears} years`);
    if (resumeIndustry && jobIndustry) {
        if (resumeIndustry.toLowerCase() === jobIndustry.toLowerCase()) {
            parts.push(`industry: ${resumeIndustry}`);
        }
        else {
            parts.push(`industry mismatch (resume: ${resumeIndustry}, job: ${jobIndustry})`);
        }
    }
    return parts.join(', ');
}
function formatSalaryDetails(jobSalary, expected) {
    const job = `${jobSalary.min}-${jobSalary.max}/${jobSalary.period}`;
    if (!expected)
        return `Job: ${job}, candidate: not specified`;
    const parts = [];
    if (expected.min)
        parts.push(`min ${expected.min}`);
    if (expected.max)
        parts.push(`max ${expected.max}`);
    return `Job: ${job}, candidate expects ${parts.join('-')}/${expected.period || 'MONTHLY'}`;
}
function formatEducationDetails(resume, job) {
    if (!job || job === 'NO_REQUIREMENT')
        return 'No education requirement';
    return `Candidate: ${resume || 'not specified'}, required: ${job}`;
}
function formatLocationDetails(resume, job) {
    if (!job)
        return 'No location requirement';
    if (job.isRemote)
        return 'Remote work — no location constraint';
    if (!resume?.city)
        return `Job in ${job.city || 'unknown'}, candidate location not specified`;
    if (resume.city === job.city)
        return `Same city: ${resume.city}`;
    return `Job: ${job.city}, Candidate: ${resume.city}${resume.willingToRelocate ? ' (willing to relocate)' : ''}`;
}
//# sourceMappingURL=resumeMatcher.js.map