# 🏠 Roomies: Shared Living, Simplified

Roomies is a modern web application that transforms how roommates manage their shared living spaces. Say goodbye to awkward money conversations, forgotten chores, and miscommunication!

## ✨ What is Roomies?

Roomies is your all-in-one household management platform that helps roommates:
- 💰 **Track shared expenses** with smart splitting options
- 🧹 **Manage chores** with automated rotation schedules
- 💬 **Communicate effectively** through built-in chat
- 📋 **Organize tasks** and household responsibilities
- 🤝 **Settle up easily** with payment tracking

## 🚀 Key Features

### 💸 Smart Expense Management
- Add one-time or recurring expenses (rent, utilities, groceries)
- Flexible splitting: equal, custom amounts, or percentages
- Automatic monthly bill processing
- Real-time balance tracking

### 🔄 Automated Chore System
- Create recurring chores with custom schedules
- Fair rotation between household members
- Swap, delegate, or snooze chores when needed
- Progress tracking and completion history

### 💬 Built-in Communication
- Household chat for important discussions
- Real-time notifications for household activities
- @mentions for direct communication
- House rules documentation

### 🏡 Household Management
- Easy setup with unique join codes
- Multiple household support
- Member roles and permissions
- Activity feed for transparency

### 🤖 AI Assistant
- Get personalized household insights
- Smart suggestions for expense splitting
- Chore schedule optimization
- Quick answers about household data

## 🛠️ Technology Stack

Built with modern, reliable technologies:

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Tailwind CSS with Radix UI components
- **Testing**: Jest & React Testing Library
- **Icons**: Lucide React

## 📋 Prerequisites

Before you begin, ensure you have:
- Node.js 20+ installed
- npm or yarn package manager
- A Supabase account (free tier available)

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd roomies_app
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> 💡 Find these values in your Supabase project dashboard under Settings → API

### 4. Set Up Database

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the database migrations (located in `supabase/migrations/`)
3. Enable Row Level Security (RLS) policies

### 5. Start Development Server
```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` to see your application running!

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Run production server |
| `npm run lint` | Check code quality |
| `npm run test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |

## 📁 Project Structure

```
roomies_app/
├── public/           # Static assets
├── src/
│   ├── app/         # Next.js pages and layouts
│   ├── components/  # Reusable UI components
│   ├── hooks/       # Custom React hooks
│   └── lib/         # Utilities and configurations
│       ├── api/     # Backend API functions
│       └── types/   # TypeScript definitions
├── supabase/        # Database migrations and config
└── tests/           # Test files
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Other Platforms
Roomies can be deployed to any platform that supports Next.js applications:
- Netlify
- AWS Amplify
- Railway
- Self-hosted with Docker

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Write tests for new features
- Follow the existing code style
- Update documentation as needed
- Keep commits atomic and descriptive

## 🐛 Troubleshooting

### Common Issues

**Database connection errors**
- Verify your Supabase URL and anon key
- Check if your Supabase project is active
- Ensure RLS policies are properly configured

**Build failures**
- Clear `.next` folder and rebuild
- Check for TypeScript errors with `npm run lint`
- Ensure all dependencies are installed

**Authentication issues**
- Verify email confirmations are enabled in Supabase
- Check redirect URLs in authentication settings

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 💡 Support

Need help? 
- Check our [FAQ section](#)
- Open an issue on GitHub
- Contact support at support@roomiesapp.com

---

Built with ❤️ by the Roomies team. Making shared living simpler, one household at a time.