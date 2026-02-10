# 🤫 Secret - Party Game

A beautiful, modern party game with blue-purple gradients, glass morphism effects, and multiple game modes!

## 🎮 Game Features

### Profile Setup
- Photo upload
- Name input
- Gender selection (Boy/Girl)
- Beautiful splash screen with logo

### Game Modes

1. **🎡 Anonymous Wheel**
   - Players submit 4 prompts: Dare, Personal Question, Gossip, Secret
   - Wheel spins to randomly select a category
   - All submissions are 100% anonymous

2. **🌶️ Spicy Mode**
   - 20+ intense Yes/No questions (18+)
   - Mix of anonymous and non-anonymous rounds
   - Special "Who do you like?" question (random appearance)
   - Questions about people in the party

3. **🎉 For Party Mode**
   - 20+ chaos-inducing questions
   - Maximum tension and drama
   - Mix of person-specific and general questions

4. **😜 Cheeky Mode**
   - 20+ lighthearted, fun questions
   - Positive energy vibes
   - Great icebreaker

### Features
- ⭐ Admin system with star badge
- 🎨 Blue-purple gradient theme
- 🔮 Glass morphism buttons
- ✨ Sparkle decorations
- ⭕ Circular player arrangement in lobby
- 🔒 Anonymous voting with polls
- 📊 Results with/without voter identity
- 🎬 Smooth animations and transitions
- 📱 Fully responsive (mobile + desktop)
- 🎯 3-10 players per game
- 🎲 Random 20 questions per match (never same)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd secret-game
npm install
```

### 2. Start the Server

```bash
npm start
```

The game will run on: **http://localhost:3000**

### 3. Play!

1. Open http://localhost:3000 on your phone/computer
2. Set up your profile (photo, name, gender)
3. Create a game or join with a PIN
4. Wait for 3-10 players to join
5. Admin selects game mode
6. Play and have fun! 🎉

## 📱 How to Play

### Creating a Game
1. Click "Create a party"
2. Share your 6-digit game PIN with friends
3. Wait for at least 3 players (max 10)
4. As admin, click "Select Game Mode"
5. Choose your mode and start!

### Joining a Game
1. Click "Join a game"
2. Enter the 6-digit PIN
3. Wait for admin to start

### Anonymous Wheel Mode
1. All players fill 4 prompts (dare, personal, gossip, secret)
2. Wait for everyone to submit
3. Admin spins the wheel
4. Random prompt appears from the selected category
5. Keep spinning until all prompts are used

### Yes/No Modes (Spicy/Party/Cheeky)
1. Question appears about someone in the party
2. Everyone votes YES or NO
3. Results show:
   - **Anonymous**: Just numbers (6 YES, 4 NO)
   - **Non-Anonymous** (every ~3 questions): Shows who voted
4. Admin clicks next question
5. Play through 20 random questions

## 🎨 Design

- **Colors**: Blue (#667eea) → Purple (#764ba2) → Pink (#f093fb)
- **Effects**: Glass morphism, backdrop blur
- **Decorations**: Sparkles ✨
- **Admin Badge**: Star ⭐
- **Animations**: Smooth transitions, bounces, floats

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Real-time**: Socket.io
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Styling**: Modern CSS with gradients, glass morphism

## 📂 Project Structure

```
secret-game/
├── server.js              # Main server with Socket.io
├── package.json           # Dependencies
├── README.md             # This file
└── public/
    ├── index.html        # Profile setup (splash + profile)
    ├── menu.html         # Main menu (create/join)
    ├── lobby.html        # Waiting room + mode selection
    ├── game.html         # All game modes
    └── styles.css        # All styling
```

## 🎯 Game Rules

### Admin Powers
- Only admin can select game mode
- Only admin can spin wheel (Anonymous Wheel mode)
- Only admin can advance to next question (Yes/No modes)
- If admin leaves, first player becomes new admin

### Player Limits
- **Minimum**: 3 players to start
- **Maximum**: 10 players per game

### Question Distribution
- Each game gets 20 random questions from a pool of 25+
- Questions never repeat in the same match
- Every 3rd question in Spicy/Party/Cheeky shows who voted (non-anonymous)

## 📝 Customization

### Add More Questions

Edit `server.js` and add to the question banks:

```javascript
const questionBanks = {
    spicy: [
        "Your new spicy question here...",
        // Add more
    ],
    party: [
        "Your new party question here...",
        // Add more
    ],
    cheeky: [
        "Your new cheeky question here...",
        // Add more
    ]
};
```

### Change Colors

Edit `public/styles.css`:

```css
body {
    background: linear-gradient(135deg, #YOUR_COLOR_1, #YOUR_COLOR_2, #YOUR_COLOR_3);
}
```

## 🌐 Deployment

### Deploy to a Server

1. Upload files to your server
2. Install Node.js
3. Run `npm install`
4. Run `npm start`
5. Access via your server's IP/domain

### Use PM2 (Recommended)

```bash
npm install -g pm2
pm2 start server.js --name secret-game
pm2 save
pm2 startup
```

## 🎉 Have Fun!

Enjoy playing Secret with your friends! Perfect for parties, hangouts, and getting to know each other better (maybe too well 😏).

---

Made with 💜 for amazing parties!
