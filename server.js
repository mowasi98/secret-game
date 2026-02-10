const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS for production
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['polling', 'websocket'], // Try polling first for Render
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true,
    connectTimeout: 45000
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', socketConnections: io.engine.clientsCount });
});

// Game state storage
const games = new Map(); // gameCode -> game data
const players = new Map(); // socketId -> player data

// Question banks (20+ questions per mode, randomized each game)
const questionBanks = {
    spicy: [
        "Who would you most want to kiss?",
        "Who has the wildest secrets?",
        "Who would you want to be alone with?",
        "Who is more attractive?",
        "Who would you date?",
        "Who has a dirty mind?",
        "Who would you hook up with at a party?",
        "Who is the better kisser?",
        "Who would you want to see without clothes?",
        "Who watches more adult content?",
        "Who would you spend a night with?",
        "Who has slept with more people?",
        "Who would you make out with?",
        "Who is freakier?",
        "Who would you have a one night stand with?",
        "Who sends riskier texts?",
        "Who would you take to a hotel room?",
        "Who has done it in weirder places?",
        "Who would you want to see in lingerie/underwear?",
        "Who is more likely to cheat?",
        "Who would you shower with?",
        "Who gives better hickeys?",
        "Who would you cuddle naked with?",
        "Who watches couples doing it more?",
        "Who would you rate 10/10 in bed?"
    ],
    party: [
        "Who would start a fight at this party?",
        "Who would get kicked out first?",
        "Who would hook up with a stranger tonight?",
        "Who would steal something from this house?",
        "Who would end up crying tonight?",
        "Who would drink the most?",
        "Who would embarrass themselves the worst?",
        "Who would get with someone's ex?",
        "Who would throw up first?",
        "Who would cause the most drama?",
        "Who would wake up not remembering last night?",
        "Who would end up in jail?",
        "Who would fight their best friend?",
        "Who would make out with multiple people?",
        "Who would get roasted the hardest?",
        "Who would start rumors about others?",
        "Who would betray their friend for attention?",
        "Who would hook up in the bathroom?",
        "Who would lie about what happened tonight?",
        "Who would get with someone taken?",
        "Who would start twerking on tables?",
        "Who would get exposed for something tonight?",
        "Who would make the worst decisions?",
        "Who would ruin a relationship tonight?",
        "Who would do the dumbest dare?"
    ],
    cheeky: [
        "Who is more likely to fall in public?",
        "Who takes more selfies?",
        "Who would eat food off the floor?",
        "Who laughs at their own jokes more?",
        "Who spends more time in the bathroom?",
        "Who could survive longer without their phone?",
        "Who is the worse driver?",
        "Who would forget their own birthday?",
        "Who sings louder in the shower?",
        "Who has the messier room?",
        "Who would get lost in their own neighborhood?",
        "Who tells worse jokes?",
        "Who is more often late?",
        "Who would trip over nothing?",
        "Who is more of a drama queen?",
        "Who would lose their phone more?",
        "Who talks to themselves more?",
        "Who has worse dance moves?",
        "Who would text the wrong person?",
        "Who would wave at someone not waving at them?",
        "Who would laugh at a funeral?",
        "Who would accidentally like an old photo while stalking?",
        "Who has worse fashion sense?",
        "Who would send a text to the group chat by mistake?",
        "Who would cry watching a kids movie?"
    ]
};

// Wheel mode prompts
const wheelPrompts = [
    { type: 'dare', prompt: 'Write a dare for someone' },
    { type: 'personal', prompt: 'Ask a personal question about someone' },
    { type: 'gossip', prompt: 'Share some recent gossip' },
    { type: 'secret', prompt: 'What\'s the deepest secret you know about someone?' }
];

// Generate random 6-digit game code
function generateGameCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Get random 20 questions from a mode
function getRandomQuestions(mode) {
    const questions = questionBanks[mode] || [];
    return shuffleArray(questions).slice(0, Math.min(20, questions.length));
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Player sets profile
    socket.on('set-profile', (data) => {
        players.set(socket.id, {
            id: socket.id,
            name: data.name,
            photo: data.photo,
            gender: data.gender
        });
        console.log('Profile set:', data.name);
    });

    // Create game
    socket.on('create-game', () => {
        const gameCode = generateGameCode();
        const creator = players.get(socket.id);
        
        if (!creator) {
            socket.emit('error', 'Please set your profile first');
            return;
        }

        const game = {
            code: gameCode,
            adminId: socket.id,
            adminProfile: creator, // Store admin profile to reassign on rejoin
            players: [creator],
            mode: null,
            status: 'lobby', // lobby, playing, finished
            currentQuestionIndex: 0,
            questions: [],
            votes: {},
            wheelSubmissions: {},
            wheelData: []
        };

        games.set(gameCode, game);
        socket.join(gameCode);
        socket.emit('game-created', { gameCode, game });
        console.log(`Game created: ${gameCode} by ${creator.name}`);
    });

    // Join game
    socket.on('join-game', (data) => {
        const gameCode = data.gameCode || data;  // Support both object and string
        console.log(`Attempting to join game: ${gameCode}`);
        console.log(`Available games:`, Array.from(games.keys()));
        
        const game = games.get(gameCode);
        const player = players.get(socket.id);

        if (!game) {
            console.log(`Game ${gameCode} not found`);
            socket.emit('error', `Game not found. Available games: ${games.size}`);
            return;
        }

        if (!player) {
            socket.emit('error', 'Please set your profile first');
            return;
        }

        // Check if this is the admin rejoining (same name/photo as original admin)
        if (game.adminProfile && 
            game.adminProfile.name === player.name && 
            game.adminProfile.photo === player.photo) {
            // Admin is rejoining with new socket ID
            console.log(`Admin ${player.name} rejoining game ${gameCode}`);
            game.adminId = socket.id;
            
            // Update player in list
            const existingPlayerIndex = game.players.findIndex(p => 
                p.name === player.name && p.photo === player.photo
            );
            
            if (existingPlayerIndex !== -1) {
                game.players[existingPlayerIndex] = player;
            } else {
                game.players.push(player);
            }
            
            socket.join(gameCode);
            socket.emit('game-joined', { game });
            io.to(gameCode).emit('player-joined', { player, players: game.players });
            console.log(`Admin ${player.name} rejoined game ${gameCode}`);
            return;
        }

        // Check if already in game
        if (game.players.some(p => p.name === player.name && p.photo === player.photo)) {
            // Player rejoining
            const existingPlayerIndex = game.players.findIndex(p => 
                p.name === player.name && p.photo === player.photo
            );
            game.players[existingPlayerIndex] = player;
            socket.join(gameCode);
            socket.emit('game-joined', { game });
            console.log(`${player.name} rejoined game ${gameCode}`);
            return;
        }

        if (game.players.length >= 10) {
            socket.emit('error', 'Game is full (max 10 players)');
            return;
        }

        // New player joining
        game.players.push(player);
        socket.join(gameCode);
        
        io.to(gameCode).emit('player-joined', { player, players: game.players });
        socket.emit('game-joined', { game });
        console.log(`${player.name} joined game ${gameCode}`);
    });

    // Select game mode (admin only)
    socket.on('select-mode', ({ gameCode, mode }) => {
        const game = games.get(gameCode);
        
        if (!game) {
            socket.emit('error', 'Game not found');
            return;
        }

        if (game.adminId !== socket.id) {
            socket.emit('error', 'Only admin can select mode');
            return;
        }

        if (game.players.length < 3) {
            socket.emit('error', 'Need at least 3 players');
            return;
        }

        game.mode = mode;

        if (mode === 'wheel') {
            // Wheel mode - send prompts to all players
            game.status = 'wheel-input';
            io.to(gameCode).emit('wheel-input-start', { prompts: wheelPrompts });
        } else {
            // Question modes - get random 20 questions
            game.questions = getRandomQuestions(mode);
            game.status = 'playing';
            game.currentQuestionIndex = 0;
            
            // Determine if first question is anonymous (most are)
            const isAnonymous = Math.random() > 0.25; // 75% anonymous
            
            // Get two random players for voting
            const shuffled = [...game.players].sort(() => Math.random() - 0.5);
            const player1 = shuffled[0];
            const player2 = shuffled[1];
            
            console.log('Sending players for question 1:');
            console.log('Player 1:', player1);
            console.log('Player 2:', player2);
            
            io.to(gameCode).emit('game-started', {
                mode,
                question: game.questions[0],
                questionNumber: 1,
                totalQuestions: game.questions.length,
                isAnonymous,
                players: [player1, player2]
            });
        }

        console.log(`Game ${gameCode} mode set to:`, mode);
    });

    // Submit wheel inputs
    socket.on('submit-wheel-inputs', ({ gameCode, submissions }) => {
        const game = games.get(gameCode);
        
        if (!game) return;

        game.wheelSubmissions[socket.id] = submissions;

        // Check if all players submitted
        const allSubmitted = game.players.every(p => game.wheelSubmissions[p.id]);
        
        // Notify lobby who submitted
        io.to(gameCode).emit('wheel-submission-status', {
            submitted: Object.keys(game.wheelSubmissions).length,
            total: game.players.length
        });

        if (allSubmitted) {
            // Compile all submissions into wheel data
            game.wheelData = [];
            
            for (const [playerId, subs] of Object.entries(game.wheelSubmissions)) {
                game.wheelData.push(...subs);
            }
            
            game.wheelData = shuffleArray(game.wheelData);
            game.status = 'wheel-ready';
            
            io.to(gameCode).emit('wheel-ready');
        }
    });

    // Spin wheel (admin only)
    socket.on('spin-wheel', ({ gameCode }) => {
        const game = games.get(gameCode);
        
        if (!game || game.adminId !== socket.id) return;

        if (game.wheelData.length === 0) {
            io.to(gameCode).emit('game-finished');
            return;
        }

        // Pick random item
        const randomIndex = Math.floor(Math.random() * game.wheelData.length);
        const selectedItem = game.wheelData[randomIndex];
        
        // Remove from pool
        game.wheelData.splice(randomIndex, 1);

        // Calculate exact rotation to land on the selected segment
        // Pointer is at top (0°). Wheel segments: dare (0-90°), personal (90-180°), gossip (180-270°), secret (270-360°)
        // To land under pointer, rotate wheel so segment center is at 0°
        const segmentAngles = {
            dare: 315,     // Rotate 315° to bring dare (45° center) to top
            personal: 225, // Rotate 225° to bring personal (135° center) to top
            gossip: 135,   // Rotate 135° to bring gossip (225° center) to top
            secret: 45     // Rotate 45° to bring secret (315° center) to top
        };
        
        const targetAngle = segmentAngles[selectedItem.type];
        const fullRotations = 5; // 5 full spins before landing
        const randomOffset = (Math.random() - 0.5) * 20; // Small random variation within segment
        const finalRotation = (fullRotations * 360) + targetAngle + randomOffset;

        // Broadcast spin with exact rotation to ALL players
        io.to(gameCode).emit('wheel-spinning', {
            rotation: finalRotation
        });

        // Broadcast result to ALL players
        io.to(gameCode).emit('wheel-result', {
            type: selectedItem.type,
            content: selectedItem.content,
            remaining: game.wheelData.length
        });
    });

    // Reset wheel (admin only)
    socket.on('reset-wheel', ({ gameCode }) => {
        const game = games.get(gameCode);
        
        if (!game || game.adminId !== socket.id) return;

        // Broadcast reset to ALL players
        io.to(gameCode).emit('wheel-reset');
    });

    // Submit vote for yes/no questions
    socket.on('submit-vote', ({ gameCode, vote }) => {
        const game = games.get(gameCode);
        
        if (!game || game.status !== 'playing') return;

        const currentQ = game.currentQuestionIndex;
        
        if (!game.votes[currentQ]) {
            game.votes[currentQ] = {};
        }

        game.votes[currentQ][socket.id] = vote;

        // Send vote progress update to all players
        const votedCount = Object.keys(game.votes[currentQ]).length;
        const totalPlayers = game.players.length;
        io.to(gameCode).emit('vote-progress', {
            voted: votedCount,
            total: totalPlayers
        });

        // Check if all voted
        const allVoted = game.players.every(p => game.votes[currentQ][p.id] !== undefined);

        if (allVoted) {
            // Calculate results
            const votes = game.votes[currentQ];
            const voteCounts = {};
            const voteDetails = {};

            for (const [playerId, votedForId] of Object.entries(votes)) {
                const player = game.players.find(p => p.id === playerId);
                
                if (!voteCounts[votedForId]) {
                    voteCounts[votedForId] = 0;
                    voteDetails[votedForId] = [];
                }
                
                voteCounts[votedForId]++;
                voteDetails[votedForId].push({
                    playerId,
                    playerName: player?.name,
                    playerPhoto: player?.photo
                });
            }

            // Determine if this question is anonymous
            const isAnonymous = (currentQ + 1) % 3 !== 0; // Every 3rd question is NOT anonymous

            io.to(gameCode).emit('vote-results', {
                voteCounts,
                voteDetails: isAnonymous ? {} : voteDetails,
                totalVotes: game.players.length,
                isAnonymous
            });
        }
    });

    // Next question
    socket.on('next-question', ({ gameCode }) => {
        const game = games.get(gameCode);
        
        if (!game || game.adminId !== socket.id) return;

        game.currentQuestionIndex++;

        if (game.currentQuestionIndex >= game.questions.length) {
            game.status = 'finished';
            io.to(gameCode).emit('game-finished');
            return;
        }

        const isAnonymous = (game.currentQuestionIndex + 1) % 3 !== 0;

        // Get two random players for voting
        const shuffled = [...game.players].sort(() => Math.random() - 0.5);
        const player1 = shuffled[0];
        const player2 = shuffled[1];

        console.log(`Sending players for question ${game.currentQuestionIndex + 1}:`);
        console.log('Player 1:', player1);
        console.log('Player 2:', player2);

        io.to(gameCode).emit('next-question', {
            question: game.questions[game.currentQuestionIndex],
            questionNumber: game.currentQuestionIndex + 1,
            totalQuestions: game.questions.length,
            isAnonymous,
            players: [player1, player2]
        });

        // Clear votes for new question
        game.votes[game.currentQuestionIndex] = {};
    });

    // Spicy mode special: Who do you like?
    socket.on('submit-crush', ({ gameCode, crushId }) => {
        const game = games.get(gameCode);
        if (!game) return;

        // Store anonymously
        if (!game.crushVotes) game.crushVotes = {};
        game.crushVotes[socket.id] = crushId;

        socket.emit('crush-submitted');
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        // Don't immediately remove player from games - give them 30 seconds to reconnect
        setTimeout(() => {
            // Check if player reconnected
            if (!players.has(socket.id)) {
                // Remove player from games
                for (const [gameCode, game] of games.entries()) {
                    const playerIndex = game.players.findIndex(p => p.id === socket.id);
                    
                    if (playerIndex !== -1) {
                        const player = game.players[playerIndex];
                        game.players.splice(playerIndex, 1);
                        
                        // If admin left, assign new admin
                        if (game.adminId === socket.id && game.players.length > 0) {
                            game.adminId = game.players[0].id;
                            io.to(gameCode).emit('new-admin', { adminId: game.adminId });
                        }
                        
                        io.to(gameCode).emit('player-left', { playerId: socket.id, players: game.players });
                        
                        // Delete game if empty or if game is older than 1 hour
                        if (game.players.length === 0) {
                            console.log(`Deleting empty game: ${gameCode}`);
                            games.delete(gameCode);
                        }
                    }
                }
            }
        }, 30000); // 30 second grace period
        
        // Always remove from players map on disconnect
        players.delete(socket.id);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🎮 Secret game server running on http://localhost:${PORT}`);
});
