"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedBlogPosts = seedBlogPosts;
// cyluxserver/src/seeds/blogSeed.ts
const database_1 = require("../database");
const Blog_1 = require("../entities/Blog");
const SEED_POSTS = [
    {
        title: 'How to Talk to Your Child About Online Safety Without Them Tuning Out',
        excerpt: 'Most kids switch off the moment parents bring up "internet rules." Here\'s a conversation framework that actually works — built on curiosity, not fear.',
        content: `<h2>Why the Fear Approach Backfires</h2>
<p>When parents lead with "the internet is dangerous," children often respond with eye-rolls or silence. Psychologists studying adolescent behaviour consistently find that scare tactics increase risk-taking rather than reduce it. The brain wires around novelty and social connection — the exact things the internet provides in abundance.</p>
<h2>Start With Curiosity, Not Rules</h2>
<p>The most effective first conversation isn't about limits — it's about understanding what your child actually does online. Ask open questions: <em>"What's the funniest thing you've seen this week?"</em> or <em>"Which creator do you think is overrated?"</em></p>
<p>This builds the conversational trust that lets you introduce safety topics naturally. When your child knows you're genuinely curious about their digital world, they're far more likely to come to you when something goes wrong.</p>
<h2>The Three-Part Framework</h2>
<ol>
  <li><strong>Share something you found online</strong> — modelling openness normalises discussion</li>
  <li><strong>Ask what they've been into lately</strong> — listen without redirecting to safety</li>
  <li><strong>Raise one scenario naturally</strong> — "I read that some apps let strangers message kids. Have you come across that?"</li>
</ol>
<h2>Repeat, Don't Lecture</h2>
<p>One big conversation is less effective than ten small ones. Make it a rhythm: a question over dinner, a comment during a drive. Safety knowledge compounds the same way reading does — a little, often.</p>`,
        coverImageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=1200&h=630&fit=crop',
        authorName: 'Cylux Team',
        tags: ['parenting', 'online safety', 'communication'],
        isPublished: true,
        readTimeMinutes: 5,
    },
    {
        title: 'The Hidden Risks of "Harmless" Apps: What Every Parent Needs to Know',
        excerpt: 'Temu, Roblox, Discord — apps that seem safe on the surface can expose children to predators, gambling mechanics, and harmful content.',
        content: `<h2>The Innocent-Looking App Problem</h2>
<p>When parents think about unsafe apps, they picture the obvious: adult content platforms, dark-web browsers. The real danger, child safety researchers consistently report, lives in mainstream apps that have legitimate uses alongside hidden risks.</p>
<h2>Roblox: Virtual Worlds, Real Strangers</h2>
<p>With 380 million registered accounts, Roblox is beloved by children aged 7–15. Its social features — private messaging, in-game voice chat, friend requests from strangers — make it a known hunting ground for predators. The platform has improved moderation, but no automated system catches everything.</p>
<p><strong>What to do:</strong> Enable the Restricted Mode in account settings, review friend lists monthly, and ask your child to show you what they're building.</p>
<h2>Discord: The Teenager's Chatroom</h2>
<p>Discord servers are unmoderated by default. While most are benign gaming communities, some expose children to extremist content, explicit material, and adult strangers. The platform's minimum age is 13, but enforcement relies solely on self-reported birthdays.</p>
<h2>Loot Boxes and Gambling Mechanics</h2>
<p>Multiple academic studies have found correlations between loot-box spending in video games and problem gambling behaviours in adolescence. Many popular games — FIFA Ultimate Team, Fortnite's old V-Bucks model — use these mechanics by design.</p>
<h2>How Cylux Helps</h2>
<p>Cylux logs every app installed on your child's device and sends an instant alert to your phone. When a new app appears, you're notified before your child has spent an hour inside it — giving you the opening to have a conversation rather than a confrontation.</p>`,
        coverImageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&h=630&fit=crop',
        authorName: 'Cylux Team',
        tags: ['app safety', 'roblox', 'discord', 'parental controls'],
        isPublished: true,
        readTimeMinutes: 6,
    },
    {
        title: 'Screen Time Science: What the Research Actually Says',
        excerpt: 'Not all screen time is equal. Neuroscience and developmental psychology have nuanced findings — and they might surprise you.',
        content: `<h2>The "One Hour a Day" Rule Is Outdated</h2>
<p>The American Academy of Pediatrics' famous one-hour limit for children aged 2–5, published in 2016, was revised in 2020. Researchers acknowledged it was too blunt: the type of content and the social context of viewing matter far more than the raw number of minutes.</p>
<h2>Passive vs Active Screen Time</h2>
<p>Neuroimaging studies consistently show different brain activation patterns for passive consumption (watching videos) versus active engagement (creating, coding, video-calling a grandparent). Active screen time shows cognitive benefits comparable to other creative play.</p>
<h2>The Displacement Problem</h2>
<p>The most consistent finding in the literature isn't about screens causing harm directly — it's about displacement. Screen time that replaces physical activity, sleep, face-to-face socialisation, and homework correlates with worse outcomes. Screen time that displaces low-quality passive TV doesn't show the same effect.</p>
<h2>Adolescents Are Different</h2>
<p>Teenage brains are uniquely sensitive to social feedback. Instagram likes and TikTok comment threads activate dopamine pathways more intensely in 13–17 year olds than in adults. This doesn't mean banning social media — it means parents need to help teens build emotional skills to process rejection and comparison online.</p>
<h2>A Practical Framework</h2>
<p>Rather than counting minutes, assess the following weekly:</p>
<ul>
  <li>Is your child getting 60+ minutes of physical activity daily?</li>
  <li>Are they sleeping 8–10 hours?</li>
  <li>Do they have regular face-to-face conversations outside screens?</li>
  <li>Are schoolwork and responsibilities being met?</li>
</ul>
<p>If those boxes are ticked, the screen time conversation becomes much less urgent.</p>`,
        coverImageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=630&fit=crop',
        authorName: 'Cylux Team',
        tags: ['screen time', 'research', 'neuroscience', 'parenting'],
        isPublished: true,
        readTimeMinutes: 7,
    },
    {
        title: 'GPS Tracking Your Child: Where to Draw the Ethical Line',
        excerpt: 'Location monitoring is one of the most debated parenting tools. Here\'s how to use it in a way that builds trust rather than resentment.',
        content: `<h2>The Transparency Principle</h2>
<p>Every child safety researcher and child psychologist we spoke to agreed on one thing: covert tracking of a child old enough to understand is almost always counterproductive. It destroys trust when discovered — and it will be discovered.</p>
<p>Transparent tracking is a different matter entirely. When a child knows they're monitored, understands why, and has been part of setting the rules, GPS monitoring becomes a safety net rather than a surveillance mechanism.</p>
<h2>Age-Appropriate Expectations</h2>
<p><strong>Ages 6–10:</strong> Full tracking with simple explanation — "This helps us know you're safe." Most children this age find it reassuring rather than invasive.</p>
<p><strong>Ages 11–13:</strong> Introduce the concept of earned trust. Tracking is default, but good behaviour reduces check-in frequency. Give them the parent app to look at too — mutual visibility changes the dynamic.</p>
<p><strong>Ages 14–17:</strong> Consider a "bubble" model: tracking only activates when your teen is outside defined safe zones (home, school, sports ground). Inside the bubble, they have full privacy.</p>
<h2>Geofencing: The Smarter Approach</h2>
<p>Constant location monitoring creates anxiety for both parent and child. Geofencing — setting virtual boundaries and getting alerted only when they're crossed — offers protection without the feeling of constant surveillance. Your teen isn't "watched" at school; you're simply notified if they leave the school grounds unexpectedly.</p>
<h2>The Conversation to Have</h2>
<p>Before enabling any tracking: "We want to know you're safe, not control your life. Here's what we can see, here's what we can't, and here's how you earn more independence over time." Most teenagers respond well to a clear deal.</p>`,
        coverImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=630&fit=crop',
        authorName: 'Cylux Team',
        tags: ['gps', 'location tracking', 'trust', 'privacy', 'geofencing'],
        isPublished: true,
        readTimeMinutes: 6,
    },
    {
        title: 'YouTube for Kids: A Parent\'s Complete Safety Guide for 2025',
        excerpt: 'YouTube Kids isn\'t as safe as you think, and regular YouTube is wilder than you imagine. Here\'s the full picture — and what you can actually do about it.',
        content: `<h2>YouTube Kids: The Good and the Gaps</h2>
<p>YouTube Kids was launched in 2015 as a filtered alternative for children. It has improved dramatically — but it's not a walled garden. In 2023 alone, researchers documented thousands of inappropriate videos that bypassed filters, often by exploiting popular characters from legitimate shows.</p>
<p>The filters work on metadata (titles, descriptions, channels), not on actual video content. A channel can be approved, then upload something problematic. The lag between upload and removal creates the window.</p>
<h2>The Algorithm Problem</h2>
<p>YouTube's recommendation algorithm optimises for watch time, not wellbeing. For a child who enjoys gaming videos, the next-video autoplay function may travel from age-appropriate content to walkthroughs of violent games within 3–4 clicks — entirely automatically.</p>
<p>Studies of YouTube recommendation paths by the Mozilla Foundation found that autoplay consistently moved viewers toward more extreme content over time, regardless of starting point.</p>
<h2>What Cylux Captures</h2>
<p>Cylux monitors YouTube activity at the system level — capturing every video watched and every search made on your child's device, even in incognito mode. You see a timestamped history in your parent dashboard, so pattern recognition becomes easy.</p>
<h2>Practical Steps Today</h2>
<ol>
  <li>Disable autoplay on all family YouTube accounts</li>
  <li>Enable Supervised Accounts (Google Family Link integration)</li>
  <li>Review watch history weekly — look for patterns, not individual videos</li>
  <li>Use Cylux's YouTube history tab to catch searches that reveal what they're curious about</li>
  <li>Approach concerning content with curiosity: "I saw you watched X — what did you think of it?"</li>
</ol>`,
        coverImageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&h=630&fit=crop',
        authorName: 'Cylux Team',
        tags: ['youtube', 'video safety', 'parental controls', 'content filtering'],
        isPublished: true,
        readTimeMinutes: 7,
    },
    {
        title: 'Cyberbullying in 2025: New Platforms, Same Old Pain',
        excerpt: 'Cyberbullying has evolved far beyond text messages and Facebook comments. Here\'s where it\'s happening now, and how to support a child who\'s experiencing it.',
        content: `<h2>Where It's Happening Now</h2>
<p>The most common venues for cyberbullying in 2025 are no longer major social platforms — those have improved moderation. The action has moved to:</p>
<ul>
  <li><strong>Gaming chat</strong> — in-game voice channels, Discord servers around specific games</li>
  <li><strong>Group chats</strong> — private WhatsApp, Telegram, and iMessage groups where adults have zero visibility</li>
  <li><strong>Anonymous apps</strong> — NGL, Yolo, and similar "anonymous question" apps designed specifically to remove accountability</li>
  <li><strong>Private stories</strong> — Snapchat and Instagram close-friends features that feel safe to post to</li>
</ul>
<h2>The Signs Parents Miss</h2>
<p>Children rarely report cyberbullying directly. Watch for:</p>
<ul>
  <li>Visibly upset after using their phone, then dismissive when asked</li>
  <li>Avoiding social events they previously enjoyed</li>
  <li>Declining grades without an obvious cause</li>
  <li>Sleeping with their phone (anxiety about what's happening while they sleep)</li>
  <li>Sudden switch from one friend group to another</li>
</ul>
<h2>What Not to Do</h2>
<p>The instinct to confiscate the phone is understandable but often makes things worse. Removing the device cuts your child off from their support network — the friends who are still kind — and signals that coming to you about online problems has consequences.</p>
<h2>What Actually Helps</h2>
<p>Research by the Cyberbullying Research Center consistently shows that children who feel they can tell a parent without the device being confiscated are three times more likely to report problems. The goal is to be the safe adult, not the phone police.</p>
<p>Specific actions: document with screenshots, report to the platform, contact the school (most have cyberbullying policies), and consider professional support if the behaviour has been ongoing.</p>`,
        coverImageUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=1200&h=630&fit=crop',
        authorName: 'Cylux Team',
        tags: ['cyberbullying', 'mental health', 'social media', 'support'],
        isPublished: true,
        readTimeMinutes: 8,
    },
    {
        title: 'Setting Up Parental Controls That Actually Work (And That Kids Can\'t Bypass)',
        excerpt: 'Most built-in parental controls have well-known workarounds that any YouTube-savvy 11-year-old knows. Here\'s what works at the OS level.',
        content: `<h2>The Problem With App-Level Controls</h2>
<p>Screen time controls built into apps — YouTube's bedtime reminders, Instagram's usage dashboard — are easily bypassed because they're enforced by the same app the child is trying to use. The child controls the device; the device controls the app; the app controls itself. It's not a serious system.</p>
<h2>Why Built-In OS Controls Aren't Enough Either</h2>
<p>Apple Screen Time and Google Family Link are more robust — they operate at the OS level. But both have well-documented bypass methods:</p>
<ul>
  <li>Factory reset (removes all restrictions)</li>
  <li>Time zone manipulation (resets daily limits)</li>
  <li>Using a second device or a friend's phone</li>
  <li>Browser workarounds for app-blocked content</li>
</ul>
<h2>The Solution: Device Management + Monitoring</h2>
<p>True parental controls require two layers working together:</p>
<p><strong>Layer 1 — Prevention:</strong> Block harmful content at the network/OS level. Cylux uses VPN-based filtering that operates below the app layer — it can't be bypassed by using an incognito browser tab or switching apps.</p>
<p><strong>Layer 2 — Detection:</strong> Monitor activity to catch what slips through. No filter is 100% effective. Activity logging — browsing history, app usage, notifications — gives you visibility without needing to be perfect at prevention.</p>
<h2>The Setup That Works</h2>
<ol>
  <li>Install Cylux on the child's device</li>
  <li>Grant Accessibility Service permission (required for activity monitoring)</li>
  <li>Enable VPN filtering (blocks harmful sites before the browser sees them)</li>
  <li>Set geofences for home, school, and common locations</li>
  <li>Configure daily screen time limits per app category</li>
  <li>Review weekly activity summary in the parent dashboard</li>
</ol>
<p>The combination of OS-level control and visibility-over-time makes bypassing not just difficult, but pointless — there's no hiding even if they technically could.</p>`,
        coverImageUrl: 'https://images.unsplash.com/photo-1555421689-491a97ff2040?w=1200&h=630&fit=crop',
        authorName: 'Cylux Team',
        tags: ['parental controls', 'setup guide', 'screen time', 'vpn filtering'],
        isPublished: true,
        readTimeMinutes: 7,
    },
    {
        title: 'The Digital Reward System: Using Tech Motivation to Build Healthy Habits',
        excerpt: 'Punishment-based screen time management breeds resentment. Reward-based systems build genuine self-regulation — and they\'re more effective.',
        content: `<h2>Why Punishment Doesn't Build Self-Regulation</h2>
<p>When screen time is taken away as punishment, children learn to hide their usage, to race through device time before it's confiscated, and to view technology as an adversarial battleground with parents. They don't learn to regulate themselves.</p>
<p>The goal of any good parenting strategy isn't compliance — it's internalisation. A teenager who manages their own screen time wisely is safer than one who's externally restricted until they leave home.</p>
<h2>The Cylux Reward System</h2>
<p>Cylux includes a built-in reward mechanism that lets parents grant bonus screen time for good behaviour, completed chores, or homework finished early. The child sees pending reward minutes on their home screen — a visible, real-time incentive.</p>
<p>This shifts the dynamic: instead of "I need to hide my phone because Mum will take it," the child thinks "If I finish my reading, I get 30 more minutes tonight."</p>
<h2>Building a Points Economy</h2>
<p>For older children, consider building a simple points system:</p>
<ul>
  <li>30 minutes physical exercise → 20 extra minutes gaming</li>
  <li>No phone at dinner for a week → 1 hour bonus on Saturday</li>
  <li>Reading a book → 15 minutes extra on weekdays</li>
  <li>Completing chores without reminders → parent's choice reward</li>
</ul>
<p>The specific trades matter less than the principle: screens are earned through real-world behaviour, not rationed by time-of-day limits alone.</p>
<h2>The Research Behind Reward Systems</h2>
<p>Behavioural psychology literature on self-determination theory consistently shows that children given autonomy within a structure develop more durable self-regulation than those managed purely by external rules. The key is that the child must perceive the system as fair and must have genuine agency over outcomes.</p>`,
        coverImageUrl: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=1200&h=630&fit=crop',
        authorName: 'Cylux Team',
        tags: ['rewards', 'screen time', 'behaviour', 'self-regulation', 'parenting'],
        isPublished: true,
        readTimeMinutes: 6,
    },
    {
        title: 'Online Predators: What Modern Grooming Actually Looks Like',
        excerpt: 'The "stranger danger" model is dangerously outdated. Grooming in 2025 is sophisticated, slow, and usually starts inside games or group chats your child already uses.',
        content: `<h2>The Myth of the Obvious Stranger</h2>
<p>The classic safeguarding message — don't talk to strangers online — misrepresents how online child exploitation actually occurs. In the majority of cases documented by Internet Watch Foundation and the National Center for Missing & Exploited Children, predators spend weeks or months building genuine-seeming friendships before any exploitation begins.</p>
<p>By the time a child recognises something is wrong, they often feel complicit, embarrassed, or that they won't be believed.</p>
<h2>Where It Starts in 2025</h2>
<p>Gaming platforms remain the most common initial contact point. Roblox, Minecraft servers, Fortnite, and Discord gaming communities offer natural cover — a child talking to an adult gamer seems completely normal. The adult gradually moves the relationship to private channels: direct messages, then off-platform to Snapchat or WhatsApp.</p>
<h2>The Five Stages of Grooming</h2>
<ol>
  <li><strong>Target selection</strong> — often children who post about loneliness, family problems, or are visibly hungry for approval</li>
  <li><strong>Friendship building</strong> — genuine shared interest (gaming, anime, music), gift-giving (in-game items), being "the only one who understands"</li>
  <li><strong>Trust and isolation</strong> — gradually positioning themselves as more important than offline friends and family</li>
  <li><strong>Desensitisation</strong> — slowly introducing sexual topics, normalising them through jokes or "curiosity"</li>
  <li><strong>Coercion</strong> — using shared secrets, guilt, or blackmail to maintain control</li>
</ol>
<h2>What Parents Can Do</h2>
<p>The notification monitoring feature in Cylux captures message previews from social apps. This isn't about reading every message — it's about pattern detection. If a child is receiving hundreds of messages from a single unknown contact, or if the content of notifications shifts over time, that's a signal worth investigating.</p>
<p>More important: build the relationship where your child would tell you. Children who feel certain they won't lose their devices and won't be blamed are significantly more likely to disclose early-stage grooming before it escalates.</p>`,
        coverImageUrl: 'https://images.unsplash.com/photo-1614813927697-81b048f6f927?w=1200&h=630&fit=crop',
        authorName: 'Cylux Team',
        tags: ['online safety', 'grooming', 'child protection', 'awareness'],
        isPublished: true,
        readTimeMinutes: 9,
    },
    {
        title: 'How Cylux Works: A Technical Deep Dive for Privacy-Conscious Parents',
        excerpt: 'What exactly does Cylux monitor? What does it send to our servers? What can\'t it see? A transparent, technical explanation for parents who want to understand what they\'re installing.',
        content: `<h2>Our Privacy Philosophy</h2>
<p>Cylux is a parental monitoring tool. We believe parents have both the right and the responsibility to monitor their minor children's digital activity. We also believe children deserve to know they're being monitored — transparency protects trust.</p>
<p>What we don't believe: that monitoring should mean sending raw message content to our servers, harvesting data for advertising, or retaining sensitive data beyond what's needed.</p>
<h2>What Cylux Monitors (and How)</h2>
<p><strong>App usage time:</strong> Tracked via Android's UsageStatsManager — this is a privileged API that requires explicit parent permission. We see which apps were active and for how long, not what was done inside them.</p>
<p><strong>Web browsing history:</strong> Captured via AccessibilityService, which reads the URL bar of the active browser. This is the same mechanism used by accessibility tools for visually impaired users. We see URLs, not page content or form inputs.</p>
<p><strong>YouTube activity:</strong> Same AccessibilityService reads video titles and search queries visible on-screen. We do not access YouTube's internal API or your child's Google account.</p>
<p><strong>Notifications:</strong> Captured by NotificationListenerService — a standard Android API. We capture the app name and notification title/body text only. We cannot read message threads or access app databases.</p>
<p><strong>Location:</strong> GPS coordinates polled at configurable intervals (default: every 5 minutes). Stored for 30 days, then automatically purged.</p>
<p><strong>App installs:</strong> Detected via BroadcastReceiver for Android package events. We capture app name and package ID at time of install only.</p>
<h2>What Cylux Cannot See</h2>
<ul>
  <li>End-to-end encrypted message content (WhatsApp, Signal, iMessage body text)</li>
  <li>Passwords, form inputs, or anything typed in a secure field</li>
  <li>Photos, videos, or files stored on the device</li>
  <li>Anything inside apps when those apps are not in the foreground</li>
</ul>
<h2>Data Transmission and Storage</h2>
<p>All data is transmitted encrypted (TLS 1.3) to servers in your region. Parent accounts are isolated — no other parent can access your data. We do not sell, share, or aggregate user data for any purpose other than delivering the service. Our privacy policy is written in plain English, not legalese.</p>`,
        coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop',
        authorName: 'Cylux Team',
        tags: ['privacy', 'technical', 'transparency', 'how it works'],
        isPublished: true,
        readTimeMinutes: 8,
    },
];
function seedBlogPosts() {
    return __awaiter(this, void 0, void 0, function* () {
        const repo = database_1.AppDataSource.getRepository(Blog_1.BlogPost);
        const count = yield repo.count();
        if (count > 0) {
            console.log('[BlogSeed] Posts already exist — skipping seed');
            return;
        }
        function slugify(text) {
            return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s]+/g, '-').replace(/-+/g, '-');
        }
        console.log(`[BlogSeed] Seeding ${SEED_POSTS.length} blog posts…`);
        for (const data of SEED_POSTS) {
            const slug = slugify(data.title);
            const post = repo.create(Object.assign(Object.assign({}, data), { slug, publishedAt: data.isPublished ? new Date() : null, cloudinaryPublicId: null, authorAvatarUrl: null }));
            yield repo.save(post);
        }
        console.log('[BlogSeed] Done');
    });
}
//# sourceMappingURL=blogSeed.js.map