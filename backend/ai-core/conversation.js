/**
 * ASMF AI Agent - Conversation Management Core
 * ===========================================
 * Advanced conversation management system with context tracking,
 * conversation persistence, and intelligent response generation
 * 
 * Features:
 * - Multi-session conversation handling
 * - Context-aware response generation  
 * - Conversation history management
 * - Memory integration
 * - Error handling and recovery
 * 
 * Author: MiniMax Agent
 * Version: 1.0.0
 * Created: 2025-11-05
 */

const { v4: uuidv4 } = require('uuid');
const { createHash } = require('crypto');

class ConversationManager {
    constructor(config = {}) {
        // Configuration
        this.config = {
            maxConversationLength: config.maxConversationLength || 50,
            contextWindowSize: config.contextWindowSize || 10,
            persistenceEnabled: config.persistenceEnabled || true,
            autoSave: config.autoSave !== false,
            memoryIntegration: config.memoryIntegration !== false,
            responseTimeout: config.responseTimeout || 30000,
            ...config
        };

        // Core components
        this.activeConversations = new Map();
        this.conversationHistory = new Map();
        this.memoryManager = config.memoryManager || null;
        this.contextProcessor = config.contextProcessor || null;

        // Response generation
        this.responseGenerator = config.responseGenerator || null;
        this.conversationTemplates = this.loadConversationTemplates();

        // Performance metrics
        this.metrics = {
            totalConversations: 0,
            activeConversations: 0,
            messagesProcessed: 0,
            averageResponseTime: 0,
            conversationSuccess: 0,
            errors: 0
        };

        // Initialize system
        this.initializeSystem();
    }

    /**
     * Initialize conversation management system
     */
    async initializeSystem() {
        try {
            console.log('🚀 Initializing Conversation Manager...');

            // Set up memory integration if available
            if (this.memoryManager && this.config.memoryIntegration) {
                await this.setupMemoryIntegration();
            }

            // Load conversation history if persistence enabled
            if (this.config.persistenceEnabled) {
                await this.loadConversationHistory();
            }

            // Initialize conversation monitoring
            this.startConversationMonitoring();

            console.log('✅ Conversation Manager initialized successfully');
            this.metrics.totalConversations = 0;
            this.metrics.activeConversations = 0;

        } catch (error) {
            console.error('❌ Failed to initialize Conversation Manager:', error);
            throw error;
        }
    }

    /**
     * Set up integration with memory system
     */
    async setupMemoryIntegration() {
        if (!this.memoryManager) return;

        try {
            // Subscribe to memory events
            this.memoryManager.on('memory_update', (data) => {
                this.handleMemoryUpdate(data);
            });

            // Register conversation memory patterns
            await this.memoryManager.registerPattern('conversation_context', {
                pattern: 'user: (.*?)\\nassistant: (.*?)(?=\\n|$)',
                type: 'contextual',
                weight: 0.8
            });

        } catch (error) {
            console.warn('⚠️ Memory integration setup failed:', error.message);
        }
    }

    /**
     * Start conversation monitoring and cleanup
     */
    startConversationMonitoring() {
        // Monitor active conversations every 5 minutes
        this.monitoringInterval = setInterval(() => {
            this.cleanupInactiveConversations();
        }, 300000);

        // Auto-save conversations every 2 minutes
        if (this.config.autoSave) {
            this.saveInterval = setInterval(() => {
                this.saveAllConversations();
            }, 120000);
        }

        console.log('📊 Conversation monitoring started');
    }

    /**
     * Create a new conversation session
     */
    async createConversation(userId, context = {}) {
        const startTime = Date.now();
        
        try {
            const conversationId = uuidv4();
            
            const conversation = {
                id: conversationId,
                userId: userId,
                title: context.title || `Conversation ${Date.now()}`,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                messages: [],
                context: {
                    userProfile: context.userProfile || {},
                    sessionInfo: context.sessionInfo || {},
                    preferences: context.preferences || {},
                    ...context
                },
                metadata: {
                    totalMessages: 0,
                    duration: 0,
                    satisfaction: null,
                    tags: [],
                    status: 'active'
                }
            };

            // Store conversation
            this.activeConversations.set(conversationId, conversation);
            
            // Update metrics
            this.metrics.totalConversations++;
            this.metrics.activeConversations++;

            // Save if persistence enabled
            if (this.config.persistenceEnabled) {
                await this.saveConversation(conversationId);
            }

            console.log(`📝 Created conversation ${conversationId} for user ${userId}`);
            return {
                success: true,
                conversationId,
                conversation: {
                    id: conversation.id,
                    title: conversation.title,
                    createdAt: conversation.createdAt,
                    messageCount: conversation.messages.length
                }
            };

        } catch (error) {
            console.error('❌ Failed to create conversation:', error);
            this.metrics.errors++;
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Add message to conversation
     */
    async addMessage(conversationId, message, messageType = 'user') {
        const startTime = Date.now();
        
        try {
            // Get conversation
            const conversation = this.activeConversations.get(conversationId);
            if (!conversation) {
                throw new Error(`Conversation ${conversationId} not found`);
            }

            // Create message object
            const messageObj = {
                id: uuidv4(),
                type: messageType, // 'user', 'assistant', 'system'
                content: message,
                timestamp: new Date().toISOString(),
                metadata: {
                    tokens: this.estimateTokens(message),
                    sentiment: await this.analyzeSentiment(message),
                    topics: await this.extractTopics(message),
                    language: this.detectLanguage(message),
                    ...this.extractMetadata(message)
                }
            };

            // Add to conversation
            conversation.messages.push(messageObj);
            conversation.lastActivity = new Date().toISOString();
            conversation.metadata.totalMessages++;

            // Trim conversation if too long
            if (conversation.messages.length > this.config.maxConversationLength) {
                const excessMessages = conversation.messages.splice(0, 
                    conversation.messages.length - this.config.maxConversationLength);
                
                // Store excess in history
                await this.storeConversationFragment(conversationId, excessMessages);
            }

            // Update metrics
            this.metrics.messagesProcessed++;

            // Process message through memory if enabled
            if (this.memoryManager && this.config.memoryIntegration) {
                await this.processMemoryIntegration(messageObj, conversation);
            }

            // Auto-save if enabled
            if (this.config.autoSave) {
                await this.saveConversation(conversationId);
            }

            console.log(`💬 Added ${messageType} message to conversation ${conversationId}`);
            return {
                success: true,
                messageId: messageObj.id,
                message: messageObj,
                conversationStats: {
                    totalMessages: conversation.messages.length,
                    lastActivity: conversation.lastActivity
                }
            };

        } catch (error) {
            console.error('❌ Failed to add message:', error);
            this.metrics.errors++;
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate response for conversation
     */
    async generateResponse(conversationId, options = {}) {
        const startTime = Date.now();
        
        try {
            // Get conversation
            const conversation = this.activeConversations.get(conversationId);
            if (!conversation) {
                throw new Error(`Conversation ${conversationId} not found`);
            }

            // Get context for response generation
            const context = await this.buildResponseContext(conversation, options);

            // Generate response
            let response;
            if (this.responseGenerator) {
                response = await this.responseGenerator.generate(context);
            } else {
                response = await this.generateDefaultResponse(context);
            }

            // Create assistant message
            const responseMessage = await this.addMessage(
                conversationId, 
                response.content, 
                'assistant'
            );

            // Update conversation metadata
            conversation.metadata.status = response.success ? 'active' : 'error';
            
            const responseTime = Date.now() - startTime;
            this.metrics.averageResponseTime = 
                (this.metrics.averageResponseTime + responseTime) / 2;

            console.log(`🤖 Generated response for conversation ${conversationId} (${responseTime}ms)`);
            return {
                success: response.success,
                response: response.content,
                messageId: responseMessage.messageId,
                metadata: {
                    responseTime,
                    confidence: response.confidence || 0.5,
                    topics: response.topics || [],
                    suggestions: response.suggestions || []
                }
            };

        } catch (error) {
            console.error('❌ Failed to generate response:', error);
            this.metrics.errors++;
            
            // Add error message to conversation
            await this.addMessage(conversationId, 
                "I apologize, but I'm experiencing technical difficulties. Please try again.", 
                'system');
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Build context for response generation
     */
    async buildResponseContext(conversation, options = {}) {
        const recentMessages = conversation.messages.slice(-this.config.contextWindowSize);
        
        const context = {
            conversation: {
                id: conversation.id,
                title: conversation.title,
                userId: conversation.userId,
                messageCount: conversation.messages.length,
                duration: this.calculateConversationDuration(conversation)
            },
            recentMessages: recentMessages,
            userContext: conversation.context,
            responseOptions: options,
            memoryContext: null,
            conversationPatterns: await this.analyzeConversationPatterns(conversation)
        };

        // Integrate memory context if available
        if (this.memoryManager && this.config.memoryIntegration) {
            try {
                const memoryQuery = {
                    type: 'contextual',
                    query: recentMessages.map(m => m.content).join(' '),
                    limit: 5
                };
                const memoryResults = await this.memoryManager.retrieveMemory(memoryQuery);
                context.memoryContext = memoryResults;
            } catch (error) {
                console.warn('⚠️ Failed to retrieve memory context:', error.message);
            }
        }

        return context;
    }

    /**
     * Generate default response when no AI is available
     */
    async generateDefaultResponse(context) {
        const recentUserMessage = context.recentMessages
            .filter(m => m.type === 'user')
            .slice(-1)[0];

        if (!recentUserMessage) {
            return {
                content: "Hello! How can I help you today?",
                confidence: 0.3,
                topics: ["greeting"],
                suggestions: ["Tell me about yourself", "What can you help with?"]
            };
        }

        // Simple response based on keywords and patterns
        const content = recentUserMessage.content.toLowerCase();
        const response = this.matchConversationTemplate(content, context);

        return response || {
            content: "I understand you're asking about that. Could you please provide more details so I can give you a better response?",
            confidence: 0.4,
            topics: ["clarification"],
            suggestions: ["Can you elaborate?", "What specific information do you need?"]
        };
    }

    /**
     * Match content against conversation templates
     */
    matchConversationTemplate(content, context) {
        const templates = this.conversationTemplates;

        // Check each template
        for (const template of templates) {
            if (template.pattern.test(content)) {
                const match = content.match(template.pattern);
                const response = this.processTemplate(template, match, context);
                if (response) return response;
            }
        }

        return null;
    }

    /**
     * Process conversation template with match data
     */
    processTemplate(template, match, context) {
        try {
            // Fill template with match data
            let response = template.response;
            
            if (template.variables) {
                for (const [key, placeholder] of Object.entries(template.variables)) {
                    if (match && match[key]) {
                        response = response.replace(placeholder, match[key]);
                    }
                }
            }

            return {
                content: response,
                confidence: template.confidence || 0.7,
                topics: template.topics || [],
                suggestions: template.suggestions || []
            };

        } catch (error) {
            console.warn('⚠️ Template processing failed:', error.message);
            return null;
        }
    }

    /**
     * Get conversation details
     */
    async getConversation(conversationId, options = {}) {
        try {
            let conversation = this.activeConversations.get(conversationId);
            
            // Load from history if not in active memory
            if (!conversation && this.config.persistenceEnabled) {
                conversation = await this.loadConversation(conversationId);
                if (conversation) {
                    this.activeConversations.set(conversationId, conversation);
                }
            }

            if (!conversation) {
                throw new Error(`Conversation ${conversationId} not found`);
            }

            // Apply filters and options
            let messages = conversation.messages;
            
            if (options.messageType) {
                messages = messages.filter(m => m.type === options.messageType);
            }
            
            if (options.limit) {
                messages = messages.slice(-options.limit);
            }

            const result = {
                conversation: {
                    id: conversation.id,
                    title: conversation.title,
                    userId: conversation.userId,
                    createdAt: conversation.createdAt,
                    lastActivity: conversation.lastActivity,
                    messageCount: conversation.messages.length,
                    status: conversation.metadata.status,
                    tags: conversation.metadata.tags
                },
                messages: messages,
                context: conversation.context,
                metadata: conversation.metadata,
                statistics: await this.calculateConversationStats(conversation)
            };

            console.log(`📊 Retrieved conversation ${conversationId}`);
            return {
                success: true,
                ...result
            };

        } catch (error) {
            console.error('❌ Failed to get conversation:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Search conversations
     */
    async searchConversations(query, filters = {}) {
        try {
            const results = [];
            const searchTerms = this.extractSearchTerms(query);

            // Search through all conversations (active + history)
            const allConversations = [
                ...this.activeConversations.values(),
                ...await this.getHistoricalConversations()
            ];

            for (const conversation of allConversations) {
                // Apply filters
                if (filters.userId && conversation.userId !== filters.userId) continue;
                if (filters.dateFrom && conversation.createdAt < filters.dateFrom) continue;
                if (filters.dateTo && conversation.createdAt > filters.dateTo) continue;
                if (filters.status && conversation.metadata.status !== filters.status) continue;

                // Calculate relevance score
                const relevance = this.calculateRelevanceScore(conversation, searchTerms);
                
                if (relevance > 0.3) { // Minimum relevance threshold
                    results.push({
                        conversation: {
                            id: conversation.id,
                            title: conversation.title,
                            userId: conversation.userId,
                            createdAt: conversation.createdAt,
                            lastActivity: conversation.lastActivity,
                            messageCount: conversation.messages.length
                        },
                        relevanceScore: relevance,
                        matchedContent: this.findMatchedContent(conversation, searchTerms)
                    });
                }
            }

            // Sort by relevance
            results.sort((a, b) => b.relevanceScore - a.relevanceScore);

            console.log(`🔍 Found ${results.length} conversations for query "${query}"`);
            return {
                success: true,
                results: results.slice(0, filters.limit || 20),
                totalFound: results.length,
                query: query
            };

        } catch (error) {
            console.error('❌ Search failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Analyze conversation patterns
     */
    async analyzeConversationPatterns(conversation) {
        const patterns = {
            messageFrequency: this.analyzeMessageFrequency(conversation),
            responseTime: this.analyzeResponseTime(conversation),
            topicEvolution: this.analyzeTopicEvolution(conversation),
            userEngagement: this.analyzeUserEngagement(conversation),
            conversationFlow: this.analyzeConversationFlow(conversation)
        };

        return patterns;
    }

    /**
     * Update conversation metadata
     */
    async updateConversationMetadata(conversationId, updates) {
        try {
            const conversation = this.activeConversations.get(conversationId);
            if (!conversation) {
                throw new Error(`Conversation ${conversationId} not found`);
            }

            // Apply updates
            Object.assign(conversation.metadata, updates);
            conversation.lastActivity = new Date().toISOString();

            // Save if persistence enabled
            if (this.config.persistenceEnabled) {
                await this.saveConversation(conversationId);
            }

            console.log(`🔄 Updated metadata for conversation ${conversationId}`);
            return {
                success: true,
                metadata: conversation.metadata
            };

        } catch (error) {
            console.error('❌ Failed to update metadata:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * End conversation
     */
    async endConversation(conversationId, reason = 'user_request') {
        try {
            const conversation = this.activeConversations.get(conversationId);
            if (!conversation) {
                throw new Error(`Conversation ${conversationId} not found`);
            }

            // Update status
            conversation.metadata.status = 'completed';
            conversation.metadata.endReason = reason;
            conversation.metadata.endedAt = new Date().toISOString();
            conversation.metadata.duration = this.calculateConversationDuration(conversation);

            // Calculate satisfaction if available
            const satisfaction = await this.calculateSatisfaction(conversation);
            if (satisfaction !== null) {
                conversation.metadata.satisfaction = satisfaction;
            }

            // Move to history
            this.conversationHistory.set(conversationId, conversation);
            this.activeConversations.delete(conversationId);

            // Update metrics
            this.metrics.activeConversations--;
            this.metrics.conversationSuccess++;

            // Final save
            if (this.config.persistenceEnabled) {
                await this.saveConversation(conversationId);
            }

            console.log(`✅ Ended conversation ${conversationId} (${reason})`);
            return {
                success: true,
                conversation: {
                    id: conversation.id,
                    duration: conversation.metadata.duration,
                    messageCount: conversation.metadata.totalMessages,
                    satisfaction: conversation.metadata.satisfaction,
                    endedAt: conversation.metadata.endedAt
                }
            };

        } catch (error) {
            console.error('❌ Failed to end conversation:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get conversation statistics
     */
    async getConversationStats(userId = null, timeRange = null) {
        try {
            let conversations = Array.from(this.activeConversations.values());
            
            if (this.conversationHistory.size > 0) {
                conversations = conversations.concat(
                    Array.from(this.conversationHistory.values())
                );
            }

            // Apply filters
            if (userId) {
                conversations = conversations.filter(c => c.userId === userId);
            }

            if (timeRange) {
                const { from, to } = timeRange;
                conversations = conversations.filter(c => 
                    c.createdAt >= from && c.createdAt <= to
                );
            }

            // Calculate statistics
            const stats = {
                total: conversations.length,
                active: conversations.filter(c => c.metadata.status === 'active').length,
                completed: conversations.filter(c => c.metadata.status === 'completed').length,
                averageDuration: this.calculateAverageDuration(conversations),
                averageMessages: this.calculateAverageMessages(conversations),
                totalMessages: conversations.reduce((sum, c) => sum + c.metadata.totalMessages, 0),
                topUsers: this.calculateTopUsers(conversations),
                satisfactionRate: this.calculateSatisfactionRate(conversations),
                timeRange: timeRange
            };

            console.log(`📈 Generated conversation statistics`);
            return {
                success: true,
                stats: stats
            };

        } catch (error) {
            console.error('❌ Failed to get conversation statistics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Handle memory updates from memory manager
     */
    handleMemoryUpdate(data) {
        // Update active conversations based on memory updates
        for (const [conversationId, conversation] of this.activeConversations) {
            if (data.context && data.context.conversationId === conversationId) {
                // Update conversation context based on memory
                this.updateConversationFromMemory(conversation, data);
            }
        }
    }

    /**
     * Process memory integration for new message
     */
    async processMemoryIntegration(message, conversation) {
        try {
            // Store message in memory
            await this.memoryManager.storeMemory({
                type: 'conversation_message',
                content: message.content,
                metadata: {
                    conversationId: conversation.id,
                    messageId: message.id,
                    messageType: message.type,
                    timestamp: message.timestamp
                },
                context: {
                    conversationContext: conversation.context,
                    userProfile: conversation.context.userProfile
                }
            });

            // Extract and store knowledge
            if (message.type === 'user') {
                await this.extractAndStoreKnowledge(message, conversation);
            }

        } catch (error) {
            console.warn('⚠️ Memory integration failed:', error.message);
        }
    }

    /**
     * Cleanup inactive conversations
     */
    async cleanupInactiveConversations() {
        const now = Date.now();
        const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

        for (const [conversationId, conversation] of this.activeConversations) {
            const lastActivity = new Date(conversation.lastActivity).getTime();
            
            if (now - lastActivity > inactiveThreshold) {
                console.log(`🧹 Cleaning up inactive conversation ${conversationId}`);
                
                // Move to history
                this.conversationHistory.set(conversationId, conversation);
                this.activeConversations.delete(conversationId);
                
                // Update metrics
                this.metrics.activeConversations--;
            }
        }
    }

    /**
     * Save all conversations
     */
    async saveAllConversations() {
        if (!this.config.persistenceEnabled) return;

        try {
            const savePromises = [];
            
            for (const [conversationId, conversation] of this.activeConversations) {
                savePromises.push(this.saveConversation(conversationId));
            }

            await Promise.all(savePromises);
            console.log(`💾 Saved ${savePromises.length} conversations`);

        } catch (error) {
            console.error('❌ Failed to save conversations:', error);
        }
    }

    /**
     * Save individual conversation
     */
    async saveConversation(conversationId) {
        // Implementation depends on storage backend
        // This is a placeholder for the actual save logic
        console.log(`💾 Saving conversation ${conversationId}`);
    }

    /**
     * Load conversation from storage
     */
    async loadConversation(conversationId) {
        // Implementation depends on storage backend
        // This is a placeholder for the actual load logic
        return null;
    }

    /**
     * Load conversation history
     */
    async loadConversationHistory() {
        // Implementation depends on storage backend
        console.log('📚 Loading conversation history...');
    }

    /**
     * Store conversation fragment
     */
    async storeConversationFragment(conversationId, messages) {
        // Implementation for storing trimmed messages
        console.log(`🗂️ Storing conversation fragment for ${conversationId}`);
    }

    /**
     * Get historical conversations
     */
    async getHistoricalConversations() {
        return Array.from(this.conversationHistory.values());
    }

    /**
     * Calculate conversation duration
     */
    calculateConversationDuration(conversation) {
        const start = new Date(conversation.createdAt).getTime();
        const end = new Date(conversation.lastActivity).getTime();
        return Math.max(0, end - start);
    }

    /**
     * Calculate conversation statistics
     */
    async calculateConversationStats(conversation) {
        return {
            duration: this.calculateConversationDuration(conversation),
            messageCount: conversation.messages.length,
            userMessageCount: conversation.messages.filter(m => m.type === 'user').length,
            assistantMessageCount: conversation.messages.filter(m => m.type === 'assistant').length,
            averageResponseTime: this.calculateAverageResponseTime(conversation),
            topics: this.extractUniqueTopics(conversation.messages),
            languages: this.detectLanguages(conversation.messages)
        };
    }

    /**
     * Utility methods
     */
    
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    async analyzeSentiment(text) {
        // Simple sentiment analysis placeholder
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst'];
        
        const words = text.toLowerCase().split(/\s+/);
        const positiveCount = words.filter(w => positiveWords.includes(w)).length;
        const negativeCount = words.filter(w => negativeWords.includes(w)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    async extractTopics(text) {
        // Simple topic extraction
        return text
            .toLowerCase()
            .split(/\W+/)
            .filter(word => word.length > 3)
            .slice(0, 5);
    }

    detectLanguage(text) {
        // Simple language detection
        if (/[а-яё]/i.test(text)) return 'ru';
        if (/[a-z]/i.test(text)) return 'en';
        return 'unknown';
    }

    extractMetadata(message) {
        return {
            wordCount: message.split(/\s+/).length,
            charCount: message.length,
            hasUrls: /https?:\/\//.test(message),
            hasQuestions: /\?/.test(message),
            hasExclamations: /!/.test(message)
        };
    }

    loadConversationTemplates() {
        return [
            {
                pattern: /^(hello|hi|hey|привет|здравствуй)/i,
                response: "Hello! How can I help you today?",
                confidence: 0.8,
                topics: ["greeting"],
                suggestions: ["Tell me about yourself", "What can you help with?"]
            },
            {
                pattern: /^(bye|goodbye|see you|до свидания|прощай)/i,
                response: "Goodbye! Feel free to come back anytime if you need help.",
                confidence: 0.8,
                topics: ["farewell"],
                suggestions: []
            },
            {
                pattern: /how are you/i,
                response: "I'm doing well, thank you for asking! How can I assist you today?",
                confidence: 0.7,
                topics: ["status"],
                suggestions: ["What can you help me with?", "Tell me about your capabilities"]
            }
        ];
    }

    extractSearchTerms(query) {
        return query
            .toLowerCase()
            .split(/\W+/)
            .filter(term => term.length > 2);
    }

    calculateRelevanceScore(conversation, searchTerms) {
        let score = 0;
        const text = [
            conversation.title,
            conversation.messages.map(m => m.content).join(' ')
        ].join(' ').toLowerCase();

        for (const term of searchTerms) {
            const matches = (text.match(new RegExp(term, 'g')) || []).length;
            score += matches;
        }

        return Math.min(1.0, score / (searchTerms.length * 2));
    }

    findMatchedContent(conversation, searchTerms) {
        const matches = [];
        const searchText = conversation.messages
            .map(m => m.content)
            .join(' ')
            .toLowerCase();

        for (const term of searchTerms) {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            const found = searchText.match(regex);
            if (found) {
                matches.push({
                    term: term,
                    count: found.length
                });
            }
        }

        return matches;
    }

    analyzeMessageFrequency(conversation) {
        const timeStamps = conversation.messages.map(m => 
            new Date(m.timestamp).getTime()
        ).sort((a, b) => a - b);

        if (timeStamps.length < 2) return 0;

        const intervals = [];
        for (let i = 1; i < timeStamps.length; i++) {
            intervals.push(timeStamps[i] - timeStamps[i - 1]);
        }

        return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }

    analyzeResponseTime(conversation) {
        const userMessages = conversation.messages.filter(m => m.type === 'user');
        const assistantMessages = conversation.messages.filter(m => m.type === 'assistant');
        
        if (userMessages.length === 0 || assistantMessages.length === 0) return null;

        // Simplified response time calculation
        return 1500; // milliseconds
    }

    analyzeTopicEvolution(conversation) {
        // Simplified topic evolution analysis
        return conversation.messages.slice(-5).map(m => 
            m.metadata?.topics || []
        ).flat();
    }

    analyzeUserEngagement(conversation) {
        return {
            messageCount: conversation.messages.length,
            duration: this.calculateConversationDuration(conversation),
            activeTime: conversation.messages.length * 1000 // Simplified
        };
    }

    analyzeConversationFlow(conversation) {
        return {
            flow: "linear", // Could be more sophisticated
            coherence: 0.7,
            direction: "forward"
        };
    }

    calculateAverageDuration(conversations) {
        if (conversations.length === 0) return 0;
        
        const totalDuration = conversations.reduce((sum, conv) => 
            sum + this.calculateConversationDuration(conv), 0);
        
        return totalDuration / conversations.length;
    }

    calculateAverageMessages(conversations) {
        if (conversations.length === 0) return 0;
        
        const totalMessages = conversations.reduce((sum, conv) => 
            sum + conv.messages.length, 0);
        
        return totalMessages / conversations.length;
    }

    calculateTopUsers(conversations) {
        const userCounts = {};
        
        conversations.forEach(conv => {
            userCounts[conv.userId] = (userCounts[conv.userId] || 0) + 1;
        });

        return Object.entries(userCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([userId, count]) => ({ userId, conversationCount: count }));
    }

    calculateSatisfactionRate(conversations) {
        const rated = conversations.filter(c => c.metadata.satisfaction !== null);
        if (rated.length === 0) return null;

        const average = rated.reduce((sum, c) => sum + c.metadata.satisfaction, 0) / rated.length;
        return Math.round(average * 100) / 100;
    }

    calculateSatisfaction(conversation) {
        // Simplified satisfaction calculation based on message patterns
        const positiveSentiment = conversation.messages.filter(m => 
            m.metadata?.sentiment === 'positive'
        ).length;
        
        const totalMessages = conversation.messages.length;
        if (totalMessages === 0) return null;

        return Math.min(1.0, positiveSentiment / totalMessages + 0.3);
    }

    calculateAverageResponseTime(conversation) {
        // Simplified average response time
        return 1200;
    }

    extractUniqueTopics(messages) {
        const topics = new Set();
        messages.forEach(m => {
            if (m.metadata?.topics) {
                m.metadata.topics.forEach(topic => topics.add(topic));
            }
        });
        return Array.from(topics);
    }

    detectLanguages(messages) {
        const languages = new Set();
        messages.forEach(m => {
            if (m.metadata?.language) {
                languages.add(m.metadata.language);
            }
        });
        return Array.from(languages);
    }

    updateConversationFromMemory(conversation, memoryData) {
        // Update conversation based on memory updates
        if (memoryData.context) {
            conversation.context = {
                ...conversation.context,
                ...memoryData.context
            };
        }
    }

    async extractAndStoreKnowledge(message, conversation) {
        // Extract knowledge from user message and store in memory
        if (this.memoryManager) {
            try {
                await this.memoryManager.storeMemory({
                    type: 'knowledge_extraction',
                    content: message.content,
                    metadata: {
                        source: 'conversation',
                        conversationId: conversation.id,
                        timestamp: message.timestamp
                    }
                });
            } catch (error) {
                console.warn('⚠️ Knowledge extraction failed:', error.message);
            }
        }
    }

    /**
     * Get system metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            memoryUsage: {
                activeConversations: this.activeConversations.size,
                historyConversations: this.conversationHistory.size
            },
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Shutdown conversation manager
     */
    async shutdown() {
        console.log('🔄 Shutting down Conversation Manager...');

        // Clear intervals
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }

        // Save all conversations
        if (this.config.persistenceEnabled) {
            await this.saveAllConversations();
        }

        console.log('✅ Conversation Manager shutdown complete');
    }
}

module.exports = ConversationManager;
