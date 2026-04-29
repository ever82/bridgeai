/**
 * Image Indexing Service
 * AI-powered image tagging, description generation, and multi-dimensional indexing
 */
/**
 * Image Indexing Service
 * Generates AI tags, descriptions, and multi-dimensional indexes for images
 */
export class ImageIndexingService {
    llmService;
    indexStore = new Map();
    updateCallbacks = new Set();
    constructor(llmService) {
        this.llmService = llmService;
    }
    /**
     * Index a single image
     */
    async indexImage(image) {
        // Generate image description
        const description = await this.generateDescription(image);
        // Generate tags
        const tags = await this.generateTags(image, description);
        // Generate embedding
        const embedding = await this.generateEmbedding(image, description, tags);
        // Detect objects
        const objects = await this.detectObjects(image);
        // Analyze colors
        const colors = await this.analyzeColors(image);
        // Detect scenes
        const scenes = await this.detectScenes(image, description);
        // Analyze emotions
        const emotions = await this.analyzeEmotions(image);
        // Assess image quality
        const quality = await this.assessQuality(image);
        // Detect faces
        const faces = await this.detectFaces(image);
        // Categorize
        const categories = this.categorizeImage(tags, scenes, objects);
        const index = {
            id: `idx_${image.id}`,
            imageId: image.id,
            userId: image.userId,
            tags,
            description,
            embedding,
            categories,
            colors,
            objects,
            faces,
            scenes,
            emotions,
            quality,
            location: image.metadata?.location,
            createdAt: image.metadata?.createdAt || new Date(),
            indexedAt: new Date()
        };
        // Store index
        this.indexStore.set(index.id, index);
        // Notify listeners
        this.notifyUpdate({
            imageId: image.id,
            action: 'created',
            timestamp: new Date()
        });
        return index;
    }
    /**
     * Batch index multiple images
     */
    async indexImages(images) {
        const results = [];
        // Process in batches to avoid overwhelming the AI service
        const batchSize = 5;
        for (let i = 0; i < images.length; i += batchSize) {
            const batch = images.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(img => this.indexImage(img)));
            results.push(...batchResults);
        }
        return results;
    }
    /**
     * Generate natural language description of image
     */
    async generateDescription(image) {
        const prompt = `
      Describe this image in detail:
      Image URL: ${image.url}

      Provide a comprehensive description including:
      - Main subjects and their actions
      - Setting/environment
      - Colors and lighting
      - Composition and style
      - Mood or atmosphere

      Keep the description concise but informative (2-3 sentences).
    `;
        try {
            const response = await this.llmService.chatCompletion({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are an AI that generates detailed image descriptions.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 200
            });
            return response.choices[0]?.message?.content || 'Image description unavailable';
        }
        catch (error) {
            console.error('Description generation failed:', error);
            return 'Image description unavailable';
        }
    }
    /**
     * Generate tags for image
     */
    async generateTags(image, description) {
        const prompt = `
      Generate tags for this image:
      Description: ${description}

      Return a JSON array of tags with this structure:
      [
        { "name": "tag_name", "confidence": 0.95, "category": "object" }
      ]

      Categories: object, scene, activity, person, animal, nature, architecture, concept, color, time, location, event
      Generate 10-15 relevant tags with confidence scores.
    `;
        try {
            const response = await this.llmService.chatCompletion({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are an AI that generates image tags. Return only valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2,
                response_format: { type: 'json_object' }
            });
            const content = response.choices[0]?.message?.content || '{}';
            const parsed = JSON.parse(content);
            return (parsed.tags || parsed || []).map((tag) => ({
                name: tag.name,
                confidence: tag.confidence || 0.5,
                category: tag.category || 'concept'
            }));
        }
        catch (error) {
            console.error('Tag generation failed:', error);
            return [];
        }
    }
    /**
     * Generate embedding for semantic search
     */
    async generateEmbedding(image, description, tags) {
        const text = `${description} ${tags.map(t => t.name).join(' ')}`;
        try {
            const response = await this.llmService.createEmbedding({
                model: 'text-embedding-3-small',
                input: text,
                dimensions: 512
            });
            return response.data[0]?.embedding || [];
        }
        catch (error) {
            console.error('Embedding generation failed:', error);
            return [];
        }
    }
    /**
     * Detect objects in image
     */
    async detectObjects(image) {
        // In a real implementation, this would use an object detection model
        // For now, return empty array as placeholder
        return [];
    }
    /**
     * Analyze dominant colors
     */
    async analyzeColors(image) {
        // In a real implementation, this would analyze the image pixels
        // For now, return common colors
        return ['various'];
    }
    /**
     * Detect scene types
     */
    async detectScenes(image, description) {
        const scenes = [
            'indoor', 'outdoor', 'nature', 'urban', 'beach', 'mountain',
            'city', 'countryside', 'party', 'work', 'travel', 'family'
        ];
        const matched = scenes.filter(scene => description.toLowerCase().includes(scene));
        return matched.length > 0 ? matched : ['general'];
    }
    /**
     * Analyze emotions in image
     */
    async analyzeEmotions(image) {
        // In a real implementation, this would use emotion detection
        return [];
    }
    /**
     * Assess image quality
     */
    async assessQuality(image) {
        // In a real implementation, this would analyze image properties
        return {
            score: 0.8,
            brightness: 0.7,
            sharpness: 0.8,
            contrast: 0.75,
            noise: 0.2
        };
    }
    /**
     * Detect faces in image
     */
    async detectFaces(image) {
        // In a real implementation, this would use face detection
        return [];
    }
    /**
     * Categorize image based on tags, scenes, and objects
     */
    categorizeImage(tags, scenes, objects) {
        const categories = new Set();
        // Add based on tags
        tags.forEach(tag => {
            if (tag.confidence > 0.7) {
                categories.add(tag.category);
            }
        });
        // Add based on scenes
        scenes.forEach(scene => {
            categories.add(scene);
        });
        return Array.from(categories);
    }
    /**
     * Get index by image ID
     */
    async getIndex(imageId) {
        return (Array.from(this.indexStore.values()).find(idx => idx.imageId === imageId) ||
            null);
    }
    /**
     * Get all indexes for a user
     */
    async getUserIndexes(userId) {
        return Array.from(this.indexStore.values()).filter(idx => idx.userId === userId);
    }
    /**
     * Update index
     */
    async updateIndex(imageId, updates) {
        const index = await this.getIndex(imageId);
        if (!index)
            return null;
        const updated = { ...index, ...updates, indexedAt: new Date() };
        this.indexStore.set(index.id, updated);
        this.notifyUpdate({
            imageId,
            action: 'updated',
            timestamp: new Date(),
            changes: Object.keys(updates)
        });
        return updated;
    }
    /**
     * Delete index
     */
    async deleteIndex(imageId) {
        const index = await this.getIndex(imageId);
        if (!index)
            return false;
        this.indexStore.delete(index.id);
        this.notifyUpdate({
            imageId,
            action: 'deleted',
            timestamp: new Date()
        });
        return true;
    }
    /**
     * Get all tags used by a user
     */
    async getUserTags(userId) {
        const indexes = await this.getUserIndexes(userId);
        const tagCounts = new Map();
        indexes.forEach(idx => {
            idx.tags.forEach(tag => {
                const count = tagCounts.get(tag.name) || 0;
                tagCounts.set(tag.name, count + 1);
            });
        });
        return Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }
    /**
     * Subscribe to index updates
     */
    onUpdate(callback) {
        this.updateCallbacks.add(callback);
        return () => this.updateCallbacks.delete(callback);
    }
    notifyUpdate(event) {
        this.updateCallbacks.forEach(cb => {
            try {
                cb(event);
            }
            catch (error) {
                console.error('Update callback error:', error);
            }
        });
    }
}
// Singleton instance
let serviceInstance = null;
export function getImageIndexingService(llmService) {
    if (!serviceInstance) {
        serviceInstance = new ImageIndexingService(llmService);
    }
    return serviceInstance;
}
//# sourceMappingURL=imageIndexing.js.map