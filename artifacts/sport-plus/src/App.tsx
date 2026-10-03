import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Activity, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, ChevronDown, CircleHelp,
  Edit3, Flag, Flame, GraduationCap, Heart, Home, Link2, LockKeyhole, LogOut, MapPin, MessageCircle,
  MoreHorizontal, Play, Plus, Search, Send, Settings as SettingsIcon, Share2, ShieldCheck,
  SlidersHorizontal, Star, Swords, Trophy, UserRound, Users, Video, Volume2, VolumeX, X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';
import {
  PersistentChallengeDetail,
  PersistentChallengeNew,
  PersistentChallenges,
  PersistentDiscover,
  PersistentFeed,
  PersistentProfile,
  PersistentPublish,
  PersistentRankings,
  PersistentSettings,
  PersistentShell,
  PersistentTeacherStudents,
  PersistentVideoDetail,
} from './persistent';
import { PersistentFeedScreen } from './PersistentFeedScreen';
import { PersistentPublishScreen } from './PersistentPublishScreen';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
type Role = 'athlete' | 'teacher';
type Sport = 'futebol' | 'futsal' | 'vôlei' | 'handebol' | 'basquete' | 'tênis' | 'atletismo' | 'corrida' | 'natação' | 'outros';
type Post = {
  id: string; initials: string; name: string; handle: string; role: Role; time: string; sport: Sport;
  title: string; copy: string; visual: 'court' | 'ball' | 'run' | 'water'; stars: number; comments: number; commentList?: string[];
  videoUrl?: string; tags?: string[];
};
type Challenge = { id: string; title: string; type: string; sport: Sport; date: string; time: string; place: string; copy: string; host: string; participants: number; joined?: boolean; status?: string };

const sports: Sport[] = ['futebol', 'futsal', 'vôlei', 'handebol', 'basquete', 'tênis', 'atletismo', 'corrida', 'natação', 'outros'];
const sportLabels: Record<Sport, string> = { futebol: 'Futebol', futsal: 'Futsal', 'vôlei': 'Vôlei', handebol: 'Handebol', basquete: 'Basquete', tênis: 'Tênis', atletismo: 'Atletismo', corrida: 'Corrida', 'natação': 'Natação', outros: 'Outros' };
const people = [
  { id: 'p1', initials: 'TC', name: 'Tiago Costa', handle: 'tiagocosta', sport: 'Tênis · intermediário', role: 'athlete' as Role, tags: ['tênis', 'Setúbal'], stars: 382 },
  { id: 'p2', initials: 'AS', name: 'Ana Silva', handle: 'anasilva', sport: 'Corrida · iniciante', role: 'athlete' as Role, tags: ['corrida', 'Sintra'], stars: 518 },
  { id: 'p3', initials: 'RM', name: 'Rui Matos', handle: 'ruimatos', sport: 'Educação Física · Lisboa', role: 'teacher' as Role, tags: ['professor', 'alunos'], stars: 704 },
  { id: 'p4', initials: 'LC', name: 'Leonor Cruz', handle: 'leonorcruz', sport: 'Vôlei · avançado', role: 'athlete' as Role, tags: ['vôlei', 'Oeiras'], stars: 986 },
  { id: 'p5', initials: 'DF', name: 'Duarte Ferreira', handle: 'duartef', sport: 'Natação · intermediário', role: 'athlete' as Role, tags: ['natação', 'Almada'], stars: 641 },
  { id: 'p6', initials: 'MG', name: 'Marta Gomes', handle: 'martagomes', sport: 'Educação Física · Porto', role: 'teacher' as Role, tags: ['professora', 'Porto'], stars: 772 },
];
const starterPosts: Post[] = [
  { id: 'post-1', initials: 'MR', name: 'Maya Rios', handle: 'mayarios', role: 'athlete', time: 'há 18 min', sport: 'basquete', title: 'Quadra nova, energia de sempre.', copy: 'Estou procurando mais duas pessoas para um 3x3 descontraído no Parque das Nações neste sábado. Todos os níveis são bem-vindos.', visual: 'ball', stars: 46, comments: 8, commentList: ['Posso levar a bola?', 'Qual horário você está pensando?'], tags: ['3x3', 'parquedanações'] },
  { id: 'post-2', initials: 'JL', name: 'João Lima', handle: 'joaolima', role: 'athlete', time: 'há 1 h', sport: 'corrida', title: 'A primeira corrida começa com alguém.', copy: 'Quatro semanas do nosso grupo ao nascer do sol. Ritmo confortável e café depois. Quem está começando, vem encontrar seu ritmo.', visual: 'run', stars: 81, comments: 14, commentList: ['Era o incentivo que eu precisava.'], tags: ['5k', 'sunriseclub'] },
  { id: 'post-3', initials: 'IP', name: 'Inês Pereira', handle: 'inesmoves', role: 'teacher', time: 'há 3 h', sport: 'atletismo', title: 'Uma aula que aprende se movimentando.', copy: 'Hoje a turma criou um revezamento que recompensa comunicação em vez de velocidade. A maior torcida veio do time que terminou por último.', visual: 'court', stars: 129, comments: 21, commentList: ['Vou guardar para o próximo semestre.'], tags: ['educaçãofísica', 'jogos'] },
  { id: 'post-4', initials: 'BC', name: 'Bruno Costa', handle: 'brunocosta', role: 'athlete', time: 'há 5 h', sport: 'futsal', title: 'Do treino para o jogo.', copy: 'Buscando um goleiro para um amistoso na terça. O importante é sair da tela e marcar um horário.', visual: 'water', stars: 63, comments: 6, tags: ['futsal', 'amistoso'] },
];
type VideoItem = {
  id: string;
  initials: string;
  name: string;
  handle: string;
  role: Role;
  sport: Sport;
  description: string;
  source: string;
  stars: number;
  likes: number;
  comments: number;
  accent: 'lime' | 'blue' | 'violet';
};
const verticalVideos: VideoItem[] = [
  { id: 'video-1', initials: 'LM', name: 'Lucas Mendes', handle: 'lucasmendes', role: 'athlete', sport: 'basquete', description: 'Treino de arremesso de hoje. Quem joga no fim de semana?', source: 'https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4', stars: 247, likes: 86, comments: 14, accent: 'lime' },
  { id: 'video-2', initials: 'MR', name: 'Maya Rios', handle: 'mayarios', role: 'athlete', sport: 'corrida', description: 'A primeira 10K começa com uma pessoa para acompanhar o ritmo.', source: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', stars: 189, likes: 54, comments: 9, accent: 'blue' },
  { id: 'video-3', initials: 'IP', name: 'Inês Pereira', handle: 'inesmoves', role: 'teacher', sport: 'atletismo', description: 'Uma dinâmica simples para fazer toda a turma participar.', source: 'https://storage.googleapis.com/coverr-main/mp4/Footboys.mp4', stars: 326, likes: 112, comments: 21, accent: 'violet' },
  { id: 'video-4', initials: 'JL', name: 'João Lima', handle: 'joaolima', role: 'athlete', sport: 'futebol', description: 'Passe rápido, cabeça levantada e vontade de jogar junto.', source: 'https://storage.googleapis.com/coverr-main/mp4/Skateboard.mp4', stars: 144, likes: 63, comments: 7, accent: 'lime' },
];
const baseChallenges: Challenge[] = [
  { id: 'c1', title: 'X1 na quadra', type: 'X1', sport: 'basquete', date: 'sábado, 22 jun', time: '10:00', place: 'Parque das Nações', copy: 'Uma partida rápida, competitiva e com respeito. Você entra?', host: 'Maya Rios', participants: 8 },
  { id: 'c2', title: 'Amistoso de futsal', type: 'Amistoso', sport: 'futsal', date: 'terça, 25 jun', time: '20:30', place: 'Pavilhão do Restelo', copy: 'Precisamos de mais 4 pessoas para fechar dois times.', host: 'Bruno Costa', participants: 8 },
  { id: 'c3', title: 'Copa SPORT+ Lisboa', type: 'Campeonato', sport: 'vôlei', date: 'domingo, 30 jun', time: '09:00', place: 'Complexo Desportivo do Jamor', copy: 'Primeira edição, 8 equipes e uma manhã inteira de vôlei.', host: 'Leonor Cruz', participants: 34 },
  { id: 'c4', title: 'Corrida sem pressão', type: 'Jogo', sport: 'corrida', date: 'quarta, 26 jun', time: '06:15', place: 'Parque Eduardo VII', copy: 'Ritmo livre e café depois. Cada pessoa corre no seu passo.', host: 'João Lima', participants: 17 },
];

function readStorage<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function writeStorage(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* demo still works without storage */ } }
function initialsClass(index: number) { return ['lime', 'violet', 'slate', 'orange'][index % 4]; }
function Avatar({ initials, index = 0, large = false }: { initials: string; index?: number; large?: boolean }) { return <div className={`sp-avatar ${initialsClass(index)} ${large ? 'large' : ''}`} data-testid={`img-avatar-${initials}`}>{initials}</div>; }
function RoleBadge({ role }: { role: Role }) { return <span className={`sp-role-badge ${role}`}><span className="sp-role-dot" />{role === 'teacher' ? 'Professor' : 'Atleta'}</span>; }
function DemoNote() { return <div className="sp-demo-note"><LockKeyhole size={13} /> Demonstração local: alterações ficam neste navegador. Uploads não são enviados para um servidor.</div>; }
function Topbar({ eyebrow, action }: { eyebrow: string; action?: ReactNode }) { return <header className="sp-topbar"><div><span className="sp-kicker">{eyebrow}</span></div><div className="sp-topbar-actions">{action}<button className="sp-icon-button" aria-label="Notificações" data-testid="button-notifications"><Bell size={17} /></button><Link href="/profile" className="sp-avatar lime" aria-label="Abrir meu perfil" data-testid="link-topbar-profile">LM</Link></div></header>; }

function Layout({ children, onCompose }: { children: ReactNode; onCompose: () => void }) {
  const [location] = useLocation();
  const role = readStorage<Role>('sportplus-role', 'athlete');
  const nav = [{ href: '/feed', label: 'Início', icon: Home }, { href: '/discover', label: 'Pesquisar', icon: Search }, { href: '/rankings', label: 'Ranking', icon: Trophy }, { href: '/challenges', label: 'Desafios', icon: Swords }, { href: '/profile', label: 'Perfil', icon: UserRound }];
  const active = (href: string) => href === '/feed' ? (location === '/' || location === '/feed') : location.startsWith(href);
  return <div className="sp-app"><div className="sp-shell"><aside className="sp-sidebar">
    <Link href="/feed" className="sp-logo" data-testid="link-brand"><span className="sp-logo-mark"><Activity size={17} strokeWidth={3} /></span>SPORT<span>+</span></Link>
    <div className="sp-sidebar-tag">REDE ESPORTIVA</div><nav className="sp-nav" aria-label="Navegação principal">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="sp-nav-link" aria-current={active(href) ? 'page' : undefined} data-testid={`link-nav-${href.slice(1)}`}><Icon size={18} strokeWidth={active(href) ? 2.6 : 1.8} />{label}{href === '/challenges' && <span className="sp-nav-pulse" />}</Link>)}</nav>
    <div className="sp-sidebar-links"><Link href="/settings" className="sp-nav-link" data-testid="link-nav-settings"><SettingsIcon size={18} />Configurações</Link>{role === 'teacher' && <Link href="/teacher/students" className="sp-nav-link" data-testid="link-nav-students"><GraduationCap size={18} />Meus alunos</Link>}<Link href="/admin" className="sp-nav-link muted" data-testid="link-nav-admin"><ShieldCheck size={18} />Admin preview</Link></div>
    <div className="sp-sidebar-footer"><button className="sp-button primary" style={{ width: '100%' }} onClick={onCompose} data-testid="button-compose-sidebar"><Plus size={16} /> Publicar vídeo</button><div className="sp-user-mini"><Avatar initials="LM" /><div style={{ minWidth: 0 }}><strong>Lucas Mendes</strong><span>{role === 'teacher' ? 'Professor de Educação Física' : 'Atleta / praticante'}</span></div><Link href="/profile" aria-label="Abrir perfil" data-testid="link-sidebar-profile" style={{ marginLeft: 'auto', color: 'inherit' }}><ArrowRight size={15} /></Link></div></div>
   </aside><main className="sp-main"><div className={`sp-content ${location === '/' || location === '/feed' ? 'sp-content-feed' : ''}`}>{children}</div></main></div>
  <nav className="sp-mobile-bar" aria-label="Navegação móvel"><Link href="/feed" className="sp-mobile-nav" aria-current={active('/feed') ? 'page' : undefined} data-testid="link-mobile-home"><Home size={20} /><span>Início</span></Link><Link href="/discover" className="sp-mobile-nav" aria-current={active('/discover') ? 'page' : undefined} data-testid="link-mobile-search"><Search size={20} /><span>Pesquisar</span></Link><Link href="/publish" className="sp-mobile-nav create" aria-label="Publicar vídeo" data-testid="link-mobile-publish"><Plus size={22} /><span>Publicar</span></Link><Link href="/rankings" className="sp-mobile-nav" aria-current={active('/rankings') ? 'page' : undefined} data-testid="link-mobile-ranking"><Trophy size={20} /><span>Ranking</span></Link><Link href="/profile" className="sp-mobile-nav" aria-current={active('/profile') ? 'page' : undefined} data-testid="link-mobile-profile"><UserRound size={20} /><span>Perfil</span></Link></nav></div>;
}

function VideoVisual({ post, compact = false }: { post: Post; compact?: boolean }) { return <div className={`sp-video-visual ${post.visual} ${compact ? 'compact' : ''}`} role="img" aria-label={`Prévia do vídeo de ${sportLabels[post.sport]}`}><div className="sp-video-grid" /><span className="sp-play"><Play size={18} fill="currentColor" /></span><span className="sp-video-label">{sportLabels[post.sport]} / sessão compartilhada</span></div>; }
function PostCard({ post, onNotify, onChallenge }: { post: Post; onNotify: (message: string) => void; onChallenge: (name: string) => void }) {
  const [starred, setStarred] = useState(() => readStorage<Record<string, boolean>>('sportplus-stars', {})[post.id] ?? false);
  const [commentOpen, setCommentOpen] = useState(false); const [comment, setComment] = useState(''); const [comments, setComments] = useState(post.commentList ?? []);
  const toggleStar = () => { const current = readStorage<Record<string, boolean>>('sportplus-stars', {}); const next = { ...current, [post.id]: !current[post.id] }; writeStorage('sportplus-stars', next); setStarred(next[post.id]); onNotify(next[post.id] ? 'Estrela registrada. O reconhecimento chega ao perfil do atleta.' : 'Estrela removida.'); };
  const addComment = () => { if (!comment.trim()) return; setComments((items) => [...items, comment.trim()]); setComment(''); onNotify('Comentário adicionado à conversa.'); };
  return <article className="sp-card sp-post" data-testid={`card-post-${post.id}`}><div className="sp-post-head"><Link href={`/profile/${post.handle}`}><Avatar initials={post.initials} /></Link><div className="sp-post-meta"><strong data-testid={`text-post-author-${post.id}`}>{post.name}</strong><span>@{post.handle} · {post.time}</span></div><RoleBadge role={post.role} /><button className="sp-icon-button subtle" aria-label={`Mais opções de ${post.name}`} data-testid={`button-post-menu-${post.id}`}><MoreHorizontal size={17} /></button></div><Link href={`/video/${post.id}`} className="sp-post-title-link"><h3 data-testid={`text-post-title-${post.id}`}>{post.title}</h3></Link><p className="sp-post-copy" data-testid={`text-post-copy-${post.id}`}>{post.copy}</p><VideoVisual post={post} /><div className="sp-post-sport"><span>{sportLabels[post.sport]}</span>{post.tags?.map((tag) => <span className="sp-hashtag" key={tag}>#{tag}</span>)}</div><div className="sp-post-actions"><button className={`sp-action ${starred ? 'starred' : ''}`} onClick={toggleStar} aria-pressed={starred} data-testid={`button-star-${post.id}`}><Star size={17} fill={starred ? 'currentColor' : 'none'} /> {post.stars + (starred ? 1 : 0)}</button><button className="sp-action" onClick={() => setCommentOpen((value) => !value)} aria-expanded={commentOpen} data-testid={`button-comment-${post.id}`}><MessageCircle size={17} /> {post.comments + comments.length}</button><button className="sp-action" onClick={() => onChallenge(post.name)} data-testid={`button-challenge-${post.id}`}><Swords size={16} /> Desafiar</button><button className="sp-action share" onClick={() => onNotify('Link copiado para compartilhar com sua próxima parceria.')} data-testid={`button-share-${post.id}`}><Share2 size={16} /></button></div>{commentOpen && <div className="sp-comments">{comments.map((item, index) => <div className="sp-comment" key={`${post.id}-comment-${index}`} data-testid={`text-comment-${post.id}-${index}`}><strong>{index === 0 ? 'Membro da comunidade' : 'Lucas Mendes'}</strong>{item}</div>)}<div className="sp-comment-row"><input value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addComment(); }} placeholder="Comente algo útil…" aria-label={`Comentar em ${post.title}`} data-testid={`input-comment-${post.id}`} /><button className="sp-icon-button" onClick={addComment} aria-label="Enviar comentário" data-testid={`button-submit-comment-${post.id}`}><Send size={15} /></button></div></div>}</article>;
}

function Feed({ notify, onCompose }: { notify: (message: string) => void; onCompose: () => void }) {
  const [posts, setPosts] = useState<Post[]>(() => [...readStorage<Post[]>('sportplus-posts', []), ...starterPosts]);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [, setLocation] = useLocation();
  useEffect(() => { const handler = (event: Event) => { const post = (event as CustomEvent<Post>).detail; if (post) setPosts((current) => [post, ...current]); }; window.addEventListener('sportplus-post-published', handler); return () => window.removeEventListener('sportplus-post-published', handler); }, []);
  const goChallenge = (name: string) => { writeStorage('sportplus-challenge-target', name); notify(`Desafio preparado para ${name}. Escolha formato, data e local.`); setLocation('/challenges/new'); };
  return <><Topbar eyebrow="segunda-feira · Lisboa" action={<span className="sp-location"><MapPin size={13} /> Comunidade por perto</span>} /><section className="sp-hero"><div className="sp-hero-copy"><span className="sp-kicker">A rede de quem se movimenta</span><h1 className="sp-display">O esporte<br /><span>conecta.</span></h1><p>Publique uma sessão, encontre alguém no mesmo ritmo e transforme uma conversa em jogo. Aqui, a próxima atividade começa com uma pessoa.</p><div className="sp-hero-actions"><button className="sp-button primary" onClick={onCompose} data-testid="button-publish-hero"><Plus size={16} /> Publicar vídeo</button><Link href="/challenges" className="sp-button ghost light" data-testid="link-hero-challenges">Encontrar para jogar <ArrowRight size={15} /></Link></div></div><div className="sp-hero-stat"><span className="sp-kicker">Movimento hoje</span><strong className="sp-display" data-testid="text-active-count">2.418</strong><p>pessoas treinando, ensinando ou procurando uma partida agora.</p><Link href="/discover" className="sp-quiet-link" data-testid="link-find-people">Conheça a comunidade <ArrowRight size={14} /></Link></div></section><div className="sp-bridge"><div><span className="sp-kicker">O próximo passo</span><h2>Viu um vídeo. Encontrou um ritmo.</h2></div><Link href="/challenges" className="sp-button green small" data-testid="link-feed-challenges">Explorar desafios <Swords size={14} /></Link></div><div className="sp-grid-feed"><section className="sp-feed-column"><div className="sp-section-title"><h2 className="sp-display">O que está rolando</h2><Link href="/discover" data-testid="link-feed-discover">Ver toda atividade <ArrowRight size={12} /></Link></div><div className="sp-card sp-composer"><Avatar initials="LM" /><button className="sp-composer-input" onClick={onCompose} data-testid="button-composer">O que você está praticando hoje, Lucas?</button><Link href="/publish" className="sp-icon-button" aria-label="Adicionar publicação" data-testid="link-composer-add"><Plus size={18} /></Link></div>{posts.map((post) => <PostCard key={post.id} post={post} onNotify={notify} onChallenge={goChallenge} />)}</section><aside className="sp-side-stack"><section className="sp-card sp-side-card"><div className="sp-section-title"><h3>Pessoas para jogar</h3><Link href="/discover" data-testid="link-side-discover">Mais</Link></div><div className="sp-mini-list">{people.slice(0, 3).map((person, index) => <div className="sp-mini-row" key={person.id}><Avatar initials={person.initials} index={index} /><div className="sp-mini-copy"><strong>{person.name}</strong><span>{person.sport}</span></div><button className={`sp-follow ${followed[person.id] ? 'followed' : ''}`} onClick={() => { const next = { ...followed, [person.id]: !followed[person.id] }; setFollowed(next); notify(next[person.id] ? `Conexão enviada para ${person.name}.` : 'Conexão removida.'); }} data-testid={`button-connect-${person.id}`}>{followed[person.id] ? 'Enviado' : 'Conectar'}</button></div>)}</div></section><section className="sp-card sp-side-card"><div className="sp-section-title"><h3>Esportes em alta</h3><Flame size={16} color="hsl(var(--primary))" /></div><div className="sp-tag-cloud">{['#futsal', '#corrida', '#jogolimpo', '#parceirodetreino', '#natação'].map((tag) => <span className="sp-tag" key={tag}>{tag}</span>)}</div></section><section className="sp-card sp-side-card side-highlight"><span className="sp-kicker">Convite aberto</span><h3>Amistoso de futsal</h3><p>Terça · 20:30 · Restelo</p><Link href="/challenges/c2" className="sp-button dark small" data-testid="link-nearby-event">Ver detalhes <ArrowRight size={13} /></Link></section></aside></div></>;
}

function VerticalFeed({ notify, onCompose }: { notify: (message: string) => void; onCompose: () => void }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [activeId, setActiveId] = useState(verticalVideos[0].id);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [starred, setStarred] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
      if (!visible) return;
      const id = (visible.target as HTMLElement).dataset.videoId;
      if (!id) return;
      setActiveId(id);
    }, { root, threshold: [0.65, 0.8, 0.95] });
    const slides = root.querySelectorAll<HTMLElement>('[data-video-id]');
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (!video) return;
      video.muted = muted;
      if (id === activeId) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [activeId, muted]);

  const toggle = (state: Record<string, boolean>, setState: (value: Record<string, boolean>) => void, id: string, message: string) => {
    const next = { ...state, [id]: !state[id] };
    setState(next);
    notify(next[id] ? message : 'Interação removida.');
  };

  return <div className="sp-video-feed-shell">
    <header className="sp-video-feed-header">
      <Link href="/feed" className="sp-logo" data-testid="link-video-feed-brand"><span className="sp-logo-mark"><Activity size={16} strokeWidth={3} /></span>SPORT<span>+</span></Link>
      <div className="sp-video-feed-header-actions">
        <span className="sp-video-feed-live"><span /> AO VIVO NA COMUNIDADE</span>
        <Link href="/discover" className="sp-feed-search" aria-label="Pesquisar vídeos e pessoas" data-testid="link-video-feed-search"><Search size={17} /></Link>
        <button className="sp-feed-compose" onClick={onCompose} aria-label="Publicar vídeo" data-testid="button-video-feed-compose"><Plus size={18} /></button>
      </div>
    </header>
    <div className="sp-video-feed" ref={feedRef} data-testid="vertical-video-feed">
      {verticalVideos.map((video, index) => {
        const isActive = activeId === video.id;
        const isLiked = Boolean(liked[video.id]);
        const isStarred = Boolean(starred[video.id]);
        return <article className={`sp-video-slide ${video.accent}`} key={video.id} data-video-id={video.id} data-testid={`video-slide-${index + 1}`}>
          <video
            ref={(node) => { videoRefs.current[video.id] = node; }}
            className="sp-video-player"
            src={video.source}
            autoPlay={index === 0}
            muted={muted}
            loop
            playsInline
            preload={index < 2 ? 'auto' : 'metadata'}
            onClick={(event) => {
              const current = event.currentTarget;
              if (current.paused) void current.play().catch(() => undefined);
              else current.pause();
            }}
            aria-label={`Vídeo de ${video.name} sobre ${sportLabels[video.sport]}`}
          />
          <div className="sp-video-shade" />
          <div className="sp-video-fallback" aria-hidden="true"><span>{sportLabels[video.sport]}</span><strong>{video.name}</strong></div>
          <div className="sp-video-slide-top">
            <span className="sp-video-index">{String(index + 1).padStart(2, '0')} / {String(verticalVideos.length).padStart(2, '0')}</span>
            {isActive && <span className="sp-video-playing"><span /> REPRODUZINDO</span>}
          </div>
          <div className="sp-video-info">
            <div className="sp-video-author">
              <Link href={`/profile/${video.handle}`} aria-label={`Abrir perfil de ${video.name}`}><Avatar initials={video.initials} index={index} /></Link>
              <div><strong>{video.name}</strong><span>{video.handle}</span></div>
              <RoleBadge role={video.role} />
            </div>
            <span className="sp-video-sport">{sportLabels[video.sport]}</span>
            <p>{video.description}</p>
            <div className="sp-video-tags"><span>#movimento</span><span>#sportplus</span></div>
          </div>
          <aside className="sp-video-actions" aria-label={`Ações do vídeo de ${video.name}`}>
            <button className={`sp-video-action ${isStarred ? 'active' : ''}`} onClick={() => toggle(starred, setStarred, video.id, 'Estrela registrada para este atleta.')} aria-pressed={isStarred} data-testid={`button-video-star-${video.id}`}><Star size={23} fill={isStarred ? 'currentColor' : 'none'} /><span>{video.stars + (isStarred ? 1 : 0)}</span></button>
            <button className={`sp-video-action ${isLiked ? 'active like' : ''}`} onClick={() => toggle(liked, setLiked, video.id, 'Curtida registrada.')} aria-pressed={isLiked} data-testid={`button-video-like-${video.id}`}><Heart size={23} fill={isLiked ? 'currentColor' : 'none'} /><span>{video.likes + (isLiked ? 1 : 0)}</span></button>
            <button className="sp-video-action" onClick={() => notify('Comentários prontos para entrar na conversa.')} data-testid={`button-video-comment-${video.id}`}><MessageCircle size={23} /><span>{video.comments}</span></button>
            <button className="sp-video-action" onClick={() => notify('Link do vídeo copiado para compartilhar.')} data-testid={`button-video-share-${video.id}`}><Share2 size={22} /><span>Enviar</span></button>
            <button className="sp-video-action" onClick={() => notify(`Desafio preparado para ${video.name}.`)} data-testid={`button-video-challenge-${video.id}`}><Swords size={22} /><span>Desafiar</span></button>
            <button className="sp-video-action sound" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Ativar som' : 'Desativar som'} data-testid={`button-video-sound-${video.id}`}>{muted ? <VolumeX size={21} /> : <Volume2 size={21} />}<span>{muted ? 'Som' : 'Mudo'}</span></button>
          </aside>
        </article>;
      })}
    </div>
    <div className="sp-video-feed-hint"><ChevronDown size={15} /> deslize para descobrir o próximo</div>
  </div>;
}

function Discover({ notify }: { notify: (message: string) => void }) {
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState<'todos' | Sport>('todos'); const [tab, setTab] = useState<'pessoas' | 'vídeos'>('pessoas'); const [connected, setConnected] = useState<Record<string, boolean>>({});
  const posts = [...starterPosts, ...readStorage<Post[]>('sportplus-posts', [])];
  const peopleResults = useMemo(() => people.filter((person) => `${person.name} ${person.sport} ${person.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'todos' || person.tags.some((tag) => tag.toLowerCase().includes(filter)))), [query, filter]);
  const videoResults = useMemo(() => posts.filter((post) => `${post.title} ${post.copy} ${post.sport} ${post.tags?.join(' ')}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'todos' || post.sport === filter)), [posts, query, filter]);
  return <><Topbar eyebrow="Encontre sua próxima parceria" /><div className="sp-page-intro"><div><span className="sp-kicker">Pesquisar</span><h1 className="sp-display">Mais pessoas.<br /><span>Mais jogo.</span></h1></div><p>Busque vídeos, atletas e professores por esporte. A melhor conexão é aquela que vira uma atividade.</p></div><div className="sp-search-wrap"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar vídeo, pessoa ou esporte" aria-label="Buscar no SPORT+" data-testid="input-discover-search" /></div><div className="sp-discover-controls"><div className="sp-tabs"><button className={tab === 'pessoas' ? 'active' : ''} onClick={() => setTab('pessoas')} data-testid="button-search-people"><Users size={15} /> Pessoas</button><button className={tab === 'vídeos' ? 'active' : ''} onClick={() => setTab('vídeos')} data-testid="button-search-videos"><Video size={15} /> Vídeos</button></div><div className="sp-sport-select"><SlidersHorizontal size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value as 'todos' | Sport)} aria-label="Filtrar por esporte" data-testid="select-discover-sport"><option value="todos">Todos os esportes</option>{sports.map((sport) => <option key={sport} value={sport}>{sportLabels[sport]}</option>)}</select><ChevronDown size={14} /></div></div>{tab === 'pessoas' ? (peopleResults.length ? <div className="sp-discover-grid">{peopleResults.map((person, index) => <article className="sp-card sp-person-card" key={person.id} data-testid={`card-person-${person.id}`}><div className="sp-person-top"><Link href={`/profile/${person.handle}`}><Avatar initials={person.initials} index={index} large /></Link><RoleBadge role={person.role} /></div><h3>{person.name}</h3><p>{person.sport}</p><div className="sp-person-stars"><Star size={14} fill="currentColor" /> {person.stars} estrelas</div><div className="sp-tag-cloud">{person.tags.map((tag) => <span className="sp-tag" key={tag}>{tag}</span>)}</div><div className="sp-card-actions"><Link href={`/profile/${person.handle}`} className="sp-button ghost small" data-testid={`link-person-${person.id}`}>Ver perfil</Link><button className={`sp-button ${connected[person.id] ? 'green' : 'primary'} small`} onClick={() => { const next = { ...connected, [person.id]: !connected[person.id] }; setConnected(next); notify(next[person.id] ? `Você está conectado com ${person.name}.` : 'Conexão removida.'); }} data-testid={`button-connect-${person.id}`}>{connected[person.id] ? <><Check size={14} /> Conectado</> : <><Link2 size={14} /> Conectar</>}</button></div></article>)}</div> : <EmptyState icon={<Search />} title="Ninguém encontrado" copy="Tente outro esporte ou termo. Sua próxima parceria pode estar perto." onClear={() => { setQuery(''); setFilter('todos'); }} />) : (videoResults.length ? <div className="sp-video-grid-results">{videoResults.map((post) => <Link href={`/video/${post.id}`} className="sp-card sp-video-result" key={post.id} data-testid={`card-video-result-${post.id}`}><VideoVisual post={post} compact /><div><strong>{post.title}</strong><span>{post.name} · {sportLabels[post.sport]}</span><small><Star size={12} fill="currentColor" /> {post.stars} estrelas</small></div></Link>)}</div> : <EmptyState icon={<Video />} title="Nenhum vídeo encontrado" copy="Experimente buscar por uma técnica, sessão ou esporte." onClear={() => { setQuery(''); setFilter('todos'); }} />)}</>;
}
function EmptyState({ icon, title, copy, onClear }: { icon: ReactNode; title: string; copy: string; onClear: () => void }) { return <div className="sp-empty" data-testid="empty-search">{icon}<h3>{title}</h3><p>{copy}</p><button className="sp-button ghost small" onClick={onClear} data-testid="button-clear-search">Limpar busca</button></div>; }

function Rankings() {
  const [filter, setFilter] = useState<'todos' | Sport>('todos'); const rows = [{ initials: 'LC', name: 'Leonor Cruz', sport: 'vôlei', score: 986 }, { initials: 'MG', name: 'Marta Gomes', sport: 'atletismo', score: 772 }, { initials: 'DF', name: 'Duarte Ferreira', sport: 'natação', score: 641 }, { initials: 'AS', name: 'Ana Silva', sport: 'corrida', score: 518 }, { initials: 'TC', name: 'Tiago Costa', sport: 'tênis', score: 382 }, { initials: 'LM', name: 'Lucas Mendes', sport: 'basquete', score: 247 }].filter((row) => filter === 'todos' || row.sport === filter);
  return <><Topbar eyebrow="Placar da comunidade" /><div className="sp-page-intro"><div><span className="sp-kicker">Ranking</span><h1 className="sp-display">Reconheça quem<br /><span>faz acontecer.</span></h1></div><p>Estrelas são reconhecimento por consistência, generosidade e pelo esporte que acontece fora dos holofotes.</p></div><div className="sp-ranking-tools"><div className="sp-filter-row">{<button className={`sp-filter ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')} data-testid="button-ranking-general">Geral</button>}{sports.map((sport) => <button className={`sp-filter ${filter === sport ? 'active' : ''}`} key={sport} onClick={() => setFilter(sport)} data-testid={`button-ranking-${sport}`}>{sportLabels[sport]}</button>)}</div></div><div className="sp-rank-grid"><section className="sp-card sp-rank-table"><div className="sp-table-head"><span>POSIÇÃO</span><span>ATLETA</span><span>ESTRELAS</span><span>VARIAÇÃO</span></div>{rows.map((item, index) => <div className={`sp-rank-row ${item.name === 'Lucas Mendes' ? 'you' : ''}`} key={item.name} data-testid={`row-ranking-${index + 1}`}><span className="sp-rank-number">{String(index + 1).padStart(2, '0')}</span><div className="sp-mini-row"><Avatar initials={item.initials} index={index} /><div className="sp-mini-copy"><strong>{item.name}{item.name === 'Lucas Mendes' && <em>VOCÊ</em>}</strong><span>{sportLabels[item.sport as Sport]}</span></div></div><span className="sp-rank-score"><Star size={13} fill="currentColor" /> {item.score}</span><span className="sp-rank-trend">+{index === 0 ? 24 : index === 1 ? 16 : 8}</span></div>)}</section><aside className="sp-side-stack"><section className="sp-rank-intro"><span className="sp-kicker">Seu momento</span><h2 className="sp-display">Você está no jogo.</h2><p>3 sessões compartilhadas, 5 estrelas recebidas e uma nova parceria encontrada nesta semana.</p><Link href="/profile" className="sp-button primary small" data-testid="link-ranking-profile">Ver meu perfil <ArrowRight size={13} /></Link></section><section className="sp-card sp-side-card"><span className="sp-kicker">Como funciona</span><h3>Uma estrela reconhece o esporte real.</h3><p>Você só pode avaliar o mesmo vídeo uma vez. Suas próprias publicações não entram na sua contagem.</p></section></aside></div></>;
}

function Challenges({ notify }: { notify: (message: string) => void }) {
  const [joined, setJoined] = useState<Record<string, boolean>>(() => readStorage<Record<string, boolean>>('sportplus-challenges', {}));
  const toggle = (challenge: Challenge) => { const next = { ...joined, [challenge.id]: !joined[challenge.id] }; setJoined(next); writeStorage('sportplus-challenges', next); notify(next[challenge.id] ? `Você entrou em “${challenge.title}”.` : `Você saiu de “${challenge.title}”.`); };
  return <><Topbar eyebrow="Encontre alguém para jogar" action={<Link href="/challenges/new" className="sp-button primary small" data-testid="link-new-challenge"><Plus size={14} /> Criar desafio</Link>} /><div className="sp-page-intro"><div><span className="sp-kicker">Desafios</span><h1 className="sp-display">Do feed<br /><span>para a quadra.</span></h1></div><p>Escolha um formato, combine local e horário e transforme uma interação em atividade esportiva.</p></div><div className="sp-challenge-types"><span><Swords size={15} />X1</span><span><Users size={15} />Amistoso</span><span><Trophy size={15} />Jogo</span><span><CalendarDays size={15} />Campeonato</span></div><div className="sp-challenge-grid">{baseChallenges.map((challenge) => <article className="sp-card sp-challenge-card" key={challenge.id} data-testid={`card-challenge-${challenge.id}`}><div className="sp-challenge-top"><span className="sp-type-label">{challenge.type}</span><span className="sp-sport-label">{sportLabels[challenge.sport]}</span></div><Link href={`/challenges/${challenge.id}`}><h3 className="sp-display">{challenge.title}</h3></Link><p>{challenge.copy}</p><div className="sp-challenge-meta"><span><CalendarDays size={13} />{challenge.date} · {challenge.time}</span><span><MapPin size={13} />{challenge.place}</span></div><div className="sp-challenge-foot"><span><Users size={13} /> {challenge.participants} participantes</span><button className={`sp-button ${joined[challenge.id] ? 'green' : 'primary'} small`} onClick={() => toggle(challenge)} aria-pressed={Boolean(joined[challenge.id])} data-testid={`button-join-${challenge.id}`}>{joined[challenge.id] ? <><Check size={14} /> Participando</> : <>Participar <ArrowRight size={13} /></>}</button></div></article>)}</div><DemoNote /></>;
}

function ChallengeNew({ notify }: { notify: (message: string) => void }) {
  const [, setLocation] = useLocation(); const [form, setForm] = useState({ title: '', type: 'X1', sport: 'futebol' as Sport, date: '', time: '', place: '', copy: '' });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!form.title || !form.date || !form.place) return; const challenge: Challenge = { id: `local-${Date.now()}`, title: form.title, type: form.type, sport: form.sport, date: form.date, time: form.time || 'a combinar', place: form.place, copy: form.copy || 'Uma atividade criada pela comunidade SPORT+.', host: 'Lucas Mendes', participants: 1 }; const current = readStorage<Challenge[]>('sportplus-local-challenges', []); writeStorage('sportplus-local-challenges', [challenge, ...current]); notify('Desafio criado localmente.'); setLocation(`/challenges/${challenge.id}`); };
  return <><Topbar eyebrow="Organize a atividade" /><div className="sp-form-page"><Link href="/challenges" className="sp-back-link" data-testid="link-back-challenges"><ArrowLeft size={15} /> Voltar para desafios</Link><div className="sp-page-intro compact"><div><span className="sp-kicker">Novo desafio</span><h1 className="sp-display">Chame para<br /><span>jogar.</span></h1></div><p>Defina o básico. O objetivo é marcar uma atividade, não preencher uma planilha.</p></div><form className="sp-card sp-form-card" onSubmit={submit}><DemoNote /><div className="sp-form-grid"><label>Título do desafio<input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Ex.: Amistoso de quarta" required data-testid="input-challenge-title" /></label><label>Tipo<select value={form.type} onChange={(event) => update('type', event.target.value)} data-testid="select-challenge-type"><option>X1</option><option>Amistoso</option><option>Jogo</option><option>Campeonato</option></select></label><label>Esporte<select value={form.sport} onChange={(event) => update('sport', event.target.value)} data-testid="select-challenge-sport">{sports.map((sport) => <option key={sport} value={sport}>{sportLabels[sport]}</option>)}</select></label><label>Data<input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} required data-testid="input-challenge-date" /></label><label>Horário<input type="time" value={form.time} onChange={(event) => update('time', event.target.value)} data-testid="input-challenge-time" /></label><label>Local<input value={form.place} onChange={(event) => update('place', event.target.value)} placeholder="Ex.: Parque da cidade" required data-testid="input-challenge-place" /></label></div><label>Mensagem para quem entrar<textarea rows={4} value={form.copy} onChange={(event) => update('copy', event.target.value)} placeholder="Conte como vai funcionar…" data-testid="textarea-challenge-copy" /></label><div className="sp-form-footer"><Link href="/challenges" className="sp-button ghost" data-testid="link-cancel-challenge">Cancelar</Link><button type="submit" className="sp-button primary" data-testid="button-submit-challenge"><Swords size={15} /> Criar desafio</button></div></form></div></>;
}

function ChallengeDetail({ notify }: { notify: (message: string) => void }) {
  const params = useParams<{ id: string }>(); const local = readStorage<Challenge[]>('sportplus-local-challenges', []); const challenge = [...local, ...baseChallenges].find((item) => item.id === params.id) ?? baseChallenges[0]; const [status, setStatus] = useState(() => readStorage<Record<string, string>>('sportplus-challenge-status', {})[challenge.id] ?? '');
  const changeStatus = (next: string) => { setStatus(next); const current = readStorage<Record<string, string>>('sportplus-challenge-status', {}); writeStorage('sportplus-challenge-status', { ...current, [challenge.id]: next }); notify(next === 'accepted' || next === 'joined' ? 'Presença confirmada neste desafio.' : 'Convite recusado.'); };
  return <><Topbar eyebrow="Detalhes da atividade" /><div className="sp-detail-wrap"><Link href="/challenges" className="sp-back-link" data-testid="link-back-challenges"><ArrowLeft size={15} /> Todos os desafios</Link><section className="sp-card sp-challenge-detail"><div className="sp-detail-accent"><span className="sp-kicker">Desafio recebido · {challenge.type}</span><span className="sp-detail-icon"><Swords size={25} /></span></div><span className="sp-type-label">{sportLabels[challenge.sport]}</span><h1 className="sp-display" data-testid="text-challenge-title">{challenge.title}</h1><p className="sp-detail-copy">{challenge.copy}</p><div className="sp-detail-info"><div><CalendarDays size={18} /><span><small>Quando</small><strong>{challenge.date}<br />{challenge.time}</strong></span></div><div><MapPin size={18} /><span><small>Onde</small><strong>{challenge.place}</strong></span></div><div><Users size={18} /><span><small>Organizado por</small><strong>{challenge.host}</strong></span></div></div><div className="sp-detail-actions">{status === 'accepted' || status === 'joined' ? <button className="sp-button green" onClick={() => changeStatus('')} data-testid="button-leave-challenge"><Check size={16} /> Você está dentro</button> : <button className="sp-button primary" onClick={() => changeStatus('joined')} data-testid="button-accept-challenge"><Check size={16} /> Aceitar e participar</button>}{status !== 'joined' && <button className="sp-button ghost" onClick={() => changeStatus('declined')} data-testid="button-decline-challenge">Recusar</button>}<button className="sp-button ghost" onClick={() => notify('Link do desafio copiado.')} data-testid="button-share-challenge"><Share2 size={15} /> Compartilhar</button></div><DemoNote /></section></div></>;
}

function VideoDetail({ notify }: { notify: (message: string) => void }) {
  const params = useParams<{ id: string }>(); const posts = [...readStorage<Post[]>('sportplus-posts', []), ...starterPosts]; const post = posts.find((item) => item.id === params.id) ?? starterPosts[0]; const [starred, setStarred] = useState(false);
  return <><Topbar eyebrow="Vídeo em destaque" /><div className="sp-video-detail"><Link href="/feed" className="sp-back-link" data-testid="link-back-feed"><ArrowLeft size={15} /> Voltar para o feed</Link><div className="sp-video-detail-grid"><section><VideoVisual post={post} /><div className="sp-detail-video-actions"><button className={`sp-button ${starred ? 'green' : 'primary'}`} onClick={() => { setStarred(!starred); notify(starred ? 'Estrela removida.' : 'Estrela registrada.'); }} data-testid={`button-video-star-${post.id}`}><Star size={16} fill={starred ? 'currentColor' : 'none'} /> {post.stars + (starred ? 1 : 0)} estrelas</button><button className="sp-button ghost" onClick={() => notify('Você pode transformar essa descoberta em um desafio.')} data-testid={`button-video-challenge-${post.id}`}><Swords size={16} /> Desafiar</button></div></section><aside className="sp-card sp-video-detail-info"><div className="sp-post-head"><Link href={`/profile/${post.handle}`}><Avatar initials={post.initials} large /></Link><div className="sp-post-meta"><strong>{post.name}</strong><span>@{post.handle}</span></div><RoleBadge role={post.role} /></div><span className="sp-type-label">{sportLabels[post.sport]}</span><h1 className="sp-display">{post.title}</h1><p>{post.copy}</p><div className="sp-detail-stat"><Star size={17} /><strong>{post.stars}</strong><span>estrelas recebidas</span></div><div className="sp-tag-cloud">{post.tags?.map((tag) => <span className="sp-tag" key={tag}>#{tag}</span>)}</div><Link href={`/profile/${post.handle}`} className="sp-button ghost" data-testid={`link-video-profile-${post.id}`}>Ver perfil de {post.name} <ArrowRight size={14} /></Link></aside></div></div></>;
}

function Publish({ notify }: { notify: (message: string) => void }) {
  const [, setLocation] = useLocation(); const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState(''); const [form, setForm] = useState({ description: '', sport: 'futebol' as Sport, tags: '' }); const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => { const selected = event.target.files?.[0]; if (selected) { setFile(selected); setPreview(URL.createObjectURL(selected)); } };
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!file || !form.description) return; const post: Post = { id: `local-${Date.now()}`, initials: 'LM', name: 'Lucas Mendes', handle: 'lucasmendes', role: readStorage<Role>('sportplus-role', 'athlete'), time: 'agora', sport: form.sport, title: form.description.slice(0, 46), copy: form.description, visual: 'court', stars: 0, comments: 0, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), videoUrl: preview }; writeStorage('sportplus-posts', [post, ...readStorage<Post[]>('sportplus-posts', [])]); window.dispatchEvent(new CustomEvent<Post>('sportplus-post-published', { detail: post })); notify('Vídeo publicado nesta demonstração local.'); setLocation('/feed'); };
  return <><Topbar eyebrow="Compartilhe seu movimento" /><div className="sp-form-page"><div className="sp-page-intro compact"><div><span className="sp-kicker">Nova publicação</span><h1 className="sp-display">Mostre seu<br /><span>esporte.</span></h1></div><p>Vídeos curtos conectam pessoas. Publique uma sessão e abra espaço para a próxima.</p></div><form className="sp-card sp-publish-card" onSubmit={submit}><DemoNote /><div className="sp-upload-zone">{preview ? <video src={preview} controls className="sp-upload-preview" data-testid="video-upload-preview" /> : <><Video size={29} /><strong>Selecione um vídeo curto</strong><span>MP4 ou MOV · até 60 segundos</span><label className="sp-button primary small" htmlFor="publish-video"><Plus size={14} /> Escolher arquivo</label></>}<input id="publish-video" type="file" accept="video/mp4,video/quicktime,video/*" onChange={chooseFile} data-testid="input-publish-video" /></div>{file && <div className="sp-file-name" data-testid="text-selected-file"><Check size={14} /> {file.name}</div>}<label>Descrição<textarea rows={4} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Ex.: Treino de ataque no vôlei. Quem topa uma sessão?" required data-testid="textarea-publish-description" /></label><div className="sp-form-grid"><label>Esporte<select value={form.sport} onChange={(event) => update('sport', event.target.value)} data-testid="select-publish-sport">{sports.map((sport) => <option key={sport} value={sport}>{sportLabels[sport]}</option>)}</select></label><label>Tags <span className="sp-label-hint">separe por vírgulas</span><input value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="treino, parceiro, técnica" data-testid="input-publish-tags" /></label></div><div className="sp-form-footer"><Link href="/feed" className="sp-button ghost" data-testid="link-cancel-publish">Cancelar</Link><button className="sp-button primary" type="submit" disabled={!file || !form.description} data-testid="button-submit-publish"><Send size={15} /> Publicar vídeo</button></div></form></div></>;
}

function Profile({ notify }: { notify: (message: string) => void }) {
  const params = useParams<{ handle?: string }>(); const isMine = !params.handle || params.handle === 'lucasmendes'; const person = isMine ? { initials: 'LM', name: 'Lucas Mendes', handle: 'lucasmendes', sport: 'Basquete · Corrida', role: readStorage<Role>('sportplus-role', 'athlete'), stars: 247, tags: ['basquete', 'corrida', 'Lisboa'] } : people.find((item) => item.handle === params.handle) ?? people[0]; const role = person.role; const [editing, setEditing] = useState(false); const [localName, setLocalName] = useState(person.name); const videos = starterPosts.filter((post) => post.handle === person.handle || (isMine && post.id === 'post-1'));
  return <><Topbar eyebrow={isMine ? 'Seu esporte, em movimento' : 'Perfil esportivo'} action={isMine ? <button className="sp-button ghost small" onClick={() => setEditing(true)} data-testid="button-edit-profile"><Edit3 size={14} /> Editar perfil</button> : <button className="sp-button primary small" onClick={() => notify(`Desafio preparado para ${person.name}.`)} data-testid="button-profile-challenge"><Swords size={14} /> Desafiar</button>} /><section className="sp-profile-cover"><div className="sp-profile-head"><Avatar initials={person.initials} large /><div><div className="sp-profile-name-row"><h1 className="sp-display" data-testid="text-profile-name">{localName}</h1><RoleBadge role={role} /></div><p>@{person.handle} · Lisboa</p></div></div><div className="sp-cover-mark">+</div></section><div className="sp-profile-body"><section><div className="sp-stat-strip"><div className="sp-card sp-stat"><strong><Star size={17} fill="currentColor" />{person.stars}</strong><span>Estrelas recebidas</span></div><div className="sp-card sp-stat"><strong>{videos.length || 3}</strong><span>Vídeos publicados</span></div><div className="sp-card sp-stat"><strong>06</strong><span>Desafios</span></div></div><section className="sp-card sp-profile-about"><div className="sp-section-title"><h3>Sobre o jeito de jogar</h3>{isMine && <button className="sp-action" onClick={() => setEditing(true)} data-testid="button-edit-about">Editar</button>}</div><p>{role === 'teacher' ? 'Professor de Educação Física. Crio jogos que fazem toda a turma encontrar seu lugar no movimento.' : 'Atleta amador, parceiro de quadra e corredor de fim de semana. Sempre em busca de uma boa sessão.'}</p><div className="sp-tag-cloud">{person.tags.map((tag) => <span className="sp-tag" key={tag}>{tag}</span>)}</div></section><section className="sp-profile-videos"><div className="sp-section-title"><h2 className="sp-display">Vídeos</h2><span className="sp-muted-text">{videos.length || 3} publicados</span></div><div className="sp-profile-video-grid">{(videos.length ? videos : starterPosts.slice(0, 3)).map((video) => <Link href={`/video/${video.id}`} key={video.id} className="sp-profile-video" data-testid={`card-profile-video-${video.id}`}><VideoVisual post={video} compact /><strong>{video.title}</strong></Link>)}</div></section></section><aside className="sp-side-stack"><section className="sp-card sp-side-card"><span className="sp-kicker">Posição no ranking</span><div className="sp-profile-rank"><Trophy size={18} /><strong>#{role === 'teacher' ? '04' : '12'}</strong><span>em Lisboa · {sportLabels[role === 'teacher' ? 'atletismo' : 'basquete']}</span></div><Link href="/rankings" className="sp-quiet-link dark-text" data-testid="link-profile-ranking">Ver ranking <ArrowRight size={14} /></Link></section><section className="sp-card sp-side-card"><span className="sp-kicker">Próximas conexões</span><h3>Desafios e partidas</h3><Link href="/challenges" className="sp-button primary small" data-testid="link-profile-challenges"><Swords size={14} /> Explorar desafios</Link></section>{isMine && role === 'teacher' && <section className="sp-card sp-side-card teacher-card"><span className="sp-kicker">Área profissional</span><h3>Acompanhe seus alunos.</h3><Link href="/teacher/students" className="sp-button ghost small" data-testid="link-profile-students"><GraduationCap size={14} /> Meus alunos</Link></section>}</aside></div>{editing && <EditProfileModal name={localName} onClose={() => setEditing(false)} onSave={(name) => { setLocalName(name); setEditing(false); notify('Perfil atualizado nesta demonstração.'); }} />}</>;
}
function EditProfileModal({ name, onClose, onSave }: { name: string; onClose: () => void; onSave: (name: string) => void }) { const [value, setValue] = useState(name); return <div className="sp-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="sp-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title"><div className="sp-modal-head"><div><span className="sp-kicker">Seu perfil</span><h2 id="edit-profile-title" className="sp-display">Deixe com a sua cara.</h2></div><button className="sp-icon-button" onClick={onClose} aria-label="Fechar edição" data-testid="button-close-edit-profile"><X size={17} /></button></div><label>Nome<input value={value} onChange={(event) => setValue(event.target.value)} data-testid="input-profile-name" /></label><label>Bio<textarea defaultValue="Atleta amador, parceiro de quadra e corredor de fim de semana." rows={3} data-testid="input-profile-bio" /></label><div className="sp-modal-footer"><button className="sp-button ghost" onClick={onClose} data-testid="button-cancel-profile">Cancelar</button><button className="sp-button primary" onClick={() => onSave(value)} data-testid="button-save-profile"><Check size={15} /> Salvar</button></div></div></div>; }

function Welcome() { const [, setLocation] = useLocation(); const [role, setRole] = useState<Role>(() => readStorage<Role>('sportplus-role', 'athlete')); const enter = () => { writeStorage('sportplus-role', role); setLocation('/sign-up'); }; return <div className="sp-auth-page"><div className="sp-auth-shell"><section className="sp-auth-visual"><Link href="/welcome" className="sp-logo" data-testid="link-auth-brand"><span className="sp-logo-mark"><Activity size={17} strokeWidth={3} /></span>SPORT<span>+</span></Link><div className="sp-auth-statement"><span className="sp-kicker">A comunidade esportiva</span><h1 className="sp-display">Conecte-se<br />através do<br /><span>esporte.</span></h1><p>Publique. Reconheça. Desafie. Organize.</p></div><div className="sp-auth-orbit"><span>+</span><span>+</span><span>+</span></div></section><section className="sp-auth-panel"><span className="sp-kicker">Primeiro passo</span><h2 className="sp-display">Como você usa o SPORT+?</h2><p>Escolha o perfil que melhor representa o seu jeito de participar. Você pode mudar depois.</p><div className="sp-role-stack"><button className={`sp-role-card ${role === 'athlete' ? 'selected' : ''}`} onClick={() => setRole('athlete')} data-testid="button-welcome-athlete"><div className="sp-role-icon"><Activity size={20} /></div><strong>Sou atleta / praticante</strong><span>Treino, jogo, aprendo ou quero encontrar mais motivos para me movimentar.</span></button><button className={`sp-role-card ${role === 'teacher' ? 'selected' : ''}`} onClick={() => setRole('teacher')} data-testid="button-welcome-teacher"><div className="sp-role-icon"><GraduationCap size={20} /></div><strong>Sou professor de Educação Física</strong><span>Ajudo outras pessoas a encontrar confiança e participação no esporte.</span></button></div><button className="sp-button primary wide" onClick={enter} data-testid="button-enter-sport-plus">Começar <ArrowRight size={16} /></button><p className="sp-auth-foot">Já tem uma conta? <Link href="/sign-in" data-testid="link-welcome-login">Entrar com minha conta</Link></p></section></div></div>; }
function AuthScreen({ mode }: { mode: 'login' | 'signup' }) { const [, setLocation] = useLocation(); const role = readStorage<Role>('sportplus-role', 'athlete'); const [name, setName] = useState(''); const submit = (event: React.FormEvent) => { event.preventDefault(); if (mode === 'signup') writeStorage('sportplus-name', name || 'Lucas Mendes'); writeStorage('sportplus-role', role); setLocation('/feed'); }; return <div className="sp-auth-page"><div className="sp-auth-simple"><Link href="/welcome" className="sp-logo" data-testid="link-auth-brand"><span className="sp-logo-mark"><Activity size={17} strokeWidth={3} /></span>SPORT<span>+</span></Link><div className="sp-auth-form-wrap"><span className="sp-kicker">{mode === 'login' ? 'Bem-vindo de volta' : 'Criar perfil'}</span><h1 className="sp-display">{mode === 'login' ? 'Entre no movimento.' : 'Seu esporte começa aqui.'}</h1><p>{mode === 'login' ? 'Acesse sua comunidade e continue encontrando pessoas para jogar.' : 'Uma conta demo para experimentar o MVP. Nada é enviado para um servidor.'}</p><form onSubmit={submit} className="sp-auth-form">{mode === 'signup' && <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos chamar você?" required data-testid="input-signup-name" /></label>}<label>E-mail<input type="email" placeholder="voce@email.com" required data-testid={`input-${mode}-email`} /></label><label>Senha<input type="password" placeholder="••••••••" required data-testid={`input-${mode}-password`} /></label>{mode === 'signup' && <><label>Nome de usuário<input placeholder="@seuusuario" data-testid="input-signup-handle" /></label><div className="sp-auth-sport"><span className="sp-label">Seu esporte principal</span><div className="sp-tag-cloud">{sports.slice(0, 6).map((sport) => <button type="button" className="sp-tag" key={sport} data-testid={`button-signup-sport-${sport}`}>{sportLabels[sport]}</button>)}</div></div></>}<button type="submit" className="sp-button primary wide" data-testid={`button-submit-${mode}`}>{mode === 'login' ? 'Entrar na demonstração' : 'Criar conta demo'} <ArrowRight size={16} /></button></form><DemoNote /><div className="sp-auth-links">{mode === 'login' ? <><span>Não tem conta?</span><Link href="/signup" data-testid="link-to-signup">Criar uma conta</Link><Link href="/forgot" data-testid="link-forgot-password">Esqueci minha senha</Link><Link href="/welcome" data-testid="link-back-welcome"><ArrowLeft size={13} /> Voltar</Link></> : <><span>Já tem conta?</span><Link href="/login" data-testid="link-to-login">Entrar</Link><Link href="/welcome" data-testid="link-back-welcome"><ArrowLeft size={13} /> Voltar</Link></>}</div></div></div></div>; }
function ForgotPassword() { const [sent, setSent] = useState(false); return <div className="sp-auth-page"><div className="sp-auth-simple"><Link href="/welcome" className="sp-logo" data-testid="link-auth-brand"><span className="sp-logo-mark"><Activity size={17} strokeWidth={3} /></span>SPORT<span>+</span></Link><div className="sp-auth-form-wrap"><span className="sp-kicker">Recuperação de acesso</span><h1 className="sp-display">Volte para o jogo.</h1><p>{sent ? 'No produto real, você receberia um link por e-mail. Nesta demonstração, nada é enviado.' : 'Digite seu e-mail para simular a recuperação de senha.'}</p>{sent ? <div className="sp-empty"><Check size={23} /><h3>Solicitação simulada</h3><p>O fluxo está pronto para a integração segura na próxima fase.</p></div> : <form className="sp-auth-form" onSubmit={(event) => { event.preventDefault(); setSent(true); }}><label>E-mail<input type="email" placeholder="voce@email.com" required data-testid="input-forgot-email" /></label><button className="sp-button primary wide" type="submit" data-testid="button-submit-forgot">Enviar instruções <Send size={15} /></button></form>}<div className="sp-auth-links"><Link href="/login" data-testid="link-back-login"><ArrowLeft size={13} /> Voltar para entrar</Link></div></div></div></div>; }

function TeacherStudents({ notify }: { notify: (message: string) => void }) { const [query, setQuery] = useState(''); const [invited, setInvited] = useState<Record<string, string>>(() => readStorage<Record<string, string>>('sportplus-student-invites', {})); const results = people.filter((person) => person.name.toLowerCase().includes(query.toLowerCase()) || person.sport.toLowerCase().includes(query.toLowerCase())); const invite = (id: string, name: string) => { const nextStatus = invited[id] === 'sent' ? 'accepted' : invited[id] === 'accepted' ? 'accepted' : 'sent'; const next = { ...invited, [id]: nextStatus }; setInvited(next); writeStorage('sportplus-student-invites', next); notify(nextStatus === 'accepted' ? `${name} agora aparece em “Meus alunos”.` : `Convite enviado para ${name}.`); }; return <><Topbar eyebrow="Área do professor" /><div className="sp-page-intro"><div><span className="sp-kicker">Meus alunos</span><h1 className="sp-display">Acompanhe<br /><span>quem aprende.</span></h1></div><p>Encontre alunos na comunidade e acompanhe seus perfis, vídeos e estrelas. Neste demo, convites são locais.</p></div><section className="sp-card sp-students-toolbar"><div className="sp-search-wrap"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Encontrar aluno por nome ou esporte" aria-label="Encontrar aluno" data-testid="input-student-search" /></div><span className="sp-student-count"><Users size={15} /> 03 alunos vinculados</span></section><div className="sp-students-grid">{results.map((student, index) => <article className="sp-card sp-student-card" key={student.id} data-testid={`card-student-${student.id}`}><div className="sp-student-head"><Avatar initials={student.initials} index={index} large /><RoleBadge role={student.role} /></div><h3>{student.name}</h3><p>{student.sport}</p><div className="sp-person-stars"><Star size={14} fill="currentColor" /> {student.stars} estrelas</div><div className="sp-card-actions"><Link href={`/profile/${student.handle}`} className="sp-button ghost small" data-testid={`link-student-profile-${student.id}`}>Ver perfil</Link><button className={`sp-button ${invited[student.id] === 'sent' || invited[student.id] === 'accepted' ? 'green' : 'primary'} small`} onClick={() => invite(student.id, student.name)} disabled={invited[student.id] === 'accepted'} data-testid={`button-invite-student-${student.id}`}>{invited[student.id] === 'sent' ? <><Check size={14} /> Aceitar convite</> : invited[student.id] === 'accepted' ? 'Aluno vinculado' : <><Send size={14} /> Convidar</>}</button></div></article>)}</div><DemoNote /></>; }

function SettingsPage({ notify }: { notify: (message: string) => void }) {
  const [notifications, setNotifications] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [role, setRole] = useState<Role>(() => readStorage<Role>('sportplus-role', 'athlete'));
  const { signOut } = useClerk();
  const toggleRole = (next: Role) => { setRole(next); writeStorage('sportplus-role', next); notify('Tipo de conta atualizado.'); };
  return <><Topbar eyebrow="Ajuste sua experiência" /><div className="sp-page-intro"><div><span className="sp-kicker">Configurações</span><h1 className="sp-display">Seu espaço,<br /><span>suas regras.</span></h1></div><p>Gerencie seu perfil esportivo e as preferências da sua conta SPORT+.</p></div><div className="sp-settings-grid"><section className="sp-card sp-settings-card"><span className="sp-kicker">Conta</span><h2>Tipo de perfil</h2><div className="sp-role-choice"><button className={`sp-role-card ${role === 'athlete' ? 'selected' : ''}`} onClick={() => toggleRole('athlete')} data-testid="button-settings-athlete"><Activity size={18} /><strong>Atleta</strong><span>Encontrar partidas e parceiros.</span></button><button className={`sp-role-card ${role === 'teacher' ? 'selected' : ''}`} onClick={() => toggleRole('teacher')} data-testid="button-settings-teacher"><GraduationCap size={18} /><strong>Professor</strong><span>Acompanhar alunos e turmas.</span></button></div><button className="sp-setting-row" onClick={() => notify('A edição de dados pessoais ficará disponível na próxima versão.')} data-testid="button-edit-account"><div><strong>Dados pessoais</strong><span>Nome, usuário, cidade e esportes</span></div><ArrowRight size={16} /></button><button className="sp-setting-row" onClick={() => { localStorage.removeItem('sportplus-role'); void signOut({ redirectUrl: `${basePath}/welcome` }); }} data-testid="button-logout"><div><strong>Sair da conta</strong><span>Encerrar sua sessão com segurança</span></div><LogOut size={16} /></button></section><section className="sp-card sp-settings-card"><span className="sp-kicker">Preferências</span><h2>Como o SPORT+ fala com você</h2><ToggleRow title="Notificações da comunidade" copy="Novos desafios, convites e comentários" checked={notifications} onChange={() => setNotifications(!notifications)} testId="toggle-notifications" /><ToggleRow title="Perfil mais reservado" copy="Controle visual para a próxima fase" checked={privateProfile} onChange={() => setPrivateProfile(!privateProfile)} testId="toggle-private" /><button className="sp-setting-row" onClick={() => notify('Central de ajuda aberta.')} data-testid="button-help"><div><strong>Ajuda e segurança</strong><span>Denúncias, bloqueios e suporte</span></div><CircleHelp size={16} /></button></section></div><DemoNote /></>;
}
function ToggleRow({ title, copy, checked, onChange, testId }: { title: string; copy: string; checked: boolean; onChange: () => void; testId: string }) { return <button className="sp-toggle-row" onClick={onChange} aria-pressed={checked} data-testid={testId}><div><strong>{title}</strong><span>{copy}</span></div><span className={`sp-toggle ${checked ? 'on' : ''}`}><span /></span></button>; }
function AdminPage({ notify }: { notify: (message: string) => void }) { const [removed, setRemoved] = useState<Record<string, boolean>>({}); const items = starterPosts.slice(0, 3); return <><Topbar eyebrow="Área interna · demonstração" /><div className="sp-page-intro"><div><span className="sp-kicker">Admin preview</span><h1 className="sp-display">Modere o<br /><span>movimento.</span></h1></div><p>Uma visão inicial dos controles de moderação previstos para o produto. Separada da experiência de atletas e professores.</p></div><div className="sp-admin-warning"><ShieldCheck size={19} /><div><strong>Somente prévia de interface</strong><span>Nenhuma remoção ou bloqueio é enviado ao backend nesta versão local.</span></div></div><div className="sp-admin-stats"><div className="sp-card"><span>Usuários ativos</span><strong>2.418</strong></div><div className="sp-card"><span>Vídeos publicados</span><strong>684</strong></div><div className="sp-card"><span>Denúncias abertas</span><strong>07</strong></div></div><section className="sp-card sp-admin-table"><div className="sp-table-head"><span>CONTEÚDO</span><span>AUTOR</span><span>STATUS</span><span>AÇÃO</span></div>{items.map((post) => <div className="sp-admin-row" key={post.id} data-testid={`row-admin-${post.id}`}><div><strong>{post.title}</strong><span>{sportLabels[post.sport]} · {post.time}</span></div><span>{post.name}</span><span className={removed[post.id] ? 'status-removed' : 'status-ok'}>{removed[post.id] ? 'Removido' : 'Publicado'}</span><button className="sp-icon-button" onClick={() => { setRemoved({ ...removed, [post.id]: true }); notify('Conteúdo marcado como removido no demo.'); }} disabled={removed[post.id]} aria-label={`Remover ${post.title}`} data-testid={`button-remove-${post.id}`}><Flag size={15} /></button></div>)}</section></>; }

function AuthLoading() { return <div className="sp-auth-page"><div className="sp-auth-loading"><span className="sp-video-spinner" /><span>Preparando o SPORT+…</span></div></div>; }
function SignedInShell({ children, onCompose }: { children: ReactNode; onCompose: () => void }) {
  return <PersistentShell onCompose={onCompose}>{children}</PersistentShell>;
}
function ClerkSignInPage() { return <div className="sp-clerk-page"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>; }
function ClerkSignUpPage() { return <div className="sp-clerk-page"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>; }
function stripBase(path: string) { return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path; }
function Router({ onCompose, notify }: { onCompose: () => void; notify: (message: string) => void }) {
  const shell = (child: ReactNode) => <SignedInShell onCompose={onCompose}>{child}</SignedInShell>;
  return <RoutedErrorBoundary><Switch>
    <Route path="/welcome" component={Welcome} />
    <Route path="/sign-in/*?" component={ClerkSignInPage} />
    <Route path="/sign-up/*?" component={ClerkSignUpPage} />
    <Route path="/video/:id">{shell(<PersistentVideoDetail notify={notify} />)}</Route>
    <Route path="/publish">{shell(<PersistentPublishScreen notify={notify} />)}</Route>
    <Route path="/challenges/new">{shell(<PersistentChallengeNew notify={notify} />)}</Route>
    <Route path="/challenges/:id">{shell(<PersistentChallengeDetail notify={notify} />)}</Route>
    <Route path="/challenges">{shell(<PersistentChallenges />)}</Route>
    <Route path="/teacher/students">{shell(<PersistentTeacherStudents notify={notify} />)}</Route>
    <Route path="/settings">{shell(<PersistentSettings notify={notify} />)}</Route>
    <Route path="/admin">{shell(<AdminPage notify={notify} />)}</Route>
    <Route path="/profile/:handle">{shell(<PersistentProfile notify={notify} />)}</Route>
    <Route path="/profile">{shell(<PersistentProfile notify={notify} />)}</Route>
    <Route path="/discover">{shell(<PersistentDiscover notify={notify} />)}</Route>
    <Route path="/rankings">{shell(<PersistentRankings />)}</Route>
    <Route path="/feed">{shell(<PersistentFeedScreen onCompose={onCompose} notify={notify} />)}</Route>
    <Route path="/">{shell(<PersistentFeedScreen onCompose={onCompose} notify={notify} />)}</Route>
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function ClerkProviderWithRoutes({ onCompose, notify }: { onCompose: () => void; notify: (message: string) => void }) {
  const [, setLocation] = useLocation();
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={{
      theme: shadcn,
      cssLayerName: 'clerk',
      options: {
        logoPlacement: 'inside',
        logoLinkUrl: basePath || '/',
        logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
      },
      variables: {
        colorPrimary: '#b8ff3d',
        colorForeground: '#f3f6f0',
        colorMutedForeground: '#91a095',
        colorBackground: '#101711',
        colorInput: '#19231c',
        colorInputForeground: '#f3f6f0',
        colorDanger: '#ff6b6b',
        colorNeutral: '#314237',
        fontFamily: 'Manrope, sans-serif',
        borderRadius: '0.75rem',
      },
      elements: {
        cardBox: 'bg-[#101711] rounded-2xl w-[440px] max-w-full overflow-hidden',
        card: '!shadow-none !border-0 !bg-transparent',
        footer: '!shadow-none !border-0 !bg-transparent',
        formButtonPrimary: 'bg-[#b8ff3d] text-[#101711] hover:bg-[#c9ff70]',
      },
    }}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: { start: { title: 'Volte para o jogo', subtitle: 'Entre para descobrir sua próxima parceria' } },
      signUp: { start: { title: 'Entre para o movimento', subtitle: 'Crie seu perfil esportivo no SPORT+' } },
    }}
    routerPush={(to) => setLocation(stripBase(to))}
    routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
  ><Router onCompose={onCompose} notify={notify} /></ClerkProvider>;
}
function App() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [toast, setToast] = useState('');
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={basePath}><ClerkProviderWithRoutes onCompose={() => setComposeOpen(true)} notify={notify} /></WouterRouter>{composeOpen && <div className="sp-modal-backdrop"><div className="sp-modal quick-publish"><div className="sp-modal-head"><div><span className="sp-kicker">Publicar</span><h2 className="sp-display">Compartilhe seu movimento.</h2></div><button className="sp-icon-button" onClick={() => setComposeOpen(false)} aria-label="Fechar publicação rápida" data-testid="button-close-quick-publish"><X size={17} /></button></div><p>Use a tela completa para selecionar seu vídeo, adicionar descrição e marcar o esporte.</p><Link href="/publish" className="sp-button primary" onClick={() => setComposeOpen(false)} data-testid="link-open-publish"><Video size={15} /> Abrir publicação</Link></div></div>}{toast && <div className="sp-toast" role="status" data-testid="status-toast">{toast}</div>}<Toaster /></TooltipProvider></QueryClientProvider>;
}
export default App;