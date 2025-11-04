const fs = require('fs').promises;
const path = require('path');
const natural = require('natural');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const multer = require('multer');
const crypto = require('crypto');

class TrainingProcessor {
  constructor() {
    this.supportedFormats = ['.pdf', '.txt', '.docx', '.md', '.csv', '.json', '.html'];
    this.processingQueue = [];
    this.batchSize = 10;
    this.nlp = {
      tokenizer: new natural.WordTokenizer(),
      stemmer: natural.PorterStemmer,
      sentiment: new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn')
    };
    this.knowledgePatterns = {
      definitions: [
        /is defined as (.+?)\./gi,
        /means (.+?)\./gi,
        /refers to (.+?)\./gi,
        /(.+?) is a (.+?)\./gi,
        /(.+?) are (.+?)\./gi
      ],
      facts: [
        /(.+?) was born in (.+?)\./gi,
        /(.+?) was founded in (.+?)\./gi,
        /(.+?) is located in (.+?)\./gi,
        /the capital of (.+?) is (.+?)\./gi,
        /(.+?) contains (.+?)\./gi
      ],
      relationships: [
        /(.+?) is related to (.+?)\./gi,
        /(.+?) is connected to (.+?)\./gi,
        /(.+?) interacts with (.+?)\./gi,
        /(.+?) works with (.+?)\./gi
      ],
      causal: [
        /because (.+?)\./gi,
        /due to (.+?)\./gi,
        /results in (.+?)\./gi,
        /causes (.+?)\./gi,
        /leads to (.+?)\./gi
      ]
    };
    this.entityTypes = {
      PERSON: /[A-Z][a-z]+ [A-Z][a-z]+/g,
      ORGANIZATION: /[A-Z][a-z]*(?: Inc|Corp|LLC|Ltd|Company|Organization)/g,
      LOCATION: /[A-Z][a-z]*(?: City|State|Country|Region)/g,
      DATE: /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
      NUMBER: /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g,
      EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      URL: /https?:\/\/[^\s]+/g
    };
  }

  async initialize() {
    try {
      console.log('🎯 Initializing Training Processor...');
      this.createProcessingDirectories();
      console.log('✅ Training Processor initialized');
    } catch (error) {
      console.error('❌ Training Processor initialization failed:', error);
      throw error;
    }
  }

  async createProcessingDirectories() {
    const dirs = [
      path.join(__dirname, '..', 'temp'),
      path.join(__dirname, '..', 'processed'),
      path.join(__dirname, '..', 'knowledge')
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  async processFile(file, options = {}) {
    try {
      const { category = 'general', autoProcess = true, sessionId = 'default' } = options;
      
      console.log(`📚 Processing file: ${file.originalname}`);
      
      const fileInfo = {
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        category,
        sessionId,
        timestamp: new Date().toISOString(),
        status: 'processing'
      };

      // Extract text content based on file type
      let content = '';
      const extension = path.extname(file.originalname).toLowerCase();
      
      switch (extension) {
        case '.pdf':
          content = await this.extractPDFText(file.buffer);
          break;
        case '.docx':
          content = await this.extractDOCXText(file.buffer);
          break;
        case '.txt':
        case '.md':
        case '.csv':
        case '.json':
        case '.html':
          content = file.buffer.toString('utf-8');
          break;
        default:
          throw new Error(`Unsupported file format: ${extension}`);
      }

      // Clean and preprocess content
      const cleanedContent = this.preprocessContent(content);
      
      // Extract knowledge
      const knowledge = await this.extractKnowledge(cleanedContent, fileInfo);
      
      // Extract entities
      const entities = await this.extractEntities(cleanedContent);
      
      // Extract relationships
      const relationships = await this.extractRelationships(cleanedContent, entities);
      
      // Analyze sentiment
      const sentiment = this.analyzeSentiment(cleanedContent);
      
      // Generate summary
      const summary = this.generateSummary(cleanedContent);
      
      // Process conversation data if applicable
      let conversationAnalysis = null;
      if (this.isConversationContent(cleanedContent)) {
        conversationAnalysis = await this.analyzeConversation(cleanedContent);
      }

      const result = {
        ...fileInfo,
        status: 'completed',
        contentLength: cleanedContent.length,
        knowledge,
        entities,
        relationships,
        sentiment,
        summary,
        conversationAnalysis,
        processingTime: Date.now() - fileInfo.timestamp.getTime(),
        autoProcessed: autoProcess
      };

      console.log(`✅ File processed: ${fileInfo.name}`);
      console.log(`   - Knowledge items: ${knowledge.length}`);
      console.log(`   - Entities: ${entities.length}`);
      console.log(`   - Relationships: ${relationships.length}`);
      console.log(`   - Sentiment: ${sentiment.score > 0 ? 'Positive' : sentiment.score < 0 ? 'Negative' : 'Neutral'}`);

      return result;

    } catch (error) {
      console.error(`❌ File processing failed:`, error);
      throw error;
    }
  }

  async extractPDFText(buffer) {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error('PDF extraction failed:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  async extractDOCXText(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('DOCX extraction failed:', error);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  preprocessContent(content) {
    return content
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/[^\S\n]+/g, ' ')
      .trim();
  }

  async extractKnowledge(content, fileInfo) {
    const knowledge = [];
    
    try {
      // Split content into sentences
      const sentences = this.splitIntoSentences(content);
      
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length < 10) continue; // Skip very short sentences

        // Extract definitions
        const definitions = this.extractDefinitions(trimmed);
        knowledge.push(...definitions.map(def => ({
          type: 'definition',
          content: def,
          confidence: 0.8,
          source: fileInfo.name,
          timestamp: new Date().toISOString()
        })));

        // Extract facts
        const facts = this.extractFacts(trimmed);
        knowledge.push(...facts.map(fact => ({
          type: 'fact',
          content: fact,
          confidence: 0.7,
          source: fileInfo.name,
          timestamp: new Date().toISOString()
        })));

        // Extract insights
        const insights = this.extractInsights(trimmed);
        knowledge.push(...insights.map(insight => ({
          type: 'insight',
          content: insight,
          confidence: 0.6,
          source: fileInfo.name,
          timestamp: new Date().toISOString()
        })));
      }

      // Remove duplicates and low-confidence items
      return this.deduplicateKnowledge(knowledge);
      
    } catch (error) {
      console.error('Knowledge extraction failed:', error);
      return [];
    }
  }

  extractDefinitions(sentence) {
    const definitions = [];
    
    for (const pattern of this.knowledgePatterns.definitions) {
      const matches = sentence.match(pattern);
      if (matches) {
        definitions.push(...matches);
      }
    }
    
    return definitions;
  }

  extractFacts(sentence) {
    const facts = [];
    
    for (const pattern of this.knowledgePatterns.facts) {
      const matches = sentence.match(pattern);
      if (matches) {
        facts.push(...matches);
      }
    }
    
    return facts;
  }

  extractInsights(sentence) {
    const insights = [];
    
    // Look for opinion statements
    if (sentence.includes('I think') || sentence.includes('I believe') || 
        sentence.includes('in my opinion') || sentence.includes('I suggest')) {
      insights.push(sentence);
    }
    
    // Look for analysis patterns
    if (sentence.includes('analysis shows') || sentence.includes('data indicates') ||
        sentence.includes('research suggests') || sentence.includes('studies show')) {
      insights.push(sentence);
    }
    
    return insights;
  }

  async extractEntities(content) {
    const entities = [];
    
    try {
      // Extract different types of entities
      for (const [type, pattern] of Object.entries(this.entityTypes)) {
        const matches = content.match(pattern) || [];
        
        for (const match of matches) {
          if (match.length > 2 && match.length < 100) { // Reasonable length filter
            entities.push({
              text: match,
              type,
              confidence: this.calculateEntityConfidence(match, type),
              occurrences: this.countOccurrences(content, match)
            });
          }
        }
      }

      // Remove duplicates and sort by confidence
      const uniqueEntities = this.deduplicateEntities(entities);
      return uniqueEntities.sort((a, b) => b.confidence - a.confidence);
      
    } catch (error) {
      console.error('Entity extraction failed:', error);
      return [];
    }
  }

  async extractRelationships(content, entities) {
    const relationships = [];
    
    try {
      for (const pattern of this.knowledgePatterns.relationships) {
        const matches = [...content.matchAll(pattern)];
        
        for (const match of matches) {
          const entity1 = this.findEntityInText(match[1], entities);
          const entity2 = this.findEntityInText(match[2], entities);
          
          if (entity1 && entity2) {
            relationships.push({
              type: 'related_to',
              source: entity1.text,
              target: entity2.text,
              sourceType: entity1.type,
              targetType: entity2.type,
              confidence: Math.min(entity1.confidence, entity2.confidence) * 0.8,
              context: match[0]
            });
          }
        }
      }

      return relationships;
      
    } catch (error) {
      console.error('Relationship extraction failed:', error);
      return [];
    }
  }

  analyzeSentiment(content) {
    try {
      const sentences = this.splitIntoSentences(content);
      const sentiments = sentences.map(sentence => 
        this.nlp.sentiment.getSentiment(sentence)
      );
      
      const avgSentiment = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
      
      return {
        score: avgSentiment,
        magnitude: Math.abs(avgSentiment),
        label: avgSentiment > 0.1 ? 'positive' : 
               avgSentiment < -0.1 ? 'negative' : 'neutral',
        confidence: Math.min(1, Math.abs(avgSentiment) * 2)
      };
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return {
        score: 0,
        magnitude: 0,
        label: 'neutral',
        confidence: 0
      };
    }
  }

  generateSummary(content) {
    try {
      const sentences = this.splitIntoSentences(content);
      if (sentences.length <= 3) {
        return content.substring(0, 500);
      }

      // Simple extractive summarization
      const importantSentences = sentences
        .map(sentence => ({
          text: sentence,
          score: this.calculateSentenceImportance(sentence),
          position: sentences.indexOf(sentence)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(3, Math.ceil(sentences.length * 0.3)));

      importantSentences.sort((a, b) => a.position - b.position);
      return importantSentences.map(s => s.text).join(' ');
      
    } catch (error) {
      console.error('Summary generation failed:', error);
      return content.substring(0, 500);
    }
  }

  calculateSentenceImportance(sentence) {
    let score = 0;
    
    // Length factor
    score += Math.min(sentence.length / 100, 1);
    
    // Proper nouns (likely important entities)
    const properNouns = sentence.match(/[A-Z][a-z]+/g);
    score += (properNouns ? properNouns.length : 0) * 0.1;
    
    // Keywords that indicate importance
    const importantWords = ['important', 'significant', 'key', 'main', 'primary', 'critical'];
    const hasImportantWords = importantWords.some(word => 
      sentence.toLowerCase().includes(word)
    );
    score += hasImportantWords ? 0.5 : 0;
    
    return score;
  }

  isConversationContent(content) {
    const conversationPatterns = [
      /^\s*[A-Za-z]+:\s*/gm,  // Name: message
      /Q:\s*/gm,              // Q: question
      /A:\s*/gm,              // A: answer
      /\?\s*$/gm              // Questions
    ];
    
    return conversationPatterns.some(pattern => pattern.test(content));
  }

  async analyzeConversation(content) {
    const messages = this.extractMessages(content);
    const participants = this.extractParticipants(content);
    const topics = this.extractTopics(content);
    const sentiments = this.analyzeConversationSentiment(messages);
    
    return {
      messages: messages.length,
      participants,
      topics,
      averageSentiment: sentiments.average,
      sentimentTrend: sentiments.trend,
      engagement: this.calculateEngagement(messages)
    };
  }

  extractMessages(content) {
    const messages = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && (trimmed.includes(': ') || trimmed.startsWith('Q:') || trimmed.startsWith('A:'))) {
        messages.push({
          content: trimmed,
          timestamp: new Date().toISOString(),
          type: trimmed.startsWith('Q:') ? 'question' : 
                trimmed.startsWith('A:') ? 'answer' : 'message'
        });
      }
    }
    
    return messages;
  }

  extractParticipants(content) {
    const participants = new Set();
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^([A-Za-z]+):/);
      if (match) {
        participants.add(match[1]);
      }
    }
    
    return Array.from(participants);
  }

  extractTopics(content) {
    // Simple topic extraction based on frequent nouns
    const sentences = this.splitIntoSentences(content);
    const wordFreq = {};
    
    for (const sentence of sentences) {
      const tokens = this.nlp.tokenizer.tokenize(sentence.toLowerCase());
      for (const token of tokens) {
        if (token.length > 3 && !this.isStopWord(token)) {
          wordFreq[token] = (wordFreq[token] || 0) + 1;
        }
      }
    }
    
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word, freq]) => ({ word, frequency: freq }));
  }

  analyzeConversationSentiment(messages) {
    const sentiments = messages.map(msg => 
      this.nlp.sentiment.getSentiment(msg.content)
    );
    
    const average = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
    const trend = sentiments.length > 1 ? 
      sentiments[sentiments.length - 1] - sentiments[0] : 0;
    
    return {
      average,
      trend,
      label: average > 0.1 ? 'positive' : average < -0.1 ? 'negative' : 'neutral'
    };
  }

  calculateEngagement(messages) {
    const questionCount = messages.filter(m => m.type === 'question').length;
    const responseCount = messages.filter(m => m.type === 'answer').length;
    
    return {
      questionResponseRatio: responseCount > 0 ? questionCount / responseCount : 0,
      totalInteractions: messages.length,
      participationRate: this.extractParticipants(messages.join('\n')).length
    };
  }

  // Utility methods
  splitIntoSentences(content) {
    return content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  calculateEntityConfidence(text, type) {
    let confidence = 0.5;
    
    // Adjust based on entity type
    switch (type) {
      case 'PERSON':
        confidence = 0.9;
        break;
      case 'ORGANIZATION':
        confidence = 0.8;
        break;
      case 'LOCATION':
        confidence = 0.8;
        break;
      case 'EMAIL':
      case 'URL':
        confidence = 1.0;
        break;
    }
    
    // Adjust based on length
    if (text.length > 5 && text.length < 50) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  countOccurrences(content, searchTerm) {
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return (content.match(regex) || []).length;
  }

  findEntityInText(text, entities) {
    return entities.find(entity => 
      text.toLowerCase().includes(entity.text.toLowerCase()) ||
      entity.text.toLowerCase().includes(text.toLowerCase())
    );
  }

  deduplicateKnowledge(knowledge) {
    const seen = new Set();
    return knowledge.filter(item => {
      const key = `${item.type}_${item.content}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  deduplicateEntities(entities) {
    const seen = new Map();
    
    return entities.filter(entity => {
      const key = `${entity.type}_${entity.text.toLowerCase()}`;
      if (seen.has(key)) {
        const existing = seen.get(key);
        if (entity.confidence > existing.confidence) {
          seen.set(key, entity);
        }
        return false;
      }
      seen.set(key, entity);
      return true;
    });
  }

  isStopWord(word) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  // Batch processing methods
  async processBatch(files, options = {}) {
    const { batchSize = this.batchSize, onProgress } = options;
    const results = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = [];
      
      for (const file of batch) {
        try {
          const result = await this.processFile(file, options);
          batchResults.push(result);
        } catch (error) {
          console.error(`Batch processing failed for ${file.originalname}:`, error);
          batchResults.push({
            name: file.originalname,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      results.push(...batchResults);
      
      if (onProgress) {
        onProgress({
          completed: Math.min(i + batchSize, files.length),
          total: files.length,
          percentage: Math.round((Math.min(i + batchSize, files.length) / files.length) * 100)
        });
      }
      
      // Small delay between batches to prevent overwhelming
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  // Training data export
  async exportTrainingData(knowledge, format = 'json') {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        knowledge,
        statistics: {
          totalItems: knowledge.length,
          byType: this.groupByType(knowledge),
          byConfidence: this.calculateConfidenceDistribution(knowledge)
        }
      };

      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(exportData, null, 2);
        case 'csv':
          return this.convertToCSV(knowledge);
        case 'xml':
          return this.convertToXML(exportData);
        default:
          return JSON.stringify(exportData, null, 2);
      }
    } catch (error) {
      console.error('Training data export failed:', error);
      throw error;
    }
  }

  groupByType(knowledge) {
    const grouped = {};
    for (const item of knowledge) {
      if (!grouped[item.type]) {
        grouped[item.type] = 0;
      }
      grouped[item.type]++;
    }
    return grouped;
  }

  calculateConfidenceDistribution(knowledge) {
    const distribution = { high: 0, medium: 0, low: 0 };
    
    for (const item of knowledge) {
      if (item.confidence >= 0.7) {
        distribution.high++;
      } else if (item.confidence >= 0.4) {
        distribution.medium++;
      } else {
        distribution.low++;
      }
    }
    
    return distribution;
  }

  convertToCSV(knowledge) {
    if (knowledge.length === 0) return '';
    
    const headers = Object.keys(knowledge[0]);
    const csvRows = [headers.join(',')];
    
    for (const item of knowledge) {
      const row = headers.map(header => {
        const value = item[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(row.join(','));
    }
    
    return csvRows.join('\n');
  }

  convertToXML(data) {
    const escapeXml = (str) => str.replace(/[<>&'"]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n
```\n';
    
    xml += `  <metadata>\n`;
    xml += `    <timestamp>${escapeXml(data.timestamp)}</timestamp>\n`;
    xml += `    <version>${escapeXml(data.version)}</version>\n`;
    xml += `    <totalItems>${data.statistics.totalItems}</totalItems>\n`;
    xml += `  </metadata>\n`;
    
    xml += `  <knowledge>\n`;
    for (const item of data.knowledge) {
      xml += `    <item type="${escapeXml(item.type)}">\n`;
      for (const [key, value] of Object.entries(item)) {
        if (key !== 'type') {
          xml += `      <${key}>${escapeXml(String(value))}</${key}>\n`;
        }
      }
      xml += `    </item>\n`;
    }
    xml += `  </knowledge>\n`;
    
    xml += ````
`;
    return xml;
  }
}

module.exports = { TrainingProcessor };
