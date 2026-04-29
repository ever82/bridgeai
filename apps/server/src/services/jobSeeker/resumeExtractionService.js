/**
 * Resume Extraction Service
 *
 * AI-powered resume parsing and skill extraction.
 */
import { v4 as uuidv4 } from 'uuid';
import { SkillLevel, } from '@bridgeai/shared';
import { calculateQualityScore } from './profileService';
/**
 * Extract structured data from natural language resume text
 */
export async function extractFromNaturalLanguage(text) {
    // In production, this would call an LLM API
    // For now, use basic rule-based extraction
    const result = {
        skills: extractSkills(text),
        workExperiences: extractWorkExperiences(text),
        educations: extractEducations(text),
        summary: extractSummary(text),
        certifications: extractCertifications(text),
        languages: extractLanguages(text),
        confidence: 0.7, // Placeholder confidence
    };
    return result;
}
/**
 * Skill extraction from text using keyword matching
 */
function extractSkills(text) {
    const skillKeywords = {
        frontend: [
            'React',
            'Vue',
            'Angular',
            'TypeScript',
            'JavaScript',
            'HTML',
            'CSS',
            'Next.js',
            'Nuxt.js',
            'Tailwind',
        ],
        backend: [
            'Node.js',
            'Python',
            'Java',
            'Go',
            'Rust',
            'Express',
            'Django',
            'Flask',
            'Spring',
            'FastAPI',
        ],
        database: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite'],
        devops: ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD', 'Terraform', 'Jenkins'],
        mobile: ['React Native', 'Flutter', 'iOS', 'Android', 'Swift', 'Kotlin'],
        design: ['Figma', 'Sketch', 'Photoshop', 'Illustrator', 'UI/UX'],
        other: ['Git', 'Agile', 'Scrum', 'REST API', 'GraphQL', 'WebSocket', 'Machine Learning', 'AI'],
    };
    const found = [];
    const textUpper = text;
    for (const [category, keywords] of Object.entries(skillKeywords)) {
        for (const keyword of keywords) {
            if (textUpper.toLowerCase().includes(keyword.toLowerCase())) {
                found.push({
                    id: uuidv4(),
                    name: keyword,
                    category,
                    level: inferSkillLevel(textUpper, keyword),
                });
            }
        }
    }
    return found;
}
/**
 * Infer skill level from context
 */
function inferSkillLevel(text, skill) {
    const lower = text.toLowerCase();
    const skillLower = skill.toLowerCase();
    // Look for level indicators near the skill mention
    const patterns = [
        {
            pattern: new RegExp(`${skillLower}[^.]{0,30}(expert|master|精通)`, 'i'),
            level: SkillLevel.EXPERT,
        },
        { pattern: new RegExp(`(expert|master|精通)${skillLower}`, 'i'), level: SkillLevel.EXPERT },
        {
            pattern: new RegExp(`${skillLower}[^.]{0,30}(advanced|熟练|高级)`, 'i'),
            level: SkillLevel.ADVANCED,
        },
        { pattern: new RegExp(`(advanced|熟练|高级)${skillLower}`, 'i'), level: SkillLevel.ADVANCED },
        {
            pattern: new RegExp(`${skillLower}[^.]{0,30}(beginner|入门|初级|了解)`, 'i'),
            level: SkillLevel.BEGINNER,
        },
        {
            pattern: new RegExp(`(beginner|入门|初级|了解)${skillLower}`, 'i'),
            level: SkillLevel.BEGINNER,
        },
    ];
    for (const { pattern, level } of patterns) {
        if (pattern.test(lower)) {
            return level;
        }
    }
    return SkillLevel.INTERMEDIATE;
}
/**
 * Extract work experiences from text
 */
function extractWorkExperiences(text) {
    const experiences = [];
    // Match patterns like "2020.01 - 2023.06 | Company Name | Job Title"
    const dateCompanyPatterns = [
        /(\d{4}[./-]\d{2})\s*[-–]\s*(\d{4}[./-]\d{2}|至今|present)\s*[|,，]?\s*([^|,，]+)\s*[|,，]\s*([^\n]+)/gi,
        /(\d{4})\s*[-–]\s*(\d{4}|至今|present)\s*[|,，]?\s*([^|,，]+)\s*[|,，]\s*([^\n]+)/gi,
    ];
    for (const pattern of dateCompanyPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const startDate = match[1].replace(/[./]/g, '-');
            const endDateStr = match[2];
            const isCurrent = /至今|present/i.test(endDateStr);
            const endDate = isCurrent ? undefined : endDateStr.replace(/[./]/g, '-');
            const company = match[3]?.trim();
            const title = match[4]?.trim();
            if (company && title) {
                experiences.push({
                    id: uuidv4(),
                    company,
                    title,
                    startDate,
                    endDate,
                    isCurrent,
                });
            }
        }
    }
    return experiences;
}
/**
 * Extract education from text
 */
function extractEducations(text) {
    const educations = [];
    // Match education patterns
    const degreePatterns = [
        /(\d{4})\s*[-–]\s*(\d{4}|至今)\s*[|,，]?\s*([^|,，]+)\s*[|,，]\s*(本科|硕士|博士|大专|学士|Master|Bachelor|PhD|Doctorate|MBA|Associate)/gi,
        /((?:本科|硕士|博士|大专|学士|Master|Bachelor|PhD|Doctorate|MBA))\s*[|,，:]?\s*([^|,，\n]+)/gi,
    ];
    for (const pattern of degreePatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            if (match[0].includes('|') || match[0].includes('，') || match[0].includes(',')) {
                const startDate = match[1]?.match(/^\d{4}$/) ? match[1] : undefined;
                const endDate = match[2]?.match(/^\d{4}$/) ? match[2] : undefined;
                const institution = match[3]?.trim();
                const degree = match[4]?.trim();
                if (institution && degree) {
                    educations.push({
                        id: uuidv4(),
                        institution,
                        degree: normalizeDegree(degree),
                        field: '', // Extract separately if possible
                        startDate: startDate || '',
                        endDate: endDate || undefined,
                        isCurrent: /至今/i.test(match[2] || ''),
                    });
                }
            }
        }
    }
    return educations;
}
function normalizeDegree(degree) {
    const mapping = {
        本科: 'Bachelor',
        学士: 'Bachelor',
        Bachelor: 'Bachelor',
        硕士: 'Master',
        Master: 'Master',
        MBA: 'MBA',
        博士: 'PhD',
        PhD: 'PhD',
        Doctorate: 'PhD',
        大专: 'Associate',
        Associate: 'Associate',
    };
    return mapping[degree] || degree;
}
/**
 * Extract summary from text (first paragraph or dedicated section)
 */
function extractSummary(text) {
    // Look for dedicated summary section
    const summaryPatterns = [
        /(?:个人简介|自我介绍|Summary|About|Profile|简介)[：:]\s*\n?([\s\S]{20,500}?)(?:\n\n|\n#|$)/i,
        /^(.{50,300}?)(?:\n\n)/, // First paragraph
    ];
    for (const pattern of summaryPatterns) {
        const match = pattern.exec(text);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return undefined;
}
/**
 * Extract certifications from text
 */
function extractCertifications(text) {
    const certs = [];
    const certPattern = /(?:证书|Certification|Certified|认证)[：:]\s*\n?([\s\S]{10,1000}?)(?:\n\n|\n#|$)/i;
    const match = certPattern.exec(text);
    if (match && match[1]) {
        const lines = match[1].split('\n');
        for (const line of lines) {
            const trimmed = line.replace(/^[-*•]\s*/, '').trim();
            if (trimmed.length > 2 && trimmed.length < 100) {
                certs.push(trimmed);
            }
        }
    }
    return certs;
}
/**
 * Extract languages from text
 */
function extractLanguages(text) {
    const languageKeywords = [
        '英语',
        '中文',
        '日语',
        '韩语',
        '法语',
        '德语',
        '西班牙语',
        'English',
        'Chinese',
        'Japanese',
        'Korean',
        'French',
        'German',
        'Spanish',
    ];
    const found = [];
    for (const lang of languageKeywords) {
        if (text.toLowerCase().includes(lang.toLowerCase())) {
            found.push(lang);
        }
    }
    return found;
}
/**
 * Match skills from profile against job requirements
 */
export function matchSkills(profileSkills, requiredSkills) {
    const matched = [];
    const missing = [];
    const partial = [];
    for (const required of requiredSkills) {
        const found = profileSkills.some(s => s.name.toLowerCase() === required.toLowerCase() ||
            s.name.toLowerCase().includes(required.toLowerCase()));
        if (found) {
            matched.push(required);
        }
        else {
            // Check for partial matches (related skills)
            const related = profileSkills.some(s => levenshteinDistance(s.name.toLowerCase(), required.toLowerCase()) <= 3);
            if (related) {
                partial.push(required);
            }
            else {
                missing.push(required);
            }
        }
    }
    const score = requiredSkills.length > 0
        ? ((matched.length + partial.length * 0.5) / requiredSkills.length) * 100
        : 0;
    return {
        matchedSkills: matched,
        missingSkills: missing,
        partialSkills: partial,
        matchScore: Math.round(score),
    };
}
/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[b.length][a.length];
}
/**
 * Score resume for a specific job
 */
export function scoreForJob(profile, jobRequirements) {
    const baseReport = calculateQualityScore(profile);
    const skillMatch = matchSkills(profile.skills, jobRequirements.skills);
    return {
        ...baseReport,
        skillMatchScore: skillMatch.matchScore,
        competitivenessScore: calculateCompetitiveness(profile, skillMatch.matchScore),
        skillMatch,
    };
}
function calculateCompetitiveness(profile, skillMatchScore) {
    let score = skillMatchScore * 0.5; // 50% weight on skill match
    // Work experience
    const yearsExp = (profile.workExperiences || []).reduce((total, exp) => {
        const start = new Date(exp.startDate + '-01');
        const end = exp.endDate ? new Date(exp.endDate + '-01') : new Date();
        return total + (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    }, 0);
    score += Math.min(yearsExp * 3, 25); // Up to 25% for experience
    // Education
    if (profile.educations && profile.educations.length > 0) {
        score += 10;
    }
    // Profile completeness
    if (profile.summary)
        score += 5;
    if (profile.certifications && profile.certifications.length > 0)
        score += 5;
    if (profile.languages && profile.languages.length > 1)
        score += 5;
    return Math.round(Math.min(score, 100));
}
//# sourceMappingURL=resumeExtractionService.js.map