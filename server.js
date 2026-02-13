require('dotenv').config();
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
        methods: ["GET", "POST"]
    }
});

// Log when Socket.io server is ready
console.log('✅ Socket.io server configured');

const PORT = process.env.PORT || 3000;

// Force no-cache headers for ALL responses
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// Serve static files with minimal caching for instant updates
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '0', // No cache - instant updates
    etag: false,
    lastModified: false
}));
app.use(express.json());

// Admin panel routes (both /admin and /admin.html work)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', socketConnections: io.engine.clientsCount });
});

// Game state storage
const games = new Map(); // gameCode -> game data
const players = new Map(); // socketId -> player data
const adminSockets = new Set(); // Set of admin socket IDs

// Helper function to broadcast game updates to all admins
function broadcastToAdmins() {
    const gamesArray = Array.from(games.values()).map(game => ({
        code: game.code,
        mode: game.mode,
        status: game.status,
        players: game.players,
        adminId: game.adminId,
        currentQuestionIndex: game.currentQuestionIndex,
        questions: game.questions
    }));
    
    adminSockets.forEach(adminSocketId => {
        io.to(adminSocketId).emit('admin-games-data', { games: gamesArray });
    });
}

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
        "Who would you rate 10/10 in bed?",
        "Who has the best body?",
        "Who would you want to see naked the most?",
        "Who has better lips?",
        "Who would you want to get handsy with?",
        "Who is secretly the horniest?",
        "Who would you sext?",
        "Who gives the most sexual energy?",
        "Who has fantasized about someone here?",
        "Who would be best in a threesome?",
        "Who has the dirtiest search history?",
        "Who would you spoon with?",
        "Who has done the freakiest thing in bed?",
        "Who would you give a lap dance to?",
        "Who would you want touching you?",
        "Who has the most sex appeal?",
        "Who would you share a bed with?",
        "Who has better eyes?",
        "Who would you get caught making out with?",
        "Who sends nudes more often?",
        "Who would you let kiss your neck?",
        "Who is most likely to be kinky?",
        "Who has the sexiest voice?",
        "Who would you take your clothes off for?",
        "Who would you want to wake up next to?",
        "Who has the best ass?",
        "Who would you cheat with?",
        "Who has hooked up with the most people?",
        "Who would you let undress you?",
        "Who gives the best bedroom eyes?",
        "Who is best at flirting?",
        "Who would you want to dominate you?",
        "Who has sent the dirtiest text?",
        "Who would you make a sex tape with?",
        "Who is most likely to have a friends with benefits?",
        "Who would you want to massage you?",
        "Who has the most game?",
        "Who would you want to bite you?",
        "Who has the most romantic personality?",
        "Who would you go to a love hotel with?",
        "Who is the biggest tease?",
        "Who would you let tie you up?",
        "Who has experimented the most sexually?",
        "Who would you want to get rough with?",
        "Who has the best smile?",
        "Who would you skinny dip with?",
        "Who is most likely to have a sugar daddy/mommy?",
        "Who would you want to pin against a wall?",
        "Who has the most sexual experience?",
        "Who would you want to slow dance with?",
        "Who is most likely to be a player?",
        "Who would you want to grind on?",
        "Who has the dirtiest secrets?",
        "Who would you want to kiss in the rain?",
        "Who is most likely to be into BDSM?",
        "Who would you want to share a shower with?",
        "Who has the best hair?",
        "Who would you want to be your secret hookup?",
        "Who is most likely to have weird kinks?",
        "Who would you want to give you a hickey?",
        "Who has the best legs?",
        "Who would you trust with a secret relationship?",
        "Who is most likely to ghost someone after sex?",
        "Who would you want in your bed right now?",
        "Who has the most confidence in bed?",
        "Who would you want to make out with drunk?",
        "Who is secretly the most experienced?",
        "Who would you want to strip for you?",
        "Who has the best fashion sense?",
        "Who would you sneak away with at a party?",
        "Who is most likely to have a high body count?",
        "Who would you want to touch you under the table?",
        "Who has the most attractive personality?",
        "Who would you want to be stuck in an elevator with?",
        "Who is most likely to cheat on their partner?",
        "Who would you want to whisper dirty things to you?",
        "Who has the best style?",
        "Who would you want to share secrets with in bed?",
        "Who is most likely to have done it in public?",
        "Who would you want to run away with?",
        "Who has the most mysterious vibe?",
        "Who would you want as your sneaky link?",
        "Who is most likely to be into roleplay?",
        "Who would you want to bite your lip?",
        "Who has the prettiest face?",
        "Who would you date secretly?",
        "Who is most likely to have a secret OnlyFans?",
        "Who would you want on top of you?",
        "Who has the best physique?",
        "Who would you want to go to second base with?",
        "Who is most likely to hook up on the first date?",
        "Who would you want to cuddle all night?",
        "Who has the most seductive walk?",
        "Who would you risk it all for?",
        "Who is most likely to be freaky in private?",
        "Who would you want to hold hands with?",
        "Who has the hottest laugh?",
        "Who would you want to kiss goodbye?",
        "Who is most likely to be a freak in the sheets?",
        "Who would you want touching your thigh?",
        "Who has the most intoxicating smell?",
        "Who would you want to spend Valentine's Day with?",
        "Who is most likely to have morning sex?",
        "Who would you want kissing your shoulder?",
        "Who has the sexiest style?",
        "Who would you want to take a romantic trip with?",
        "Who is most likely to send risky pictures?",
        "Who would you want playing with your hair?",
        "Who has the most captivating eyes?",
        "Who would you want to be your summer fling?",
        "Who is most likely to hook up with multiple people in one night?",
        "Who would you want whispering in your ear?",
        "Who has the most magnetic energy?",
        "Who would you want to get caught with?",
        "Who is most likely to have sex in a car?",
        "Who would you want holding you from behind?",
        "Who has the sexiest accent?",
        "Who would you want to share a romantic dinner with?",
        "Who is most likely to try something adventurous in bed?",
        "Who would you want to dance sensually with?",
        "Who has the most tempting lips?",
        "Who would you want to fall asleep on?",
        "Who is most likely to be loud in bed?",
        "Who would you want running their fingers through your hair?",
        "Who has the most attractive laugh?",
        "Who would you want to stare into your eyes?",
        "Who is most likely to hook up with an ex?",
        "Who would you want to kiss your forehead?",
        "Who has the most alluring personality?",
        "Who would you want to take care of you when sick?",
        "Who is most likely to use someone for sex?",
        "Who would you want to surprise with lingerie?",
        "Who has the sexiest confidence?",
        "Who would you want to slow kiss?",
        "Who is most likely to be into choking?",
        "Who would you want holding your waist?",
        "Who has the best vibe?",
        "Who would you want to wake you up with kisses?",
        "Who is most likely to have a sex playlist?",
        "Who would you want to pull you closer?",
        "Who has the most kissable neck?",
        "Who would you want to spend a rainy day in bed with?",
        "Who is most likely to send a risky DM?",
        "Who would you want to trace your body?",
        "Who has the most enchanting presence?",
        "Who would you want to look at you like that?",
        "Who is most likely to be everyone's crush?",
        "Who would you want to hold you tight?",
        "Who has the most dangerous smile?",
        "Who would you want to get lost with?",
        "Who is most likely to have a sugar baby?",
        "Who would you want to breathe on your neck?",
        "Who has the most hypnotic eyes?",
        "Who would you want to confess feelings to?",
        "Who is most likely to sneak someone in?",
        "Who would you want to pin you down?",
        "Who has the sexiest energy?",
        "Who would you want to be stuck on a deserted island with?",
        "Who is most likely to join the mile high club?",
        "Who would you want to kiss you against a wall?",
        "Who has the most irresistible charm?",
        "Who would you want to spend forever with?",
        "Who is most likely to make you jealous on purpose?",
        "Who would you want to trace your lips?",
        "Who has the most attractive aura?"
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
        "Who would do the dumbest dare?",
        "Who would black out first?",
        "Who would break something expensive?",
        "Who would get their phone stolen?",
        "Who would leave with someone they just met?",
        "Who would start dancing on strangers?",
        "Who would get in a fight over nothing?",
        "Who would drunk text their ex?",
        "Who would lose their friends at the party?",
        "Who would hook up with their friend's crush?",
        "Who would get too drunk too fast?",
        "Who would start spilling everyone's secrets?",
        "Who would get kicked out of an Uber?",
        "Who would end up on someone's story doing something dumb?",
        "Who would get arrested for being too rowdy?",
        "Who would puke in someone's car?",
        "Who would forget where they parked?",
        "Who would fight a bouncer?",
        "Who would hook up in a public place?",
        "Who would sneak into the VIP section?",
        "Who would get caught cheating tonight?",
        "Who would bring drugs to the party?",
        "Who would hook up with two people in one night?",
        "Who would get ditched by their friends?",
        "Who would cry over their ex at the party?",
        "Who would start a food fight?",
        "Who would get banned from the venue?",
        "Who would steal someone's drink?",
        "Who would accidentally like their ex's post while stalking?",
        "Who would get in a screaming match?",
        "Who would break up with someone at the party?",
        "Who would hook up in the host's bed?",
        "Who would get too handsy with strangers?",
        "Who would get their fake ID rejected?",
        "Who would drunk dial someone they shouldn't?",
        "Who would start a dance battle?",
        "Who would get jealous and cause a scene?",
        "Who would throw up on someone?",
        "Who would get into a car with a stranger?",
        "Who would post something they'll regret tomorrow?",
        "Who would hook up with the host?",
        "Who would get in a fight with their significant other?",
        "Who would wake up in a random place?",
        "Who would get slapped tonight?",
        "Who would try to fight everyone?",
        "Who would get kicked out for being too loud?",
        "Who would cheat on their partner tonight?",
        "Who would lose their wallet?",
        "Who would get too clingy when drunk?",
        "Who would hook up with their ex tonight?",
        "Who would start an argument about politics?",
        "Who would break up a couple?",
        "Who would get recorded doing something embarrassing?",
        "Who would fall asleep in a random spot?",
        "Who would get into drama with their ex?",
        "Who would flirt with everyone?",
        "Who would kiss someone for a dare?",
        "Who would get thrown out by security?",
        "Who would steal the AUX cord?",
        "Who would get in a physical fight?",
        "Who would confess their feelings drunk?",
        "Who would be the drunkest person there?",
        "Who would get exposed for lying?",
        "Who would hook up and regret it tomorrow?",
        "Who would get lost going home?",
        "Who would wake up somewhere they don't recognize?",
        "Who would get in trouble with the cops?",
        "Who would ruin someone's relationship?",
        "Who would start crying for no reason?",
        "Who would get too drunk to stand?",
        "Who would hook up with someone ugly?",
        "Who would get kicked out of the group?",
        "Who would talk trash about everyone?",
        "Who would end up in a stranger's bed?",
        "Who would cause a breakup tonight?",
        "Who would get in a fight over someone?",
        "Who would leak someone's secret?",
        "Who would fall down the stairs?",
        "Who would get ghosted after tonight?",
        "Who would wake up with regrets?",
        "Who would hook up with someone's sibling?",
        "Who would start beef with strangers?",
        "Who would get played tonight?",
        "Who would break someone's heart tonight?",
        "Who would get too emotional?",
        "Who would hook up with the ugliest person?",
        "Who would get exposed on social media?",
        "Who would steal someone's vape?",
        "Who would get into it with the host?",
        "Who would get ditched by their date?",
        "Who would be the messiest drunk?",
        "Who would hook up with multiple people's exes?",
        "Who would start a fight over nothing?",
        "Who would get blocked after tonight?",
        "Who would wake up next to someone random?",
        "Who would lose their shoes?",
        "Who would get rejected the most?",
        "Who would hook up with someone inappropriate?",
        "Who would spread the most gossip?",
        "Who would get called out publicly?",
        "Who would puke in public?",
        "Who would hook up with a friend's ex?",
        "Who would start a fight with a stranger?",
        "Who would get kicked out for fighting?",
        "Who would ruin the vibe?",
        "Who would hook up with someone they hate?",
        "Who would get exposed for cheating?",
        "Who would break something and not tell anyone?",
        "Who would get too drunk to go home?",
        "Who would hook up in a car?",
        "Who would start problems with everyone?",
        "Who would wake up and not remember anything?",
        "Who would get their ass beat tonight?",
        "Who would hook up with the last person you'd expect?",
        "Who would start a riot?",
        "Who would get exposed for their secrets?",
        "Who would fall and hurt themselves?",
        "Who would hook up with someone way older?",
        "Who would get into the most trouble?",
        "Who would be everyone's problem tonight?",
        "Who would hook up and ghost immediately?",
        "Who would start a fight over jealousy?",
        "Who would get caught doing something sketchy?",
        "Who would ruin their reputation tonight?",
        "Who would hook up with someone way younger?",
        "Who would get kicked out and try to sneak back in?",
        "Who would cause absolute chaos?",
        "Who would hook up with someone in a relationship?",
        "Who would get called out for being fake?",
        "Who would make the biggest fool of themselves?",
        "Who would hook up and cry after?",
        "Who would start the most beef?",
        "Who would get exposed for talking behind backs?",
        "Who would wake up with the worst hangover?",
        "Who would hook up with someone they just dissed?",
        "Who would get embarrassed in front of everyone?",
        "Who would be the reason the party gets shut down?",
        "Who would hook up with their friend's sibling?",
        "Who would get into the wildest situation?",
        "Who would be the topic of conversation tomorrow?",
        "Who would hook up and regret it the most?",
        "Who would start drama that lasts for weeks?",
        "Who would get exposed for their lies?",
        "Who would be the party's biggest mistake?",
        "Who would hook up with someone they swore they wouldn't?",
        "Who would get kicked out and not care?",
        "Who would cause the most damage tonight?",
        "Who would hook up with the most unexpected person?",
        "Who would get into a situation they can't get out of?",
        "Who would be everyone's entertainment tonight?",
        "Who would hook up and ghost the next day?",
        "Who would cause permanent drama?",
        "Who would get exposed for something shocking?",
        "Who would be the reason someone cries tonight?",
        "Who would hook up and ruin a friendship?",
        "Who would make tonight unforgettable for the wrong reasons?"
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
        "Who would cry watching a kids movie?",
        "Who snores louder?",
        "Who would fall asleep in class?",
        "Who would walk into a glass door?",
        "Who has a worse sleep schedule?",
        "Who would forget where they parked?",
        "Who takes longer to get ready?",
        "Who would accidentally reveal a surprise?",
        "Who would walk out with toilet paper on their shoe?",
        "Who is more clumsy?",
        "Who would get scared by their own reflection?",
        "Who talks more in their sleep?",
        "Who would accidentally send a voice note?",
        "Who has more unread messages?",
        "Who would trip on flat ground?",
        "Who would lock themselves out more often?",
        "Who has more screenshots on their phone?",
        "Who would walk into the wrong bathroom?",
        "Who has worse handwriting?",
        "Who would drop their phone in the toilet?",
        "Who procrastinates more?",
        "Who would forget someone's name right after meeting?",
        "Who has more embarrassing childhood photos?",
        "Who would laugh at the wrong time?",
        "Who has worse pickup lines?",
        "Who would accidentally call someone while talking about them?",
        "Who is more superstitious?",
        "Who has more clothes on their floor?",
        "Who would get lost using GPS?",
        "Who is louder when they're excited?",
        "Who would forget what they were saying mid-sentence?",
        "Who has more random apps on their phone?",
        "Who would walk the wrong way?",
        "Who complains more about being tired?",
        "Who has worse morning breath?",
        "Who would trip going up stairs?",
        "Who is more awkward in photos?",
        "Who would accidentally mute themselves on a call?",
        "Who has more tabs open on their phone?",
        "Who would wave back at someone waving behind them?",
        "Who is worse at keeping secrets?",
        "Who would laugh at their own pain?",
        "Who has more random notes on their phone?",
        "Who would walk into a pole?",
        "Who sleeps through their alarm more?",
        "Who is messier when eating?",
        "Who would accidentally turn on their camera?",
        "Who has worse memory?",
        "Who would trip on their own feet?",
        "Who talks louder on the phone?",
        "Who has more unfinished projects?",
        "Who would accidentally post on their story?",
        "Who is more paranoid about weird things?",
        "Who would forget to mute on a video call?",
        "Who has more screenshots of conversations?",
        "Who would get startled easier?",
        "Who is more dramatic when sick?",
        "Who would walk out with their shirt inside out?",
        "Who has worse posture?",
        "Who would forget to bring their wallet?",
        "Who is louder when they sneeze?",
        "Who has more photos of themselves?",
        "Who would accidentally reply to the wrong chat?",
        "Who is more competitive about silly things?",
        "Who would walk into the wrong car?",
        "Who has worse table manners?",
        "Who would forget to charge their phone?",
        "Who is more likely to overshare?",
        "Who would fall off a chair?",
        "Who has more unopened emails?",
        "Who would accidentally FaceTime someone?",
        "Who is worse at lying?",
        "Who would spill something on themselves?",
        "Who has more random contacts saved?",
        "Who would walk into someone by accident?",
        "Who is louder when they laugh?",
        "Who would forget important dates?",
        "Who has worse coordination?",
        "Who would accidentally send a screenshot to the person?",
        "Who is more likely to get hangry?",
        "Who would walk out with their fly down?",
        "Who has more voice memos?",
        "Who would trip over their own bag?",
        "Who is more afraid of bugs?",
        "Who would accidentally unmatch someone?",
        "Who has worse rhythm?",
        "Who would walk into a spider web?",
        "Who is more likely to talk with their mouth full?",
        "Who would drop their phone more?",
        "Who has more alarms set?",
        "Who would forget they already told a story?",
        "Who is worse at directions?",
        "Who would sit on their glasses?",
        "Who has more draft messages?",
        "Who would accidentally skip someone's message?",
        "Who is more likely to burn food?",
        "Who would get their words mixed up?",
        "Who has worse parking skills?",
        "Who would forget what day it is?",
        "Who is more likely to get lost in a mall?",
        "Who would accidentally turn off their alarm?",
        "Who has more blurry photos?",
        "Who would trip getting out of bed?",
        "Who is worse at keeping plants alive?",
        "Who would accidentally leave someone on read?",
        "Who has more unfinished to-do lists?",
        "Who would forget to lock the door?",
        "Who is more likely to talk to animals?",
        "Who would walk out with mismatched socks?",
        "Who has worse taste in music?",
        "Who would accidentally delete something important?",
        "Who is more likely to lose their keys?",
        "Who would trip over their shoelaces?",
        "Who has more random stuff in their bag?",
        "Who would forget they have food in the oven?",
        "Who is worse at parallel parking?",
        "Who would accidentally send a risky text to the wrong person?",
        "Who has more unorganized folders?",
        "Who would fall asleep during a movie?",
        "Who is more likely to wear something backwards?",
        "Who would accidentally block someone?",
        "Who has worse timing for everything?",
        "Who would trip in front of their crush?",
        "Who is more likely to forget their password?",
        "Who would walk into furniture?",
        "Who has more random subscriptions they forgot about?",
        "Who would accidentally mute their own story?",
        "Who is worse at telling time?",
        "Who would spill their drink more often?",
        "Who has more old conversations saved?",
        "Who would forget what they went to get?",
        "Who is more likely to hit reply all by mistake?",
        "Who would walk out with food on their face?",
        "Who has worse credit card debt from impulse buys?",
        "Who would trip during an important moment?",
        "Who is more likely to lose their AirPods?",
        "Who would accidentally swipe left on their crush?",
        "Who has more screenshots they'll never use?",
        "Who would forget they're on speaker?",
        "Who is worse at keeping up with trends?",
        "Who would walk into the wrong house?",
        "Who has more expired food in their fridge?",
        "Who would accidentally leave their mic on?",
        "Who is more likely to oversleep?",
        "Who would trip on the treadmill?",
        "Who has worse spending habits?",
        "Who would forget someone is behind them and hit them with a door?",
        "Who is more likely to get catfished?",
        "Who would accidentally post a private story publicly?",
        "Who has more clothes with tags still on?",
        "Who would walk out without their shoes?",
        "Who is worse at small talk?",
        "Who would trip getting into a car?",
        "Who has more embarrassing Google searches?",
        "Who would forget they left the faucet running?",
        "Who is more likely to laugh at inappropriate times?",
        "Who would accidentally call someone while their phone is in their pocket?",
        "Who has more random bookmarks saved?"
    ],
    family: [
        // Silly/Fun Questions (60)
        "Who would survive longest on a deserted island?",
        "Who tells the funniest jokes?",
        "Who would win in a dance battle?",
        "Who's more likely to become famous?",
        "Who would make a better superhero?",
        "Who's the better singer?",
        "Who would win in a staring contest?",
        "Who's more likely to win a game show?",
        "Who has the best laugh?",
        "Who would be the best comedian?",
        "Who's more likely to go viral on social media?",
        "Who would win at hide and seek?",
        "Who's better at making people smile?",
        "Who would be funnier in a sitcom?",
        "Who's more likely to pull off a magic trick?",
        "Who would win at karaoke?",
        "Who's the better dancer?",
        "Who would win in a video game tournament?",
        "Who's more likely to win a talent show?",
        "Who has better dance moves?",
        "Who would be better at stand-up comedy?",
        "Who's more likely to become a YouTube star?",
        "Who would win at charades?",
        "Who's better at telling stories?",
        "Who would make a better cartoon character?",
        "Who's more likely to win at trivia night?",
        "Who has the best sense of humor?",
        "Who would be better in a musical?",
        "Who's more likely to make everyone laugh?",
        "Who would win a lip sync battle?",
        "Who's better at impressions?",
        "Who would be more fun at a party?",
        "Who's more likely to win a costume contest?",
        "Who has the cooler nickname?",
        "Who would be better at voice acting?",
        "Who's more likely to start a TikTok trend?",
        "Who would win at board games?",
        "Who's better at making funny faces?",
        "Who would be a better circus performer?",
        "Who's more likely to become a meme?",
        "Who has better jokes?",
        "Who would win at arm wrestling?",
        "Who's more likely to win American Idol?",
        "Who would be better in a comedy movie?",
        "Who's got better dance energy?",
        "Who would win at dodgeball?",
        "Who's more likely to go on a game show?",
        "Who has the better smile?",
        "Who would be better at pranks?",
        "Who's more likely to win at mini golf?",
        "Who would be the class clown?",
        "Who's better at beatboxing?",
        "Who would win at rock-paper-scissors?",
        "Who's more likely to become a rapper?",
        "Who has the better victory dance?",
        "Who would be better at improv comedy?",
        "Who's more likely to win The Amazing Race?",
        "Who has the funnier laugh?",
        "Who would win at air hockey?",
        "Who's more likely to become a game streamer?",
        
        // Skills/Talents Questions (50)
        "Who's a better cook?",
        "Who's smarter?",
        "Who's more athletic?",
        "Who's better at video games?",
        "Who's more artistic?",
        "Who's better at math?",
        "Who's a better driver?",
        "Who's more tech-savvy?",
        "Who's better at sports?",
        "Who's a better musician?",
        "Who's better at drawing?",
        "Who has better handwriting?",
        "Who's better at baking?",
        "Who's more organized?",
        "Who's better at solving puzzles?",
        "Who's stronger?",
        "Who's faster?",
        "Who's better at building things?",
        "Who's a better photographer?",
        "Who's better at singing?",
        "Who has better fashion sense?",
        "Who's better at DIY projects?",
        "Who's a better writer?",
        "Who's better at gardening?",
        "Who's more creative with ideas?",
        "Who's better at memorizing things?",
        "Who's more handy around the house?",
        "Who's better at chess?",
        "Who's a better negotiator?",
        "Who's better at parallel parking?",
        "Who's more resourceful?",
        "Who's better at public speaking?",
        "Who has better music taste?",
        "Who's better at crafts?",
        "Who's more graceful?",
        "Who has better rhythm?",
        "Who's better at coding?",
        "Who's better at spelling?",
        "Who's more talented overall?",
        "Who's better at multitasking?",
        "Who's better at card games?",
        "Who has better coordination?",
        "Who's better at problem-solving?",
        "Who's more skilled with tools?",
        "Who's better at languages?",
        "Who has better memory?",
        "Who's better at planning?",
        "Who's more flexible?",
        "Who has better reflexes?",
        "Who's better at strategy games?",
        
        // Personality Questions (50)
        "Who's the better listener?",
        "Who's more creative?",
        "Who's more adventurous?",
        "Who gives the best advice?",
        "Who's the biggest foodie?",
        "Who's more outgoing?",
        "Who's more patient?",
        "Who's more optimistic?",
        "Who's more determined?",
        "Who's more generous?",
        "Who's more confident?",
        "Who's more ambitious?",
        "Who's more reliable?",
        "Who's more spontaneous?",
        "Who's more caring?",
        "Who's more responsible?",
        "Who's a better leader?",
        "Who's more curious?",
        "Who's more humble?",
        "Who's more loyal?",
        "Who's more honest?",
        "Who's more independent?",
        "Who's more thoughtful?",
        "Who's more forgiving?",
        "Who's more courageous?",
        "Who's more energetic?",
        "Who's calmer under pressure?",
        "Who's more polite?",
        "Who's more respectful?",
        "Who's more positive?",
        "Who's friendlier?",
        "Who's more open-minded?",
        "Who's more adaptable?",
        "Who's wiser?",
        "Who's more motivated?",
        "Who's more disciplined?",
        "Who's more passionate?",
        "Who's more empathetic?",
        "Who's more mature?",
        "Who's more chill?",
        "Who's more understanding?",
        "Who's more authentic?",
        "Who's more cheerful?",
        "Who's more focused?",
        "Who's more practical?",
        "Who has better vibes?",
        "Who's more supportive?",
        "Who's more mindful?",
        "Who's more sincere?",
        "Who's more balanced?",
        
        // Future/Hypothetical Questions (40)
        "Who would make a better teacher?",
        "Who would be a better president?",
        "Who would survive a zombie apocalypse?",
        "Who would win a talent show?",
        "Who's most likely to become a millionaire?",
        "Who would be a better doctor?",
        "Who would make a better detective?",
        "Who would be a better chef?",
        "Who's most likely to travel the world?",
        "Who would be a better parent?",
        "Who's most likely to write a book?",
        "Who would be a better astronaut?",
        "Who's most likely to start a business?",
        "Who would be a better actor?",
        "Who's most likely to win the lottery?",
        "Who would be a better scientist?",
        "Who's most likely to become an inventor?",
        "Who would be a better lawyer?",
        "Who's most likely to save the world?",
        "Who would be a better athlete?",
        "Who's most likely to discover something new?",
        "Who would be a better architect?",
        "Who's most likely to become a professor?",
        "Who would be a better veterinarian?",
        "Who's most likely to climb Mount Everest?",
        "Who would be a better engineer?",
        "Who's most likely to win an Oscar?",
        "Who would be a better pilot?",
        "Who's most likely to become a politician?",
        "Who would be a better artist?",
        "Who's most likely to break a world record?",
        "Who would be a better coach?",
        "Who's most likely to live to 100?",
        "Who would be a better therapist?",
        "Who's most likely to run a marathon?",
        "Who would be a better designer?",
        "Who's most likely to adopt all the pets?",
        "Who would be a better firefighter?",
        "Who's most likely to move to another country?",
        "Who would make the world a better place?"
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

// Get random 20 questions from a mode (80% anonymous, 20% public)
function getRandomQuestions(mode) {
    const questions = questionBanks[mode] || [];
    const shuffled = shuffleArray(questions).slice(0, Math.min(20, questions.length));
    
    // Mark questions as public or anonymous
    // 80% anonymous (16 questions), 20% public (4 questions)
    const publicIndices = new Set();
    while (publicIndices.size < 4 && publicIndices.size < shuffled.length) {
        publicIndices.add(Math.floor(Math.random() * shuffled.length));
    }
    
    return shuffled.map((question, index) => ({
        text: question,
        isPublic: publicIndices.has(index)
    }));
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
        
        // Send confirmation back to client
        socket.emit('profile-confirmed', { success: true, socketId: socket.id });
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
        
        // Notify admins
        broadcastToAdmins();
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

        // Clear disconnection flag if player is reconnecting
        if (player.disconnectedAt) {
            delete player.disconnectedAt;
            console.log(`Player ${player.name} reconnected successfully`);
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
            
            // Send full game state including current voting players
            const gameState = {
                ...game,
                currentVotingPlayers: game.currentVotingPlayers || []
            };
            socket.emit('game-joined', { game: gameState });
            io.to(gameCode).emit('player-joined', { player, players: game.players });
            console.log(`Admin ${player.name} rejoined game ${gameCode}`);
            broadcastToAdmins();
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
            
            // Send full game state including current voting players
            const gameState = {
                ...game,
                currentVotingPlayers: game.currentVotingPlayers || []
            };
            socket.emit('game-joined', { game: gameState });
            console.log(`${player.name} rejoined game ${gameCode}`);
            broadcastToAdmins();
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
        
        // Notify admins
        broadcastToAdmins();
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
            
            // Get first question and check if it's public
            const firstQuestion = game.questions[0];
            const isAnonymous = !firstQuestion.isPublic;
            
            // Get two random players for voting
            const shuffled = [...game.players].sort(() => Math.random() - 0.5);
            const player1 = shuffled[0];
            const player2 = shuffled[1];
            
            // Store for admin panel
            game.currentVotingPlayers = [player1, player2];
            
            console.log('Sending players for question 1:');
            console.log('Player 1:', player1);
            console.log('Player 2:', player2);
            
            io.to(gameCode).emit('game-started', {
                mode,
                question: firstQuestion.text,
                questionNumber: 1,
                totalQuestions: game.questions.length,
                isAnonymous,
                players: [player1, player2]
            });
        }

        console.log(`Game ${gameCode} mode set to:`, mode);
        
        // Notify admins
        broadcastToAdmins();
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
            broadcastToAdmins();
            return;
        }

        // Pick random item
        const randomIndex = Math.floor(Math.random() * game.wheelData.length);
        const selectedItem = game.wheelData[randomIndex];
        
        // Remove from pool
        game.wheelData.splice(randomIndex, 1);

        // Calculate exact rotation to land on the selected segment
        // Pointer is at top (0°). Wheel segments: dare (0-180°), gossip (180-360°)
        // To land under pointer, rotate wheel so segment center is at 0°
        const segmentAngles = {
            dare: 270,     // Rotate 270° to bring dare (90° center) to top
            gossip: 90     // Rotate 90° to bring gossip (270° center) to top
        };
        
        const targetAngle = segmentAngles[selectedItem.type];
        const fullRotations = 5; // 5 full spins before landing
        const randomOffset = (Math.random() - 0.5) * 40; // Random variation within segment
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

        console.log(`📊 Vote check for game ${gameCode}: ${votedCount}/${totalPlayers} voted, allVoted=${allVoted}`);

        if (allVoted) {
            console.log(`✅ ALL VOTED! Sending results for game ${gameCode}...`);
            
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

            // Check if this question is public or anonymous
            const currentQuestion = game.questions[currentQ];
            const isAnonymous = !currentQuestion.isPublic;

            console.log(`🎯 Emitting vote-results to game ${gameCode}:`, { voteCounts, isAnonymous });

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
            // Last question finished - check if we should show crush question
            if (game.mode === 'spicy') {
                // Count boys and girls
                const boys = game.players.filter(p => p.gender === 'boy');
                const girls = game.players.filter(p => p.gender === 'girl');

                if (boys.length > 0 && girls.length > 0) {
                    // Mixed genders - show crush question
                    console.log(`Showing crush question for game ${gameCode}`);
                    game.status = 'crush-voting';
                    game.crushVotes = {};

                    // Send crush question to each player with their opposite gender options
                    game.players.forEach(player => {
                        const oppositeGender = player.gender === 'boy' ? 'girl' : 'boy';
                        const options = game.players.filter(p => p.gender === oppositeGender);

                        io.to(player.id).emit('show-crush-question', { options });
                    });
                    return;
                }
            }

            // No crush question - go straight to finished
            game.status = 'finished';
            io.to(gameCode).emit('game-finished');
            broadcastToAdmins();
            return;
        }

        // Get current question and check if it's public
        const currentQuestion = game.questions[game.currentQuestionIndex];
        const isAnonymous = !currentQuestion.isPublic;

        // Get two random players for voting
        const shuffled = [...game.players].sort(() => Math.random() - 0.5);
        const player1 = shuffled[0];
        const player2 = shuffled[1];

        // Store for admin panel
        game.currentVotingPlayers = [player1, player2];

        console.log(`Sending players for question ${game.currentQuestionIndex + 1}:`);
        console.log('Player 1:', player1);
        console.log('Player 2:', player2);

        io.to(gameCode).emit('next-question', {
            question: currentQuestion.text,
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

        // Store anonymously (never reveal these votes)
        if (!game.crushVotes) game.crushVotes = {};
        game.crushVotes[socket.id] = crushId;

        console.log(`Player submitted crush vote. Total: ${Object.keys(game.crushVotes).length}/${game.players.length}`);

        // Check if everyone voted
        const allVoted = game.players.every(p => game.crushVotes[p.id] !== undefined);

        if (allVoted) {
            console.log(`All players voted on crush question for game ${gameCode}`);
            game.status = 'finished';
            io.to(gameCode).emit('game-finished');
            broadcastToAdmins();
        }
    });

    // Play again with same party
    socket.on('play-again', ({ gameCode }) => {
        const game = games.get(gameCode);
        
        if (!game || game.adminId !== socket.id) {
            socket.emit('error', 'Only admin can restart the game');
            return;
        }

        console.log(`Game ${gameCode} restarting - returning to lobby`);

        // Reset game state
        game.mode = null;
        game.status = 'lobby';
        game.currentQuestionIndex = 0;
        game.questions = [];
        game.votes = {};
        game.crushVotes = {};
        game.wheelSubmissions = {};
        game.wheelData = [];

        // Send everyone back to lobby
        io.to(gameCode).emit('return-to-lobby');
    });

    // Admin: Authenticate and get all games
    socket.on('admin-auth', (data) => {
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wasishah98';
        
        if (data.password === ADMIN_PASSWORD) {
            console.log('✅ Admin authenticated:', socket.id);
            
            // Add to admin sockets set
            adminSockets.add(socket.id);
            
            // Send all games data
            const gamesArray = Array.from(games.values()).map(game => ({
                code: game.code,
                mode: game.mode,
                status: game.status,
                players: game.players,
                adminId: game.adminId,
                currentQuestionIndex: game.currentQuestionIndex,
                questions: game.questions
            }));
            
            socket.emit('admin-games-data', { games: gamesArray });
            console.log(`📊 Sent ${gamesArray.length} games to admin`);
        } else {
            console.log('❌ Failed admin auth attempt:', socket.id);
        }
    });

    // Admin: Get specific game details
    socket.on('admin-get-game-details', (data) => {
        const game = games.get(data.gameCode);
        
        if (!game) {
            socket.emit('error', 'Game not found');
            return;
        }

        // Prepare detailed game data
        const gameDetails = {
            code: game.code,
            mode: game.mode,
            status: game.status,
            players: game.players,
            adminId: game.adminId,
            currentQuestionIndex: game.currentQuestionIndex,
            questions: game.questions,
            votes: game.votes,
            wheelSubmissions: game.wheelSubmissions,
            wheelData: game.wheelData,
            crushVotes: game.crushVotes
        };

        // If currently voting, include the current voting players
        if (game.status === 'playing' && game.currentVotingPlayers) {
            gameDetails.currentVotingPlayers = game.currentVotingPlayers;
        }

        socket.emit('admin-game-details', gameDetails);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        // Remove from admin sockets if applicable
        if (adminSockets.has(socket.id)) {
            adminSockets.delete(socket.id);
            console.log('Admin disconnected:', socket.id);
        }
        
        // Mark player as disconnected but keep their data for reconnection
        const playerData = players.get(socket.id);
        if (playerData) {
            playerData.disconnectedAt = Date.now();
            console.log(`Player ${playerData.name} marked as disconnected`);
        }
        
        // Give players 30 SECONDS to reconnect (phone lock, etc)
        setTimeout(() => {
            const player = players.get(socket.id);
            
            // Only clean up if player never reconnected
            if (player && player.disconnectedAt) {
                console.log(`Cleaning up player ${socket.id} after 30 sec timeout`);
                
                // Remove player from games
                for (const [gameCode, game] of games.entries()) {
                    const playerIndex = game.players.findIndex(p => p.id === socket.id);
                    
                    if (playerIndex !== -1) {
                        game.players.splice(playerIndex, 1);
                        
                        // If admin left, try to find them by profile
                        if (game.adminId === socket.id) {
                            // Keep the game alive, just mark admin as disconnected
                            console.log(`Admin disconnected from game ${gameCode}, keeping game alive`);
                        }
                        
                        io.to(gameCode).emit('player-left', { 
                            playerId: socket.id, 
                            playerName: player.name,
                            players: game.players 
                        });
                        
                        // Only delete game if empty AND it's been 10+ seconds
                        if (game.players.length === 0) {
                            console.log(`Deleting empty game after timeout: ${gameCode}`);
                            games.delete(gameCode);
                        }
                        
                        // Notify admins of changes
                        broadcastToAdmins();
                    }
                }
                
                // Remove from players map
                players.delete(socket.id);
            }
        }, 30000); // 30 SECOND grace period (30000ms)
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🎮 Secret game server running on http://localhost:${PORT}`);
});
