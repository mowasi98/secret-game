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
        "Who would you want to see without clothes?",
        "Who watches more adult content?",
        "Who has slept with more people?",
        "Who is freakier?",
        "Who would you have a one night stand with?",
        "Who has done it in weirder places?",
        "Who would you want to see in lingerie/underwear?",
        "Who would you shower with?",
        "Who would you cuddle naked with?",
        "Who watches couples doing it more?",
        "Who would you rate 10/10 in bed?",
        "Who has the best body?",
        "Who would you want to see naked the most?",
        "Who would you want to get handsy with?",
        "Who is secretly the horniest?",
        "Who would you sext?",
        "Who has fantasized about someone here?",
        "Who would be best in a threesome?",
        "Who has the dirtiest search history?",
        "Who has done the freakiest thing in bed?",
        "Who would you give a lap dance to?",
        "Who would you want touching you?",
        "Who has the most sex appeal?",
        "Who sends nudes more often?",
        "Who is most likely to be kinky?",
        "Who would you take your clothes off for?",
        "Who has the best ass?",
        "Who would you cheat with?",
        "Who has hooked up with the most people?",
        "Who would you let undress you?",
        "Who would you want to dominate you?",
        "Who has sent the dirtiest text?",
        "Who would you make a sex tape with?",
        "Who would you want to bite you?",
        "Who would you let tie you up?",
        "Who has experimented the most sexually?",
        "Who would you want to get rough with?",
        "Who would you skinny dip with?",
        "Who is most likely to have a sugar daddy/mommy?",
        "Who would you want to pin against a wall?",
        "Who has the most sexual experience?",
        "Who would you want to grind on?",
        "Who has the dirtiest secrets?",
        "Who is most likely to be into BDSM?",
        "Who would you want to share a shower with?",
        "Who would you want to be your secret hookup?",
        "Who is most likely to have weird kinks?",
        "Who is most likely to ghost someone after sex?",
        "Who would you want in your bed right now?",
        "Who has the most confidence in bed?",
        "Who is secretly the most experienced?",
        "Who would you want to strip for you?",
        "Who is most likely to have a high body count?",
        "Who would you want to touch you under the table?",
        "Who is most likely to cheat on their partner?",
        "Who would you want to whisper dirty things to you?",
        "Who is most likely to have done it in public?",
        "Who would you want as your sneaky link?",
        "Who is most likely to be into roleplay?",
        "Who is most likely to have a secret OnlyFans?",
        "Who would you want on top of you?",
        "Who would you want to go to second base with?",
        "Who is most likely to hook up on the first date?",
        "Who is most likely to be freaky in private?",
        "Who is most likely to be a freak in the sheets?",
        "Who would you want touching your thigh?",
        "Who is most likely to have morning sex?",
        "Who is most likely to send risky pictures?",
        "Who is most likely to hook up with multiple people in one night?",
        "Who is most likely to have sex in a car?",
        "Who is most likely to try something adventurous in bed?",
        "Who is most likely to be loud in bed?",
        "Who is most likely to hook up with an ex?",
        "Who is most likely to use someone for sex?",
        "Who is most likely to be into choking?",
        "Who is most likely to have a sex playlist?",
        "Who is most likely to send a risky DM?",
        "Who is most likely to have a sugar baby?",
        "Who is most likely to sneak someone in?",
        "Who is most likely to join the mile high club?",
        "Who has the most attractive aura?",
        "Who would you want to make you scream?",
        "Who is most likely to film themselves?",
        "Who would you let leave marks on you?",
        "Who has the dirtiest thoughts right now?",
        "Who would you want to rip your clothes off?",
        "Who is most likely to have a praise kink?",
        "Who would you want to edge you?",
        "Who has fantasized about someone here the most?",
        "Who would you let choke you?",
        "Who is most likely to have a daddy/mommy kink?",
        "Who would you want to call you theirs?",
        "Who has the most freaky fantasies?",
        "Who would you want to spank you?",
        "Who is most likely to be submissive?",
        "Who would you want to dominate in bed?",
        "Who has done the freakiest thing with food?",
        "Who would you want to pull your hair?",
        "Who is most likely to have a foot fetish?",
        "Who would you want to use handcuffs with?",
        "Who has the most kinky side?",
        "Who would you want to make you beg?",
        "Who is most likely to try toys in bed?",
        "Who would you want to bite your neck?",
        "Who has watched the most adult content?",
        "Who would you want to go multiple rounds with?",
        "Who is most likely to be dominant?",
        "Who would you want to tease you?",
        "Who has sent the most explicit pictures?",
        "Who would you want to make you finish?",
        "Who is most likely to hook up in a bathroom?",
        "Who would you want to tie up?",
        "Who has the most experience with toys?",
        "Who would you want to ruin you?",
        "Who is most likely to have a breeding kink?",
        "Who would you want to make you theirs?",
        "Who has the highest body count?",
        "Who would you want to degrade you?",
        "Who is most likely to have mirror sex?",
        "Who would you want to own you?",
        "Who has tried the most positions?",
        "Who would you want to bruise you?",
        "Who is most likely to have a recording fetish?",
        "Who would you let use you?",
        "Who has the most shameless search history?",
        "Who would you want to make you submit?",
        "Who is most likely to have a bratty side?",
        "Who would you want to make you cum?",
        "Who has hooked up in the weirdest place?",
        "Who would you want to control you?",
        "Who is most likely to be into breath play?",
        "Who would you want to claim you?",
        "Who has the most bodies?",
        "Who would you want to worship your body?",
        "Who is most likely to have a public sex fantasy?",
        "Who would you want to make you lose control?",
        "Who has the most explicit DMs?",
        "Who would you want to bend you over?",
        "Who is most likely to be into rough play?",
        "Who would you want to breed you?",
        "Who has been with the most people at once?",
        "Who would you want to fuck?",
        "Who has the wettest pussy?",
        "Who has the biggest dick?",
        "Who would you want to eat you out?",
        "Who would you want to suck off?",
        "Who is most likely to be into anal?",
        "Who would you want to rail you?",
        "Who has given the most head?",
        "Who would you want to ride?",
        "Who is most likely to swallow?",
        "Who would you want to pound you?",
        "Who has fucked the most people?",
        "Who would you want to cream pie?",
        "Who is most likely to do it raw?",
        "Who would you want to squirt on?",
        "Who has the most cum in them?",
        "Who would you want to gag on?",
        "Who is most likely to moan the loudest?",
        "Who would you want to finish inside?",
        "Who has sent the most nudes?",
        "Who would you want to choke on it?",
        "Who is most likely to be into gangbangs?",
        "Who would you want to cum for?",
        "Who has the tightest hole?",
        "Who would you want to destroy?",
        "Who is most likely to have threesomes regularly?",
        "Who would you want to fill up?",
        "Who has masturbated to someone here?",
        "Who would you want on their knees?",
        "Who is most likely to fuck on the first date?",
        "Who would you want to dominate completely?",
        "Who has watched porn of people they know?",
        "Who would you want to make your bitch?",
        "Who is most likely to be a slut?",
        "Who would you want to make you their whore?",
        "Who has the best tits?",
        "Who would you want to nut in?",
        "Who is most likely to cheat with multiple people?",
        "Who would you want to make you gag?",
        "Who has fucked in the craziest place?",
        "Who would you want to make scream your name?",
        "Who is most likely to be into degradation?",
        "Who would you want bouncing on you?",
        "Who has the freakiest fetish?",
        "Who would you want to wreck?",
        "Who is most likely to fuck someone for money?",
        "Who would you want to use as a toy?",
        "Who has done the dirtiest roleplay?",
        "Who would you want to put in their place?",
        "Who is most likely to be into pain?",
        "Who would you want to make beg for it?",
        "Who has the sluttiest body?",
        "Who would you want to punish?",
        "Who is most likely to fuck their friend's partner?",
        "Who would you want to make you their slave?",
        "Who has the nastiest fantasies?",
        "Who would you want to drill?",
        "Who is most likely to send pussy/dick pics?",
        "Who would you want to make you scream daddy/mommy?",
        "Who has been caught fucking?",
        "Who would you want to pound from behind?"
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
        // Flirty/Romantic (15)
        "Who's most likely to slide into someone's DMs?",
        "Who's the biggest flirt here?",
        "Who's most likely to have a secret crush on someone in this room?",
        "Who's most likely to kiss someone tonight?",
        "Who's most likely to have a friends with benefits?",
        "Who's most likely to make the first move?",
        "Who gets butterflies the easiest?",
        "Who's most likely to catch feelings too fast?",
        "Who's most likely to be texting their crush right now?",
        "Who's most likely to have multiple crushes at once?",
        "Who's the smoothest talker?",
        "Who's most likely to date two people at once?",
        "Who's most likely to get caught staring at someone?",
        "Who's most likely to fall in love this year?",
        "Who's most likely to have a secret admirer?",
        
        // Relationship Drama (15)
        "Who's most likely to ghost someone?",
        "Who's most likely to get back with their ex?",
        "Who's most likely to stalk their ex on social media?",
        "Who's most likely to date their friend's ex?",
        "Who's most likely to cheat?",
        "Who's most likely to be in a toxic relationship?",
        "Who's most likely to lead someone on?",
        "Who's most likely to be a player?",
        "Who's most likely to have a secret relationship?",
        "Who's most likely to sleep with their ex 'one last time'?",
        "Who's most likely to cry over an ex?",
        "Who's most likely to be in a situationship?",
        "Who's most likely to get played?",
        "Who's most likely to catch their partner cheating?",
        "Who's most likely to forgive a cheater?",
        
        // Social Media/Online (15)
        "Who posts the most thirst traps?",
        "Who's most likely to delete a post if it doesn't get enough likes?",
        "Who's most likely to buy followers?",
        "Who stalks people the most on Instagram?",
        "Who's most likely to overshare online?",
        "Who's most likely to send risky DMs?",
        "Who's most likely to post drunk stories they'll regret?",
        "Who's most likely to get cancelled?",
        "Who's most likely to catfish someone?",
        "Who's most likely to photoshop their pictures?",
        "Who's most likely to have a finsta?",
        "Who's most likely to screenshot private messages?",
        "Who's most likely to get exposed online?",
        "Who's most likely to block someone out of pettiness?",
        "Who's most likely to post a cryptic story about someone?",
        
        // Party/Night Out (15)
        "Who's the party animal?",
        "Who's most likely to wake up somewhere random?",
        "Who's most likely to black out?",
        "Who's most likely to lose their phone on a night out?",
        "Who's most likely to hook up with a stranger?",
        "Who's most likely to drunk text someone they shouldn't?",
        "Who's most likely to get kicked out of somewhere?",
        "Who becomes a different person when drunk?",
        "Who's most likely to kiss a stranger?",
        "Who's most likely to do something they'll regret?",
        "Who's the messiest drunk?",
        "Who's most likely to pass out first?",
        "Who's most likely to drunk call their ex?",
        "Who's most likely to start dancing on tables?",
        "Who's most likely to get into a fight when drunk?",
        
        // Gossip/Drama (15)
        "Who's most likely to spill a secret?",
        "Who knows everyone's business?",
        "Who's most likely to start drama?",
        "Who's the biggest gossip?",
        "Who can't keep a secret?",
        "Who's most likely to eavesdrop?",
        "Who always knows the tea?",
        "Who's most likely to stir the pot?",
        "Who's most likely to talk behind your back?",
        "Who's most likely to expose someone?",
        "Who's the fakest person here?",
        "Who's most likely to backstab a friend?",
        "Who's most likely to spread rumors?",
        "Who's most likely to be two-faced?",
        "Who's most likely to screenshot and share?",
        
        // Embarrassing/Awkward (10)
        "Who's most likely to trip in public?",
        "Who's most likely to forget someone's name?",
        "Who's most likely to accidentally like an old Instagram post?",
        "Who's most likely to send a text to the wrong person?",
        "Who's most likely to walk into a glass door?",
        "Who's most likely to laugh at the wrong time?",
        "Who's most likely to wave back at someone who wasn't waving at them?",
        "Who's most likely to embarrass themselves on a date?",
        "Who's most likely to have food in their teeth and not notice?",
        "Who's most likely to call someone the wrong name?",
        
        // Wild/Risky (10)
        "Who's most likely to get arrested?",
        "Who's most likely to lie to get out of trouble?",
        "Who's most likely to do something illegal?",
        "Who's most likely to sneak out?",
        "Who's most likely to get caught lying?",
        "Who's most likely to get into trouble?",
        "Who's most likely to break the rules?",
        "Who's most likely to cause a scene?",
        "Who's most likely to get fired?",
        "Who's most likely to fake being sick to skip something?",
        
        // Money/Lifestyle (5)
        "Who's most likely to marry rich?",
        "Who's most likely to be a gold digger?",
        "Who's most likely to flex fake designer?",
        "Who's most likely to scam someone?",
        "Who's most likely to be broke at 30?"
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

        // Check if player was kicked (not in game.players anymore)
        const existingPlayerIndex = game.players.findIndex(p => 
            p.name === player.name && p.photo === player.photo
        );
        
        // If game is active and player is NOT in the list, they were kicked
        if ((game.status === 'playing' || game.status === 'wheel-input' || game.status === 'wheel-ready') && existingPlayerIndex === -1) {
            console.log(`Player ${player.name} was kicked from game ${gameCode}`);
            socket.emit('error', '🚫 You were kicked from the game due to inactivity. Please wait until the current game finishes to rejoin.');
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

        // Store current rotation for reconnecting players
        game.currentWheelRotation = finalRotation;

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
