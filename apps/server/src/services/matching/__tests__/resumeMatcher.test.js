"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resumeMatcher_1 = require("../resumeMatcher");
// ---------------------------------------------------------------------------
// Skill score
// ---------------------------------------------------------------------------
describe('calculateSkillScore', () => {
    it('returns 100 when job has no skill requirements', () => {
        const result = (0, resumeMatcher_1.calculateSkillScore)(['React', 'TypeScript'], []);
        expect(result.score).toBe(100);
        expect(result.matched).toEqual([]);
        expect(result.missing).toEqual([]);
    });
    it('scores perfect match at 100', () => {
        const result = (0, resumeMatcher_1.calculateSkillScore)(['React', 'TypeScript', 'Node.js'], ['React', 'TypeScript']);
        expect(result.score).toBe(100);
        expect(result.matched).toEqual(['React', 'TypeScript']);
        expect(result.missing).toEqual([]);
    });
    it('scores partial match proportionally', () => {
        const result = (0, resumeMatcher_1.calculateSkillScore)(['React', 'Node.js'], ['React', 'TypeScript', 'Python']);
        expect(result.score).toBeCloseTo(100 / 3, 0);
        expect(result.matched).toEqual(['React']);
        expect(result.missing).toEqual(['TypeScript', 'Python']);
    });
    it('scores 0 when no skills match', () => {
        const result = (0, resumeMatcher_1.calculateSkillScore)(['Java'], ['React', 'TypeScript']);
        expect(result.score).toBe(0);
        expect(result.matched).toEqual([]);
        expect(result.missing).toEqual(['React', 'TypeScript']);
    });
    it('penalizes missing required skills', () => {
        const result = (0, resumeMatcher_1.calculateSkillScore)(['React'], ['React', 'TypeScript'], ['TypeScript'] // required
        );
        // 1/2 matched = 50 base, missing 1/1 required = -30 penalty
        expect(result.score).toBe(20);
    });
    it('penalizes multiple missing required skills', () => {
        const result = (0, resumeMatcher_1.calculateSkillScore)(['React'], ['React', 'TypeScript', 'Python'], ['TypeScript', 'Python'] // both required and missing
        );
        // 1/3 matched ≈ 33.3 base, 2/2 required missing = -60 penalty → clamped to ~0
        expect(result.score).toBeLessThanOrEqual(5);
    });
    it('no penalty when all required skills are present', () => {
        const result = (0, resumeMatcher_1.calculateSkillScore)(['React', 'TypeScript'], ['React', 'TypeScript', 'Python'], ['React', 'TypeScript']);
        // 2/3 matched ≈ 66.7, no penalty for missing optional
        expect(result.score).toBeCloseTo(66.7, 0);
    });
    it('identifies bonus skills', () => {
        const result = (0, resumeMatcher_1.calculateSkillScore)(['React', 'TypeScript', 'GraphQL', 'Docker'], ['React', 'TypeScript']);
        expect(result.bonus).toEqual(['GraphQL', 'Docker']);
    });
    it('handles case-insensitive matching', () => {
        const result = (0, resumeMatcher_1.calculateSkillScore)(['react', 'TYPESCRIPT'], ['React', 'TypeScript']);
        expect(result.score).toBe(100);
        expect(result.matched).toEqual(['React', 'TypeScript']);
    });
    it('handles substring matching', () => {
        const result = (0, resumeMatcher_1.calculateSkillScore)(['React.js', 'Node.js'], ['React', 'Node']);
        expect(result.score).toBe(100);
    });
});
// ---------------------------------------------------------------------------
// Experience score
// ---------------------------------------------------------------------------
describe('calculateExperienceScore', () => {
    it('returns neutral 75 when no requirements', () => {
        expect((0, resumeMatcher_1.calculateExperienceScore)(5)).toBe(75);
    });
    it('deducts for insufficient years', () => {
        const score = (0, resumeMatcher_1.calculateExperienceScore)(2, undefined, 5);
        // gap = 3, penalty = 30
        expect(score).toBe(70);
    });
    it('full score when years meet minimum', () => {
        const score = (0, resumeMatcher_1.calculateExperienceScore)(5, undefined, 3);
        expect(score).toBe(100);
    });
    it('small penalty for over-qualification by years', () => {
        const score = (0, resumeMatcher_1.calculateExperienceScore)(12, undefined, 3, 5);
        // gap = 7 over max, penalty = min(35, 20) = 20
        expect(score).toBe(80);
    });
    it('deducts for under-qualified level', () => {
        const score = (0, resumeMatcher_1.calculateExperienceScore)(2, 'SENIOR', undefined, undefined, 'JUNIOR');
        // diff = 2 levels, penalty = 30
        expect(score).toBe(70);
    });
    it('small penalty for over-qualified level', () => {
        const score = (0, resumeMatcher_1.calculateExperienceScore)(10, 'JUNIOR', undefined, undefined, 'EXPERT');
        // diff = 3 levels, penalty = 15
        expect(score).toBe(85);
    });
    it('perfect score when level matches', () => {
        const score = (0, resumeMatcher_1.calculateExperienceScore)(4, 'MID', undefined, undefined, 'MID');
        expect(score).toBe(100);
    });
    it('clamps score to 0 minimum', () => {
        const score = (0, resumeMatcher_1.calculateExperienceScore)(0, 'EXPERT', 10, undefined, 'ENTRY');
        // years gap = 10, penalty = 50; level diff = 4, penalty = 60 → total base 100 - 50 - 60 = -10 → clamped 0
        expect(score).toBe(0);
    });
    it('adds 5 for matching industry', () => {
        const score = (0, resumeMatcher_1.calculateExperienceScore)(5, undefined, 3, undefined, undefined, 'Technology', 'Technology');
        // base 100, industry match +5 → 105 → clamped to 100
        expect(score).toBe(100);
    });
    it('deducts 10 for mismatched industry', () => {
        const score = (0, resumeMatcher_1.calculateExperienceScore)(5, undefined, 3, undefined, undefined, 'Healthcare', 'Technology');
        // base 100, industry mismatch -10 → 90
        expect(score).toBe(90);
    });
    it('industry match is case-insensitive', () => {
        const score = (0, resumeMatcher_1.calculateExperienceScore)(5, undefined, 3, undefined, undefined, 'technology', 'TECHNOLOGY');
        expect(score).toBe(100);
    });
});
// ---------------------------------------------------------------------------
// Salary score
// ---------------------------------------------------------------------------
describe('calculateSalaryScore', () => {
    const jobSalary = { min: 15000, max: 25000, period: 'MONTHLY' };
    it('returns 75 when candidate has no salary info', () => {
        expect((0, resumeMatcher_1.calculateSalaryScore)(jobSalary)).toBe(75);
    });
    it('good score when ranges overlap significantly', () => {
        const result = (0, resumeMatcher_1.calculateSalaryScore)(jobSalary, { min: 18000, max: 22000, period: 'MONTHLY' });
        // 15k-25k vs 18k-22k → overlap 4k / 10k = 0.4 → score = 50 + 0.4*50 = 70
        expect(result).toBeGreaterThanOrEqual(65);
    });
    it('good score when candidate min is within job range', () => {
        const result = (0, resumeMatcher_1.calculateSalaryScore)({ ...jobSalary, isNegotiable: true }, { min: 20000, period: 'MONTHLY' });
        expect(result).toBeGreaterThanOrEqual(70);
    });
    it('lower score when candidate wants more than job offers', () => {
        const result = (0, resumeMatcher_1.calculateSalaryScore)(jobSalary, { min: 30000, max: 40000, period: 'MONTHLY' });
        expect(result).toBeLessThan(60);
    });
    it('high score when job offers more than candidate expects', () => {
        const result = (0, resumeMatcher_1.calculateSalaryScore)(jobSalary, { min: 10000, max: 15000, period: 'MONTHLY' });
        // candidate max (15k) < job min (15k) → overlap at boundary → treated as no overlap, gap = 0
        // Actually overlapStart = 15k, overlapEnd = 15k → overlap range = 0
        // score falls to the "no overlap, gap ≤ 0" → returns 90 only if gap < 0
        // gap = candidateMin(10k) - jobMax(25k) = -15k < 0 → returns 90
        expect(result).toBeGreaterThanOrEqual(50);
    });
    it('normalizes yearly salary to monthly', () => {
        const result = (0, resumeMatcher_1.calculateSalaryScore)({ min: 180000, max: 300000, period: 'YEARLY' }, { min: 15000, max: 25000, period: 'MONTHLY' });
        // 180k/12=15k to 300k/12=25k vs 15k-25k → perfect overlap
        expect(result).toBeGreaterThanOrEqual(80);
    });
    it('is more lenient when job salary is negotiable', () => {
        const negotiable = (0, resumeMatcher_1.calculateSalaryScore)({ ...jobSalary, isNegotiable: true }, { min: 28000, max: 35000, period: 'MONTHLY' });
        const fixed = (0, resumeMatcher_1.calculateSalaryScore)({ ...jobSalary, isNegotiable: false }, { min: 28000, max: 35000, period: 'MONTHLY' });
        expect(negotiable).toBeGreaterThan(fixed);
    });
});
// ---------------------------------------------------------------------------
// Education score
// ---------------------------------------------------------------------------
describe('calculateEducationScore', () => {
    it('returns 80 when no requirement', () => {
        expect((0, resumeMatcher_1.calculateEducationScore)('BACHELOR')).toBe(80);
    });
    it('returns 80 when NO_REQUIREMENT', () => {
        expect((0, resumeMatcher_1.calculateEducationScore)('BACHELOR', 'NO_REQUIREMENT')).toBe(80);
    });
    it('returns 40 when candidate did not specify and job requires', () => {
        expect((0, resumeMatcher_1.calculateEducationScore)(undefined, 'BACHELOR')).toBe(40);
    });
    it('full match when levels equal', () => {
        expect((0, resumeMatcher_1.calculateEducationScore)('BACHELOR', 'BACHELOR')).toBe(80);
    });
    it('higher score for exceeding requirement', () => {
        const score = (0, resumeMatcher_1.calculateEducationScore)('MASTER', 'BACHELOR');
        expect(score).toBe(90);
    });
    it('lower score for below requirement', () => {
        const score = (0, resumeMatcher_1.calculateEducationScore)('HIGH_SCHOOL', 'BACHELOR');
        // diff = 2, score = 70 - 50 = 20
        expect(score).toBe(20);
    });
    it('doctorate exceeds bachelor significantly', () => {
        const score = (0, resumeMatcher_1.calculateEducationScore)('DOCTORATE', 'BACHELOR');
        expect(score).toBe(100);
    });
});
// ---------------------------------------------------------------------------
// Location score
// ---------------------------------------------------------------------------
describe('calculateLocationScore', () => {
    it('returns 80 when no job location', () => {
        expect((0, resumeMatcher_1.calculateLocationScore)({ city: 'Beijing' })).toBe(80);
    });
    it('returns 95 for remote jobs', () => {
        expect((0, resumeMatcher_1.calculateLocationScore)({ city: 'Shanghai' }, { city: 'Beijing', isRemote: true })).toBe(95);
    });
    it('returns 50 when candidate has no location info', () => {
        expect((0, resumeMatcher_1.calculateLocationScore)(undefined, { city: 'Beijing' })).toBe(50);
    });
    it('returns 100 for same city', () => {
        expect((0, resumeMatcher_1.calculateLocationScore)({ city: 'Beijing' }, { city: 'Beijing' })).toBe(100);
    });
    it('scores by distance with coordinates', () => {
        // Beijing center to Tianjin center ≈ 120km
        const score = (0, resumeMatcher_1.calculateLocationScore)({ latitude: 39.9042, longitude: 116.4074 }, { latitude: 39.0842, longitude: 117.201 });
        // ~110km → 45 range
        expect(score).toBeLessThanOrEqual(50);
        expect(score).toBeGreaterThanOrEqual(10);
    });
    it('high score for nearby coordinates', () => {
        // Within same city, <10km apart
        const score = (0, resumeMatcher_1.calculateLocationScore)({ latitude: 39.9042, longitude: 116.4074 }, { latitude: 39.9242, longitude: 116.4274 });
        expect(score).toBeGreaterThanOrEqual(90);
    });
    it('bonus for willing to relocate', () => {
        const relocate = (0, resumeMatcher_1.calculateLocationScore)({ city: 'Shanghai', willingToRelocate: true }, { city: 'Beijing' });
        const noRelocate = (0, resumeMatcher_1.calculateLocationScore)({ city: 'Shanghai', willingToRelocate: false }, { city: 'Beijing' });
        expect(relocate).toBeGreaterThan(noRelocate);
    });
});
// ---------------------------------------------------------------------------
// Composite matchResumeToJob
// ---------------------------------------------------------------------------
describe('matchResumeToJob', () => {
    const perfectResume = {
        skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
        experienceYears: 4,
        experienceLevel: 'MID',
        educationLevel: 'BACHELOR',
        expectedSalary: { min: 18000, max: 25000, period: 'MONTHLY' },
        location: { city: 'Beijing', latitude: 39.9042, longitude: 116.4074 },
    };
    const matchingJob = {
        skills: ['React', 'TypeScript', 'Node.js'],
        experienceLevel: 'MID',
        minExperienceYears: 3,
        educationLevel: 'BACHELOR',
        salary: { min: 15000, max: 25000, period: 'MONTHLY' },
        location: { city: 'Beijing', latitude: 39.9042, longitude: 116.4074 },
    };
    it('scores near 100 for a perfect match', () => {
        const result = (0, resumeMatcher_1.matchResumeToJob)(perfectResume, matchingJob);
        expect(result.totalScore).toBeGreaterThanOrEqual(85);
        expect(result.totalScore).toBeLessThanOrEqual(100);
    });
    it('includes all dimension scores', () => {
        const result = (0, resumeMatcher_1.matchResumeToJob)(perfectResume, matchingJob);
        expect(result.dimensions.skill).toBeDefined();
        expect(result.dimensions.experience).toBeDefined();
        expect(result.dimensions.salary).toBeDefined();
        expect(result.dimensions.education).toBeDefined();
        expect(result.dimensions.location).toBeDefined();
    });
    it('weights sum to 1', () => {
        const sum = Object.values(resumeMatcher_1.DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1);
    });
    it('each dimension has weighted = score * weight', () => {
        const result = (0, resumeMatcher_1.matchResumeToJob)(perfectResume, matchingJob);
        for (const dim of Object.values(result.dimensions)) {
            expect(dim.weighted).toBeCloseTo(dim.score * dim.weight, 1);
        }
    });
    it('totalScore equals sum of weighted dimensions', () => {
        const result = (0, resumeMatcher_1.matchResumeToJob)(perfectResume, matchingJob);
        const sum = Object.values(result.dimensions).reduce((s, d) => s + d.weighted, 0);
        expect(result.totalScore).toBeCloseTo(Math.round(sum * 10) / 10, 0);
    });
    it('lists matched and missing skills', () => {
        const result = (0, resumeMatcher_1.matchResumeToJob)(perfectResume, matchingJob);
        expect(result.matchedSkills).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Node.js']));
        expect(result.missingSkills).toEqual([]);
    });
    it('scores lower for mismatched resume', () => {
        const weakResume = {
            skills: ['Java'],
            experienceYears: 1,
            experienceLevel: 'ENTRY',
            educationLevel: 'HIGH_SCHOOL',
            expectedSalary: { min: 35000, max: 50000, period: 'MONTHLY' },
            location: { city: 'Shanghai' },
        };
        const result = (0, resumeMatcher_1.matchResumeToJob)(weakResume, matchingJob);
        expect(result.totalScore).toBeLessThan(50);
        expect(result.missingSkills.length).toBeGreaterThan(0);
    });
    it('respects custom weights', () => {
        const result = (0, resumeMatcher_1.matchResumeToJob)(perfectResume, matchingJob, {
            skill: 1.0,
            experience: 0,
            salary: 0,
            education: 0,
            location: 0,
        });
        // Only skill matters
        expect(result.totalScore).toBe(result.dimensions.skill.score);
    });
    it('clamps totalScore to 0-100', () => {
        const result = (0, resumeMatcher_1.matchResumeToJob)({ skills: [], experienceYears: 0 }, { skills: ['React'], salary: { min: 0, max: 0, period: 'MONTHLY' } });
        expect(result.totalScore).toBeGreaterThanOrEqual(0);
        expect(result.totalScore).toBeLessThanOrEqual(100);
    });
});
//# sourceMappingURL=resumeMatcher.test.js.map