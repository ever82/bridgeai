/**
 * Opening Line Service
 * 约会开场白生成服务 - 基于匹配点生成个性化开场白
 */
import { logger } from '../../utils/logger';
// ============================================
// 开场白模板库
// ============================================
const INTEREST_BASED_TEMPLATES = {
    SPORTS: [
        '看到你也喜欢运动！你最近有在关注什么比赛吗？',
        '运动达人！你平时喜欢什么运动？也许我们可以一起锻炼。',
    ],
    MUSIC: ['音乐品味很合拍呢！你最近在听什么？', '看到你也喜欢音乐，有什么推荐的歌吗？'],
    READING: ['爱读书的人最有魅力了！最近在看什么书？', '书友！你最近有什么推荐的书吗？'],
    TRAVEL: ['旅行爱好者！你最难忘的一次旅行是去哪里？', '看到你也爱旅行，有没有特别想去的地方？'],
    FOOD: ['美食家！你知道附近有什么好吃的推荐吗？', '吃货合拍！你最喜欢的菜系是什么？'],
    MOVIES: ['电影爱好者！最近有什么好片推荐吗？', '看到你也喜欢看电影，你最喜欢的类型是什么？'],
    GAMING: ['游戏玩家！你最近在玩什么游戏？', '看到你也喜欢游戏，要不要一起玩？'],
    PHOTOGRAPHY: ['摄影爱好者！你平时喜欢拍什么类型的照片？', '看到你也喜欢摄影，你用什么相机？'],
    ARTS: ['艺术爱好者！你最近有去看什么展览吗？', '看到你也喜欢艺术，你有什么推荐的展览吗？'],
    TECH: ['科技爱好者！你对最近什么科技新闻感兴趣？', '看到你也关注科技，有什么有趣的产品推荐吗？'],
    OUTDOOR: ['户外爱好者！你周末一般去哪里玩？', '看到你也喜欢户外活动，有推荐的路线吗？'],
    PETS: ['宠物爱好者！你有养宠物吗？', '看到你也喜欢宠物，你是猫派还是狗派？'],
    COOKING: ['厨艺高手！你拿手菜是什么？', '看到你也喜欢做饭，有什么简单的食谱推荐吗？'],
    FITNESS: ['健身达人！你平时都怎么锻炼？', '看到你也喜欢健身，你去哪个健身房？'],
    DANCING: ['舞蹈爱好者！你喜欢什么类型的舞蹈？', '看到你也喜欢跳舞，你学了多久了？'],
    FASHION: ['时尚达人！你对穿搭有什么心得？', '看到你也关注时尚，有什么好品牌推荐吗？'],
};
const PERSONALITY_BASED_TEMPLATES = {
    INTROVERTED: ['你给我的感觉特别温暖和深沉。', '感觉你是一个很有内涵的人。'],
    EXTROVERTED: ['你的活力很有感染力！', '感觉你是一个很开朗的人。'],
    HUMOROUS: ['听说有趣的人都在这里相遇了！', '我就喜欢你这样有幽默感的人。'],
    GENTLE: ['你给人的感觉特别温柔。', '感觉你是一个很细心的人。'],
    ADVENTUROUS: ['冒险家！你最近有什么有趣的经历？', '看到你也是个爱冒险的人！'],
    CREATIVE: ['创意达人！你平时都做些什么创作？', '看到你也是个很有创意的人。'],
    RATIONAL: ['理性的人最有魅力了！你对最近的热点怎么看？', '感觉你是一个很有想法的人。'],
};
const LIFESTYLE_BASED_TEMPLATES = {
    same_city: ['原来我们同城的！你平时喜欢去哪里逛？', '同城！有空一起出来玩呀。'],
    same_province: ['我们离得不远呢！你那边有什么好玩的地方？', '原来我们在同一个省！'],
    night_owl: ['夜猫子集合！你一般几点睡？', '看到你也是夜猫子，安心了。'],
    early_bird: ['早起鸟！你早上一般做什么？', '看到你也是早起的，难得。'],
};
const GENERIC_TEMPLATES = [
    '嗨！很高兴认识你，感觉我们有不少共同点。',
    '你好！看到你的资料觉得很有意思，想和你聊聊。',
    '嗨！系统推荐了我们，我觉得推荐得挺好的。',
    '你好呀！匹配度还挺高的，聊聊看？',
];
// ============================================
// 开场白生成逻辑
// ============================================
/**
 * 根据匹配亮点生成个性化开场白
 */
export function generateOpeningLine(request) {
    const { matchScore, tone = 'friendly' } = request;
    const basedOn = [];
    const alternatives = [];
    // 1. 优先基于兴趣匹配生成
    const interestLine = generateInterestBasedLine(matchScore);
    if (interestLine) {
        basedOn.push('共同兴趣');
        alternatives.push(interestLine);
    }
    // 2. 基于性格匹配生成
    const personalityLine = generatePersonalityBasedLine(matchScore);
    if (personalityLine) {
        basedOn.push('性格契合');
        alternatives.push(personalityLine);
    }
    // 3. 基于生活方式匹配
    const lifestyleLine = generateLifestyleBasedLine(matchScore);
    if (lifestyleLine) {
        basedOn.push('生活方式');
        alternatives.push(lifestyleLine);
    }
    // 4. 基于匹配度分数
    if (matchScore.totalScore >= 80) {
        basedOn.push('高匹配度');
        alternatives.push(`系统说我们匹配度${matchScore.totalScore}%，我觉得可以聊聊看！`);
    }
    // 选择主开场白（优先兴趣类）
    const mainLine = interestLine ??
        personalityLine ??
        lifestyleLine ??
        GENERIC_TEMPLATES[Math.floor(Math.random() * GENERIC_TEMPLATES.length)];
    // 确保至少有2个备选
    while (alternatives.length < 2) {
        alternatives.push(GENERIC_TEMPLATES[Math.floor(Math.random() * GENERIC_TEMPLATES.length)]);
    }
    logger.info(`Generated opening line based on: ${basedOn.join(', ')}`);
    return {
        line: mainLine,
        tone,
        basedOn,
        alternatives: alternatives.slice(0, 3),
    };
}
/**
 * 基于兴趣生成开场白
 */
function generateInterestBasedLine(matchScore) {
    const interestHighlights = matchScore.highlights.filter(h => h.includes('兴趣') || h.includes('共同'));
    if (interestHighlights.length === 0)
        return null;
    // 检查各兴趣类别模板
    for (const [category, templates] of Object.entries(INTEREST_BASED_TEMPLATES)) {
        for (const highlight of interestHighlights) {
            if (highlight.toLowerCase().includes(category.toLowerCase())) {
                return templates[Math.floor(Math.random() * templates.length)];
            }
        }
    }
    // 通用兴趣开场
    if (interestHighlights.length > 0) {
        return interestHighlights[0].includes('共同') ? '我们有好多共同爱好！你最热衷的是哪个？' : null;
    }
    return null;
}
/**
 * 基于性格生成开场白
 */
function generatePersonalityBasedLine(matchScore) {
    const personalityHighlights = matchScore.highlights.filter(h => h.includes('性格') || h.includes('MBTI') || h.includes('互补'));
    if (personalityHighlights.length === 0)
        return null;
    for (const [trait, templates] of Object.entries(PERSONALITY_BASED_TEMPLATES)) {
        for (const highlight of personalityHighlights) {
            if (highlight.includes(trait)) {
                return templates[Math.floor(Math.random() * templates.length)];
            }
        }
    }
    return personalityHighlights[0].includes('MBTI') ? 'MBTI很合拍呢！你是怎么了解到MBTI的？' : null;
}
/**
 * 基于生活方式生成开场白
 */
function generateLifestyleBasedLine(matchScore) {
    const lifestyleHighlights = matchScore.highlights.filter(h => h.includes('同城') || h.includes('作息') || h.includes('生活') || h.includes('同省'));
    if (lifestyleHighlights.length === 0)
        return null;
    for (const [key, templates] of Object.entries(LIFESTYLE_BASED_TEMPLATES)) {
        for (const highlight of lifestyleHighlights) {
            if (highlight.includes(key.replace('_', '')) || highlight.includes(key)) {
                return templates[Math.floor(Math.random() * templates.length)];
            }
        }
    }
    return lifestyleHighlights[0].includes('作息') ? '看到我们作息很合拍！你一般几点起床？' : null;
}
/**
 * 批量生成多个开场白选项
 */
export function generateOpeningLineOptions(request, count = 3) {
    const results = [];
    const tones = [
        'casual',
        'friendly',
        'humorous',
        'sincere',
    ];
    for (let i = 0; i < count; i++) {
        const result = generateOpeningLine({
            ...request,
            tone: tones[i % tones.length],
        });
        results.push(result);
    }
    return results;
}
export default {
    generateOpeningLine,
    generateOpeningLineOptions,
};
//# sourceMappingURL=openingLineService.js.map