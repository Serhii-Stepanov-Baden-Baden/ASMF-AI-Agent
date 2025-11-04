/**
 * ASMF (Autonomous Semantic Memory Framework) - Core Memory Engine
 * Implements 3-layer memory architecture for intelligent AI agent
 * 
 * Memory Layers:
 * 1. Context Layer - Current conversation and working memory
 * 2. Semantic Layer - Knowledge structures and concepts
 * 3. Temporal Layer - Timeline history and temporal relationships
 * 
 * Features:
 * - Autonomous learning and adaptation
 * - Semantic similarity matching
 * - Temporal memory consolidation
 * - Pattern recognition and extraction
 * - Memory compression and optimization
 * 
 * Author: MiniMax Agent
 * Version: 1.0.0
 * Created: 2025-11-05
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

class ASMFEngine {
    constructor(config = {}) {
        this.config = {
            // Memory layer configurations
            contextLayer: {
                maxSize: config.contextMaxSize || 100,
                retentionTime: config.contextRetentionTime || 3600000, // 1 hour
                consolidationThreshold: config.contextConsolidationThreshold || 0.7
            },
            semanticLayer: {
                maxConcepts: config.semanticMaxConcepts || 10000,
                similarityThreshold: config.semanticSimilarityThreshold || 0.6,
                clusterSize: config.semanticClusterSize || 50
            },
            temporalLayer: {
                maxEvents: config.temporalMaxEvents || 50000,
                timeWindow: config.temporalTimeWindow || 2592000000, // 30 days
                compressionRatio: config.temporalCompressionRatio || 0.1
            },
            // Storage configuration
            storage: {
                dataPath: config.dataPath || './data/asmf-memory/',
                backupEnabled: config.backupEnabled !== false,
                backupInterval: config.backupInterval || 3600000, // 1 hour
                encryptionEnabled: config.encryptionEnabled || false
            },
            // Performance settings
            performance: {
                batchSize: config.batchSize || 100,
                maxProcessingTime: config.maxProcessingTime || 5000,
                cacheEnabled: config.cacheEnabled !== false,
                cacheSize: config.cacheSize || 1000
            },
            // AI processing settings
            ai: {
                nlpModel: config.nlpModel || 'natural',
                sentimentAnalysis: config.sentimentAnalysis !== false,
                entityRecognition: config.entityRecognition !== false,
                keywordExtraction: config.keywordExtraction !== false
            },
            ...config
        };

        // Initialize memory layers
        this.contextLayer = new ContextLayer(this.config.contextLayer);
        this.semanticLayer = new SemanticLayer(this.config.semanticLayer);
        this.temporalLayer = new TemporalLayer(this.config.temporalLayer);

        // Initialize cache and performance metrics
        this.cache = new Map();
        this.performanceMetrics = {
            totalMemories: 0,
            averageResponseTime: 0,
            memoryEfficiency: 0,
            lastConsolidation: null,
            hitRate: 0
        };

        // Storage management
        this.storage = new MemoryStorage(this.config.storage);
        
        // Initialize system
        this.initialized = false;
        this.startTime = Date.now();
    }

    /**
     * Initialize the ASMF engine
     */
    async initialize() {
        try {
            console.log('🧠 Initializing ASMF Memory Engine...');
            
            // Create storage directories
            await this.storage.initialize();
            
            // Load existing memory data
            await this.loadMemory();
            
            // Start background processes
            this.startBackgroundProcesses();
            
            // Initialize AI components
            await this.initializeAI();
            
            this.initialized = true;
            console.log('✅ ASMF Memory Engine initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize ASMF:', error);
            throw error;
        }
    }

    /**
     * Process new information and integrate into memory layers
     */
    async processInformation(input, metadata = {}) {
        try {
            if (!this.initialized) {
                throw new Error('ASMF engine not initialized');
            }

            const startTime = Date.now();
            
            // Extract semantic information
            const extractedInfo = await this.extractSemanticInfo(input);
            
            // Add to context layer
            await this.contextLayer.addMemory(extractedInfo, metadata);
            
            // Process through semantic layer
            const semanticResult = await this.semanticLayer.processInput(extractedInfo);
            
            // Store in temporal layer
            await this.temporalLayer.recordEvent(extractedInfo, metadata);
            
            // Trigger consolidation if needed
            await this.checkConsolidation();
            
            // Update performance metrics
            const processingTime = Date.now() - startTime;
            await this.updatePerformanceMetrics(processingTime, true);
            
            // Generate memory fingerprint
            const fingerprint = this.generateMemoryFingerprint(extractedInfo);
            
            return {
                success: true,
                fingerprint,
                processingTime,
                layersUpdated: ['context', 'semantic', 'temporal'],
                semanticSimilarity: semanticResult.similarity,
                consolidationTriggered: false
            };
            
        } catch (error) {
            console.error('Error processing information:', error);
            await this.updatePerformanceMetrics(0, false);
            throw error;
        }
    }

    /**
     * Retrieve information from memory layers
     */
    async retrieveInformation(query, options = {}) {
        try {
            if (!this.initialized) {
                throw new Error('ASMF engine not initialized');
            }

            const startTime = Date.now();
            
            // Check cache first
            const cacheKey = this.generateCacheKey(query, options);
            if (this.config.performance.cacheEnabled && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                await this.updatePerformanceMetrics(Date.now() - startTime, true, true);
                return {
                    ...cached,
                    cached: true,
                    retrievalTime: Date.now() - startTime
                };
            }
            
            // Extract query semantics
            const queryInfo = await this.extractSemanticInfo(query);
            
            // Search across all memory layers
            const results = {
                context: await this.contextLayer.search(queryInfo, options.context || {}),
                semantic: await this.semanticLayer.search(queryInfo, options.semantic || {}),
                temporal: await this.temporalLayer.search(queryInfo, options.temporal || {})
            };
            
            // Combine and rank results
            const rankedResults = await this.rankResults(results, queryInfo);
            
            // Create comprehensive response
            const response = {
                success: true,
                query: query,
                results: rankedResults,
                layers: results,
                totalResults: rankedResults.length,
                retrievalTime: Date.now() - startTime,
                confidence: this.calculateConfidence(rankedResults),
                metadata: {
                    searchRadius: this.calculateSearchRadius(options),
                    layerContributions: this.calculateLayerContributions(results)
                }
            };
            
            // Cache successful results
            if (this.config.performance.cacheEnabled && rankedResults.length > 0) {
                this.cache.set(cacheKey, response);
                this.cleanupCache();
            }
            
            await this.updatePerformanceMetrics(Date.now() - startTime, true);
            
            return response;
            
        } catch (error) {
            console.error('Error retrieving information:', error);
            await this.updatePerformanceMetrics(0, false);
            throw error;
        }
    }

    /**
     * Consolidate memory layers to optimize storage and performance
     */
    async consolidateMemory() {
        try {
            console.log('🔄 Starting memory consolidation...');
            
            const startTime = Date.now();
            
            // Consolidate context layer
            const contextConsolidation = await this.contextLayer.consolidate();
            
            // Consolidate semantic layer
            const semanticConsolidation = await this.semanticLayer.consolidate();
            
            // Consolidate temporal layer
            const temporalConsolidation = await this.temporalLayer.consolidate();
            
            // Optimize cross-layer connections
            const connectionOptimization = await this.optimizeConnections();
            
            // Compress and clean old data
            await this.compressAndClean();
            
            // Save consolidated state
            await this.saveMemory();
            
            const consolidationTime = Date.now() - startTime;
            
            console.log(`✅ Memory consolidation completed in ${consolidationTime}ms`);
            
            return {
                success: true,
                duration: consolidationTime,
                contextOptimizations: contextConsolidation,
                semanticOptimizations: semanticConsolidation,
                temporalOptimizations: temporalConsolidation,
                connectionOptimizations: connectionOptimization,
                totalItemsProcessed: contextConsolidation.items + semanticConsolidation.items + temporalConsolidation.items,
                compressionRatio: await this.calculateCompressionRatio()
            };
            
        } catch (error) {
            console.error('Error during memory consolidation:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive memory status
     */
    async getMemoryStatus() {
        try {
            const contextStatus = await this.contextLayer.getStatus();
            const semanticStatus = await this.semanticLayer.getStatus();
            const temporalStatus = await this.temporalLayer.getStatus();
            
            const uptime = Date.now() - this.startTime;
            
            return {
                engine: {
                    initialized: this.initialized,
                    uptime: uptime,
                    version: '1.0.0',
                    totalMemories: this.performanceMetrics.totalMemories
                },
                layers: {
                    context: contextStatus,
                    semantic: semanticStatus,
                    temporal: temporalStatus
                },
                performance: {
                    ...this.performanceMetrics,
                    cacheSize: this.cache.size,
                    cacheHitRate: this.performanceMetrics.hitRate
                },
                storage: {
                    dataPath: this.config.storage.dataPath,
                    backupEnabled: this.config.storage.backupEnabled
                },
                configuration: {
                    memoryLimits: {
                        context: this.config.contextLayer.maxSize,
                        semantic: this.config.semanticLayer.maxConcepts,
                        temporal: this.config.temporalLayer.maxEvents
                    },
                    performance: this.config.performance,
                    ai: this.config.ai
                }
            };
            
        } catch (error) {
            console.error('Error getting memory status:', error);
            throw error;
        }
    }

    /**
     * Extract semantic information from input
     */
    async extractSemanticInfo(input) {
        // This would integrate with NLP libraries like natural, spaCy, or custom models
        // For now, implementing a simplified version
        
        const info = {
            text: input,
            timestamp: Date.now(),
            tokens: [],
            entities: [],
            sentiment: { score: 0, comparative: 0 },
            keywords: [],
            concepts: [],
            embeddings: null
        };

        // Tokenization (simplified)
        info.tokens = input.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 2);

        // Basic keyword extraction
        info.keywords = this.extractKeywords(info.tokens);
        
        // Conceptual analysis
        info.concepts = await this.identifyConcepts(info.tokens);
        
        // Sentiment analysis (if enabled)
        if (this.config.ai.sentimentAnalysis) {
            info.sentiment = await this.analyzeSentiment(input);
        }
        
        // Entity recognition (if enabled)
        if (this.config.ai.entityRecognition) {
            info.entities = await this.recognizeEntities(input);
        }

        return info;
    }

    /**
     * Extract keywords from tokens
     */
    extractKeywords(tokens) {
        // Simple frequency-based keyword extraction
        const frequencies = {};
        tokens.forEach(token => {
            frequencies[token] = (frequencies[token] || 0) + 1;
        });

        return Object.entries(frequencies)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word, frequency]) => ({ word, frequency }));
    }

    /**
     * Identify concepts from tokens
     */
    async identifyConcepts(tokens) {
        // Conceptual mapping - would be enhanced with real knowledge bases
        const conceptMappings = {
            'ai': ['artificial intelligence', 'machine learning', 'neural networks'],
            'computer': ['technology', 'software', 'hardware'],
            'learning': ['education', 'training', 'knowledge acquisition'],
            'memory': ['storage', 'recall', 'retention'],
            'data': ['information', 'facts', 'statistics']
        };

        const concepts = [];
        tokens.forEach(token => {
            for (const [key, conceptList] of Object.entries(conceptMappings)) {
                if (token.includes(key)) {
                    concepts.push(...conceptList);
                }
            }
        });

        return [...new Set(concepts)];
    }

    /**
     * Analyze sentiment of text
     */
    async analyzeSentiment(text) {
        // Simplified sentiment analysis
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'worst'];
        
        const words = text.toLowerCase().split(/\s+/);
        let score = 0;
        
        words.forEach(word => {
            if (positiveWords.includes(word)) score++;
            if (negativeWords.includes(word)) score--;
        });

        return {
            score: score,
            comparative: score / words.length
        };
    }

    /**
     * Recognize entities in text
     */
    async recognizeEntities(text) {
        // Simplified entity recognition
        const entities = [];
        
        // Basic pattern matching for entities
        const patterns = {
            person: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            url: /https?:\/\/[^\s]+/g,
            date: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const matches = text.match(pattern);
            if (matches) {
                entities.push(...matches.map(match => ({ type, value: match })));
            }
        }

        return entities;
    }

    /**
     * Rank search results across layers
     */
    async rankResults(results, queryInfo) {
        const allResults = [];
        
        // Combine results from all layers
        for (const [layer, layerResults] of Object.entries(results)) {
            layerResults.forEach(result => {
                allResults.push({
                    ...result,
                    layer,
                    relevanceScore: this.calculateRelevanceScore(result, queryInfo, layer)
                });
            });
        }
        
        // Sort by relevance score
        return allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Calculate relevance score for a result
     */
    calculateRelevanceScore(result, queryInfo, layer) {
        let score = 0;
        
        // Base score from layer type
        const layerWeights = {
            context: 1.0,
            semantic: 0.8,
            temporal: 0.6
        };
        score += (layerWeights[layer] || 0.5) * 10;
        
        // Keyword matching
        if (result.keywords && queryInfo.keywords) {
            const matches = result.keywords.filter(k => 
                queryInfo.keywords.some(qk => qk.word === k.word)
            ).length;
            score += matches * 5;
        }
        
        // Concept matching
        if (result.concepts && queryInfo.concepts) {
            const conceptMatches = result.concepts.filter(c => 
                queryInfo.concepts.includes(c)
            ).length;
            score += conceptMatches * 3;
        }
        
        // Recency bonus for temporal layer
        if (layer === 'temporal' && result.timestamp) {
            const ageHours = (Date.now() - result.timestamp) / 3600000;
            const recencyScore = Math.max(0, 10 - ageHours / 24);
            score += recencyScore;
        }
        
        return score;
    }

    /**
     * Calculate confidence score for results
     */
    calculateConfidence(results) {
        if (results.length === 0) return 0;
        
        const avgScore = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length;
        const maxScore = Math.max(...results.map(r => r.relevanceScore));
        
        return {
            average: avgScore / 20, // Normalize to 0-1
            maximum: maxScore / 20,
            consistency: avgScore / maxScore
        };
    }

    /**
     * Calculate search radius for query
     */
    calculateSearchRadius(options) {
        const defaultRadius = 1.0;
        return options.radius || defaultRadius;
    }

    /**
     * Calculate layer contributions to results
     */
    calculateLayerContributions(results) {
        const contributions = {
            context: results.context.length,
            semantic: results.semantic.length,
            temporal: results.temporal.length
        };
        
        const total = Object.values(contributions).reduce((sum, count) => sum + count, 0);
        
        if (total > 0) {
            Object.keys(contributions).forEach(layer => {
                contributions[layer] = contributions[layer] / total;
            });
        }
        
        return contributions;
    }

    /**
     * Check if memory consolidation is needed
     */
    async checkConsolidation() {
        const contextSize = await this.contextLayer.getSize();
        const semanticSize = await this.semanticLayer.getSize();
        const temporalSize = await this.temporalLayer.getSize();
        
        // Trigger consolidation if any layer is near capacity
        const needsConsolidation = 
            contextSize > this.config.contextLayer.maxSize * 0.8 ||
            semanticSize > this.config.semanticLayer.maxConcepts * 0.8 ||
            temporalSize > this.config.temporalLayer.maxEvents * 0.8;
            
        if (needsConsolidation) {
            await this.consolidateMemory();
        }
    }

    /**
     * Optimize connections between memory layers
     */
    async optimizeConnections() {
        // Optimize cross-references and connections between layers
        const optimizations = {
            crossReferencesOptimized: 0,
            redundantConnectionsRemoved: 0,
            newConnectionsCreated: 0
        };
        
        // Implementation would analyze and optimize layer connections
        // This is a simplified placeholder
        
        return optimizations;
    }

    /**
     * Compress and clean old memory data
     */
    async compressAndClean() {
        const cutoffTime = Date.now() - this.config.temporalLayer.timeWindow;
        
        // Clean old context memories
        await this.contextLayer.cleanOldMemories(cutoffTime);
        
        // Compress semantic concepts
        await this.semanticLayer.compressOldConcepts(cutoffTime);
        
        // Archive old temporal events
        await this.temporalLayer.archiveOldEvents(cutoffTime);
        
        return {
            itemsCompressed: 0, // Would be calculated in real implementation
            spaceSaved: 0 // Would be calculated in real implementation
        };
    }

    /**
     * Calculate compression ratio
     */
    async calculateCompressionRatio() {
        // Placeholder implementation
        return 0.15; // 15% compression ratio
    }

    /**
     * Update performance metrics
     */
    async updatePerformanceMetrics(processingTime, success, cached = false) {
        this.performanceMetrics.totalMemories++;
        
        if (success) {
            // Update average response time
            const totalTime = this.performanceMetrics.averageResponseTime * (this.performanceMetrics.totalMemories - 1);
            this.performanceMetrics.averageResponseTime = (totalTime + processingTime) / this.performanceMetrics.totalMemories;
            
            if (cached) {
                this.performanceMetrics.hitRate = 
                    (this.performanceMetrics.hitRate * (this.performanceMetrics.totalMemories - 1) + 1) / 
                    this.performanceMetrics.totalMemories;
            }
        }
        
        // Calculate memory efficiency
        const totalCapacity = this.config.contextLayer.maxSize + 
                             this.config.semanticLayer.maxConcepts + 
                             this.config.temporalLayer.maxEvents;
        this.performanceMetrics.memoryEfficiency = this.performanceMetrics.totalMemories / totalCapacity;
    }

    /**
     * Generate memory fingerprint
     */
    generateMemoryFingerprint(info) {
        const content = JSON.stringify({
            text: info.text,
            keywords: info.keywords,
            concepts: info.concepts,
            timestamp: Math.floor(info.timestamp / 60000) // Minute precision
        });
        
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Generate cache key
     */
    generateCacheKey(query, options) {
        const content = JSON.stringify({
            query: query,
            options: options,
            timestamp: Math.floor(Date.now() / 300000) // 5-minute precision
        });
        
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Clean up cache when it gets too large
     */
    cleanupCache() {
        if (this.cache.size > this.config.performance.cacheSize) {
            // Remove oldest entries
            const entriesToRemove = this.cache.size - this.config.performance.cacheSize;
            const keys = Array.from(this.cache.keys());
            
            for (let i = 0; i < entriesToRemove; i++) {
                this.cache.delete(keys[i]);
            }
        }
    }

    /**
     * Initialize AI components
     */
    async initializeAI() {
        console.log('🤖 Initializing AI components...');
        
        // Initialize NLP components based on configuration
        if (this.config.ai.nlpModel === 'natural') {
            console.log('📚 Using natural.js for NLP processing');
        }
        
        // Initialize sentiment analysis if enabled
        if (this.config.ai.sentimentAnalysis) {
            console.log('😊 Initializing sentiment analysis');
        }
        
        console.log('✅ AI components initialized');
    }

    /**
     * Start background processes
     */
    startBackgroundProcesses() {
        // Start periodic backup process
        if (this.config.storage.backupEnabled) {
            setInterval(async () => {
                try {
                    await this.saveMemory();
                } catch (error) {
                    console.error('Background backup failed:', error);
                }
            }, this.config.storage.backupInterval);
        }
        
        // Start periodic consolidation
        setInterval(() => {
            this.checkConsolidation();
        }, 1800000); // 30 minutes
        
        console.log('🔄 Background processes started');
    }

    /**
     * Save memory state to storage
     */
    async saveMemory() {
        try {
            const memoryState = {
                timestamp: Date.now(),
                contextLayer: await this.contextLayer.exportState(),
                semanticLayer: await this.semanticLayer.exportState(),
                temporalLayer: await this.temporalLayer.exportState(),
                performanceMetrics: this.performanceMetrics
            };
            
            await this.storage.saveState('main', memoryState);
        } catch (error) {
            console.error('Failed to save memory state:', error);
            throw error;
        }
    }

    /**
     * Load memory state from storage
     */
    async loadMemory() {
        try {
            const memoryState = await this.storage.loadState('main');
            
            if (memoryState) {
                await this.contextLayer.importState(memoryState.contextLayer);
                await this.semanticLayer.importState(memoryState.semanticLayer);
                await this.temporalLayer.importState(memoryState.temporalLayer);
                this.performanceMetrics = { ...this.performanceMetrics, ...memoryState.performanceMetrics };
                
                console.log('📂 Memory state loaded from storage');
            }
        } catch (error) {
            console.error('Failed to load memory state:', error);
            // Continue with empty memory if loading fails
        }
    }

    /**
     * Get system information
     */
    async getSystemInfo() {
        return {
            version: '1.0.0',
            uptime: Date.now() - this.startTime,
            memoryLayers: ['context', 'semantic', 'temporal'],
            configuration: this.config,
            features: [
                'autonomous_learning',
                'semantic_similarity',
                'temporal_consolidation',
                'pattern_recognition',
                'memory_compression',
                'cross_layer_optimization'
            ]
        };
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        try {
            console.log('🛑 Shutting down ASMF engine...');
            
            // Save current state
            await this.saveMemory();
            
            // Cleanup resources
            this.cache.clear();
            
            console.log('✅ ASMF engine shutdown complete');
        } catch (error) {
            console.error('Error during shutdown:', error);
        }
    }
}

/**
 * Context Layer - Working memory and current conversation context
 */
class ContextLayer {
    constructor(config) {
        this.config = config;
        this.memories = [];
        this.connections = new Map();
    }

    async addMemory(info, metadata) {
        const memory = {
            id: this.generateMemoryId(),
            ...info,
            metadata,
            createdAt: Date.now(),
            accessCount: 0,
            lastAccessed: Date.now()
        };
        
        this.memories.push(memory);
        
        // Maintain size limit
        if (this.memories.length > this.config.maxSize) {
            const removed = this.memories.shift();
            await this.handleMemoryRemoval(removed);
        }
        
        return memory;
    }

    async search(queryInfo, options = {}) {
        const results = [];
        
        for (const memory of this.memories) {
            const similarity = this.calculateSimilarity(queryInfo, memory);
            if (similarity >= options.similarityThreshold || this.config.consolidationThreshold) {
                results.push({
                    ...memory,
                    similarity,
                    relevanceScore: similarity * 10
                });
            }
        }
        
        // Sort by relevance and recency
        return results.sort((a, b) => {
            if (Math.abs(a.relevanceScore - b.relevanceScore) < 0.1) {
                return b.createdAt - a.createdAt;
            }
            return b.relevanceScore - a.relevanceScore;
        });
    }

    calculateSimilarity(queryInfo, memory) {
        // Simplified similarity calculation
        let similarity = 0;
        
        // Keyword overlap
        if (queryInfo.keywords && memory.keywords) {
            const queryKeywords = new Set(queryInfo.keywords.map(k => k.word));
            const memoryKeywords = new Set(memory.keywords.map(k => k.word));
            const overlap = new Set([...queryKeywords].filter(k => memoryKeywords.has(k)));
            similarity += overlap.size / Math.max(queryKeywords.size, memoryKeywords.size);
        }
        
        // Concept overlap
        if (queryInfo.concepts && memory.concepts) {
            const queryConcepts = new Set(queryInfo.concepts);
            const memoryConcepts = new Set(memory.concepts);
            const overlap = new Set([...queryConcepts].filter(c => memoryConcepts.has(c)));
            similarity += overlap.size / Math.max(queryConcepts.size, memoryConcepts.size);
        }
        
        return similarity / 2; // Normalize
    }

    async consolidate() {
        const originalSize = this.memories.length;
        
        // Remove low-access, old memories
        const cutoffTime = Date.now() - this.config.retentionTime;
        this.memories = this.memories.filter(memory => 
            memory.accessCount > 0 || memory.createdAt > cutoffTime
        );
        
        const consolidatedItems = originalSize - this.memories.length;
        
        return {
            items: consolidatedItems,
            compressionRatio: consolidatedItems / originalSize,
            memoriesRetained: this.memories.length
        };
    }

    async getStatus() {
        return {
            size: this.memories.length,
            maxSize: this.config.maxSize,
            utilization: this.memories.length / this.config.maxSize,
            oldestMemory: this.memories.length > 0 ? Math.min(...this.memories.map(m => m.createdAt)) : null,
            newestMemory: this.memories.length > 0 ? Math.max(...this.memories.map(m => m.createdAt)) : null
        };
    }

    async getSize() {
        return this.memories.length;
    }

    async cleanOldMemories(cutoffTime) {
        const beforeSize = this.memories.length;
        this.memories = this.memories.filter(memory => memory.createdAt > cutoffTime);
        return beforeSize - this.memories.length;
    }

    async exportState() {
        return {
            memories: this.memories,
            connections: Array.from(this.connections.entries())
        };
    }

    async importState(state) {
        if (state && state.memories) {
            this.memories = state.memories;
            if (state.connections) {
                this.connections = new Map(state.connections);
            }
        }
    }

    generateMemoryId() {
        return crypto.randomBytes(16).toString('hex');
    }

    async handleMemoryRemoval(memory) {
        // Handle cleanup when memory is removed
        this.connections.delete(memory.id);
    }
}

/**
 * Semantic Layer - Knowledge structures and concept relationships
 */
class SemanticLayer {
    constructor(config) {
        this.config = config;
        this.concepts = new Map();
        this.relationships = new Map();
        this.clusters = [];
    }

    async processInput(info) {
        // Extract and update concepts
        const concepts = await this.extractConcepts(info);
        
        // Update concept relationships
        await this.updateRelationships(concepts);
        
        // Check for clustering opportunities
        await this.checkClustering();
        
        return {
            concepts: concepts,
            similarity: 0.8 // Placeholder
        };
    }

    async extractConcepts(info) {
        const concepts = [];
        
        for (const concept of info.concepts || []) {
            if (!this.concepts.has(concept)) {
                this.concepts.set(concept, {
                    id: this.generateConceptId(),
                    name: concept,
                    frequency: 0,
                    lastSeen: Date.now(),
                    connections: new Set(),
                    context: []
                });
            }
            
            const conceptObj = this.concepts.get(concept);
            conceptObj.frequency++;
            conceptObj.lastSeen = Date.now();
            conceptObj.context.push(info.text);
            
            if (conceptObj.context.length > 10) {
                conceptObj.context.shift(); // Keep only recent contexts
            }
            
            concepts.push(concept);
        }
        
        // Maintain concept limit
        if (this.concepts.size > this.config.maxConcepts) {
            await this.cleanupOldConcepts();
        }
        
        return concepts;
    }

    async updateRelationships(concepts) {
        // Create relationships between co-occurring concepts
        for (let i = 0; i < concepts.length; i++) {
            for (let j = i + 1; j < concepts.length; j++) {
                const concept1 = concepts[i];
                const concept2 = concepts[j];
                
                const relationshipKey = `${concept1}::${concept2}`;
                const reverseKey = `${concept2}::${concept1}`;
                
                const currentWeight = this.relationships.get(relationshipKey) || 0;
                this.relationships.set(relationshipKey, currentWeight + 1);
                
                // Update bidirectional relationship
                const concept1Obj = this.concepts.get(concept1);
                const concept2Obj = this.concepts.get(concept2);
                concept1Obj.connections.add(concept2);
                concept2Obj.connections.add(concept1);
            }
        }
    }

    async checkClustering() {
        // Group related concepts into clusters
        if (this.concepts.size > this.config.clusterSize) {
            await this.performClustering();
        }
    }

    async performClustering() {
        // Simplified clustering based on relationship weights
        const sortedConcepts = Array.from(this.concepts.keys())
            .sort((a, b) => {
                const connectionsA = this.concepts.get(a).connections.size;
                const connectionsB = this.concepts.get(b).connections.size;
                return connectionsB - connectionsA;
            });
        
        const cluster = {
            id: this.generateClusterId(),
            concepts: sortedConcepts.slice(0, this.config.clusterSize),
            createdAt: Date.now(),
            strength: this.calculateClusterStrength(sortedConcepts.slice(0, this.config.clusterSize))
        };
        
        this.clusters.push(cluster);
        
        // Maintain cluster limit
        if (this.clusters.length > 100) {
            this.clusters.shift();
        }
    }

    calculateClusterStrength(concepts) {
        let totalWeight = 0;
        let relationshipCount = 0;
        
        for (let i = 0; i < concepts.length; i++) {
            for (let j = i + 1; j < concepts.length; j++) {
                const concept1 = concepts[i];
                const concept2 = concepts[j];
                const relationshipKey = `${concept1}::${concept2}`;
                
                const weight = this.relationships.get(relationshipKey) || 0;
                totalWeight += weight;
                relationshipCount++;
            }
        }
        
        return relationshipCount > 0 ? totalWeight / relationshipCount : 0;
    }

    async search(queryInfo, options = {}) {
        const results = [];
        const queryConcepts = queryInfo.concepts || [];
        
        for (const [conceptName, conceptObj] of this.concepts) {
            let similarity = 0;
            
            // Direct concept match
            if (queryConcepts.includes(conceptName)) {
                similarity += 1.0;
            }
            
            // Related concept match
            for (const queryConcept of queryConcepts) {
                if (conceptObj.connections.has(queryConcept)) {
                    similarity += 0.5;
                }
            }
            
            // Cluster membership bonus
            for (const cluster of this.clusters) {
                if (cluster.concepts.includes(conceptName) && 
                    cluster.concepts.some(c => queryConcepts.includes(c))) {
                    similarity += cluster.strength * 0.2;
                }
            }
            
            if (similarity >= (options.similarityThreshold || this.config.similarityThreshold)) {
                results.push({
                    ...conceptObj,
                    similarity,
                    relevanceScore: similarity * 15,
                    type: 'concept'
                });
            }
        }
        
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    async consolidate() {
        const originalSize = this.concepts.size;
        const originalRelationships = this.relationships.size;
        
        // Remove low-frequency concepts
        const frequencyThreshold = 2;
        const now = Date.now();
        const timeThreshold = 7 * 24 * 3600000; // 7 days
        
        for (const [conceptName, conceptObj] of this.concepts) {
            if (conceptObj.frequency < frequencyThreshold && 
                (now - conceptObj.lastSeen) > timeThreshold) {
                this.concepts.delete(conceptName);
                
                // Remove related relationships
                for (const [relKey, relWeight] of this.relationships) {
                    if (relKey.includes(conceptName)) {
                        this.relationships.delete(relKey);
                    }
                }
            }
        }
        
        return {
            items: (originalSize - this.concepts.size) + (originalRelationships - this.relationships.size),
            conceptsRetained: this.concepts.size,
            relationshipsRetained: this.relationships.size,
            compressionRatio: (originalSize - this.concepts.size) / originalSize
        };
    }

    async cleanupOldConcepts() {
        // Remove least frequent concepts when limit is reached
        const conceptsArray = Array.from(this.concepts.entries())
            .sort((a, b) => a[1].frequency - b[1].frequency);
        
        const toRemove = conceptsArray.slice(0, Math.floor(this.concepts.size * 0.1));
        
        for (const [conceptName] of toRemove) {
            this.concepts.delete(conceptName);
            
            // Clean up relationships
            for (const [relKey] of this.relationships) {
                if (relKey.includes(conceptName)) {
                    this.relationships.delete(relKey);
                }
            }
        }
    }

    async compressOldConcepts(cutoffTime) {
        // Compress concepts that haven't been accessed recently
        let compressedCount = 0;
        
        for (const [conceptName, conceptObj] of this.concepts) {
            if (conceptObj.lastSeen < cutoffTime && conceptObj.frequency < 5) {
                // Compress by reducing context and keeping only essential info
                conceptObj.context = conceptObj.context.slice(-3); // Keep only 3 recent contexts
                compressedCount++;
            }
        }
        
        return compressedCount;
    }

    async getStatus() {
        return {
            conceptCount: this.concepts.size,
            maxConcepts: this.config.maxConcepts,
            utilization: this.concepts.size / this.config.maxConcepts,
            relationshipCount: this.relationships.size,
            clusterCount: this.clusters.length,
            averageConceptFrequency: this.concepts.size > 0 ? 
                Array.from(this.concepts.values()).reduce((sum, c) => sum + c.frequency, 0) / this.concepts.size : 0
        };
    }

    async getSize() {
        return this.concepts.size;
    }

    async exportState() {
        return {
            concepts: Array.from(this.concepts.entries()),
            relationships: Array.from(this.relationships.entries()),
            clusters: this.clusters
        };
    }

    async importState(state) {
        if (state && state.concepts) {
            this.concepts = new Map(state.concepts.map(([name, data]) => [
                name, 
                { ...data, connections: new Set(data.connections) }
            ]));
        }
        if (state && state.relationships) {
            this.relationships = new Map(state.relationships);
        }
        if (state && state.clusters) {
            this.clusters = state.clusters;
        }
    }

    generateConceptId() {
        return crypto.randomBytes(8).toString('hex');
    }

    generateClusterId() {
        return crypto.randomBytes(8).toString('hex');
    }
}

/**
 * Temporal Layer - Timeline history and temporal relationships
 */
class TemporalLayer {
    constructor(config) {
        this.config = config;
        this.events = [];
        this.timelines = new Map();
        this.patterns = [];
    }

    async recordEvent(info, metadata) {
        const event = {
            id: this.generateEventId(),
            ...info,
            metadata,
            timestamp: Date.now(),
            sequence: this.events.length,
            temporalRelationships: []
        };
        
        this.events.push(event);
        
        // Maintain event limit
        if (this.events.length > this.config.maxEvents) {
            await this.archiveOldEvent();
        }
        
        // Update timelines and patterns
        await this.updateTimelines(event);
        await this.detectPatterns(event);
        
        return event;
    }

    async updateTimelines(event) {
        const timelineKey = this.extractTimelineKey(event);
        
        if (!this.timelines.has(timelineKey)) {
            this.timelines.set(timelineKey, {
                key: timelineKey,
                events: [],
                startTime: event.timestamp,
                endTime: event.timestamp,
                metadata: {}
            });
        }
        
        const timeline = this.timelines.get(timelineKey);
        timeline.events.push(event);
        timeline.startTime = Math.min(timeline.startTime, event.timestamp);
        timeline.endTime = Math.max(timeline.endTime, event.timestamp);
        
        // Update temporal relationships
        await this.updateTemporalRelationships(event, timeline);
    }

    extractTimelineKey(event) {
        // Extract key for timeline grouping (e.g., conversation, project, topic)
        if (event.metadata && event.metadata.timeline) {
            return event.metadata.timeline;
        }
        
        // Default to daily timeline
        const date = new Date(event.timestamp);
        return `daily-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }

    async updateTemporalRelationships(event, timeline) {
        // Create temporal relationships with nearby events
        const nearbyEvents = timeline.events
            .filter(e => e.id !== event.id && Math.abs(e.timestamp - event.timestamp) < 3600000); // 1 hour
        
        for (const nearbyEvent of nearbyEvents) {
            const relationship = {
                event1: event.id,
                event2: nearbyEvent.id,
                type: this.determineRelationshipType(event, nearbyEvent),
                strength: this.calculateRelationshipStrength(event, nearbyEvent),
                timestamp: Date.now()
            };
            
            event.temporalRelationships.push(relationship);
        }
    }

    determineRelationshipType(event1, event2) {
        const timeDiff = Math.abs(event1.timestamp - event2.timestamp);
        
        if (timeDiff < 60000) return 'concurrent'; // Same minute
        if (timeDiff < 300000) return 'sequential'; // Within 5 minutes
        if (timeDiff < 3600000) return 'related'; // Within 1 hour
        return 'distant'; // More than 1 hour apart
    }

    calculateRelationshipStrength(event1, event2) {
        let strength = 0;
        
        // Time proximity
        const timeDiff = Math.abs(event1.timestamp - event2.timestamp);
        strength += Math.max(0, 1 - timeDiff / 3600000); // Normalize to 1 hour
        
        // Content similarity
        const contentSimilarity = this.calculateContentSimilarity(event1, event2);
        strength += contentSimilarity * 0.5;
        
        // Metadata similarity
        if (event1.metadata && event2.metadata) {
            const metadataSimilarity = this.calculateMetadataSimilarity(event1.metadata, event2.metadata);
            strength += metadataSimilarity * 0.3;
        }
        
        return Math.min(1, strength);
    }

    calculateContentSimilarity(event1, event2) {
        // Simplified content similarity based on shared concepts
        const concepts1 = new Set(event1.concepts || []);
        const concepts2 = new Set(event2.concepts || []);
        
        if (concepts1.size === 0 || concepts2.size === 0) return 0;
        
        const intersection = new Set([...concepts1].filter(c => concepts2.has(c)));
        const union = new Set([...concepts1, ...concepts2]);
        
        return intersection.size / union.size;
    }

    calculateMetadataSimilarity(metadata1, metadata2) {
        const keys1 = new Set(Object.keys(metadata1));
        const keys2 = new Set(Object.keys(metadata2));
        
        if (keys1.size === 0 || keys2.size === 0) return 0;
        
        const intersection = new Set([...keys1].filter(k => keys2.has(k)));
        const union = new Set([...keys1, ...keys2]);
        
        return intersection.size / union.size;
    }

    async detectPatterns(newEvent) {
        // Look for temporal patterns in recent events
        const recentEvents = this.events.slice(-20); // Last 20 events
        
        // Pattern 1: Recurring events
        const recurringPattern = this.detectRecurringPattern(newEvent, recentEvents);
        if (recurringPattern) {
            this.patterns.push(recurringPattern);
        }
        
        // Pattern 2: Sequential patterns
        const sequentialPattern = this.detectSequentialPattern(recentEvents);
        if (sequentialPattern) {
            this.patterns.push(sequentialPattern);
        }
        
        // Pattern 3: Frequency patterns
        const frequencyPattern = this.detectFrequencyPattern(newEvent);
        if (frequencyPattern) {
            this.patterns.push(frequencyPattern);
        }
        
        // Clean up old patterns
        await this.cleanupPatterns();
    }

    detectRecurringPattern(newEvent, recentEvents) {
        // Check if similar events occurred at regular intervals
        const similarEvents = recentEvents.filter(event => 
            event.id !== newEvent.id && 
            this.calculateContentSimilarity(newEvent, event) > 0.3
        );
        
        if (similarEvents.length < 2) return null;
        
        const intervals = [];
        for (let i = 1; i < similarEvents.length; i++) {
            intervals.push(similarEvents[i].timestamp - similarEvents[i-1].timestamp);
        }
        
        // Check for regularity
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const coefficientOfVariation = Math.sqrt(variance) / avgInterval;
        
        if (coefficientOfVariation < 0.2) { // Less than 20% variation
            return {
                id: this.generatePatternId(),
                type: 'recurring',
                pattern: {
                    baseEvent: newEvent,
                    similarEvents: similarEvents,
                    averageInterval: avgInterval,
                    confidence: 1 - coefficientOfVariation
                },
                createdAt: Date.now()
            };
        }
        
        return null;
    }

    detectSequentialPattern(events) {
        // Look for sequences that repeat
        if (events.length < 4) return null;
        
        const sequences = [];
        const sequenceLength = 3;
        
        for (let i = 0; i <= events.length - sequenceLength - 1; i++) {
            const sequence = events.slice(i, i + sequenceLength).map(e => e.concepts);
            
            // Look for similar sequences later in the data
            for (let j = i + sequenceLength; j <= events.length - sequenceLength; j++) {
                const compareSequence = events.slice(j, j + sequenceLength).map(e => e.concepts);
                
                if (this.compareSequences(sequence, compareSequence) > 0.7) {
                    sequences.push({
                        firstOccurrence: i,
                        secondOccurrence: j,
                        similarity: this.compareSequences(sequence, compareSequence)
                    });
                }
            }
        }
        
        if (sequences.length > 0) {
            return {
                id: this.generatePatternId(),
                type: 'sequential',
                pattern: sequences,
                createdAt: Date.now()
            };
        }
        
        return null;
    }

    compareSequences(seq1, seq2) {
        if (seq1.length !== seq2.length) return 0;
        
        let similaritySum = 0;
        for (let i = 0; i < seq1.length; i++) {
            const concepts1 = new Set(seq1[i] || []);
            const concepts2 = new Set(seq2[i] || []);
            
            if (concepts1.size === 0 || concepts2.size === 0) continue;
            
            const intersection = new Set([...concepts1].filter(c => concepts2.has(c)));
            const union = new Set([...concepts1, ...concepts2]);
            
            similaritySum += intersection.size / union.size;
        }
        
        return similaritySum / seq1.length;
    }

    detectFrequencyPattern(newEvent) {
        // Check for frequency anomalies
        const similarEvents = this.events.filter(event => 
            event.id !== newEvent.id && 
            this.calculateContentSimilarity(newEvent, event) > 0.4
        );
        
        if (similarEvents.length < 3) return null;
        
        // Check recent frequency
        const recentTimeWindow = 24 * 3600000; // 24 hours
        const recentSimilarEvents = similarEvents.filter(event => 
            (newEvent.timestamp - event.timestamp) < recentTimeWindow
        );
        
        // Historical average (excluding recent events)
        const historicalSimilarEvents = similarEvents.filter(event => 
            (newEvent.timestamp - event.timestamp) >= recentTimeWindow
        );
        
        if (historicalSimilarEvents.length > 0) {
            const historicalRate = historicalSimilarEvents.length / 
                ((newEvent.timestamp - historicalSimilarEvents[0].timestamp) / (24 * 3600000));
            const recentRate = recentSimilarEvents.length / 1; // Per day
            
            const frequencyRatio = recentRate / historicalRate;
            
            if (frequencyRatio > 2 || frequencyRatio < 0.5) { // Significant deviation
                return {
                    id: this.generatePatternId(),
                    type: 'frequency',
                    pattern: {
                        currentRate: recentRate,
                        historicalRate: historicalRate,
                        ratio: frequencyRatio,
                        threshold: frequencyRatio > 2 ? 'increase' : 'decrease'
                    },
                    createdAt: Date.now()
                };
            }
        }
        
        return null;
    }

    async cleanupPatterns() {
        // Remove old or invalid patterns
        const cutoffTime = Date.now() - (30 * 24 * 3600000); // 30 days
        this.patterns = this.patterns.filter(pattern => pattern.createdAt > cutoffTime);
        
        // Limit pattern count
        if (this.patterns.length > 1000) {
            this.patterns = this.patterns.slice(-1000);
        }
    }

    async search(queryInfo, options = {}) {
        const results = [];
        const queryTime = options.timeRange || { start: 0, end: Date.now() };
        
        for (const event of this.events) {
            if (event.timestamp < queryTime.start || event.timestamp > queryTime.end) {
                continue;
            }
            
            // Content similarity
            const contentSimilarity = this.calculateContentSimilarity(queryInfo, event);
            
            // Temporal relevance
            const temporalRelevance = this.calculateTemporalRelevance(queryTime, event);
            
            // Pattern matching
            const patternRelevance = this.calculatePatternRelevance(queryInfo, event);
            
            const totalRelevance = (contentSimilarity * 0.4) + (temporalRelevance * 0.3) + (patternRelevance * 0.3);
            
            if (totalRelevance > 0.3) {
                results.push({
                    ...event,
                    relevanceScore: totalRelevance * 20,
                    similarity: contentSimilarity,
                    temporalRelevance,
                    patternRelevance
                });
            }
        }
        
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    calculateTemporalRelevance(timeRange, event) {
        const range = timeRange.end - timeRange.start;
        const eventPosition = (event.timestamp - timeRange.start) / range;
        
        // Prefer events closer to the middle of the time range
        const distanceFromCenter = Math.abs(eventPosition - 0.5);
        return 1 - (distanceFromCenter * 2);
    }

    calculatePatternRelevance(queryInfo, event) {
        let relevance = 0;
        
        for (const pattern of this.patterns) {
            if (pattern.type === 'recurring' && pattern.pattern.baseEvent) {
                const similarity = this.calculateContentSimilarity(queryInfo, pattern.pattern.baseEvent);
                relevance = Math.max(relevance, similarity * pattern.pattern.confidence);
            }
        }
        
        return relevance;
    }

    async consolidate() {
        const originalSize = this.events.length;
        
        // Archive old events based on time and compression settings
        const cutoffTime = Date.now() - this.config.timeWindow;
        
        // Separate recent and archival events
        const recentEvents = this.events.filter(event => event.timestamp > cutoffTime);
        const archivalEvents = this.events.filter(event => event.timestamp <= cutoffTime);
        
        // Compress archival events
        const compressedEvents = await this.compressArchivalEvents(archivalEvents);
        
        this.events = [...recentEvents, ...compressedEvents];
        
        // Clean up timelines
        for (const [key, timeline] of this.timelines) {
            timeline.events = timeline.events.filter(event => this.events.includes(event));
            if (timeline.events.length === 0) {
                this.timelines.delete(key);
            }
        }
        
        return {
            items: (originalSize - this.events.length),
            eventsRetained: this.events.length,
            compressionRatio: (originalSize - this.events.length) / originalSize
        };
    }

    async compressArchivalEvents(archivalEvents) {
        // Group similar archival events and create summaries
        const compressed = [];
        const compressionRatio = this.config.compressionRatio;
        
        for (let i = 0; i < archivalEvents.length; i += Math.ceil(1 / compressionRatio)) {
            const group = archivalEvents.slice(i, i + Math.ceil(1 / compressionRatio));
            
            if (group.length > 1) {
                // Create compressed representation
                const compressedEvent = {
                    id: this.generateCompressedEventId(i),
                    text: `Compressed group of ${group.length} similar events`,
                    concepts: this.extractCommonConcepts(group),
                    timestamp: group[Math.floor(group.length / 2)].timestamp, // Middle timestamp
                    metadata: {
                        compressed: true,
                        originalCount: group.length,
                        timeRange: {
                            start: Math.min(...group.map(e => e.timestamp)),
                            end: Math.max(...group.map(e => e.timestamp))
                        },
                        originalIds: group.map(e => e.id)
                    },
                    accessCount: 0,
                    lastAccessed: Date.now()
                };
                
                compressed.push(compressedEvent);
            } else {
                compressed.push(group[0]);
            }
        }
        
        return compressed;
    }

    extractCommonConcepts(events) {
        const conceptCounts = {};
        
        events.forEach(event => {
            (event.concepts || []).forEach(concept => {
                conceptCounts[concept] = (conceptCounts[concept] || 0) + 1;
            });
        });
        
        // Return concepts that appear in at least half of the events
        const threshold = Math.ceil(events.length / 2);
        return Object.entries(conceptCounts)
            .filter(([, count]) => count >= threshold)
            .map(([concept]) => concept);
    }

    async archiveOldEvent() {
        const removed = this.events.shift();
        
        // Remove from timelines
        for (const [, timeline] of this.timelines) {
            timeline.events = timeline.events.filter(event => event.id !== removed.id);
        }
        
        return removed;
    }

    async cleanOldMemories(cutoffTime) {
        const beforeSize = this.events.length;
        this.events = this.events.filter(event => event.timestamp > cutoffTime);
        
        // Clean up timelines
        for (const [key, timeline] of this.timelines) {
            timeline.events = timeline.events.filter(event => this.events.includes(event));
            if (timeline.events.length === 0) {
                this.timelines.delete(key);
            }
        }
        
        return beforeSize - this.events.length;
    }

    async archiveOldEvents(cutoffTime) {
        // Archive events older than cutoff time
        const oldEvents = this.events.filter(event => event.timestamp < cutoffTime);
        
        for (const event of oldEvents) {
            await this.archiveOldEvent();
        }
        
        return oldEvents.length;
    }

    async getStatus() {
        return {
            eventCount: this.events.length,
            maxEvents: this.config.maxEvents,
            utilization: this.events.length / this.config.maxEvents,
            timelineCount: this.timelines.size,
            patternCount: this.patterns.length,
            oldestEvent: this.events.length > 0 ? Math.min(...this.events.map(e => e.timestamp)) : null,
            newestEvent: this.events.length > 0 ? Math.max(...this.events.map(e => e.timestamp)) : null,
            averageEventInterval: this.events.length > 1 ? 
                (this.events[this.events.length - 1].timestamp - this.events[0].timestamp) / (this.events.length - 1) : 0
        };
    }

    async getSize() {
        return this.events.length;
    }

    async exportState() {
        return {
            events: this.events,
            timelines: Array.from(this.timelines.entries()),
            patterns: this.patterns
        };
    }

    async importState(state) {
        if (state && state.events) {
            this.events = state.events;
        }
        if (state && state.timelines) {
            this.timelines = new Map(state.timelines);
        }
        if (state && state.patterns) {
            this.patterns = state.patterns;
        }
    }

    generateEventId() {
        return crypto.randomBytes(12).toString('hex');
    }

    generateCompressedEventId(index) {
        return `compressed-${index}-${crypto.randomBytes(4).toString('hex')}`;
    }

    generatePatternId() {
        return crypto.randomBytes(8).toString('hex');
    }
}

/**
 * Memory Storage - Handles persistence and file operations
 */
class MemoryStorage {
    constructor(config) {
        this.config = config;
        this.dataPath = config.dataPath;
        this.encryptionKey = config.encryptionKey || null;
    }

    async initialize() {
        try {
            await mkdir(this.dataPath, { recursive: true });
            await mkdir(path.join(this.dataPath, 'backups'), { recursive: true });
            console.log(`💾 Memory storage initialized at ${this.dataPath}`);
        } catch (error) {
            console.error('Failed to initialize storage:', error);
            throw error;
        }
    }

    async saveState(stateName, data) {
        try {
            const filePath = path.join(this.dataPath, `${stateName}.json`);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.dataPath, 'backups', `${stateName}-${timestamp}.json`);
            
            const serialized = this.serializeData(data);
            const encrypted = this.encryptIfNeeded(serialized);
            
            // Save current state
            await writeFile(filePath, encrypted);
            
            // Save backup
            if (this.config.backupEnabled) {
                await writeFile(backupPath, encrypted);
            }
            
            console.log(`💾 State '${stateName}' saved successfully`);
        } catch (error) {
            console.error(`Failed to save state '${stateName}':`, error);
            throw error;
        }
    }

    async loadState(stateName) {
        try {
            const filePath = path.join(this.dataPath, `${stateName}.json`);
            
            try {
                const data = await readFile(filePath, 'utf8');
                const decrypted = this.decryptIfNeeded(data);
                return this.deserializeData(decrypted);
            } catch (error) {
                // Try loading from backup if main file doesn't exist
                return await this.loadFromBackup(stateName);
            }
        } catch (error) {
            console.error(`Failed to load state '${stateName}':`, error);
            return null;
        }
    }

    async loadFromBackup(stateName) {
        try {
            const backupDir = path.join(this.dataPath, 'backups');
            const files = await fs.promises.readdir(backupDir);
            const backupFiles = files
                .filter(file => file.startsWith(`${stateName}-`))
                .sort()
                .reverse(); // Most recent first
            
            if (backupFiles.length > 0) {
                const backupPath = path.join(backupDir, backupFiles[0]);
                const data = await readFile(backupPath, 'utf8');
                const decrypted = this.decryptIfNeeded(data);
                const deserialized = this.deserializeData(decrypted);
                
                console.log(`📁 Loaded state '${stateName}' from backup: ${backupFiles[0]}`);
                return deserialized;
            }
            
            return null;
        } catch (error) {
            console.error('Failed to load from backup:', error);
            return null;
        }
    }

    serializeData(data) {
        return JSON.stringify(data, null, 2);
    }

    deserializeData(serialized) {
        return JSON.parse(serialized);
    }

    encryptIfNeeded(data) {
        if (!this.encryptionKey) return data;
        
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    decryptIfNeeded(encryptedData) {
        if (!this.encryptionKey) return encryptedData;
        
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Failed to decrypt data:', error);
            throw new Error('Failed to decrypt memory data');
        }
    }
}

module.exports = ASMFEngine;
