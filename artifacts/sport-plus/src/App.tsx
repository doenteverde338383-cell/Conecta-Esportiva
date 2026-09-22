import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  HeartHandshake,
  Home,
  Link2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Star,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  Link,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

type Role = 'athlete' | 'teacher';
type Post = {
  id: string;
  initials: string;
  name: string;
  handle: string;
  role: Role;
  time: string;
  sport: string;
  title: string;
  copy: string;
  visual?: 'court' | 'basket' | 'run';
  stars: number;
  comments: number;
  commentList?: string[];
};

const starterPosts: Post[] = [
  {
    id: 'post-1',
    initials: 'MR',
    name: 'Maya Rios',
    handle: '@mayarios',
    role: 'athlete',
    time: '18 min ago',
    sport: 'Basketball',
    title: 'A new court, same competitive energy.',
    copy: 'Looking for two more players for a relaxed 3v3 at Parque das Nações this Saturday. All levels welcome, good passes mandatory.',
    visual: 'basket',
    stars: 46,
    comments: 8,
    commentList: ['Count me in. I can bring a ball.', 'What time are you thinking?'],
  },
  {
    id: 'post-2',
    initials: 'JL',
    name: 'João Lima',
    handle: '@joaolima',
    role: 'athlete',
    time: '1 hr ago',
    sport: 'Running',
    title: 'The first 10K always starts with one friend.',
    copy: 'Four weeks into our sunrise group. We are keeping it simple: 5:45/km, no headphones, coffee after. New runners, come find your pace.',
    visual: 'run',
    stars: 81,
    comments: 14,
    commentList: ['This is exactly the push I needed.'],
  },
  {
    id: 'post-3',
    initials: 'IP',
    name: 'Inês Pereira',
    handle: '@inesmoves',
    role: 'teacher',
    time: '3 hrs ago',
    sport: 'Physical Education',
    title: 'A class that learns by moving together.',
    copy: 'Today my Year 9 group designed a relay that rewards communication instead of speed. The loudest cheer came from the team that finished last.',
    visual: 'court',
    stars: 129,
    comments: 21,
    commentList: ['Saving this for next term.'],
  },
];

const people = [
  { id: 'p1', initials: 'TC', name: 'Tiago Costa', sport: 'Tennis · intermediate', role: 'athlete' as Role, tags: ['Tennis', 'Setúbal'] },
  { id: 'p2', initials: 'AS', name: 'Ana Silva', sport: 'Trail running · beginner', role: 'athlete' as Role, tags: ['Trail', 'Sintra'] },
  { id: 'p3', initials: 'RM', name: 'Rui Matos', sport: 'Physical Education · Lisbon', role: 'teacher' as Role, tags: ['Teacher', 'Classes'] },
  { id: 'p4', initials: 'LC', name: 'Leonor Cruz', sport: 'Volleyball · advanced', role: 'athlete' as Role, tags: ['Volley', 'Oeiras'] },
  { id: 'p5', initials: 'DF', name: 'Duarte Ferreira', sport: 'Swimming · intermediate', role: 'athlete' as Role, tags: ['Swim', 'Almada'] },
  { id: 'p6', initials: 'MG', name: 'Marta Gomes', sport: 'Physical Education · Porto', role: 'teacher' as Role, tags: ['Teacher', 'Porto'] },
];

const rankings = [
  { rank: '01', initials: 'JR', name: 'Joana Reis', sport: 'Climbing', score: '1,284', change: '+18' },
  { rank: '02', initials: 'AF', name: 'Alex Faria', sport: 'Triathlon', score: '1,176', change: '+11' },
  { rank: '03', initials: 'MR', name: 'Maya Rios', sport: 'Basketball', score: '1,092', change: '+24' },
  { rank: '04', initials: 'TG', name: 'Tomás Gomes', sport: 'Surf', score: '1,018', change: '+07' },
  { rank: '05', initials: 'LC', name: 'Leonor Cruz', sport: 'Volleyball', score: '986', change: '+16' },
  { rank: '06', initials: 'CR', name: 'Carolina Rocha', sport: 'Running', score: '941', change: '+04' },
];

const challenges = [
  { id: 'c1', title: 'The 30-day outside streak', copy: 'Move outdoors once a day. A walk counts. Showing up counts more.', sport: 'EVERY SPORT', people: '184 joined', progress: 68, accent: true },
  { id: 'c2', title: 'Find your doubles partner', copy: 'Play three sessions with someone new before the month is over.', sport: 'TENNIS · PADEL', people: '72 joined', progress: 42, accent: false },
  { id: 'c3', title: 'Classroom in motion', copy: 'Teachers: share one game that gets every student participating.', sport: 'TEACHERS', people: '39 joined', progress: 54, accent: false },
  { id: 'c4', title: '5K, no pressure', copy: 'Build consistency with three runs each week. Your pace is your pace.', sport: 'RUNNING', people: '267 joined', progress: 83, accent: true },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Demo continues if storage is unavailable.
  }
}

function initialsClass(index: number) {
  return ['coral', 'green', 'ink'][index % 3];
}

function Layout({ children, onCompose }: { children: ReactNode; onCompose: () => void }) {
  const [location] = useLocation();
  const [role] = useState<Role>(() => readStorage<Role>('sportplus-role', 'athlete'));
  const nav = [
    { href: '/feed', label: 'Feed', icon: Home },
    { href: '/discover', label: 'Discover', icon: Search },
    { href: '/rankings', label: 'Rankings', icon: Trophy },
    { href: '/challenges', label: 'Challenges', icon: Flame },
    { href: '/profile', label: 'My profile', icon: UserRound },
  ];
  const active = (href: string) => href === '/feed' ? (location === '/' || location === '/feed') : location.startsWith(href);
  return (
    <div className="sp-app">
      <div className="sp-shell">
        <aside className="sp-sidebar">
          <Link href="/feed" className="sp-logo" data-testid="link-brand">
            <span className="sp-logo-mark"><Activity size={17} strokeWidth={3} /></span>
            SPORT+
          </Link>
          <div className="sp-nav" aria-label="Primary navigation">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="sp-nav-link" aria-current={active(href) ? 'page' : undefined} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}>
                <Icon size={18} strokeWidth={active(href) ? 2.5 : 1.8} />
                {label}
              </Link>
            ))}
          </div>
          <div className="sp-sidebar-footer">
            <button className="sp-button primary" style={{ width: '100%' }} onClick={onCompose} data-testid="button-compose-sidebar">
              <Plus size={16} /> Publish a move
            </button>
            <div className="sp-user-mini">
              <div className="sp-avatar coral">LM</div>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '.78rem' }}>Lucas Mendes</strong>
                <span style={{ display: 'block', color: 'hsl(var(--sidebar-foreground) / .55)', fontSize: '.67rem', marginTop: 3 }}>
                  {role === 'teacher' ? 'Physical Education' : 'Amateur athlete'}
                </span>
              </div>
              <Link href="/profile" aria-label="Open profile" data-testid="link-sidebar-profile" style={{ marginLeft: 'auto', color: 'inherit' }}><ChevronRight size={15} /></Link>
            </div>
          </div>
        </aside>
        <main className="sp-main">
          <div className="sp-content">{children}</div>
        </main>
      </div>
      <nav className="sp-mobile-bar" aria-label="Mobile navigation">
        {nav.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="sp-mobile-nav" aria-current={active(href) ? 'page' : undefined} data-testid={`link-mobile-${label.toLowerCase()}`}>
            <Icon size={20} /><span>{label}</span>
          </Link>
        ))}
        <button className="sp-mobile-nav create" onClick={onCompose} aria-label="Publish a move" data-testid="button-compose-mobile"><Plus size={21} /><span>Publish</span></button>
        {nav.slice(2, 4).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="sp-mobile-nav" aria-current={active(href) ? 'page' : undefined} data-testid={`link-mobile-${label.toLowerCase()}`}>
            <Icon size={20} /><span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Topbar({ eyebrow, action }: { eyebrow: string; action?: ReactNode }) {
  return (
    <header className="sp-topbar">
      <div><span className="sp-kicker">{eyebrow}</span></div>
      <div className="sp-topbar-actions">
        {action}
        <button className="sp-icon-button" aria-label="Notifications" data-testid="button-notifications"><Bell size={17} /></button>
        <Link href="/profile" className="sp-avatar coral" aria-label="Open Lucas Mendes profile" data-testid="link-topbar-profile">LM</Link>
      </div>
    </header>
  );
}

function Avatar({ initials, index = 0 }: { initials: string; index?: number }) {
  return <div className={`sp-avatar ${initialsClass(index)}`} data-testid={`img-avatar-${initials}`}>{initials}</div>;
}

function PostCard({ post, starred, onStar, onComment, onShare }: { post: Post; starred: boolean; onStar: () => void; onComment: (comment: string) => void; onShare: () => void }) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState('');
  const submitComment = () => {
    if (!comment.trim()) return;
    onComment(comment.trim());
    setComment('');
  };
  return (
    <article className="sp-card sp-post" data-testid={`card-post-${post.id}`}>
      <div className="sp-post-head">
        <Avatar initials={post.initials} />
        <div className="sp-post-meta">
          <strong data-testid={`text-post-author-${post.id}`}>{post.name}</strong>
          <span>{post.handle} · {post.time}</span>
        </div>
        {post.role === 'teacher' ? <span className="sp-teacher-badge"><ShieldCheck size={11} /> Teacher</span> : <span className="sp-post-type">{post.sport}</span>}
        <button className="sp-icon-button" style={{ border: 0, background: 'transparent', width: 28, height: 28 }} aria-label={`More options for ${post.name}`} data-testid={`button-post-menu-${post.id}`}><MoreHorizontal size={17} /></button>
      </div>
      <h3 data-testid={`text-post-title-${post.id}`}>{post.title}</h3>
      <p className="sp-post-copy" data-testid={`text-post-copy-${post.id}`}>{post.copy}</p>
      {post.visual && <div className={`sp-post-visual ${post.visual}`} role="img" aria-label={`${post.sport} visual`}><span className="sp-visual-label">{post.sport} / shared session</span></div>}
      <div className="sp-post-actions">
        <button className={`sp-action ${starred ? 'starred' : ''}`} onClick={onStar} aria-pressed={starred} data-testid={`button-star-${post.id}`}><Star size={17} fill={starred ? 'currentColor' : 'none'} /> {post.stars + (starred ? 1 : 0)}</button>
        <button className="sp-action" onClick={() => setCommentOpen((value) => !value)} aria-expanded={commentOpen} data-testid={`button-comment-${post.id}`}><MessageCircle size={17} /> {post.comments + (post.commentList?.length ?? 0)}</button>
        <button className="sp-action share" onClick={onShare} data-testid={`button-share-${post.id}`}><Share2 size={16} /> Share</button>
      </div>
      {commentOpen && (
        <>
          {post.commentList?.map((item, index) => <div className="sp-comment" key={`${post.id}-comment-${index}`} data-testid={`text-comment-${post.id}-${index}`}><strong style={{ color: 'hsl(var(--foreground))' }}>{index === 0 ? 'Community member' : 'Maya Rios'}</strong> {item}</div>)}
          <div className="sp-comment-row">
            <input value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitComment(); }} placeholder="Add something useful…" aria-label={`Comment on ${post.title}`} data-testid={`input-comment-${post.id}`} />
            <button className="sp-icon-button" onClick={submitComment} aria-label="Post comment" data-testid={`button-submit-comment-${post.id}`}><Send size={15} /></button>
          </div>
        </>
      )}
    </article>
  );
}

function Feed({ onCompose, notify }: { onCompose: () => void; notify: (message: string) => void }) {
  const [posts, setPosts] = useState<Post[]>(() => [...readStorage<Post[]>('sportplus-posts', []), ...starterPosts]);
  const [stars, setStars] = useState<Record<string, boolean>>(() => readStorage<Record<string, boolean>>('sportplus-stars', {}));
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const handlePublished = (event: Event) => {
      const post = (event as CustomEvent<Post>).detail;
      if (post) setPosts((current) => [post, ...current]);
    };
    window.addEventListener('sportplus-post-published', handlePublished);
    return () => window.removeEventListener('sportplus-post-published', handlePublished);
  }, []);
  const star = (id: string) => {
    const next = { ...stars, [id]: !stars[id] };
    setStars(next);
    writeStorage('sportplus-stars', next);
  };
  const addComment = (id: string, comment: string) => {
    setPosts((current) => current.map((post) => post.id === id ? { ...post, commentList: [...(post.commentList ?? []), comment] } : post));
    notify('Comment added to the conversation.');
  };
  return (
    <>
      <Topbar eyebrow="Monday · Lisbon" action={<span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '.72rem' }}><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Community nearby</span>} />
      <section className="sp-hero">
        <div className="sp-hero-copy">
          <span className="sp-kicker">The sport network</span>
          <h1 className="sp-display">Move better,<br /><span style={{ color: 'hsl(var(--primary))' }}>together.</span></h1>
          <p>SPORT+ turns the thing you love doing into the people you have been looking for. Share a session, find your next teammate, and give credit where it is earned.</p>
          <button className="sp-button primary" onClick={onCompose} data-testid="button-publish-hero"><Plus size={16} /> Share what you’re doing</button>
        </div>
        <div className="sp-hero-stat">
          <span className="sp-kicker">Active around you</span>
          <strong className="sp-display" data-testid="text-active-count">2,418</strong>
          <p>people are moving, training, teaching, or looking for a game today.</p>
          <Link href="/discover" className="sp-button ghost" style={{ alignSelf: 'start', marginTop: 18, color: 'hsl(var(--sidebar-foreground))', borderColor: 'hsl(var(--sidebar-border))' }} data-testid="link-find-people">Find your people <ChevronRight size={14} /></Link>
        </div>
      </section>
      <div className="sp-grid-feed">
        <section className="sp-feed-column">
          <div className="sp-section-title"><h2 className="sp-display">What’s moving</h2><Link href="/discover" data-testid="link-feed-discover">See all activity <ChevronRight size={12} style={{ verticalAlign: 'middle' }} /></Link></div>
          <div className="sp-card sp-composer">
            <Avatar initials="LM" />
            <button className="sp-composer-input" onClick={onCompose} data-testid="button-composer">What are you working on today, Lucas?</button>
            <button className="sp-icon-button" onClick={onCompose} aria-label="Add a post" data-testid="button-composer-add"><Plus size={18} /></button>
          </div>
          {posts.map((post) => <PostCard key={post.id} post={post} starred={Boolean(stars[post.id])} onStar={() => star(post.id)} onComment={(comment) => addComment(post.id, comment)} onShare={() => notify('Link copied — send your next session to a friend.')} />)}
        </section>
        <aside className="sp-side-stack">
          <section className="sp-card sp-side-card">
            <div className="sp-section-title"><h3>People to move with</h3><Link href="/discover" data-testid="link-side-discover">More</Link></div>
            <div className="sp-mini-list">
              {people.slice(0, 3).map((person, index) => <div className="sp-mini-row" key={person.id}><Avatar initials={person.initials} index={index} /><div className="sp-mini-copy"><strong>{person.name}</strong><span>{person.sport}</span></div><button className={`sp-follow ${followed[person.id] ? 'followed' : ''}`} onClick={() => { setFollowed({ ...followed, [person.id]: !followed[person.id] }); notify(followed[person.id] ? 'Connection removed.' : `You are now connected with ${person.name}.`); }} data-testid={`button-follow-${person.id}`}>{followed[person.id] ? 'Added' : 'Connect'}</button></div>)}
            </div>
          </section>
          <section className="sp-card sp-side-card">
            <div className="sp-section-title"><h3>Popular this week</h3><Flame size={16} color="hsl(var(--primary))" /></div>
            <div className="sp-tag-cloud">{['#sunriseclub', '#padelpartners', '#runyourway', '#teachthroughplay', '#futsal'].map((tag) => <span className="sp-tag" key={tag}>{tag}</span>)}</div>
          </section>
          <section className="sp-card sp-side-card" style={{ background: 'hsl(var(--secondary) / .68)' }}>
            <span className="sp-kicker">Next nearby</span>
            <h3 style={{ fontSize: '1.05rem', margin: '10px 0 6px' }}>Open court, open invite.</h3>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '.74rem', lineHeight: 1.5, margin: 0 }}>Saturday · 10:00 · Monsanto courts</p>
            <Link href="/challenges" className="sp-button dark small" style={{ marginTop: 16 }} data-testid="link-nearby-event">View session <ChevronRight size={13} /></Link>
          </section>
        </aside>
      </div>
    </>
  );
}

function Discover({ notify }: { notify: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Everyone');
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const filters = ['Everyone', 'Athletes', 'Teachers', 'Running', 'Court sports'];
  const results = useMemo(() => people.filter((person) => {
    const queryMatch = `${person.name} ${person.sport} ${person.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    const filterMatch = filter === 'Everyone' || (filter === 'Athletes' && person.role === 'athlete') || (filter === 'Teachers' && person.role === 'teacher') || (filter === 'Running' && person.sport.toLowerCase().includes('running')) || (filter === 'Court sports' && /tennis|volleyball/i.test(person.sport));
    return queryMatch && filterMatch;
  }), [query, filter]);
  return (
    <>
      <Topbar eyebrow="Find your people" />
      <div className="sp-page-intro"><div><span className="sp-kicker">Discover</span><h1 className="sp-display">More people.<br /><span style={{ color: 'hsl(var(--accent))' }}>More play.</span></h1></div><p>Search for the teammate, training partner, rival, or teacher who makes showing up easier.</p></div>
      <div className="sp-search-wrap"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, sport, or place" aria-label="Search people" data-testid="input-discover-search" /></div>
      <div className="sp-filter-row" style={{ marginTop: 16 }}>{filters.map((item) => <button className={`sp-filter ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)} key={item} aria-pressed={filter === item} data-testid={`button-filter-${item.toLowerCase().replace(' ', '-')}`}>{item}</button>)}</div>
      {results.length ? <div className="sp-discover-grid">{results.map((person, index) => <article className="sp-card sp-person-card" key={person.id} data-testid={`card-person-${person.id}`}><div className="sp-person-top"><Avatar initials={person.initials} index={index} />{person.role === 'teacher' ? <span className="sp-teacher-badge"><ShieldCheck size={11} /> Teacher</span> : <span className="sp-kicker">Active now</span>}</div><h3>{person.name}</h3><p>{person.sport}</p><div className="sp-tag-cloud">{person.tags.map((tag) => <span className="sp-tag" key={tag}>{tag}</span>)}</div><button className={`sp-button ${connected[person.id] ? 'green' : 'primary'} small`} onClick={() => { setConnected({ ...connected, [person.id]: !connected[person.id] }); notify(connected[person.id] ? `You disconnected from ${person.name}.` : `Connection request sent to ${person.name}.`); }} data-testid={`button-connect-${person.id}`}>{connected[person.id] ? <><Check size={14} /> Connected</> : <><Link2 size={14} /> Connect</>}</button></article>)}</div> : <div className="sp-empty" data-testid="empty-discover"><Search size={24} /><h3>No one matches that search</h3><p>Try a sport, a place, or a wider filter. Your next teammate is probably nearby.</p><button className="sp-button ghost small" style={{ marginTop: 17 }} onClick={() => { setQuery(''); setFilter('Everyone'); }} data-testid="button-clear-search">Clear search</button></div>}
    </>
  );
}

function Rankings() {
  return (
    <>
      <Topbar eyebrow="Community scoreboard" />
      <div className="sp-page-intro"><div><span className="sp-kicker">Rankings</span><h1 className="sp-display">Give credit.<br /><span style={{ color: 'hsl(var(--primary))' }}>Get better.</span></h1></div><p>Stars are not a popularity contest. They are a way to notice consistency, generosity, and the people who make sport better for everyone.</p></div>
      <div className="sp-rank-grid">
        <section className="sp-card sp-rank-table"><div className="sp-section-title" style={{ paddingTop: 13 }}><h2 className="sp-display">Lisbon · all sports</h2><span className="sp-mono" style={{ color: 'hsl(var(--muted-foreground))', fontSize: '.64rem' }}>WEEK 24</span></div>{rankings.map((item, index) => <div className={`sp-rank-row ${index === 2 ? 'you' : ''}`} key={item.rank} data-testid={`row-ranking-${item.rank}`}><span className="sp-rank-number">{item.rank}</span><div className="sp-mini-row"><Avatar initials={item.initials} index={index} /><div className="sp-mini-copy"><strong>{item.name}{index === 2 && <span style={{ color: 'hsl(var(--primary))', display: 'inline', marginLeft: 5, fontFamily: 'var(--app-font-mono)', fontSize: '.58rem' }}>YOU</span>}</strong><span>{item.sport}</span></div></div><span className="sp-rank-score">{item.score} ★</span><span className="sp-rank-trend">{item.change}</span></div>)}</section>
        <aside className="sp-side-stack"><section className="sp-rank-intro"><span className="sp-kicker">Your momentum</span><h2 className="sp-display">You are having a good week.</h2><p>Three sessions shared, five stars earned, one new running partner found.</p><Link href="/profile" className="sp-button primary small" style={{ position: 'relative', zIndex: 1 }} data-testid="link-ranking-profile">See your profile <ChevronRight size={13} /></Link></section><section className="sp-card sp-side-card"><span className="sp-kicker">How it works</span><h3 style={{ marginTop: 9 }}>Stars for the sport that happens between the highlights.</h3><p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '.75rem', lineHeight: 1.55, marginBottom: 0 }}>Earn recognition when your community sees you show up, help out, or bring people into the game.</p></section></aside>
      </div>
    </>
  );
}

function Challenges({ notify }: { notify: (message: string) => void }) {
  const [joined, setJoined] = useState<Record<string, boolean>>(() => readStorage<Record<string, boolean>>('sportplus-challenges', {}));
  const toggle = (id: string, title: string) => { const next = { ...joined, [id]: !joined[id] }; setJoined(next); writeStorage('sportplus-challenges', next); notify(next[id] ? `You joined “${title}”. Let’s get moving.` : `You left “${title}”.`); };
  return (
    <>
      <Topbar eyebrow="Make a little noise" />
      <div className="sp-page-intro"><div><span className="sp-kicker">Challenges</span><h1 className="sp-display">The extra<br /><span style={{ color: 'hsl(var(--primary))' }}>push.</span></h1></div><p>Small commitments become shared rituals. Join a challenge, invite someone new, and leave the sport a little bigger.</p></div>
      <div className="sp-challenge-grid">{challenges.map((challenge) => <article className={`sp-card sp-challenge-card ${challenge.accent ? 'accent' : ''}`} key={challenge.id} data-testid={`card-challenge-${challenge.id}`}><span className="sp-kicker">{challenge.sport}</span><h3 className="sp-display">{challenge.title}</h3><p>{challenge.copy}</p><div className="sp-challenge-meta"><span><Users size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{challenge.people}</span><span><CalendarDays size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Ends in {challenge.id === 'c4' ? '12' : '21'} days</span></div><div className="sp-progress" aria-label={`${challenge.progress}% complete`}><span style={{ width: `${challenge.progress}%` }} /></div><button className={`sp-button ${joined[challenge.id] ? (challenge.accent ? 'ghost' : 'green') : (challenge.accent ? 'dark' : 'primary')} small`} onClick={() => toggle(challenge.id, challenge.title)} aria-pressed={Boolean(joined[challenge.id])} data-testid={`button-join-${challenge.id}`}>{joined[challenge.id] ? <><Check size={14} /> Joined</> : <>Join challenge <ChevronRight size={13} /></>}</button></article>)}</div>
      <section className="sp-card" style={{ marginTop: 18, padding: 20, display: 'flex', alignItems: 'center', gap: 17, flexWrap: 'wrap' }}><div className="sp-avatar green"><HeartHandshake size={19} /></div><div style={{ flex: 1, minWidth: 220 }}><span className="sp-kicker">Bring your own energy</span><h3 style={{ margin: '6px 0 2px', fontSize: '1rem' }}>Have a challenge for your crew?</h3><p style={{ color: 'hsl(var(--muted-foreground))', margin: 0, fontSize: '.74rem' }}>Create a simple goal and make it public. The best challenges start with one invite.</p></div><button className="sp-button ghost small" onClick={() => notify('Challenge builder is ready for the next demo iteration.')} data-testid="button-create-challenge"><Plus size={14} /> Create a challenge</button></section>
    </>
  );
}

function Profile({ notify }: { notify: (message: string) => void }) {
  const [role, setRole] = useState<Role>(() => readStorage<Role>('sportplus-role', 'athlete'));
  const [editing, setEditing] = useState(false);
  const toggleRole = (next: Role) => { setRole(next); writeStorage('sportplus-role', next); notify(next === 'teacher' ? 'Your profile now highlights your teaching practice.' : 'Your profile now highlights your athletic practice.'); };
  return (
    <>
      <Topbar eyebrow="Your sport, in full" action={<button className="sp-button ghost small" onClick={() => setEditing(true)} data-testid="button-edit-profile"><UserRound size={14} /> Edit profile</button>} />
      <section className="sp-profile-cover"><div className="sp-profile-head"><div className="sp-avatar coral">LM</div><div><h1 className="sp-display">Lucas Mendes</h1><p>@lucasmendes · Lisbon · {role === 'teacher' ? 'Physical Education teacher' : 'Amateur athlete'}</p></div></div></section>
      <div className="sp-profile-body">
        <section><div className="sp-stat-strip"><div className="sp-card sp-stat"><strong>47</strong><span>Stars earned</span></div><div className="sp-card sp-stat"><strong>12</strong><span>Sessions shared</span></div><div className="sp-card sp-stat"><strong>8</strong><span>Connections</span></div></div><section className="sp-card sp-side-card"><div className="sp-section-title"><h3>About the way I move</h3><button className="sp-action" onClick={() => setEditing(true)} data-testid="button-edit-about">Edit</button></div><p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '.8rem', lineHeight: 1.7, margin: 0 }}>{role === 'teacher' ? 'I use games, pace, and a bit of friendly competition to help every student find a way into movement.' : 'Weekend runner, weekday basketball regular. Always up for a session that leaves us both better than we arrived.'}</p><div className="sp-tag-cloud" style={{ marginTop: 18 }}><span className="sp-tag">Basketball</span><span className="sp-tag">Running</span><span className="sp-tag">Community first</span></div></section></section>
        <aside className="sp-side-stack"><section className="sp-card sp-side-card"><span className="sp-kicker">Account type</span><h3 style={{ margin: '10px 0 4px' }}>{role === 'teacher' ? 'Physical Education teacher' : 'Athlete / practitioner'}</h3><p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '.72rem', lineHeight: 1.5 }}>Your profile surface changes so the community knows how to connect with you.</p><div className="sp-role-choice"><button className={`sp-role-card ${role === 'athlete' ? 'selected' : ''}`} onClick={() => toggleRole('athlete')} data-testid="button-role-athlete"><Dumbbell size={17} color="hsl(var(--primary))" /><strong>Athlete</strong><span>Find a partner, team, or challenge.</span></button><button className={`sp-role-card ${role === 'teacher' ? 'selected' : ''}`} onClick={() => toggleRole('teacher')} data-testid="button-role-teacher"><ShieldCheck size={17} color="hsl(var(--accent))" /><strong>Teacher</strong><span>Share practice and grow participation.</span></button></div></section><section className="sp-card sp-side-card"><span className="sp-kicker">Recent recognition</span><div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14 }}><div className="sp-avatar" style={{ background: 'hsl(41 79% 56% / .2)', color: 'hsl(41 79% 44%)' }}><Star size={17} fill="currentColor" /></div><div><strong style={{ fontSize: '.76rem' }}>Good teammate</strong><span style={{ display: 'block', color: 'hsl(var(--muted-foreground))', fontSize: '.68rem', marginTop: 3 }}>Received from Maya Rios</span></div></div></section></aside>
      </div>
      {editing && <EditProfileModal role={role} onClose={() => setEditing(false)} onSave={() => { setEditing(false); notify('Profile details saved.'); }} />}
    </>
  );
}

function EditProfileModal({ role, onClose, onSave }: { role: Role; onClose: () => void; onSave: () => void }) {
  return <div className="sp-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="sp-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title"><div className="sp-modal-head"><div><span className="sp-kicker">Your details</span><h2 id="edit-profile-title" className="sp-display">Make it yours.</h2></div><button className="sp-icon-button" onClick={onClose} aria-label="Close edit profile" data-testid="button-close-edit-profile"><X size={17} /></button></div><label>Display name<input defaultValue="Lucas Mendes" data-testid="input-profile-name" /></label><label>Short bio<textarea rows={3} defaultValue={role === 'teacher' ? 'Helping every student find their way into movement.' : 'Weekend runner, weekday basketball regular.'} data-testid="input-profile-bio" /></label><div className="sp-modal-footer"><button className="sp-button ghost" onClick={onClose} data-testid="button-cancel-profile">Cancel</button><button className="sp-button primary" onClick={onSave} data-testid="button-save-profile"><Check size={15} /> Save changes</button></div></div></div>;
}

function PublishModal({ onClose, onPublish }: { onClose: () => void; onPublish: (post: Post) => void }) {
  const [text, setText] = useState('');
  const [sport, setSport] = useState('Running');
  const publish = () => {
    if (!text.trim()) return;
    onPublish({ id: `post-local-${Date.now()}`, initials: 'LM', name: 'Lucas Mendes', handle: '@lucasmendes', role: 'athlete', time: 'just now', sport, title: sport === 'Running' ? 'Today’s session is on.' : `Looking for a ${sport.toLowerCase()} session.`, copy: text.trim(), stars: 0, comments: 0 });
  };
  return <div className="sp-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="sp-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title"><div className="sp-modal-head"><div><span className="sp-kicker">Share with your community</span><h2 id="publish-title" className="sp-display">What’s your move?</h2></div><button className="sp-icon-button" onClick={onClose} aria-label="Close publish dialog" data-testid="button-close-publish"><X size={17} /></button></div><label>Sport<select value={sport} onChange={(event) => setSport(event.target.value)} data-testid="select-publish-sport"><option>Running</option><option>Basketball</option><option>Football</option><option>Tennis</option><option>Strength training</option></select></label><label>Your update<textarea rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder="Share a session, invite someone, or tell us what you learned…" data-testid="textarea-publish" /></label><div className="sp-modal-footer"><button className="sp-button ghost" onClick={onClose} data-testid="button-cancel-publish">Not now</button><button className="sp-button primary" disabled={!text.trim()} onClick={publish} data-testid="button-submit-publish"><Send size={15} /> Publish move</button></div></div></div>;
}

function Welcome() {
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<Role>(() => readStorage<Role>('sportplus-role', 'athlete'));
  const continueToApp = () => { writeStorage('sportplus-role', role); setLocation('/feed'); };
  return <div className="sp-app" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 18, background: 'hsl(var(--sidebar))' }}><div style={{ width: 'min(850px, 100%)', display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'hsl(var(--card))', borderRadius: 23, overflow: 'hidden', boxShadow: '0 25px 80px rgba(10,14,28,.35)' }}><section style={{ padding: '42px 38px', background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', position: 'relative', overflow: 'hidden' }}><span className="sp-logo" style={{ color: 'inherit' }}><span className="sp-logo-mark" style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary-foreground))' }}><Activity size={17} strokeWidth={3} /></span>SPORT+</span><h1 className="sp-display" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.7rem)', lineHeight: .92, margin: '90px 0 18px', maxWidth: 340 }}>Sport is better when it is shared.</h1><p style={{ color: 'hsl(var(--primary-foreground) / .75)', fontSize: '.82rem', lineHeight: 1.6, maxWidth: 320 }}>A place to find your people, give recognition, and turn “we should play sometime” into a plan.</p><div style={{ position: 'absolute', right: -70, bottom: -70, fontSize: 220, color: 'hsl(var(--primary-foreground) / .12)', lineHeight: 1 }}>+</div></section><section style={{ padding: '42px 35px' }}><span className="sp-kicker">Start with your perspective</span><h2 className="sp-display" style={{ fontSize: '2rem', lineHeight: 1, margin: '14px 0 8px' }}>How do you show up?</h2><p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '.78rem', lineHeight: 1.55, margin: 0 }}>You can change this later. We use it to shape the people and conversations you see first.</p><div className="sp-role-choice" style={{ gridTemplateColumns: '1fr', marginTop: 24 }}><button className={`sp-role-card ${role === 'athlete' ? 'selected' : ''}`} onClick={() => setRole('athlete')} data-testid="button-welcome-athlete"><Dumbbell size={19} color="hsl(var(--primary))" /><strong>Athlete / practitioner</strong><span>I train, play, learn, or simply want to move more often.</span></button><button className={`sp-role-card ${role === 'teacher' ? 'selected' : ''}`} onClick={() => setRole('teacher')} data-testid="button-welcome-teacher"><ShieldCheck size={19} color="hsl(var(--accent))" /><strong>Physical Education teacher</strong><span>I help other people discover the confidence to participate.</span></button></div><button className="sp-button primary" style={{ width: '100%', marginTop: 10 }} onClick={continueToApp} data-testid="button-enter-sport-plus">Enter SPORT+ <ChevronRight size={16} /></button><p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '.65rem', textAlign: 'center', marginTop: 16 }}>No pressure. No performance theatre. Just people who move.</p></section></div></div>;
}

function Router({ onCompose, notify }: { onCompose: () => void; notify: (message: string) => void }) {
  return <RoutedErrorBoundary><Switch><Route path="/welcome" component={Welcome} /><Route path="/profile/:handle"><Layout onCompose={onCompose}><Profile notify={notify} /></Layout></Route><Route path="/profile"><Layout onCompose={onCompose}><Profile notify={notify} /></Layout></Route><Route path="/discover"><Layout onCompose={onCompose}><Discover notify={notify} /></Layout></Route><Route path="/rankings"><Layout onCompose={onCompose}><Rankings /></Layout></Route><Route path="/challenges"><Layout onCompose={onCompose}><Challenges notify={notify} /></Layout></Route><Route path="/feed"><Layout onCompose={onCompose}><Feed onCompose={onCompose} notify={notify} /></Layout></Route><Route path="/"><Layout onCompose={onCompose}><Feed onCompose={onCompose} notify={notify} /></Layout></Route><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [toast, setToast] = useState('');
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const addPost = (post: Post) => { const existing = readStorage<Post[]>('sportplus-posts', []); writeStorage('sportplus-posts', [post, ...existing]); window.dispatchEvent(new CustomEvent<Post>('sportplus-post-published', { detail: post })); setComposeOpen(false); notify('Your move is live in the community.'); };
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router onCompose={() => setComposeOpen(true)} notify={notify} /></WouterRouter>{composeOpen && <PublishModal onClose={() => setComposeOpen(false)} onPublish={addPost} />}{toast && <div className="sp-toast" role="status" data-testid="status-toast">{toast}</div>}<Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;