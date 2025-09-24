# ChatWE - Real-time Chat Application

A modern real-time chat application with rooms, user authentication, typing indicators, and dark mode.

## Features

- 🔐 User authentication (login/register)
- 💬 Real-time messaging with Socket.IO
- 🏠 Chat rooms with automatic joining
- 👥 User online status and typing indicators
- 🌙 Dark/Light mode toggle (default: dark)
- 📱 Responsive design
- 🎨 Modern purple-violet theme

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Real-time**: Socket.IO
- **Deployment**: Vercel

## Local Development

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd Backend
   npm install
   ```
3. Create `.env` file in Backend folder with:
   ```
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret-key
   NODE_ENV=development
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open `Frontend/index.html` in your browser

## Deploy to Vercel

### Prerequisites
- MongoDB Atlas account (free tier available)
- Vercel account
- Git repository

### Step 1: Setup MongoDB Atlas
1. Create a MongoDB Atlas cluster
2. Get your connection string
3. Add your IP to whitelist (or use 0.0.0.0/0 for all IPs)

### Step 2: Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: GitHub Integration
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Deploy automatically

### Step 3: Environment Variables
In Vercel dashboard, add these environment variables:
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: A secure random string
- `NODE_ENV`: production

### Step 4: Domain Configuration
- Your app will be available at `https://your-app-name.vercel.app`
- Configure custom domain if needed

## Project Structure

```
ChatWE/
├── Backend/
│   ├── server.js           # Main server file
│   ├── package.json        # Backend dependencies
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   └── middleware/        # Custom middleware
├── Frontend/
│   ├── index.html         # Main HTML file
│   ├── script.js          # Frontend JavaScript
│   └── styles.css         # CSS styles
├── vercel.json            # Vercel configuration
├── package.json           # Root package.json
└── .env.example          # Environment variables template
```

## Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 5000)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License