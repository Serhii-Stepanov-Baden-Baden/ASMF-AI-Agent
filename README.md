# ASMF AI Agent
Autonomous Semantic Memory Framework (ASMF) AI Agent - A revolutionary AI system with persistent memory, autonomous learning, and Google Drive cloud integration.

# 🚀 Overview
The ASMF AI Agent represents a breakthrough in artificial intelligence, implementing a unique 3-layer autonomous semantic memory framework. 
This system can learn from user interactions, maintain persistent conversations, and automatically store and process knowledge in the cloud.

# ✨ Key Features
🧠 3-Layer Memory Architecture
Context Layer: Stores current conversation context with importance scoring
Semantic Layer: Manages concepts, relationships, and knowledge structures
Temporal Layer: Maintains conversation history and timeline evolution
# 🎯 Autonomous Learning
File Processing: Automatically processes PDF, TXT, DOCX, MD, CSV files
Knowledge Extraction: Extracts definitions, facts, relationships, and insights
Continuous Improvement: Learns from every interaction and uploaded content
# ☁️ Google Drive Integration
15GB Cloud Storage: Secure cloud-based memory storage
Automatic Backup: Real-time synchronization of all memory layers
Cross-Platform Access: Memory available across all devices and platforms
# 💬 Advanced Conversations
Multiple Personalities: Friendly, Intelligent, and Teacher modes
Context Awareness: Remembers previous conversations and builds on them
Emotional Intelligence: Detects and responds to emotional context
# 🔧 Technical Excellence
RESTful API: 6 main endpoints for comprehensive functionality
Real-time Updates: Live memory status monitoring
Secure Architecture: Service account authentication for Google APIs
Modern Frontend: Dark theme web interface with responsive design
# 🏗️ Architecture
ASMF AI Agent
├── Backend (Node.js/Express)
│   ├── ASMF Engine (3-layer memory)
│   ├── AI Core (Conversation & Training)
│   ├── Google Drive Integration
│   └── RESTful API (6 endpoints)
└── Frontend (Modern Web Interface)
├── Real-time Chat Interface
├── Memory Status Dashboard
├── File Upload System
└── Personality Selector

# 🚀 Quick Start
1. Google Drive API
2. Setup
1. Go to Google Cloud Console
2. Create a new project or select existing one
3. Enable Google Drive API
4. Create Service Account credentials
5. Download credentials.json file
6. Share your target Google Drive folder with the service account email
2. Local Development bash
   
# Clone repository
git clone https://github.com/Serhii-Stepanov-Baden-Baden/ASMF-AI-Agent.git
cd ASMF-AI-Agent

# Install dependencies
cd backend
npm install

# Setup environment
cp .env.example .env

# Edit .env with your configurations
cp config/credentials.example.json config/credentials.json

# Replace with your actual Google credentials

# Start development server
npm run dev
3. Vercel Deployment
1.
Import repository to Vercel
2.
Configure Environment Variables in Vercel dashboard
3.
Deploy automatically - Vercel will detect vercel.json configuration
4.
Your AI agent will be live at the provided Vercel URL

# 📋 API Endpoints
Endpoint	Method	Description
/chat	POST	Main conversation endpoint
/memory/status	GET	Get current memory layer status
/memory/conversations	GET	Retrieve conversation history
/training/upload	POST	Upload files for training
/agent/info	GET	Get agent capabilities and info
/health	GET	System health check

# 📁 Project Structure
ASMF-AI-Agent/
├── README.md                    # This file
├── vercel.json                  # Vercel deployment configuration
├── .gitignore                   # Git ignore rules
├── start.sh / start.bat         # Development startup scripts
├── test-project.js             # Project validation script
├── backend/
│   ├── package.json            # Node.js dependencies
│   ├── app.js                  # Main Express server
│   ├── .env.example            # Environment variables template
│   ├── asmf-engine/
│   │   └── memory-core.js      # 3-layer memory engine
│   ├── ai-core/
│   │   ├── conversation.js     # Conversation engine
│   │   └── training.js         # Learning processor
│   ├── google-drive/
│   │   └── storage.js          # Drive API integration
│   └── config/
│       └── credentials.example.json
├── frontend/
│   ├── index.html              # Web interface
│   ├── styles.css              # Dark theme styling
│   └── script.js               # Frontend functionality
└── Documentation/
├── DEPLOYMENT_GUIDE.md     # Detailed deployment guide
├── QUICK_START.md          # 3-step quick start
├── PROJECT_SUMMARY.md      # Technical achievements
├── GITHUB_UPLOAD.md        # Repository setup guide
└── VERIFICATION.md         # Pre-deployment checklist

# 🔧 Configuration
Environment Variables
Key configuration options in .env:
env

# Server Configuration
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=*

# Google Drive API
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\\n-----END PRIVATE KEY-----\n"

# ASMF Memory Configuration
MEMORY_RETENTION_DAYS=365
CONTEXT_LAYER_LIMIT=1000
SEMANTIC_LAYER_LIMIT=5000
TEMPORAL_LAYER_LIMIT=10000
IMPORTANCE_THRESHOLD=0.7

# AI Agent Settings
DEFAULT_PERSONALITY=friendly
MEMORY_ENABLED=true
MAX_RESPONSE_LENGTH=500

# Training Configuration
MAX_FILE_SIZE_MB=10
TRAINING_BATCH_SIZE=10
LEARNING_THRESHOLD=0.6

# 🎮 Usage Examples
Basic Conversation
javascript
const response = await fetch('/chat', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
message: "Hello! Can you help me with Python programming?",
personality: "intelligent"
})
});
Check Memory Status
javascript
const status = await fetch('/memory/status');
const memoryData = await status.json();
console.log(memoryData);
// Returns: { context: 45, semantic: 1230, temporal: 567 }
Upload Training Files
javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
const response = await fetch('/training/upload', {
method: 'POST',
body: formData
});

# 🎯 Use Cases
Personal AI Assistant: Remember personal details, preferences, and conversation history
Educational Platform: Teacher AI that learns course materials and student interactions
Research Assistant: Process research papers and maintain knowledge base
Customer Support: Personalized support with conversation memory
Content Creation: AI that learns your writing style and preferences

# 🛡️ Security Features
Service Account Authentication: Secure Google Drive access
Environment Variable Protection: No credentials in code
CORS Protection: Configurable origin restrictions
Rate Limiting: API abuse prevention
Input Validation: Secure data processing

# 🌟 Unique Advantages
1. Persistent Memory: Unlike chatbots, this agent remembers everything
2. Autonomous Learning: Learns from every interaction automatically
3. Cloud Integration: 15GB storage with Google Drive
4. Multi-Personality: Adapts communication style to user needs
5. Real-time Processing: Instant learning and memory updates
6. Cross-Platform: Works on any device with web browser
   
# 🚀 Deployment Ready
This project is production-ready with:
Vercel Configuration: One-click deployment
Environment Templates: Easy setup process
Validation Scripts: Pre-deployment checks
Comprehensive Documentation: Step-by-step guides
Error Handling: Robust error management

# 🤝 Contributing
1. Fork the repository
2. Create feature branch (git checkout -b feature/amazing-feature)
3. Commit changes (git commit -m 'Add amazing feature')
4. Push to branch (git push origin feature/amazing-feature)

# Open Pull Request
📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

# 👨‍💻 Author
Serhii Stepanov

Location: Baden-Baden, Germany

Specialty: AI Systems, Semantic Memory, Autonomous Learning
ASMF AI Agent - Revolutionizing AI with Autonomous Semantic Memory 🧠✨

Built with Node.js, Express, Google Drive API, and Modern Web Technologies
