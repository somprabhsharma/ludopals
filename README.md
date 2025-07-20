# LudoPals - Real-time Mobile-Friendly Ludo Game

A full-stack, real-time multiplayer Ludo game optimized for mobile devices with private rooms, AI players, and quick play functionality.

## 🎮 Features

- **Real-time Multiplayer**: Play with friends using WebSocket connections
- **Private Rooms**: Create and share room links for 2-4 players
- **AI Players**: Mix human and computer players in any combination
- **Quick Play**: Random matchmaking for instant games
- **Mobile-First**: Responsive design optimized for mobile devices
- **Session Persistence**: Rejoin games using UUID-based sessions
- **Smooth Animations**: Dice rolls, piece movements, and game events
- **No Registration**: Play instantly without creating accounts

## 🛠 Tech Stack

### Frontend
- **React.js** - Modern UI framework with hooks
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Socket.IO Client** - Real-time communication
- **Lucide React** - Beautiful icons

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time WebSocket communication
- **Supabase** - PostgreSQL database
- **Express Rate Limit** - API protection

### Deployment
- **Frontend**: Vercel (free tier)
- **Backend**: Render (free tier)
- **Database**: Supabase (free tier)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Git installed
- Supabase account (free)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ludopals.git
   cd ludopals
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your Supabase credentials
   npm run dev
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   npm start
   ```

4. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## 🎯 Game Rules

### Classic Ludo Rules
- Each player has 4 pieces starting in their home area
- Roll a 6 to move pieces out of home
- Move pieces clockwise around the board
- Cut opponent pieces by landing on them
- Safe tiles protect pieces from being cut
- First player to get all 4 pieces home wins

### Game Modes
- **2-4 Human Players**: Classic multiplayer
- **Human vs AI**: Mix of human and computer players
- **Quick Play**: Random matchmaking (2 or 4 players)

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📱 Mobile Optimization

- Touch-friendly controls
- Responsive design for all screen sizes
- Optimized animations for mobile performance
- PWA capabilities for app-like experience

## 🔒 Security Features

- Rate limiting on critical endpoints
- CORS protection
- Input validation and sanitization
- Secure WebSocket connections
- Environment variable protection

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Render)
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy automatically on push to main branch

### Database (Supabase)
1. Create a new Supabase project
2. Run the provided SQL schema
3. Configure Row Level Security policies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎮 Play Now

Visit [ludopals.vercel.app](https://ludopals.vercel.app) to start playing!

## 📞 Support

For support, email support@ludopals.com or create an issue on GitHub.