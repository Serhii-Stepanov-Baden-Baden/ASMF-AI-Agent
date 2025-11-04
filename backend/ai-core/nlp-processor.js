/**
 * ASMF AI Agent - Natural Language Processing Core
 * Advanced NLP processing with semantic analysis and intent recognition
 * 
 * @version 1.0.0
 * @author MiniMax Agent
 * @created 2025-11-05
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

/**
 * Natural Language Processing Engine
 * Handles text analysis, entity extraction, sentiment analysis, and intent recognition
 */
class NLPProcessor extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.patterns = new Map();
    this.entities = new Map();
    this.intents = new Map();
    this.sentiments = new Map();
    this.models = new Map();
    this.metrics = {
      totalProcessed: 0,
      averageConfidence: 0,
      entitiesExtracted: 0,
      intentsRecognized: 0,
      sentimentAnalyzed: 0,
      processingTime: 0
    };
    
    // Configuration
    this.config = {
      maxTokens: 2048,
      confidenceThreshold: 0.7,
      sentimentSensitivity: 0.5,
      entityConfidence: 0.6,
      intentConfidence: 0.75,
      enableCaching: true,
      cacheTTL: 300000, // 5 minutes
      parallelProcessing: true,
      maxConcurrent: 10,
      language: 'en',
      supportLanguages: ['en', 'ru', 'uk'],
      enableSentimentAnalysis: true,
      enableEntityExtraction: true,
      enableIntentRecognition: true,
      enableSyntaxAnalysis: true,
      enableSemanticAnalysis: true
    };
    
    // Initialize processing pipeline
    this.pipeline = [
      'preprocessing',
      'tokenization', 
      'syntaxAnalysis',
      'entityExtraction',
      'sentimentAnalysis',
      'intentRecognition',
      'semanticAnalysis',
      'responseGeneration'
    ];
  }

  /**
   * Initialize the NLP processor
   */
  async initialize() {
    try {
      console.log('🔤 Initializing NLP Processor...');
      
      // Load processing patterns
      await this.loadProcessingPatterns();
      
      // Initialize language models
      await this.initializeLanguageModels();
      
      // Set up entity recognition patterns
      await this.setupEntityPatterns();
      
      // Initialize intent recognition system
      await this.initializeIntentRecognition();
      
      // Load sentiment analysis patterns
      await this.loadSentimentPatterns();
      
      // Set up cache system
      if (this.config.enableCaching) {
        await this.initializeCache();
      }
      
      // Start metrics collection
      this.startMetricsCollection();
      
      this.initialized = true;
      console.log('✅ NLP Processor initialized successfully');
      
    } catch (error) {
      console.error('❌ NLP Processor initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load processing patterns for different languages
   */
  async loadProcessingPatterns() {
    const patterns = {
      // English patterns
      en: {
        sentence: /([.!?]+)/g,
        word: /\b[a-zA-Z']+\b/g,
        number: /\b\d+(?:\.\d+)?\b/g,
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        url: /https?:\/\/[^\s]+/g,
        hashtag: /#[A-Za-z0-9_]+/g,
        mention: /@[A-Za-z0-9_]+/g,
        punctuation: /[.,;:!?()[\]{}"']/g,
        whitespace: /\s+/g
      },
      // Russian patterns
      ru: {
        sentence: /([.!?]+)/g,
        word: /\b[а-яёА-ЯЁ']+\b/g,
        number: /\b\d+(?:\.\d+)?\b/g,
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        url: /https?:\/\/[^\s]+/g,
        hashtag: /#[А-Яа-яA-Za-z0-9_]+/g,
        mention: /@[А-Яа-яA-Za-z0-9_]+/g,
        punctuation: /[.,;:!?()[\]{}"']/g,
        whitespace: /\s+/g
      },
      // Ukrainian patterns
      uk: {
        sentence: /([.!?]+)/g,
        word: /\b[іїІЇєЄґҐа-яА-Я']+\b/g,
        number: /\b\d+(?:\.\d+)?\b/g,
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        url: /https?:\/\/[^\s]+/g,
        hashtag: /#[іїІЇєЄґҐА-Яа-яA-Za-z0-9_]+/g,
        mention: /@[іїІЇєЄґҐА-Яа-яA-Za-z0-9_]+/g,
        punctuation: /[.,;:!?()[\]{}"']/g,
        whitespace: /\s+/g
      }
    };

    // Store patterns by language
    for (const [lang, langPatterns] of Object.entries(patterns)) {
      this.patterns.set(lang, langPatterns);
    }

    console.log(`📝 Loaded processing patterns for ${this.config.supportLanguages.length} languages`);
  }

  /**
   * Initialize language-specific processing models
   */
  async initializeLanguageModels() {
    // Language detection model
    this.models.set('languageDetector', {
      type: 'heuristic',
      patterns: {
        'en': ['the', 'and', 'you', 'have', 'this', 'that'],
        'ru': ['это', 'что', 'как', 'они', 'него', 'мне'],
        'uk': ['це', 'що', 'як', 'вони', 'йому', 'мені']
      },
      weights: {
        en: 0.8,
        ru: 0.8,
        uk: 0.8
      }
    });

    // Tokenization models
    for (const lang of this.config.supportLanguages) {
      this.models.set(`tokenizer_${lang}`, {
        type: 'rule-based',
        rules: this.patterns.get(lang),
        maxTokens: this.config.maxTokens
      });
    }

    console.log('🤖 Language models initialized');
  }

  /**
   * Set up entity recognition patterns
   */
  async setupEntityPatterns() {
    const entityPatterns = {
      person: {
        en: /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
        ru: /\b(?:г-н|г-жа|д-р|проф\.)\s*[А-Я][а-я]+(?:\s+[А-Я][а-я]+)*\b/ug,
        uk: /\b(?:п-н|пані|д-р|проф\.)\s*[А-Я][а-я]+(?:\s+[А-Я][а-я]+)*\b/ug
      },
      organization: {
        en: /\b(?:Inc\.|Corp\.|Ltd\.|LLC\.|Company|Corporation|Organization)\b/g,
        ru: /\b(?:ООО|ПАО|ЗАО|Компания|Корпорация|Предприятие)\b/ug,
        uk: /\b(?:ТОВ|ПАТ|Приватна|Організація|Корпорація)\b/ug
      },
      location: {
        en: /\b(?:New York|Paris|London|Tokyo|China|United States|France)\b/g,
        ru: /\b(?:Москва|Санкт-Петербург|Сочи|Франция|США|Китай)\b/ug,
        uk: /\b(?:Київ|Харків|Одеса|США|Франція|Китай)\b/ug
      },
      date: {
        en: /\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/g,
        ru: /\b(?:\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}\.\d{1,2}\.\d{1,2})\b/ug,
        uk: /\b(?:\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}\.\d{1,2}\.\d{1,2})\b/ug
      },
      time: {
        en: /\b(?:\d{1,2}:\d{2}(?:\s*[AP]M)?|\d{1,2}\s*[AP]M)\b/g,
        ru: /\b\d{1,2}:\d{2}\b/ug,
        uk: /\b\d{1,2}:\d{2}\b/ug
      },
      money: {
        en: /\b(?:\$|€|£)\s*\d+(?:[,\.]\d{3})*(?:\.\d{2})?\b/gi,
        ru: /\b\d+(?:[,\s]\d{3})*(?:\.\d{2})?\s*(?:руб|долл|евро)\b/ugi,
        uk: /\b\d+(?:[,\s]\d{3})*(?:\.\d{2})?\s*(?:грн|дол|євро)\b/ugi
      },
      url: {
        all: /https?:\/\/[^\s]+/g
      },
      email: {
        all: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
      },
      phone: {
        en: /\b(?:\+?1[-.]?)?\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4}\b/g,
        ru: /\b\+?[7|8]?[-\s]?\(?[0-9]{3}\)?[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}\b/g,
        uk: /\b\+?[38]?[-\s]?\(?[0-9]{3}\)?[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}\b/g
      }
    };

    this.entities = new Map();
    for (const [type, patterns] of Object.entries(entityPatterns)) {
      this.entities.set(type, patterns);
    }

    console.log(`🎯 Set up ${this.entities.size} entity types with patterns`);
  }

  /**
   * Initialize intent recognition system
   */
  async initializeIntentRecognition() {
    const intentPatterns = {
      greeting: {
        patterns: [
          'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
          'привет', 'здравствуйте', 'доброе утро', 'добрый день', 'добрый вечер',
          'привіт', 'добрий ранок', 'добрий день', 'добрий вечір'
        ],
        confidence: 0.9
      },
      question: {
        patterns: [
          'what', 'when', 'where', 'who', 'why', 'how', 'which', 'whose',
          'что', 'когда', 'где', 'кто', 'почему', 'как', 'какой', 'чей',
          'що', 'коли', 'де', 'хто', 'чому', 'як', 'який', 'чий'
        ],
        questionMarkers: ['?', 'how about', 'what about', 'знаешь ли'],
        confidence: 0.8
      },
      request: {
        patterns: [
          'please', 'can you', 'could you', 'would you', 'help me', 'show me',
          'пожалуйста', 'можете ли', 'помогите мне', 'покажите мне',
          'будь ласка', 'можете', 'допоможіть мені', 'покажіть мені'
        ],
        confidence: 0.85
      },
      goodbye: {
        patterns: [
          'bye', 'goodbye', 'see you', 'farewell', 'take care',
          'пока', 'до свидания', 'увидимся', 'будь здоров',
          'бувай', 'до побачення', 'побачимося', 'будь здоровий'
        ],
        confidence: 0.9
      },
      thank: {
        patterns: [
          'thanks', 'thank you', 'appreciate', 'grateful',
          'спасибо', 'благодарю', 'признателен',
          'дякую', 'вдячний', 'вдячна'
        ],
        confidence: 0.95
      },
      affirmative: {
        patterns: [
          'yes', 'yep', 'sure', 'definitely', 'absolutely', 'of course',
          'да', 'конечно', 'определенно', 'безусловно',
          'так', 'звичайно', 'безумовно', 'авжеж'
        ],
        confidence: 0.85
      },
      negative: {
        patterns: [
          'no', 'nope', 'not really', 'never', 'nothing',
          'нет', 'не', 'никогда', 'ничего',
          'ні', 'ніколи', 'нічого'
        ],
        confidence: 0.85
      },
      apology: {
        patterns: [
          'sorry', 'excuse me', 'apologies', 'forgive me',
          'извините', 'простите', 'извиняюсь',
          'вибачте', 'пробачте'
        ],
        confidence: 0.9
      },
      weather: {
        patterns: [
          'weather', 'temperature', 'rain', 'sunny', 'cloudy',
          'погода', 'температура', 'дождь', 'солнце', 'облачно',
          'погода', 'температура', 'дощ', 'сонце', 'хмарно'
        ],
        confidence: 0.8
      },
      time: {
        patterns: [
          'time', 'what time', 'when', 'today', 'tomorrow', 'yesterday',
          'время', 'сколько время', 'когда', 'сегодня', 'завтра', 'вчера',
          'час', 'котра година', 'сьогодні', 'завтра', 'вчора'
        ],
        confidence: 0.8
      }
    };

    this.intents = new Map();
    for (const [name, config] of Object.entries(intentPatterns)) {
      this.intents.set(name, config);
    }

    console.log(`🎭 Initialized ${this.intents.size} intent types`);
  }

  /**
   * Load sentiment analysis patterns
   */
  async loadSentimentPatterns() {
    const sentimentPatterns = {
      positive: {
        en: ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'joy', 'pleased', 'satisfied'],
        ru: ['отлично', 'прекрасно', 'замечательно', 'фантастически', 'люблю', 'нравится', 'счастлив', 'радость', 'доволен'],
        uk: ['відмінно', 'прекрасно', 'чудово', 'фантастично', 'люблю', 'подобається', 'щасливий', 'радість', 'задоволений']
      },
      negative: {
        en: ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed'],
        ru: ['плохо', 'ужасно', 'отвратительно', 'ненавижу', 'не люблю', 'грустно', 'злой', 'расстроен', 'разочарован'],
        uk: ['погано', 'жахливо', 'огидно', 'ненавиджу', 'не люблю', 'сумно', 'злий', 'прикрощений', 'розчарований']
      },
      neutral: {
        en: ['okay', 'fine', 'alright', 'whatever', 'neutral'],
        ru: ['нормально', 'ладно', 'пофиг', 'нейтрально'],
        uk: ['нормально', 'добре', 'пофіг', 'нейтрально']
      },
      emotional: {
        en: ['excited', 'worried', 'surprised', 'confused', 'worried', 'concerned'],
        ru: ['возбужден', 'взволнован', 'удивлен', 'смущен', 'обеспокоен'],
        uk: ['збуджений', 'хвилюється', 'здивований', 'збентежений', 'турбований']
      }
    };

    this.sentiments = new Map();
    for (const [type, langWords] of Object.entries(sentimentPatterns)) {
      this.sentiments.set(type, langWords);
    }

    console.log(`😊 Loaded sentiment patterns for ${this.sentiments.size} categories`);
  }

  /**
   * Initialize cache system for performance optimization
   */
  async initializeCache() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    
    // Set up cache cleanup interval
    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      const ttl = this.config.cacheTTL;
      
      for (const [key, timestamp] of this.cacheTimestamps.entries()) {
        if (now - timestamp > ttl) {
          this.cache.delete(key);
          this.cacheTimestamps.delete(key);
        }
      }
    }, 60000); // Clean every minute

    console.log('💾 Cache system initialized');
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      console.log(`📊 NLP Metrics: Processed ${this.metrics.totalProcessed} texts, Avg Confidence: ${this.metrics.averageConfidence.toFixed(2)}`);
    }, 300000); // Every 5 minutes
  }

  /**
   * Detect language of the input text
   */
  detectLanguage(text) {
    const words = text.toLowerCase().match(/\b[a-zA-Zа-яёіїєґА-ЯЁІЇЄҐ']+\b/gu) || [];
    const scores = {};
    
    // Initialize scores for all supported languages
    for (const lang of this.config.supportLanguages) {
      scores[lang] = 0;
    }
    
    // Score based on language-specific words
    for (const word of words) {
      for (const [lang, langWords] of this.models.get('languageDetector').patterns.entries()) {
        if (langWords.includes(word)) {
          scores[lang] += this.models.get('languageDetector').weights[lang];
        }
      }
    }
    
    // Determine most likely language
    let detectedLang = 'en'; // Default to English
    let maxScore = 0;
    
    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    }
    
    return {
      language: detectedLang,
      confidence: Math.min(maxScore / words.length, 1.0),
      scores
    };
  }

  /**
   * Tokenize text into words and sentences
   */
  tokenize(text, language = 'en') {
    const langPatterns = this.patterns.get(language) || this.patterns.get('en');
    
    const sentences = text
      .split(langPatterns.sentence)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());
    
    const words = (text.match(langPatterns.word) || []).map(w => w.toLowerCase());
    
    return {
      sentences: sentences.map((sentence, index) => ({
        text: sentence,
        index,
        wordCount: (sentence.match(langPatterns.word) || []).length
      })),
      words: words.map((word, index) => ({
        text: word,
        index,
        length: word.length
      })),
      totalSentences: sentences.length,
      totalWords: words.length,
      language
    };
  }

  /**
   * Extract entities from text
   */
  extractEntities(text, language = 'en') {
    const entities = [];
    const usedPositions = new Set();
    
    for (const [entityType, patterns] of this.entities.entries()) {
      const pattern = patterns[language] || patterns.all;
      if (!pattern) continue;
      
      const matches = text.match(pattern) || [];
      
      for (const match of matches) {
        const startIndex = text.indexOf(match);
        const endIndex = startIndex + match.length;
        
        // Check if this position is already used
        const key = `${startIndex}-${endIndex}`;
        if (usedPositions.has(key)) continue;
        
        entities.push({
          type: entityType,
          text: match,
          confidence: this.config.entityConfidence,
          position: {
            start: startIndex,
            end: endIndex
          },
          metadata: {
            language,
            extractedAt: new Date().toISOString()
          }
        });
        
        usedPositions.add(key);
      }
    }
    
    // Sort entities by position
    entities.sort((a, b) => a.position.start - b.position.start);
    
    return entities;
  }

  /**
   * Analyze sentiment of text
   */
  analyzeSentiment(text, language = 'en') {
    const words = text.toLowerCase().match(/\b[a-zA-Zа-яёіїєґА-ЯЁІЇЄҐ']+\b/gu) || [];
    const sentimentScores = {
      positive: 0,
      negative: 0,
      neutral: 0
    };
    
    // Count sentiment-bearing words
    for (const word of words) {
      for (const [sentiment, langWords] of this.sentiments.entries()) {
        if (langWords[language] && langWords[language].includes(word)) {
          if (sentiment === 'positive') {
            sentimentScores.positive += 1;
          } else if (sentiment === 'negative') {
            sentimentScores.negative += 1;
          } else {
            sentimentScores.neutral += 1;
          }
        }
      }
    }
    
    // Calculate overall sentiment
    const totalWords = words.length;
    const positiveScore = sentimentScores.positive / totalWords;
    const negativeScore = sentimentScores.negative / totalWords;
    const neutralScore = sentimentScores.neutral / totalWords;
    
    let overallSentiment = 'neutral';
    let confidence = neutralScore;
    
    if (positiveScore > negativeScore && positiveScore > this.config.sentimentSensitivity) {
      overallSentiment = 'positive';
      confidence = positiveScore;
    } else if (negativeScore > positiveScore && negativeScore > this.config.sentimentSensitivity) {
      overallSentiment = 'negative';
      confidence = negativeScore;
    }
    
    return {
      sentiment: overallSentiment,
      confidence: Math.min(confidence, 1.0),
      scores: sentimentScores,
      intensity: Math.abs(positiveScore - negativeScore),
      details: {
        positive: sentimentScores.positive,
        negative: sentimentScores.negative,
        neutral: sentimentScores.neutral,
        totalWords
      }
    };
  }

  /**
   * Recognize intent of text
   */
  recognizeIntent(text, language = 'en') {
    const textLower = text.toLowerCase();
    const intentScores = {};
    
    // Score each intent based on pattern matches
    for (const [intentName, config] of this.intents.entries()) {
      let score = 0;
      const patternMatches = [];
      
      // Check primary patterns
      for (const pattern of config.patterns) {
        const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
        const matches = textLower.match(regex) || [];
        if (matches.length > 0) {
          score += matches.length * config.confidence;
          patternMatches.push({
            pattern,
            matches: matches.length
          });
        }
      }
      
      // Check question markers for question intent
      if (intentName === 'question' && config.questionMarkers) {
        for (const marker of config.questionMarkers) {
          if (textLower.includes(marker.toLowerCase())) {
            score += config.confidence * 0.5;
            patternMatches.push({
              pattern: `question_marker_${marker}`,
              matches: 1
            });
          }
        }
      }
      
      // Check for punctuation indicators
      if (text.includes('?')) {
        if (intentName === 'question') {
          score += config.confidence * 0.3;
          patternMatches.push({
            pattern: 'question_mark',
            matches: 1
          });
        }
      }
      
      if (text.includes('!')) {
        if (intentName === 'greeting' || intentName === 'thank' || intentName === 'goodbye') {
          score += config.confidence * 0.2;
        }
      }
      
      intentScores[intentName] = {
        score,
        matches: patternMatches,
        confidence: config.confidence
      };
    }
    
    // Determine primary intent
    let primaryIntent = 'unknown';
    let maxScore = 0;
    
    for (const [intent, data] of Object.entries(intentScores)) {
      if (data.score > maxScore) {
        maxScore = data.score;
        primaryIntent = intent;
      }
    }
    
    // Calculate overall confidence
    const totalScore = Object.values(intentScores).reduce((sum, data) => sum + data.score, 0);
    const confidence = totalScore > 0 ? maxScore / totalScore : 0;
    
    return {
      intent: primaryIntent,
      confidence: Math.min(confidence, 1.0),
      scores: intentScores,
      primaryMatches: intentScores[primaryIntent]?.matches || [],
      alternativeIntents: Object.keys(intentScores)
        .filter(intent => intent !== primaryIntent && intentScores[intent].score > 0)
        .sort((a, b) => intentScores[b].score - intentScores[a].score)
        .slice(0, 3)
    };
  }

  /**
   * Perform syntax analysis
   */
  syntaxAnalysis(text, language = 'en') {
    const tokens = this.tokenize(text, language);
    const words = tokens.words;
    
    const analysis = {
      partsOfSpeech: {},
      sentenceStructure: [],
      complexity: {
        avgSentenceLength: tokens.totalWords / tokens.totalSentences,
        avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length,
        uniqueWords: new Set(words.map(w => w.text)).size,
        totalWords: tokens.totalWords,
        typeTokenRatio: new Set(words.map(w => w.text)).size / words.length
      },
      language
    };
    
    // Simple part-of-speech detection based on patterns
    for (const word of words) {
      const wordText = word.text;
      let pos = 'unknown';
      
      // Basic POS detection
      if (/^[A-Z][a-z]*$/.test(wordText) && !text.startsWith(wordText)) {
        pos = 'proper_noun';
      } else if (/^[a-z]+ing$/.test(wordText)) {
        pos = 'verb_present_participle';
      } else if (/^[a-z]+ed$/.test(wordText)) {
        pos = 'verb_past_tense';
      } else if (/^[a-z]+ly$/.test(wordText)) {
        pos = 'adverb';
      } else if (/^[a-z]+ion$/.test(wordText)) {
        pos = 'noun_abstract';
      } else if (/^[a-z]+ness$/.test(wordText)) {
        pos = 'noun_abstract';
      } else if (/^[a-z]+able$/.test(wordText)) {
        pos = 'adjective';
      } else if (/^[a-z]+ous$/.test(wordText)) {
        pos = 'adjective';
      } else if (/^[a-z]+ful$/.test(wordText)) {
        pos = 'adjective';
      } else if (/^the$|^a$|^an$/.test(wordText)) {
        pos = 'article';
      } else if (/^to$|^of$|^in$|^on$|^at$|^by$|^for$|^with$/.test(wordText)) {
        pos = 'preposition';
      } else if (/^and$|^or$|^but$|^so$|^because$/.test(wordText)) {
        pos = 'conjunction';
      } else if (/^i$|^you$|^he$|^she$|^it$|^we$|^they$/.test(wordText)) {
        pos = 'pronoun';
      }
      
      analysis.partsOfSpeech[pos] = (analysis.partsOfSpeech[pos] || 0) + 1;
    }
    
    // Analyze sentence structure
    for (const sentence of tokens.sentences) {
      const structure = {
        type: 'simple',
        clauses: 1,
        hasConjunctions: sentence.text.includes('and') || sentence.text.includes('or'),
        hasQuestions: sentence.text.includes('?'),
        hasExclamations: sentence.text.includes('!')
      };
      
      // Determine sentence complexity
      const clauseCount = (sentence.text.match(/[,;]/) || []).length + 1;
      structure.clauses = clauseCount;
      
      if (clauseCount > 2 || structure.hasConjunctions) {
        structure.type = 'complex';
      } else if (clauseCount > 1) {
        structure.type = 'compound';
      }
      
      analysis.sentenceStructure.push(structure);
    }
    
    return analysis;
  }

  /**
   * Perform semantic analysis
   */
  semanticAnalysis(text, language = 'en') {
    const tokens = this.tokenize(text, language);
    const words = tokens.words;
    
    const analysis = {
      semanticDensity: 0,
      conceptualThemes: [],
      semanticRelationships: [],
      coherenceScore: 0,
      relevanceScore: 0,
      semanticFields: []
    };
    
    // Calculate semantic density (content words vs function words)
    const contentWords = words.filter(word => {
      const text = word.text;
      return !['the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with'].includes(text) &&
             !['это', 'что', 'как', 'они', 'него', 'мне', 'для', 'чтобы'].includes(text) &&
             !['це', 'що', 'як', 'вони', 'йому', 'мені', 'для', 'щоб'].includes(text);
    }).length;
    
    analysis.semanticDensity = contentWords / words.length;
    
    // Identify semantic fields
    const wordFrequencies = {};
    for (const word of words) {
      wordFrequencies[word.text] = (wordFrequencies[word.text] || 0) + 1;
    }
    
    const topWords = Object.entries(wordFrequencies)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    analysis.semanticFields = topWords.map(([word, frequency]) => ({
      word,
      frequency,
      importance: frequency / words.length
    }));
    
    // Simple coherence calculation based on word repetition and proximity
    const coherenceMetrics = {
      wordRepetition: 0,
      sequentialCoherence: 0,
      overall: 0
    };
    
    // Word repetition score
    const uniqueWords = new Set(words.map(w => w.text)).size;
    coherenceMetrics.wordRepetition = uniqueWords / words.length;
    
    // Sequential coherence (words appearing in similar contexts)
    for (let i = 1; i < words.length - 1; i++) {
      const prevWord = words[i - 1].text;
      const currentWord = words[i].text;
      const nextWord = words[i + 1].text;
      
      // Simple semantic relationship detection
      if (wordFrequencies[prevWord] > 1 && wordFrequencies[nextWord] > 1) {
        coherenceMetrics.sequentialCoherence += 0.1;
      }
    }
    
    coherenceMetrics.sequentialCoherence = Math.min(coherenceMetrics.sequentialCoherence / words.length, 1);
    coherenceMetrics.overall = (coherenceMetrics.wordRepetition + coherenceMetrics.sequentialCoherence) / 2;
    
    analysis.coherenceScore = coherenceMetrics.overall;
    
    return analysis;
  }

  /**
   * Main processing pipeline
   */
  async processText(inputText, options = {}) {
    const startTime = Date.now();
    
    try {
      if (!this.initialized) {
        throw new Error('NLP Processor not initialized');
      }

      const text = inputText.trim();
      if (!text) {
        throw new Error('Empty text provided');
      }

      console.log(`🔤 Processing text: "${text.substring(0, 50)}..."`);
      
      // Check cache
      const cacheKey = crypto.createHash('md5').update(text + JSON.stringify(options)).digest('hex');
      if (this.config.enableCaching && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Language detection
      const languageDetection = this.detectLanguage(text);
      const language = options.language || languageDetection.language;

      // Initialize results
      const results = {
        originalText: text,
        language: languageDetection,
        tokenization: null,
        entities: [],
        sentiment: null,
        intent: null,
        syntax: null,
        semantics: null,
        processingTime: 0,
        metadata: {
          processedAt: new Date().toISOString(),
          processorVersion: '1.0.0',
          confidence: 0,
          success: true,
          error: null
        }
      };

      // Processing pipeline
      const pipelineTasks = [];

      if (this.config.enableSyntaxAnalysis) {
        pipelineTasks.push(() => {
          results.syntax = this.syntaxAnalysis(text, language);
        });
      }

      if (this.config.enableEntityExtraction) {
        pipelineTasks.push(() => {
          results.entities = this.extractEntities(text, language);
        });
      }

      if (this.config.enableSentimentAnalysis) {
        pipelineTasks.push(() => {
          results.sentiment = this.analyzeSentiment(text, language);
        });
      }

      if (this.config.enableIntentRecognition) {
        pipelineTasks.push(() => {
          results.intent = this.recognizeIntent(text, language);
        });
      }

      if (this.config.enableSemanticAnalysis) {
        pipelineTasks.push(() => {
          results.semantics = this.semanticAnalysis(text, language);
        });
      }

      // Always perform tokenization
      results.tokenization = this.tokenize(text, language);

      // Execute pipeline (parallel or sequential based on config)
      if (this.config.parallelProcessing && pipelineTasks.length > 1) {
        await Promise.all(pipelineTasks.map(task => task()));
      } else {
        for (const task of pipelineTasks) {
          await task();
        }
      }

      // Calculate overall confidence
      const confidenceComponents = [];
      if (results.sentiment) confidenceComponents.push(results.sentiment.confidence);
      if (results.intent) confidenceComponents.push(results.intent.confidence);
      if (results.language) confidenceComponents.push(results.language.confidence);
      
      results.metadata.confidence = confidenceComponents.length > 0 
        ? confidenceComponents.reduce((sum, conf) => sum + conf, 0) / confidenceComponents.length
        : 0.5;

      // Update metrics
      const processingTime = Date.now() - startTime;
      results.processingTime = processingTime;
      
      this.metrics.totalProcessed++;
      this.metrics.averageConfidence = (this.metrics.averageConfidence * (this.metrics.totalProcessed - 1) + results.metadata.confidence) / this.metrics.totalProcessed;
      this.metrics.entitiesExtracted += results.entities.length;
      this.metrics.processingTime += processingTime;

      // Cache result
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, results);
        this.cacheTimestamps.set(cacheKey, Date.now());
      }

      console.log(`✅ Text processed in ${processingTime}ms with confidence ${(results.metadata.confidence * 100).toFixed(1)}%`);
      
      return results;

    } catch (error) {
      console.error('❌ Text processing failed:', error);
      
      return {
        originalText: inputText,
        error: error.message,
        processingTime: Date.now() - startTime,
        metadata: {
          processedAt: new Date().toISOString(),
          success: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Batch process multiple texts
   */
  async processBatch(texts, options = {}) {
    console.log(`🔤 Processing batch of ${texts.length} texts`);
    
    const results = [];
    const batchSize = this.config.maxConcurrent;
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.processText(text, options));
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            error: result.reason.message,
            metadata: {
              success: false,
              error: result.reason.message
            }
          });
        }
      }
    }
    
    console.log(`✅ Batch processing completed: ${results.length}/${texts.length} successful`);
    return results;
  }

  /**
   * Generate natural language response based on analysis
   */
  generateResponse(analysis, context = {}) {
    if (!analysis || !analysis.intent) {
      return {
        text: "I understand you're trying to communicate, but I'm having trouble processing your message.",
        confidence: 0.1,
        suggestions: ["Please try rephrasing your message", "Check your spelling"]
      };
    }

    let response = "";
    const suggestions = [];
    let confidence = analysis.intent.confidence;

    switch (analysis.intent.intent) {
      case 'greeting':
        response = "Hello! I'm here to help you. What can I assist you with today?";
        break;
        
      case 'goodbye':
        response = "Goodbye! Feel free to come back if you need any help.";
        break;
        
      case 'thank':
        response = "You're very welcome! I'm happy I could help.";
        break;
        
      case 'question':
        response = "I understand you're asking a question. ";
        if (analysis.sentiment && analysis.sentiment.sentiment === 'confused') {
          response += "I can sense you might be confused. Let me try to help clarify things.";
          suggestions.push("Try asking more specific questions", "Provide more context");
        } else {
          response += "I'd be happy to help answer that. Could you provide a bit more detail?";
          suggestions.push("Be more specific in your question", "Include relevant context");
        }
        break;
        
      case 'request':
        response = "I'd be happy to help you with that request. ";
        if (analysis.sentiment && analysis.sentiment.sentiment === 'urgent') {
          response += "I can see this is important to you, so I'll prioritize it.";
          suggestions.push("I'll work on this immediately");
        } else {
          response += "Let me see how I can best assist you.";
          suggestions.push("Could you provide more details about what you need?");
        }
        break;
        
      case 'affirmative':
        response = "Great! I'm glad we're on the same page.";
        break;
        
      case 'negative':
        response = "I understand. Let's try a different approach.";
        suggestions.push("Consider alternative solutions", "Break down the problem differently");
        break;
        
      case 'apology':
        response = "No worries at all! Everyone makes mistakes. How can I help you move forward?";
        break;
        
      case 'weather':
        response = "I understand you're asking about the weather. ";
        response += "I don't have real-time weather data, but I can help you find weather information or suggest weather-appropriate activities.";
        suggestions.push("Check a weather app for current conditions", "Ask about specific weather-related topics");
        break;
        
      case 'time':
        response = "I understand you're asking about time. ";
        response += `The current time is ${new Date().toLocaleString()}. How can I help you with time-related matters?`;
        suggestions.push("Ask about scheduling", "Request help with time management");
        break;
        
      default:
        response = "I understand you're communicating with me. ";
        if (analysis.sentiment) {
          if (analysis.sentiment.sentiment === 'positive') {
            response += "I can sense you're feeling positive about our interaction.";
          } else if (analysis.sentiment.sentiment === 'negative') {
            response += "I want to make sure I'm being helpful. Please let me know if there's anything specific I can improve.";
            suggestions.push("Let me know if I'm not meeting your needs", "Suggest how I can be more helpful");
          }
        }
        response += " How can I best assist you?";
        suggestions.push("Be more specific about what you need", "Ask me any question you'd like");
    }

    // Adjust confidence based on sentiment and entities
    if (analysis.sentiment) {
      confidence *= (0.9 + analysis.sentiment.intensity * 0.1);
    }
    
    if (analysis.entities && analysis.entities.length > 0) {
      confidence *= 1.1; // Boost confidence if entities were found
    }

    return {
      text: response,
      confidence: Math.min(confidence, 1.0),
      intent: analysis.intent.intent,
      sentiment: analysis.sentiment?.sentiment || 'neutral',
      entities: analysis.entities || [],
      suggestions: suggestions.length > 0 ? suggestions : ["How can I help you today?", "What would you like to know?"],
      language: analysis.language?.language || 'en',
      processingTime: analysis.processingTime || 0
    };
  }

  /**
   * Get processing statistics
   */
  getStatistics() {
    return {
      ...this.metrics,
      cache: {
        size: this.cache ? this.cache.size : 0,
        enabled: this.config.enableCaching
      },
      patterns: {
        languages: this.patterns.size,
        entities: this.entities.size,
        intents: this.intents.size,
        sentiments: this.sentiments.size
      },
      models: this.models.size,
      uptime: process.uptime(),
      initialized: this.initialized
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 NLP Processor configuration updated');
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down NLP Processor...');
      
      // Clear intervals
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }
      
      if (this.cacheCleanupInterval) {
        clearInterval(this.cacheCleanupInterval);
      }
      
      // Clear cache
      if (this.cache) {
        this.cache.clear();
        this.cacheTimestamps.clear();
      }
      
      // Emit shutdown event
      this.emit('shutdown');
      
      this.initialized = false;
      console.log('✅ NLP Processor shutdown complete');
      
    } catch (error) {
      console.error('❌ NLP Processor shutdown error:', error);
      throw error;
    }
  }
}

module.exports = { NLPProcessor };
