/**
 * Task 4 — Chatbot Knowledge Base
 * Retrieval-based Q&A for a Cloud Services Help Desk use case
 */

const knowledgeBase = [
  // ── Greetings ─────────────────────────────
  {
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'howdy', 'sup', 'what\'s up'],
    response: "Hello! 👋 Welcome to CloudHelp — your AI assistant for cloud services. How can I help you today?",
    category: 'greeting'
  },
  {
    patterns: ['how are you', 'how are you doing', 'how\'s it going'],
    response: "I'm doing great, thanks for asking! I'm here to help you with cloud services questions. What can I assist you with?",
    category: 'greeting'
  },

  // ── Cloud Services ────────────────────────
  {
    patterns: ['what is cloud computing', 'explain cloud computing', 'cloud computing definition', 'what does cloud computing mean'],
    response: "☁️ **Cloud Computing** is the delivery of computing services — including servers, storage, databases, networking, software, analytics, and intelligence — over the Internet (\"the cloud\") to offer faster innovation, flexible resources, and economies of scale. You typically pay only for the services you use, helping you lower operating costs, run your infrastructure more efficiently, and scale as your business needs change.",
    category: 'cloud'
  },
  {
    patterns: ['cloud service models', 'iaas paas saas', 'types of cloud services', 'what are iaas paas saas'],
    response: "There are three main cloud service models:\n\n🔧 **IaaS (Infrastructure as a Service)** — Virtual machines, storage, networking. E.g., AWS EC2, Azure VMs.\n\n🛠️ **PaaS (Platform as a Service)** — Managed platforms for deploying apps. E.g., Heroku, Google App Engine.\n\n📦 **SaaS (Software as a Service)** — Ready-to-use applications. E.g., Gmail, Salesforce, Slack.",
    category: 'cloud'
  },
  {
    patterns: ['cloud providers', 'best cloud providers', 'top cloud platforms', 'aws azure gcp'],
    response: "The top cloud providers are:\n\n🟠 **AWS (Amazon Web Services)** — Largest market share, 200+ services.\n🔵 **Microsoft Azure** — Strong enterprise integration, hybrid cloud leader.\n🟢 **Google Cloud Platform (GCP)** — Excellent AI/ML, data analytics, Kubernetes.\n\nOther notable providers include IBM Cloud, Oracle Cloud, and DigitalOcean.",
    category: 'cloud'
  },
  {
    patterns: ['cloud deployment models', 'public cloud private cloud hybrid', 'types of cloud deployment'],
    response: "Cloud deployment models:\n\n🌐 **Public Cloud** — Shared infrastructure, managed by providers (AWS, Azure, GCP). Cost-effective, scalable.\n\n🏢 **Private Cloud** — Dedicated infrastructure for one organization. More control, better compliance.\n\n🔄 **Hybrid Cloud** — Combination of public and private. Flexibility to run workloads where they fit best.\n\n🤝 **Multi-Cloud** — Using multiple cloud providers to avoid vendor lock-in.",
    category: 'cloud'
  },

  // ── Pricing & Billing ─────────────────────
  {
    patterns: ['cloud pricing', 'how much does cloud cost', 'cloud cost', 'cloud billing', 'pricing model'],
    response: "💰 Cloud pricing typically follows these models:\n\n• **Pay-as-you-go** — Pay only for what you use (most common).\n• **Reserved Instances** — Commit for 1-3 years for significant discounts (up to 75%).\n• **Spot/Preemptible** — Use spare capacity at steep discounts (up to 90% off).\n• **Free Tier** — Most providers offer free usage tiers for new accounts.\n\nTip: Use tools like AWS Cost Explorer, Azure Cost Management, or GCP Billing to monitor spending.",
    category: 'pricing'
  },
  {
    patterns: ['free tier', 'free cloud services', 'cloud for free', 'try cloud free'],
    response: "🆓 Major cloud providers offer free tiers:\n\n• **AWS Free Tier** — 12 months free for 85+ services (750hrs EC2, 5GB S3).\n• **Azure Free Account** — 12 months free services + $200 credit.\n• **GCP Free Tier** — Always-free products + $300 credit for 90 days.\n• **Oracle Cloud** — Generous always-free tier with 2 VMs and 20GB storage.",
    category: 'pricing'
  },

  // ── Security ──────────────────────────────
  {
    patterns: ['cloud security', 'is cloud secure', 'cloud security best practices', 'secure cloud'],
    response: "🔒 Cloud security best practices:\n\n1. **Identity & Access Management (IAM)** — Use least-privilege access, MFA.\n2. **Encryption** — Encrypt data at rest and in transit.\n3. **Network Security** — Use VPCs, firewalls, security groups.\n4. **Monitoring** — Enable logging (CloudTrail, Azure Monitor, Cloud Audit Logs).\n5. **Compliance** — Ensure your setup meets SOC 2, GDPR, HIPAA requirements.\n6. **Backups** — Regular automated backups with disaster recovery plans.",
    category: 'security'
  },
  {
    patterns: ['what is iam', 'identity access management', 'iam explained'],
    response: "🔐 **IAM (Identity and Access Management)** is a framework for managing digital identities and controlling who has access to what resources.\n\nKey concepts:\n• **Users** — Individual identities\n• **Groups** — Collections of users with shared permissions\n• **Roles** — Temporary permissions that can be assumed\n• **Policies** — JSON documents defining permissions\n• **MFA** — Multi-Factor Authentication for extra security",
    category: 'security'
  },

  // ── Databases ─────────────────────────────
  {
    patterns: ['cloud database', 'database services', 'managed database', 'cloud db options'],
    response: "🗄️ Popular managed database services:\n\n**Relational:**\n• AWS RDS / Aurora\n• Azure SQL Database\n• Google Cloud SQL\n\n**NoSQL:**\n• AWS DynamoDB\n• Azure Cosmos DB\n• Google Firestore\n\n**In-Memory:**\n• AWS ElastiCache (Redis/Memcached)\n• Azure Cache for Redis\n\nManaged databases handle backups, patching, and scaling automatically.",
    category: 'database'
  },

  // ── Containers & Kubernetes ───────────────
  {
    patterns: ['what is docker', 'docker explained', 'containers', 'what are containers'],
    response: "🐳 **Docker** is a platform for building, shipping, and running applications in containers.\n\nA **container** packages an application with all its dependencies into a standardized unit. Benefits:\n• ⚡ Lightweight — share OS kernel, start in seconds\n• 📦 Portable — run anywhere (laptop, cloud, datacenter)\n• 🔄 Consistent — same environment in dev, test, and production\n• 🏗️ Scalable — easily scale horizontally",
    category: 'containers'
  },
  {
    patterns: ['what is kubernetes', 'kubernetes explained', 'k8s', 'container orchestration'],
    response: "☸️ **Kubernetes (K8s)** is an open-source container orchestration platform that automates:\n\n• **Deployment** — Roll out changes gradually\n• **Scaling** — Auto-scale based on demand\n• **Self-healing** — Restart failed containers automatically\n• **Load balancing** — Distribute traffic across containers\n• **Service discovery** — Automatically expose containers\n\nManaged K8s: EKS (AWS), AKS (Azure), GKE (Google Cloud).",
    category: 'containers'
  },

  // ── Serverless ────────────────────────────
  {
    patterns: ['what is serverless', 'serverless computing', 'lambda function', 'cloud functions'],
    response: "⚡ **Serverless computing** lets you run code without provisioning or managing servers. You pay only for actual execution time.\n\nPopular services:\n• **AWS Lambda** — up to 1M free requests/month\n• **Azure Functions** — event-driven compute\n• **Google Cloud Functions** — lightweight event-driven functions\n\nBest for: API backends, event processing, scheduled tasks, real-time file processing.",
    category: 'serverless'
  },

  // ── DevOps & CI/CD ────────────────────────
  {
    patterns: ['what is devops', 'devops explained', 'ci cd', 'continuous integration continuous deployment'],
    response: "🔄 **DevOps** is a set of practices combining software development (Dev) and IT operations (Ops) to shorten the development lifecycle.\n\n**CI/CD Pipeline:**\n1. **Continuous Integration** — Automatically build and test code changes.\n2. **Continuous Delivery** — Automatically prepare releases for deployment.\n3. **Continuous Deployment** — Automatically deploy to production.\n\nTools: GitHub Actions, Jenkins, GitLab CI, AWS CodePipeline, Azure DevOps.",
    category: 'devops'
  },

  // ── Storage ───────────────────────────────
  {
    patterns: ['cloud storage', 'object storage', 's3 blob storage', 'file storage cloud'],
    response: "📁 Cloud storage types:\n\n**Object Storage** (most popular):\n• AWS S3 — industry standard, 99.999999999% durability\n• Azure Blob Storage\n• Google Cloud Storage\n\n**Block Storage:**\n• AWS EBS, Azure Managed Disks\n\n**File Storage:**\n• AWS EFS, Azure Files, Google Filestore\n\nUse object storage for files, images, backups. Use block storage for databases. Use file storage for shared filesystems.",
    category: 'storage'
  },

  // ── Networking ────────────────────────────
  {
    patterns: ['cloud networking', 'vpc', 'virtual private cloud', 'cdn', 'content delivery network'],
    response: "🌐 Cloud networking concepts:\n\n• **VPC (Virtual Private Cloud)** — Your own isolated network in the cloud.\n• **Subnets** — Divide your VPC into smaller segments.\n• **Load Balancers** — Distribute traffic across instances.\n• **CDN** — Cache content at edge locations globally (CloudFront, Azure CDN, Cloud CDN).\n• **DNS** — Route 53 (AWS), Azure DNS, Cloud DNS.\n• **VPN/Direct Connect** — Secure connection from on-premises to cloud.",
    category: 'networking'
  },

  // ── Migration ─────────────────────────────
  {
    patterns: ['cloud migration', 'migrate to cloud', 'migration strategy', 'how to move to cloud'],
    response: "🚀 Cloud migration strategies (the 6 R's):\n\n1. **Rehost** (lift and shift) — Move as-is to cloud.\n2. **Replatform** — Minor optimizations for cloud.\n3. **Repurchase** — Switch to SaaS alternative.\n4. **Refactor** — Rewrite for cloud-native architecture.\n5. **Retire** — Decommission unused applications.\n6. **Retain** — Keep on-premises for now.\n\nStart with a thorough assessment and create a migration plan before moving.",
    category: 'migration'
  },

  // ── Help & Features ───────────────────────
  {
    patterns: ['help', 'what can you do', 'features', 'capabilities', 'commands', 'menu'],
    response: "I can help you with:\n\n☁️ **Cloud Computing** — Concepts, service models, providers\n💰 **Pricing** — Cost models, free tiers, optimization\n🔒 **Security** — Best practices, IAM, encryption\n🗄️ **Databases** — Managed database services\n🐳 **Containers** — Docker, Kubernetes\n⚡ **Serverless** — Lambda, Cloud Functions\n🔄 **DevOps** — CI/CD, automation\n📁 **Storage** — S3, Blob Storage, file systems\n🌐 **Networking** — VPC, CDN, load balancing\n🚀 **Migration** — Strategies and best practices\n\nJust ask me anything about cloud services!",
    category: 'help'
  },

  // ── Goodbye ───────────────────────────────
  {
    patterns: ['bye', 'goodbye', 'see you', 'exit', 'quit', 'thanks bye', 'see you later'],
    response: "Goodbye! 👋 Thanks for chatting with CloudHelp. Feel free to come back anytime you have questions about cloud services!",
    category: 'goodbye'
  },
  {
    patterns: ['thank you', 'thanks', 'appreciate it', 'thank you so much', 'thx'],
    response: "You're welcome! 😊 I'm glad I could help. Is there anything else you'd like to know about cloud services?",
    category: 'thanks'
  }
];

module.exports = knowledgeBase;
