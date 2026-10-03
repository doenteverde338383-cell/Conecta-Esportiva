import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useUser, useClerk } from "@clerk/react";
import { Link, useLocation, useParams } from "wouter";
import {
  Activity, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, ChevronDown, Edit3,
  CircleHelp, GraduationCap, Heart, Home, Link2, LogOut, MapPin, MessageCircle, Plus,
  RefreshCw, Search, Send, Settings, Share2, SlidersHorizontal, Star, Swords, Trophy,
  UserPlus, UserRound, Users, Video, Volume2, VolumeX,
} from "lucide-react";

export type Role = "athlete" | "teacher" | "spectator";
export type Sport = "futebol" | "futsal" | "vôlei" | "handebol" | "basquete" | "tênis" | "atletismo" | "corrida" | "natação" | "outros";
export type AppProfile = {
  userId: string; name: string; username: string; age: number; sport: string;
  role: Role; city: string | null; photoPath: string | null; photoUrl: string | null;
  following?: boolean; followers?: number;
};
export type ApiVideo = {
  id: string; description: string; sport: Sport; tags: string[]; videoUrl: string;
  createdAt: string; likes: number; stars: number; comments: number; liked: boolean;
  starred: boolean; authorId: string; authorName: string; authorUsername: string;
  authorRole: Role; authorPhotoUrl: string | null;
  media: Array<{ objectPath: string; contentType: string; originalName: string; url: string }>;
};
type ApiInvitation = {
  id: string;
  category: "teacher" | "challenge";
  kind: "training_school" | "championship" | "challenge";
  message: string;
  sender: string;
  senderName: string;
  senderUsername: string;
  challengeId: string | null;
  challengeType?: string;
  sport?: string;
  date?: string;
  time?: string;
  location?: string;
  createdAt: string;
};
type ApiChallenge = {
  id: string; sport: Sport; type: string; date: string; time: string; location: string;
  message: string; participantCount: number; participants: string[]; host: string;
  hostUsername?: string; joined?: boolean; invited?: boolean;
};

const sports: Sport[] = ["futebol", "futsal", "vôlei", "handebol", "basquete", "tênis", "atletismo", "corrida", "natação", "outros"];
export const sportLabels: Record<Sport, string> = { futebol: "Futebol", futsal: "Futsal", "vôlei": "Vôlei", handebol: "Handebol", basquete: "Basquete", "tênis": "Tênis", atletismo: "Atletismo", corrida: "Corrida", "natação": "Natação", outros: "Outros" };

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(path, { ...init, headers, credentials: "include" });
  const body = await response.json().catch(() => null) as { error?: string } | T | null;
  if (!response.ok) throw new Error(body && typeof body === "object" && "error" in body ? String(body.error) : `Erro ${response.status}`);
  return body as T;
}

export async function uploadFile(file: File) {
  const prepared = await apiRequest<{ uploadURL: string; objectPath: string }>("/api/storage/uploads/request-url", {
    method: "POST", body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  const upload = await fetch(prepared.uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!upload.ok) throw new Error("Não foi possível enviar o arquivo");
  await apiRequest("/api/storage/uploads/complete", {
    method: "POST", body: JSON.stringify({ objectPath: prepared.objectPath, contentType: file.type, originalName: file.name }),
  });
  return prepared.objectPath;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}
function roleLabel(role: Role) { return role === "teacher" ? "Professor" : role === "spectator" ? "Espectador" : "Atleta"; }
function photoUrl(path: string | null) { return path ? `/api/storage${path}` : null; }
export function Avatar({ profile, large = false, index = 0 }: { profile?: { name?: string; photoUrl?: string | null }; large?: boolean; index?: number }) {
  const colors = ["lime", "violet", "slate", "orange"];
  return profile?.photoUrl
    ? <img className={`sp-avatar ${large ? "large" : ""}`} src={profile.photoUrl} alt={profile.name ?? "Perfil"} />
    : <div className={`sp-avatar ${colors[index % colors.length]} ${large ? "large" : ""}`}>{initials(profile?.name ?? "")}</div>;
}
export function RoleBadge({ role }: { role: Role }) { return <span className={`sp-role-badge ${role}`}><span className="sp-role-dot" />{roleLabel(role)}</span>; }
export function PageTop({ eyebrow, profile, action }: { eyebrow: string; profile: AppProfile; action?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [invitations, setInvitations] = useState<ApiInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const loadInvitations = async () => {
    setLoading(true);
    try {
      const result = await apiRequest<{ invitations: ApiInvitation[] }>("/api/profile/invitations");
      setInvitations(result.invitations);
    } catch (cause) { setInvitations([]); }
    finally { setLoading(false); }
  };
  const toggleNotifications = () => {
    const next = !open;
    setOpen(next);
    if (next) void loadInvitations();
  };
  const respond = async (invitation: ApiInvitation, action: "accept" | "decline") => {
    setBusyId(invitation.id);
    try {
      await apiRequest(invitation.category === "challenge"
        ? `/api/challenges/${encodeURIComponent(invitation.challengeId ?? invitation.id)}/invitation-response`
        : `/api/profile/invitations/${encodeURIComponent(invitation.id)}`, {
        method: invitation.category === "challenge" ? "POST" : "PATCH",
        body: JSON.stringify({ action }),
      });
      await loadInvitations();
    } catch (cause) { window.dispatchEvent(new CustomEvent("sportplus-notify", { detail: cause instanceof Error ? cause.message : "Não foi possível responder ao convite" })); }
    finally { setBusyId(""); }
  };
  return <header className="sp-topbar"><span className="sp-kicker">{eyebrow}</span><div className="sp-topbar-actions">{action}<div className="sp-notification-wrap"><button className="sp-icon-button" onClick={toggleNotifications} aria-label="Notificações e convites" aria-expanded={open} data-testid="button-notifications"><Bell size={16} />{invitations.length > 0 && <span className="sp-notification-count">{invitations.length}</span>}</button>{open && <section className="sp-notification-panel" aria-label="Notificações e convites"><div className="sp-notification-head"><strong>Convites recebidos</strong><button className="sp-icon-button" onClick={() => setOpen(false)} aria-label="Fechar notificações">×</button></div>{loading ? <p className="sp-muted-text">Carregando convites…</p> : invitations.length ? invitations.map((invitation) => <article className="sp-notification-item" key={`${invitation.category}:${invitation.id}`}><Link href={`/profile/${invitation.senderUsername}`} onClick={() => setOpen(false)}><strong>{invitation.senderName}</strong></Link><span>{invitation.category === "challenge" ? `Desafio ${invitation.challengeType ?? ""} · ${invitation.date ?? ""} ${invitation.time ?? ""}` : invitation.kind === "championship" ? "Convite para campeonato" : "Convite para escolinha"}</span><p>{invitation.message}</p>{invitation.category === "challenge" && invitation.location && <small>{invitation.location}</small>}<div className="sp-card-actions"><button className="sp-button primary small" onClick={() => void respond(invitation, "accept")} disabled={busyId === invitation.id}>{busyId === invitation.id ? "Salvando…" : "Aceitar"}</button><button className="sp-button ghost small" onClick={() => void respond(invitation, "decline")} disabled={busyId === invitation.id}>Recusar</button></div></article>) : <p className="sp-muted-text">{profile.role === "athlete" ? "Você não tem convites pendentes." : "Convites para atletas aparecem nesta área."}</p>}</section>}</div><Link href="/profile" aria-label="Abrir meu perfil" data-testid="link-topbar-profile"><Avatar profile={profile} /></Link></div></header>;
}
function initialsProfile(profile: AppProfile) { return { name: profile.name, photoUrl: profile.photoUrl }; }

export function PersistentLayout({ children, profile, onCompose }: { children: ReactNode; profile: AppProfile; onCompose: () => void }) {
  const [location] = useLocation();
  const nav = [{ href: "/feed", label: "Início", icon: Home }, { href: "/discover", label: "Pesquisar", icon: Search }, { href: "/rankings", label: "Ranking", icon: Trophy }, { href: "/challenges", label: "Desafios", icon: Swords }, { href: "/profile", label: "Perfil", icon: UserRound }];
  const active = (href: string) => href === "/feed" ? location === "/" || location === "/feed" : location.startsWith(href);
  return <div className="sp-app"><div className="sp-shell"><aside className="sp-sidebar">
    <Link href="/feed" className="sp-logo" data-testid="link-brand"><span className="sp-logo-mark"><Activity size={17} strokeWidth={3} /></span>SPORT<span>+</span></Link>
    <div className="sp-sidebar-tag">REDE ESPORTIVA</div><details className="sp-profile-help"><summary><CircleHelp size={14} /> Tipos de perfil</summary><p><strong>Atleta:</strong> publica, interage, segue perfis e cria desafios.</p><p><strong>Professor:</strong> tem as funções do atleta e pode convidar atletas para escolinhas e campeonatos.</p><p><strong>Espectador:</strong> assiste, segue e interage, sem publicar nem criar desafios.</p></details><nav className="sp-nav" aria-label="Navegação principal">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="sp-nav-link" aria-current={active(href) ? "page" : undefined} data-testid={`link-nav-${href.slice(1)}`}><Icon size={18} strokeWidth={active(href) ? 2.6 : 1.8} />{label}{href === "/challenges" && <span className="sp-nav-pulse" />}</Link>)}</nav>
    <div className="sp-sidebar-links"><Link href="/settings" className="sp-nav-link" data-testid="link-nav-settings"><Settings size={18} />Configurações</Link>{profile.role === "teacher" && <Link href="/teacher/students" className="sp-nav-link" data-testid="link-nav-students"><GraduationCap size={18} />Meus alunos</Link>}</div>
    <div className="sp-sidebar-footer">{profile.role !== "spectator" && <button className="sp-button primary" style={{ width: "100%" }} onClick={onCompose} data-testid="button-compose-sidebar"><Plus size={16} /> Publicar vídeo</button>}<div className="sp-user-mini"><Avatar profile={initialsProfile(profile)} /><div style={{ minWidth: 0 }}><strong>{profile.name}</strong><span>{profile.role === "teacher" ? "Professor de Educação Física" : profile.role === "spectator" ? "Espectador" : "Atleta / praticante"}</span></div><Link href="/profile" aria-label="Abrir perfil" data-testid="link-sidebar-profile" style={{ marginLeft: "auto", color: "inherit" }}><ArrowRight size={15} /></Link></div></div>
  </aside><main className="sp-main"><div className={`sp-content ${location === "/" || location === "/feed" ? "sp-content-feed" : ""}`}>{children}</div></main></div>
    <nav className="sp-mobile-bar" aria-label="Navegação móvel"><Link href="/feed" className="sp-mobile-nav"><Home size={20} /><span>Início</span></Link><Link href="/discover" className="sp-mobile-nav"><Search size={20} /><span>Pesquisar</span></Link>{profile.role !== "spectator" && <Link href="/publish" className="sp-mobile-nav create"><Plus size={22} /><span>Publicar</span></Link>}<Link href="/rankings" className="sp-mobile-nav"><Trophy size={20} /><span>Ranking</span></Link><Link href="/profile" className="sp-mobile-nav"><UserRound size={20} /><span>Perfil</span></Link></nav></div>;
}

function ProfileSetup({ initial, onSaved }: { initial?: AppProfile; onSaved: (profile: AppProfile) => void }) {
  const { user } = useUser();
  const [form, setForm] = useState({ name: initial?.name ?? user?.fullName ?? "", username: initial?.username ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0].replace(/[^a-z0-9_]/gi, "").slice(0, 25) ?? "", age: initial?.age ? String(initial.age) : "", sport: initial?.sport ?? "futebol", role: initial?.role ?? "athlete" as Role, city: initial?.city ?? "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const photoPath = photo ? await uploadFile(photo) : initial?.photoPath ?? null;
      const result = await apiRequest<{ profile: AppProfile }>("/api/profile", { method: "PUT", body: JSON.stringify({ ...form, age: Number(form.age), photoPath }) });
      onSaved(result.profile);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar o perfil"); }
    finally { setBusy(false); }
  };
  return <div className="sp-auth-page"><div className="sp-auth-simple"><Link href="/welcome" className="sp-logo"><span className="sp-logo-mark"><Activity size={17} strokeWidth={3} /></span>SPORT<span>+</span></Link><div className="sp-auth-form-wrap"><span className="sp-kicker">{initial ? "Editar perfil" : "Último passo"}</span><h1 className="sp-display">{initial ? "Atualize seu movimento." : "Seu esporte começa aqui."}</h1><p>Esses dados ficam ligados à sua conta e serão usados no seu perfil, no feed e no ranking.</p><form className="sp-auth-form" onSubmit={submit}><label>Nome<input value={form.name} onChange={(event) => update("name", event.target.value)} required data-testid="input-profile-name" /></label><label>Nome de usuário<input value={form.username} onChange={(event) => update("username", event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} required data-testid="input-profile-username" /></label><div className="sp-form-grid"><label>Idade<input type="number" min="13" max="110" value={form.age} onChange={(event) => update("age", event.target.value)} required data-testid="input-profile-age" /></label><label>Cidade<input value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="Sua cidade" data-testid="input-profile-city" /></label></div><label>Esporte principal<select value={form.sport} onChange={(event) => update("sport", event.target.value)} data-testid="select-profile-sport">{sports.map((sport) => <option key={sport} value={sport}>{sportLabels[sport]}</option>)}</select></label><div className="sp-auth-sport"><span className="sp-label">Você participa como</span><div className="sp-card-actions"><button type="button" className={`sp-button ${form.role === "athlete" ? "primary" : "ghost"} small`} onClick={() => setForm((current) => ({ ...current, role: "athlete" }))}><Activity size={14} /> Atleta</button><button type="button" className={`sp-button ${form.role === "teacher" ? "primary" : "ghost"} small`} onClick={() => setForm((current) => ({ ...current, role: "teacher" }))}><GraduationCap size={14} /> Professor</button><button type="button" className={`sp-button ${form.role === "spectator" ? "primary" : "ghost"} small`} onClick={() => setForm((current) => ({ ...current, role: "spectator" }))}><UserRound size={14} /> Espectador</button></div><small>Espectadores podem assistir e interagir, mas não publicar ou criar desafios.</small></div><label>Foto de perfil<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} data-testid="input-profile-photo" /></label>{error && <div className="sp-empty"><p>{error}</p></div>}<button className="sp-button primary wide" disabled={busy} data-testid="button-save-profile">{busy ? "Salvando…" : initial ? "Salvar perfil" : "Entrar no SPORT+"} <ArrowRight size={16} /></button></form></div></div></div>;
}

export function PersistentShell({ children, onCompose }: { children: ReactNode; onCompose: () => void }) {
  const { isLoaded, isSignedIn } = useUser();
  const [profile, setProfile] = useState<AppProfile | null | undefined>(undefined);
  const loadProfile = () => { void apiRequest<{ profile: AppProfile | null }>("/api/profile").then((result) => setProfile(result.profile)).catch(() => setProfile(null)); };
  useEffect(() => { if (isLoaded && isSignedIn) loadProfile(); }, [isLoaded, isSignedIn]);
  if (!isLoaded) return <div className="sp-auth-page"><div className="sp-auth-loading"><span className="sp-video-spinner" /><span>Preparando o SPORT+…</span></div></div>;
  if (!isSignedIn) return <div className="sp-auth-page"><div className="sp-auth-simple"><Link href="/sign-in" className="sp-logo">SPORT<span>+</span></Link><div className="sp-auth-form-wrap"><h1 className="sp-display">Entre para continuar.</h1><Link className="sp-button primary wide" href="/sign-in">Entrar <ArrowRight size={16} /></Link></div></div></div>;
  if (profile === undefined) return <div className="sp-auth-page"><div className="sp-auth-loading"><span className="sp-video-spinner" /><span>Carregando seu perfil…</span></div></div>;
  if (!profile) return <ProfileSetup onSaved={setProfile} />;
  return <PersistentLayout profile={profile} onCompose={onCompose}>{Children.map(children, (child) => isValidElement(child) ? cloneElement(child as React.ReactElement<{ profile?: AppProfile }>, { profile }) : child)}</PersistentLayout>;
}

export function PersistentFeed({ profile: passedProfile, notify, onCompose }: { profile?: AppProfile; notify: (message: string) => void; onCompose: () => void }) {
  const profile = passedProfile!;
  const [videos, setVideos] = useState<ApiVideo[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false); const [activeId, setActiveId] = useState<string | null>(null); const [muted, setMuted] = useState(true); const [commentsOpen, setCommentsOpen] = useState<string | null>(null); const [commentText, setCommentText] = useState(""); const [commentItems, setCommentItems] = useState<Record<string, Array<{ id: string; name: string; body: string }>>>({});
  const feedRef = useRef<HTMLDivElement>(null); const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const load = async (next = false) => { if (next && (!cursor || loadingMore)) return; next ? setLoadingMore(true) : setLoading(true); try { const query = new URLSearchParams({ limit: "12" }); if (next && cursor) query.set("cursor", cursor); const result = await apiRequest<{ videos: ApiVideo[]; nextCursor: string | null }>(`/api/videos?${query}`); setVideos((current) => next ? [...current, ...result.videos] : result.videos); setCursor(result.nextCursor); setActiveId((current) => current ?? result.videos[0]?.id ?? null); } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível carregar o feed"); } finally { setLoading(false); setLoadingMore(false); } };
  useEffect(() => { void load(); }, []);
  useEffect(() => { const root = feedRef.current; if (!root) return; const observer = new IntersectionObserver((entries) => { const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (!visible) return; const id = (visible.target as HTMLElement).dataset.videoId; if (id) { setActiveId(id); if (id === videos[videos.length - 1]?.id) void load(true); } }, { root, threshold: [0.65, 0.85] }); root.querySelectorAll<HTMLElement>("[data-video-id]").forEach((item) => observer.observe(item)); return () => observer.disconnect(); }, [videos, cursor, loadingMore]);
  useEffect(() => { Object.entries(videoRefs.current).forEach(([id, video]) => { if (!video) return; video.muted = muted; if (id === activeId) void video.play().catch(() => undefined); else video.pause(); }); }, [activeId, muted, videos]);
  const react = async (id: string, type: "like" | "star") => { try { const result = await apiRequest<{ active: boolean; count: number }>(`/api/videos/${id}/${type}`, { method: "POST" }); setVideos((items) => items.map((item) => item.id === id ? { ...item, [type === "like" ? "liked" : "starred"]: result.active, [type === "like" ? "likes" : "stars"]: result.count } : item)); } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível registrar a interação"); } };
  const share = async (video: ApiVideo) => { const url = `${window.location.origin}${window.location.pathname}video/${video.id}`; try { if (navigator.share) await navigator.share({ title: `SPORT+ · ${video.authorName}`, text: video.description, url }); else { await navigator.clipboard.writeText(url); notify("Link do vídeo copiado."); } } catch { /* canceled share */ } };
  const openComments = async (id: string) => { setCommentsOpen((current) => current === id ? null : id); if (!commentItems[id]) { const result = await apiRequest<{ comments: Array<{ id: string; name: string; body: string }> }>(`/api/videos/${id}/comments`); setCommentItems((current) => ({ ...current, [id]: result.comments })); } };
  const addComment = async (id: string) => { if (!commentText.trim()) return; try { const result = await apiRequest<{ comment: { id: string; body: string } }>(`/api/videos/${id}/comments`, { method: "POST", body: JSON.stringify({ body: commentText }) }); setCommentItems((current) => ({ ...current, [id]: [...(current[id] ?? []), { ...result.comment, name: profile.name }] })); setCommentText(""); setVideos((items) => items.map((item) => item.id === id ? { ...item, comments: item.comments + 1 } : item)); } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível comentar"); } };
  if (loading) return <div className="sp-video-feed-shell"><div className="sp-auth-loading"><span className="sp-video-spinner" /><span>Carregando vídeos da comunidade…</span></div></div>;
  return <div className="sp-video-feed-shell"><header className="sp-video-feed-header"><Link href="/feed" className="sp-logo"><span className="sp-logo-mark"><Activity size={16} strokeWidth={3} /></span>SPORT<span>+</span></Link><div className="sp-video-feed-header-actions"><span className="sp-video-feed-live"><span /> FEED DA COMUNIDADE</span><Link href="/discover" className="sp-feed-search" aria-label="Pesquisar vídeos e pessoas"><Search size={17} /></Link><button className="sp-feed-compose" onClick={onCompose} aria-label="Publicar vídeo"><Plus size={18} /></button></div></header>
    <div className="sp-video-feed" ref={feedRef} data-testid="vertical-video-feed">{videos.map((video, index) => { const isActive = activeId === video.id; return <article className={`sp-video-slide ${index % 3 === 0 ? "lime" : index % 3 === 1 ? "blue" : "violet"}`} key={video.id} data-video-id={video.id} data-testid={`video-slide-${index + 1}`}><video ref={(node) => { videoRefs.current[video.id] = node; }} className="sp-video-player" src={video.videoUrl} autoPlay={index === 0} muted={muted} loop playsInline preload={index < 2 ? "auto" : "metadata"} controls={false} onClick={(event) => { const current = event.currentTarget; if (current.paused) void current.play(); else current.pause(); }} aria-label={`Vídeo de ${video.authorName} sobre ${sportLabels[video.sport]}`} /><div className="sp-video-shade" /><div className="sp-video-slide-top"><span className="sp-video-index">{String(index + 1).padStart(2, "0")} / {cursor ? "∞" : String(videos.length).padStart(2, "0")}</span>{isActive && <span className="sp-video-playing"><span /> REPRODUZINDO</span>}</div><div className="sp-video-info"><div className="sp-video-author"><Link href={`/profile/${video.authorUsername}`}><Avatar profile={{ name: video.authorName, photoUrl: video.authorPhotoUrl }} index={index} /></Link><div><strong>{video.authorName}</strong><span>@{video.authorUsername}</span></div><RoleBadge role={video.authorRole} /></div><span className="sp-video-sport">{sportLabels[video.sport]}</span><p>{video.description}</p><div className="sp-video-tags">{video.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></div><aside className="sp-video-actions" aria-label={`Ações do vídeo de ${video.authorName}`}><button className={`sp-video-action ${video.starred ? "active" : ""}`} onClick={() => void react(video.id, "star")} aria-pressed={video.starred}><Star size={23} fill={video.starred ? "currentColor" : "none"} /><span>{video.stars}</span></button><button className={`sp-video-action ${video.liked ? "active like" : ""}`} onClick={() => void react(video.id, "like")} aria-pressed={video.liked}><Heart size={23} fill={video.liked ? "currentColor" : "none"} /><span>{video.likes}</span></button><button className="sp-video-action" onClick={() => void openComments(video.id)}><MessageCircle size={23} /><span>{video.comments}</span></button><button className="sp-video-action" onClick={() => void share(video)}><Share2 size={22} /><span>Enviar</span></button><Link className="sp-video-action" href={`/challenges/new?videoId=${video.id}`}><Swords size={22} /><span>Desafiar</span></Link><button className="sp-video-action sound" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Ativar som" : "Desativar som"}>{muted ? <VolumeX size={21} /> : <Volume2 size={21} />}<span>{muted ? "Som" : "Mudo"}</span></button></aside>{commentsOpen === video.id && <div className="sp-comments sp-video-comments">{(commentItems[video.id] ?? []).map((comment) => <div className="sp-comment" key={comment.id}><strong>{comment.name}</strong>{comment.body}</div>)}<div className="sp-comment-row"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addComment(video.id); }} placeholder="Comente algo útil…" /><button className="sp-icon-button" onClick={() => void addComment(video.id)} aria-label="Enviar comentário"><Send size={15} /></button></div></div>}</article>; })}{!videos.length && <div className="sp-empty"><Video size={28} /><h3>Seu feed ainda está vazio</h3><p>Publique o primeiro vídeo da comunidade.</p><button className="sp-button primary" onClick={onCompose}><Plus size={15} /> Publicar vídeo</button></div>}</div>{loadingMore && <div className="sp-video-feed-hint">Carregando mais vídeos…</div>}{videos.length > 0 && <div className="sp-video-feed-hint"><ChevronDown size={15} /> deslize para descobrir o próximo</div>}</div>;
}

export function PersistentPublish({ profile: passedProfile, notify }: { profile?: AppProfile; notify: (message: string) => void }) {
  const profile = passedProfile!;
  const [, setLocation] = useLocation(); const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState(""); const [form, setForm] = useState({ description: "", sport: "futebol" as Sport, tags: "" }); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!file) return; setBusy(true); try { const videoPath = await uploadFile(file); await apiRequest("/api/videos", { method: "POST", body: JSON.stringify({ description: form.description, sport: form.sport, tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean), videoPath, contentType: file.type, originalName: file.name }) }); notify("Vídeo publicado no feed."); setLocation("/feed"); } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível publicar o vídeo"); } finally { setBusy(false); } };
  return <><PageTop eyebrow="Compartilhe seu movimento" profile={profile} /><div className="sp-form-page"><div className="sp-page-intro compact"><div><span className="sp-kicker">Nova publicação</span><h1 className="sp-display">Mostre seu<br /><span>esporte.</span></h1></div><p>Vídeos curtos conectam pessoas. Publique uma sessão e abra espaço para a próxima.</p></div><form className="sp-card sp-publish-card" onSubmit={submit}><div className="sp-upload-zone">{preview ? <video src={preview} controls className="sp-upload-preview" /> : <><Video size={29} /><strong>Selecione um vídeo curto</strong><span>MP4 ou MOV · até 150MB</span><label className="sp-button primary small" htmlFor="publish-video"><Plus size={14} /> Escolher arquivo</label></>}<input id="publish-video" type="file" accept="video/mp4,video/quicktime,video/*" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) { setFile(selected); setPreview(URL.createObjectURL(selected)); } }} data-testid="input-publish-video" /></div>{file && <div className="sp-file-name"><Check size={14} /> {file.name}</div>}<label>Descrição<textarea rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Ex.: Treino de ataque no vôlei. Quem topa uma sessão?" required /></label><div className="sp-form-grid"><label>Esporte<select value={form.sport} onChange={(event) => setForm((current) => ({ ...current, sport: event.target.value as Sport }))}>{sports.map((sport) => <option key={sport} value={sport}>{sportLabels[sport]}</option>)}</select></label><label>Tags <span className="sp-label-hint">separe por vírgulas</span><input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="treino, parceiro, técnica" /></label></div><div className="sp-form-footer"><Link href="/feed" className="sp-button ghost">Cancelar</Link><button className="sp-button primary" type="submit" disabled={!file || !form.description.trim() || busy}><Send size={15} /> {busy ? "Enviando…" : "Publicar vídeo"}</button></div></form></div></>;
}

export function PersistentProfile({ profile: passedProfile, notify }: { profile?: AppProfile; notify: (message: string) => void }) {
  const profile = passedProfile!;
  const params = useParams<{ handle?: string }>(); const isMine = !params.handle || params.handle === profile.username; const [person, setPerson] = useState<AppProfile | null>(isMine ? profile : null); const [videos, setVideos] = useState<ApiVideo[]>([]); const [editing, setEditing] = useState(false); const [loading, setLoading] = useState(!isMine); const [inviteOpen, setInviteOpen] = useState(false); const [inviteKind, setInviteKind] = useState<"training_school" | "championship">("training_school"); const [inviteMessage, setInviteMessage] = useState(""); const [inviteBusy, setInviteBusy] = useState(false);
  useEffect(() => { const username = params.handle; if (!username || username === profile.username) { setPerson(profile); return; } setLoading(true); void apiRequest<{ profile: AppProfile }>(`/api/profiles/${username}`).then((result) => setPerson(result.profile)).catch(() => setPerson(null)).finally(() => setLoading(false)); }, [params.handle, profile]);
  useEffect(() => { if (!person) return; const path = person.username === profile.username ? "/api/profile/videos" : `/api/profiles/${person.username}/videos`; void apiRequest<{ videos: ApiVideo[] }>(path).then((result) => setVideos(result.videos)).catch(() => setVideos([])); }, [person, profile.username]);
  if (loading) return <div className="sp-auth-loading"><span className="sp-video-spinner" /><span>Carregando perfil…</span></div>;
  if (!person) return <div className="sp-empty"><h3>Perfil não encontrado</h3><Link href="/discover" className="sp-button primary">Voltar para pesquisar</Link></div>;
  const totalStars = videos.reduce((sum, video) => sum + video.stars, 0);
  const follow = async () => {
    try {
      const result = await apiRequest<{ following: boolean; followers: number }>(`/api/people/${encodeURIComponent(person.username)}/follow`, { method: "POST" });
      setPerson((current) => current ? { ...current, following: result.following, followers: result.followers } : current);
      notify(result.following ? `Você está seguindo ${person.name}.` : `Você deixou de seguir ${person.name}.`);
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível seguir este perfil"); }
  };
  const invite = async (event: React.FormEvent) => {
    event.preventDefault(); setInviteBusy(true);
    try {
      await apiRequest(`/api/people/${encodeURIComponent(person.username)}/invitations`, {
        method: "POST", body: JSON.stringify({ kind: inviteKind, message: inviteMessage }),
      });
      setInviteOpen(false); setInviteMessage("");
      notify(inviteKind === "championship" ? `Convite para campeonato enviado a ${person.name}.` : `Convite para a escolinha enviado a ${person.name}.`);
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível enviar o convite"); }
    finally { setInviteBusy(false); }
  };
  const profileActions = isMine
    ? <button className="sp-button ghost small" onClick={() => setEditing(true)}><Edit3 size={14} /> Editar perfil</button>
    : <div className="sp-card-actions">
      <button className={`sp-button ${person.following ? "green" : "primary"} small`} onClick={() => void follow()} data-testid="button-follow-profile"><UserPlus size={14} /> {person.following ? "Seguindo" : "Seguir"}</button>
      {profile.role !== "spectator" && <Link className="sp-button ghost small" href={`/challenges/new?username=${encodeURIComponent(person.username)}`}><Swords size={14} /> Desafiar</Link>}
      {profile.role === "teacher" && person.role === "athlete" && <button className="sp-button ghost small" onClick={() => setInviteOpen(true)} data-testid="button-invite-athlete-profile"><Send size={14} /> Convidar atleta</button>}
    </div>;
  return <><PageTop eyebrow={isMine ? "Seu esporte, em movimento" : "Perfil esportivo"} profile={profile} action={profileActions} /><section className="sp-profile-cover"><div className="sp-profile-head"><Avatar profile={person} large /><div><div className="sp-profile-name-row"><h1 className="sp-display">{person.name}</h1><RoleBadge role={person.role} /></div><p>@{person.username}{person.city ? ` · ${person.city}` : ""}{!isMine && ` · ${person.followers ?? 0} seguidores`}</p></div></div><div className="sp-cover-mark">+</div></section><div className="sp-profile-body"><section><div className="sp-stat-strip"><div className="sp-card sp-stat"><strong><Star size={17} fill="currentColor" />{totalStars}</strong><span>Estrelas recebidas</span></div><div className="sp-card sp-stat"><strong>{videos.length}</strong><span>Publicações</span></div><div className="sp-card sp-stat"><strong>{person.followers ?? 0}</strong><span>Seguidores</span></div></div><section className="sp-card sp-profile-about"><div className="sp-section-title"><h3>Sobre o jeito de jogar</h3>{isMine && <button className="sp-action" onClick={() => setEditing(true)}>Editar</button>}</div><p>{roleLabel(person.role)} de {sportLabels[person.sport as Sport] ?? person.sport}{person.city ? ` em ${person.city}` : ""}.</p><div className="sp-tag-cloud"><span className="sp-tag">{sportLabels[person.sport as Sport] ?? person.sport}</span>{person.city && <span className="sp-tag">{person.city}</span>}</div></section><section className="sp-profile-videos"><div className="sp-section-title"><h2 className="sp-display">Publicações</h2><span className="sp-muted-text">{videos.length} publicadas</span></div>{videos.length ? <div className="sp-profile-video-grid">{videos.map((video) => { const firstMedia = video.media?.[0]; return <Link href={`/video/${video.id}`} key={video.id} className="sp-profile-video">{firstMedia?.contentType.startsWith("image/") ? <img src={firstMedia.url} alt={video.description} loading="lazy" /> : <video src={video.videoUrl} muted playsInline preload="metadata" />}<strong>{video.description}</strong></Link>; })}</div> : <div className="sp-empty"><Video size={23} /><h3>Nenhuma publicação</h3><p>Quando houver uma publicação, ela aparecerá aqui.</p></div>}</section></section><aside className="sp-side-stack"><section className="sp-card sp-side-card"><span className="sp-kicker">Próximas conexões</span><h3>Desafios e partidas</h3><Link href="/challenges" className="sp-button primary small"><Swords size={14} /> Explorar desafios</Link></section></aside></div>{editing && <EditProfile profile={person} onClose={() => setEditing(false)} onSaved={(next) => { setEditing(false); notify("Perfil atualizado."); if (isMine) setPerson(next); }} />}{inviteOpen && <div className="sp-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !inviteBusy) setInviteOpen(false); }}><form className="sp-modal" onSubmit={(event) => void invite(event)}><div className="sp-modal-head"><div><span className="sp-kicker">Convite de professor</span><h2 className="sp-display">Convide {person.name}.</h2></div><button type="button" className="sp-icon-button" onClick={() => setInviteOpen(false)} aria-label="Fechar convite"><ArrowLeft size={17} /></button></div><label>Tipo de convite<select value={inviteKind} onChange={(event) => setInviteKind(event.target.value as typeof inviteKind)}><option value="training_school">Escolinha</option><option value="championship">Campeonato</option></select></label><label>Mensagem<textarea rows={3} maxLength={500} value={inviteMessage} onChange={(event) => setInviteMessage(event.target.value)} placeholder="Escreva uma mensagem para o atleta (opcional)." /></label><div className="sp-modal-footer"><button type="button" className="sp-button ghost" onClick={() => setInviteOpen(false)}>Cancelar</button><button className="sp-button primary" disabled={inviteBusy}><Send size={14} /> {inviteBusy ? "Enviando…" : "Enviar convite"}</button></div></form></div>}</>;
}
function EditProfile({ profile, onClose, onSaved }: { profile: AppProfile; onClose: () => void; onSaved: (profile: AppProfile) => void }) { const [form, setForm] = useState({ name: profile.name, username: profile.username, age: String(profile.age), sport: profile.sport, city: profile.city ?? "", role: profile.role }); const [busy, setBusy] = useState(false); return <div className="sp-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="sp-modal" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { const result = await apiRequest<{ profile: AppProfile }>("/api/profile", { method: "PUT", body: JSON.stringify({ ...form, age: Number(form.age), photoPath: profile.photoPath }) }); onSaved(result.profile); } catch { /* validation is surfaced by keeping modal open */ } finally { setBusy(false); } }}><div className="sp-modal-head"><div><span className="sp-kicker">Seu perfil</span><h2 className="sp-display">Deixe com a sua cara.</h2></div><button type="button" className="sp-icon-button" onClick={onClose} aria-label="Fechar edição"><ArrowLeft size={17} /></button></div><label>Nome<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label><label>Nome de usuário<input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} required /></label><div className="sp-form-grid"><label>Idade<input type="number" min="13" value={form.age} onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))} required /></label><label>Cidade<input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></label></div><label>Esporte<select value={form.sport} onChange={(event) => setForm((current) => ({ ...current, sport: event.target.value }))}>{sports.map((sport) => <option key={sport} value={sport}>{sportLabels[sport]}</option>)}</select></label><div className="sp-modal-footer"><button type="button" className="sp-button ghost" onClick={onClose}>Cancelar</button><button className="sp-button primary" disabled={busy}><Check size={15} /> Salvar</button></div></form></div>; }

export function PersistentDiscover({ profile: passedProfile, notify }: { profile?: AppProfile; notify: (message: string) => void }) {
  const profile = passedProfile!;
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? ""); const [filter, setFilter] = useState<"todos" | Sport>("todos"); const [tab, setTab] = useState<"pessoas" | "vídeos">("pessoas"); const [people, setPeople] = useState<Array<AppProfile & { stars: number }>>([]); const [videos, setVideos] = useState<ApiVideo[]>([]);
  useEffect(() => { let current = true; void apiRequest<{ people: Array<AppProfile & { stars: number }> }>(`/api/people?query=${encodeURIComponent(query)}${filter !== "todos" ? `&sport=${encodeURIComponent(filter)}` : ""}`).then((result) => { if (current) setPeople(result.people); }).catch(() => { if (current) setPeople([]); }); return () => { current = false; }; }, [query, filter]);
  useEffect(() => { void apiRequest<{ videos: ApiVideo[] }>("/api/videos?limit=30").then((result) => setVideos(result.videos)).catch(() => setVideos([])); }, []);
  const filteredVideos = useMemo(() => videos.filter((video) => (!query || `${video.description} ${video.authorName} ${video.sport} ${video.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())) && (filter === "todos" || video.sport === filter)), [videos, query, filter]);
  const follow = async (person: AppProfile & { stars: number }) => {
    try {
      const result = await apiRequest<{ following: boolean; followers: number }>(`/api/people/${encodeURIComponent(person.username)}/follow`, { method: "POST" });
      setPeople((current) => current.map((item) => item.userId === person.userId ? { ...item, following: result.following, followers: result.followers } : item));
      notify(result.following ? `Você está seguindo ${person.name}.` : `Você deixou de seguir ${person.name}.`);
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível seguir este perfil"); }
  };
  return <><PageTop eyebrow="Encontre sua próxima parceria" profile={profile} /><div className="sp-page-intro"><div><span className="sp-kicker">Pesquisar</span><h1 className="sp-display">Mais pessoas.<br /><span>Mais jogo.</span></h1></div><p>Busque vídeos, atletas e professores por esporte. A melhor conexão é aquela que vira uma atividade.</p></div><div className="sp-search-wrap"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar vídeo, pessoa ou esporte" aria-label="Buscar no SPORT+" /></div><div className="sp-discover-controls"><div className="sp-tabs"><button className={tab === "pessoas" ? "active" : ""} onClick={() => setTab("pessoas")}><Users size={15} /> Pessoas</button><button className={tab === "vídeos" ? "active" : ""} onClick={() => setTab("vídeos")}><Video size={15} /> Vídeos</button></div><div className="sp-sport-select"><SlidersHorizontal size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value as "todos" | Sport)}><option value="todos">Todos os esportes</option>{sports.map((sport) => <option key={sport} value={sport}>{sportLabels[sport]}</option>)}</select><ChevronDown size={14} /></div></div>{tab === "pessoas" ? <div className="sp-discover-grid">{people.length ? people.map((person, index) => <article className="sp-card sp-person-card" key={person.userId}><div className="sp-person-top"><Link href={`/profile/${person.username}`}><Avatar profile={person} large index={index} /></Link><RoleBadge role={person.role} /></div><h3>{person.name}</h3><p>{sportLabels[person.sport as Sport] ?? person.sport}{person.city ? ` · ${person.city}` : ""}</p><div className="sp-person-stars"><Star size={14} fill="currentColor" /> {person.stars} estrelas</div><div className="sp-card-actions"><Link href={`/profile/${person.username}`} className="sp-button ghost small">Ver perfil</Link><button className={`sp-button ${person.following ? "green" : "primary"} small`} onClick={() => void follow(person)}><UserPlus size={14} /> {person.following ? "Seguindo" : "Seguir"}</button>{profile.role === "teacher" && person.role === "athlete" && <Link href={`/profile/${person.username}`} className="sp-button ghost small"><Send size={14} /> Convidar</Link>}</div></article>) : <div className="sp-empty"><Search size={23} /><h3>Ninguém encontrado</h3><p>A comunidade ainda não tem resultados para essa busca.</p></div>}</div> : <div className="sp-video-grid-results">{filteredVideos.length ? filteredVideos.map((video) => <Link href={`/video/${video.id}`} className="sp-card sp-video-result" key={video.id}>{video.media?.[0]?.contentType.startsWith("image/") ? <img src={video.media[0].url} alt={video.description} loading="lazy" /> : <video src={video.videoUrl} muted playsInline preload="metadata" />}<div><strong>{video.description}</strong><span>{video.authorName} · {sportLabels[video.sport]}</span><small><Star size={12} fill="currentColor" /> {video.stars} estrelas</small></div></Link>) : <div className="sp-empty"><Video size={23} /><h3>Nenhum vídeo encontrado</h3><p>Experimente outro esporte ou publique o primeiro vídeo.</p></div>}</div>}</>;
}

export function PersistentTeacherStudents({ profile: passedProfile, notify }: { profile?: AppProfile; notify: (message: string) => void }) {
  const profile = passedProfile!;
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Array<AppProfile & { stars: number }>>([]);
  const [busyKey, setBusyKey] = useState("");
  useEffect(() => {
    let current = true;
    void apiRequest<{ people: Array<AppProfile & { stars: number }> }>(`/api/people?query=${encodeURIComponent(query)}`)
      .then((result) => { if (current) setPeople(result.people.filter((person) => person.role === "athlete")); })
      .catch((cause) => { if (current) { setPeople([]); notify(cause instanceof Error ? cause.message : "Não foi possível buscar atletas"); } });
    return () => { current = false; };
  }, [query]);

  const sendInvite = async (student: AppProfile, kind: "training_school" | "championship") => {
    const key = `${student.username}:${kind}`;
    setBusyKey(key);
    try {
      await apiRequest(`/api/people/${encodeURIComponent(student.username)}/invitations`, {
        method: "POST",
        body: JSON.stringify({ kind }),
      });
      notify(kind === "championship" ? `Convite para campeonato enviado a ${student.name}.` : `Convite para a escolinha enviado a ${student.name}.`);
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível enviar o convite"); }
    finally { setBusyKey(""); }
  };

  if (profile.role !== "teacher") return <><PageTop eyebrow="Área do professor" profile={profile} /><div className="sp-empty"><GraduationCap size={24} /><h3>Área exclusiva para professores</h3><p>Esta função está disponível para contas de professor de Educação Física.</p><Link className="sp-button primary" href="/profile">Voltar ao perfil</Link></div></>;
  return <><PageTop eyebrow="Área do professor" profile={profile} /><div className="sp-page-intro"><div><span className="sp-kicker">Meus alunos</span><h1 className="sp-display">Encontre<br /><span>atletas.</span></h1></div><p>Pesquise atletas e envie convites para uma escolinha ou campeonato.</p></div><section className="sp-card sp-students-toolbar"><div className="sp-search-wrap"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Encontrar atleta por nome ou esporte" aria-label="Encontrar atleta" data-testid="input-student-search" /></div><span className="sp-student-count"><Users size={15} /> {people.length} atletas</span></section><div className="sp-students-grid">{people.map((student, index) => <article className="sp-card sp-student-card" key={student.userId}><div className="sp-student-head"><Link href={`/profile/${student.username}`}><Avatar profile={student} large index={index} /></Link><RoleBadge role={student.role} /></div><h3>{student.name}</h3><p>{sportLabels[student.sport as Sport] ?? student.sport}{student.city ? ` · ${student.city}` : ""}</p><div className="sp-person-stars"><Star size={14} fill="currentColor" /> {student.stars} estrelas</div><div className="sp-card-actions"><Link href={`/profile/${student.username}`} className="sp-button ghost small">Ver perfil</Link><button className="sp-button primary small" onClick={() => void sendInvite(student, "training_school")} disabled={Boolean(busyKey)} data-testid={`button-invite-school-${student.username}`}><Send size={14} /> {busyKey === `${student.username}:training_school` ? "Enviando…" : "Escolinha"}</button><button className="sp-button ghost small" onClick={() => void sendInvite(student, "championship")} disabled={Boolean(busyKey)} data-testid={`button-invite-championship-${student.username}`}><Trophy size={14} /> {busyKey === `${student.username}:championship` ? "Enviando…" : "Campeonato"}</button></div></article>)}</div>{!people.length && <div className="sp-empty"><Search size={23} /><h3>Nenhum atleta encontrado</h3><p>Tente outra busca ou volte mais tarde.</p></div>}</>;
}

export function PersistentRankings({ profile: passedProfile }: { profile?: AppProfile }) {
  const profile = passedProfile!;
  const [filter, setFilter] = useState<"todos" | Sport>("todos"); const [rows, setRows] = useState<Array<{ userId: string; name: string; username: string; sport: string; role: Role; stars: number; photoUrl: string | null; position: number }>>([]);
  useEffect(() => { void apiRequest<{ rankings: typeof rows }>("/api/rankings").then((result) => setRows(result.rankings)); }, []);
  const visible = rows.filter((row) => filter === "todos" || row.sport === filter);
  return <><PageTop eyebrow="Placar da comunidade" profile={profile} /><div className="sp-page-intro"><div><span className="sp-kicker">Ranking</span><h1 className="sp-display">Reconheça quem<br /><span>faz acontecer.</span></h1></div><p>Estrelas são reconhecimento por consistência, generosidade e pelo esporte que acontece fora dos holofotes.</p></div><div className="sp-ranking-tools"><div className="sp-filter-row"><button className={`sp-filter ${filter === "todos" ? "active" : ""}`} onClick={() => setFilter("todos")}>Geral</button>{sports.map((sport) => <button className={`sp-filter ${filter === sport ? "active" : ""}`} key={sport} onClick={() => setFilter(sport)}>{sportLabels[sport]}</button>)}</div></div><div className="sp-rank-grid"><section className="sp-card sp-rank-table"><div className="sp-table-head"><span>POSIÇÃO</span><span>ATLETA</span><span>ESTRELAS</span><span>VARIAÇÃO</span></div>{visible.map((item, index) => <div className={`sp-rank-row ${item.userId === profile.userId ? "you" : ""}`} key={item.userId}><span className="sp-rank-number">{String(index + 1).padStart(2, "0")}</span><div className="sp-mini-row"><Avatar profile={{ name: item.name, photoUrl: item.photoUrl }} index={index} /><div className="sp-mini-copy"><strong>{item.name}{item.userId === profile.userId && <em>VOCÊ</em>}</strong><span>{sportLabels[item.sport as Sport] ?? item.sport}</span></div></div><span className="sp-rank-score"><Star size={13} fill="currentColor" /> {item.stars}</span><span className="sp-rank-trend">—</span></div>)}</section></div></>;
}

export function PersistentChallenges({ profile: passedProfile }: { profile?: AppProfile }) {
  const profile = passedProfile!;
  const [challenges, setChallenges] = useState<ApiChallenge[]>([]); useEffect(() => { void apiRequest<{ challenges: ApiChallenge[] }>("/api/challenges").then((result) => setChallenges(result.challenges)); }, []);
  const canCreate = profile.role !== "spectator";
  return <><PageTop eyebrow="Encontre alguém para jogar" profile={profile} action={canCreate ? <Link href="/challenges/new" className="sp-button primary small"><Plus size={14} /> Criar desafio</Link> : undefined} /><div className="sp-page-intro"><div><span className="sp-kicker">Desafios</span><h1 className="sp-display">Do feed<br /><span>para a quadra.</span></h1></div><p>Escolha um formato, combine local e horário e transforme uma interação em atividade esportiva.</p></div><div className="sp-challenge-types"><span><Swords size={15} />X1</span><span><Users size={15} />Amistoso</span><span><Trophy size={15} />Campeonato</span></div><div className="sp-challenge-grid">{challenges.length ? challenges.map((challenge) => <article className="sp-card sp-challenge-card" key={challenge.id}><div className="sp-challenge-top"><span className="sp-type-label">{challenge.type}</span><span className="sp-sport-label">{sportLabels[challenge.sport]}</span></div><Link href={`/challenges/${challenge.id}`}><h3 className="sp-display">{challenge.type} de {sportLabels[challenge.sport]}</h3></Link><p>{challenge.message}</p><div className="sp-challenge-meta"><span><CalendarDays size={13} />{challenge.date} · {challenge.time}</span><span><MapPin size={13} />{challenge.location}</span></div><div className="sp-challenge-foot"><span><Users size={13} /> {challenge.participantCount} participantes</span><Link href={`/challenges/${challenge.id}`} className="sp-button primary small">Ver detalhes <ArrowRight size={13} /></Link></div></article>) : <div className="sp-empty"><Swords size={23} /><h3>Ainda não há desafios</h3><p>Crie o primeiro encontro da comunidade.</p>{canCreate && <Link href="/challenges/new" className="sp-button primary"><Plus size={15} /> Criar desafio</Link>}</div>}</div></>;
}

export function PersistentChallengeNew({ profile: passedProfile, notify }: { profile?: AppProfile; notify: (message: string) => void }) {
  const profile = passedProfile!;
  const [, setLocation] = useLocation(); const targetUsername = new URLSearchParams(window.location.search).get("username") ?? ""; const [targetName, setTargetName] = useState(""); const [form, setForm] = useState({ type: "Amistoso", sport: "futebol" as Sport, date: "", time: "", location: "", message: "" }); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!targetUsername) return; void apiRequest<{ profile: AppProfile }>(`/api/profiles/${encodeURIComponent(targetUsername)}`).then((result) => setTargetName(result.profile.name)).catch(() => setTargetName(`@${targetUsername}`)); }, [targetUsername]);
  if (profile.role === "spectator") return <><PageTop eyebrow="Desafios indisponíveis" profile={profile} /><div className="sp-empty"><Swords size={25} /><h3>Espectadores não podem criar desafios</h3><p>Você pode seguir atletas, assistir aos conteúdos e interagir com as publicações.</p><Link className="sp-button primary" href="/challenges">Ver desafios</Link></div></>;
  return <><PageTop eyebrow="Organize a atividade" profile={profile} /><div className="sp-form-page"><Link href="/challenges" className="sp-back-link"><ArrowLeft size={15} /> Voltar para desafios</Link><div className="sp-page-intro compact"><div><span className="sp-kicker">Novo desafio</span><h1 className="sp-display">Chame para<br /><span>jogar.</span></h1></div><p>Defina o básico. O objetivo é marcar uma atividade, não preencher uma planilha.</p></div>{targetUsername && <p className="sp-muted-text">Convite direcionado para {targetName || `@${targetUsername}`}.</p>}<form className="sp-card sp-form-card" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { const result = await apiRequest<{ challenge: ApiChallenge }>("/api/challenges", { method: "POST", body: JSON.stringify({ ...form, ...(targetUsername ? { inviteUsername: targetUsername } : {}) }) }); notify(targetUsername ? "Desafio criado e convite enviado." : "Desafio criado."); setLocation(`/challenges/${result.challenge.id}`); } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível criar o desafio"); } finally { setBusy(false); } }}><div className="sp-form-grid"><label>Tipo<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}><option>X1</option><option>Amistoso</option><option>Jogo</option><option>Campeonato</option></select></label><label>Esporte<select value={form.sport} onChange={(event) => setForm((current) => ({ ...current, sport: event.target.value as Sport }))}>{sports.map((sport) => <option key={sport} value={sport}>{sportLabels[sport]}</option>)}</select></label><label>Data<input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required /></label><label>Horário<input type="time" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} required /></label><label>Local<input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} required placeholder="Ex.: Parque da cidade" /></label></div><label>Mensagem para quem entrar<textarea rows={4} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} required placeholder="Conte como vai funcionar…" /></label><div className="sp-form-footer"><Link href="/challenges" className="sp-button ghost">Cancelar</Link><button className="sp-button primary" disabled={busy}><Swords size={15} /> {busy ? "Criando…" : "Criar desafio"}</button></div></form></div></>;
}

export function PersistentChallengeDetail({ profile: passedProfile, notify }: { profile?: AppProfile; notify: (message: string) => void }) {
  const profile = passedProfile!;
  const params = useParams<{ id: string }>(); const [challenge, setChallenge] = useState<ApiChallenge | null>(null); useEffect(() => { void apiRequest<{ challenge: ApiChallenge }>(`/api/challenges/${params.id}`).then((result) => setChallenge(result.challenge)); }, [params.id]);
  if (!challenge) return <div className="sp-auth-loading"><span className="sp-video-spinner" /><span>Carregando desafio…</span></div>;
  const join = async () => {
    try {
      const result = await apiRequest<{ joined: boolean }>(`/api/challenges/${challenge.id}/join`, { method: "POST" });
      setChallenge((current) => current ? { ...current, joined: result.joined, invited: false, participantCount: Math.max(0, current.participantCount + (result.joined ? 1 : -1)) } : current);
      notify(result.joined ? "Presença confirmada neste desafio." : "Você saiu deste desafio.");
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível atualizar sua participação"); }
  };
  return <><PageTop eyebrow="Detalhes da atividade" profile={profile} /><div className="sp-detail-wrap"><Link href="/challenges" className="sp-back-link"><ArrowLeft size={15} /> Todos os desafios</Link><section className="sp-card sp-challenge-detail"><div className="sp-detail-accent"><span className="sp-kicker">{challenge.invited ? "Convite recebido" : "Desafio"} · {challenge.type}</span><span className="sp-detail-icon"><Swords size={25} /></span></div><span className="sp-type-label">{sportLabels[challenge.sport]}</span><h1 className="sp-display">{challenge.type} de {sportLabels[challenge.sport]}</h1><p className="sp-detail-copy">{challenge.message}</p><div className="sp-detail-info"><div><CalendarDays size={18} /><span><small>Quando</small><strong>{challenge.date}<br />{challenge.time}</strong></span></div><div><MapPin size={18} /><span><small>Onde</small><strong>{challenge.location}</strong></span></div><div><Users size={18} /><span><small>Organizado por</small><strong>{challenge.host}</strong></span></div></div><div className="sp-detail-actions">{profile.role !== "spectator" && <button className={`sp-button ${challenge.joined ? "green" : "primary"}`} onClick={() => void join()}><Check size={16} /> {challenge.joined ? "Você está dentro" : challenge.invited ? "Aceitar convite" : "Participar"}</button>}<button className="sp-button ghost" onClick={async () => { const url = window.location.href; try { await navigator.share ? navigator.share({ title: `SPORT+ · ${challenge.type}`, text: challenge.message, url }) : await navigator.clipboard.writeText(url); notify("Link do desafio copiado."); } catch { notify("Não foi possível compartilhar o desafio."); } }}><Share2 size={15} /> Compartilhar</button></div></section></div></>;
}

export function PersistentVideoDetail({ profile: passedProfile, notify }: { profile?: AppProfile; notify: (message: string) => void }) {
  const profile = passedProfile!;
  const params = useParams<{ id: string }>(); const [video, setVideo] = useState<ApiVideo | null>(null); const [comment, setComment] = useState(""); const [comments, setComments] = useState<Array<{ id: string; name: string; body: string }>>([]);
  useEffect(() => { void apiRequest<{ video: ApiVideo }>(`/api/videos/${params.id}`).then((result) => setVideo(result.video)); void apiRequest<{ comments: Array<{ id: string; name: string; body: string }> }>(`/api/videos/${params.id}/comments`).then((result) => setComments(result.comments)); }, [params.id]);
  if (!video) return <div className="sp-auth-loading"><span className="sp-video-spinner" /><span>Carregando vídeo…</span></div>;
  const react = async (type: "like" | "star") => { const result = await apiRequest<{ active: boolean; count: number }>(`/api/videos/${video.id}/${type}`, { method: "POST" }); setVideo({ ...video, [type === "like" ? "liked" : "starred"]: result.active, [type === "like" ? "likes" : "stars"]: result.count }); };
  const firstMedia = video.media?.[0];
  const isPhotoPost = firstMedia?.contentType.startsWith("image/");
  const sendComment = async () => {
    if (!comment.trim()) return;
    try {
      const result = await apiRequest<{ comment: { id: string; body: string } }>(`/api/videos/${video.id}/comments`, { method: "POST", body: JSON.stringify({ body: comment }) });
      setComments((current) => [...current, { ...result.comment, name: profile.name }]);
      setComment("");
      notify("Comentário adicionado.");
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível comentar"); }
  };
  const shareChallenge = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `SPORT+ · ${challenge.type}`, text: challenge.message, url });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        notify("Link do desafio copiado.");
      } else window.prompt("Copie o link do desafio:", url);
    } catch (cause) {
      if (cause instanceof Error && cause.name !== "AbortError") notify("Não foi possível compartilhar o desafio.");
    }
  };
  return <><PageTop eyebrow={isPhotoPost ? "Publicação em destaque" : "Vídeo em destaque"} profile={profile} /><div className="sp-video-detail"><Link href="/feed" className="sp-back-link"><ArrowLeft size={15} /> Voltar para o feed</Link><div className="sp-video-detail-grid"><section>{isPhotoPost ? <div className="sp-detail-photo-carousel">{video.media.map((item, index) => <img key={item.objectPath || item.url} src={item.url} alt={`Foto ${index + 1} da publicação`} />)}</div> : <video src={firstMedia?.url ?? video.videoUrl} controls playsInline className="sp-detail-video" />}<div className="sp-detail-video-actions"><button className={`sp-button ${video.starred ? "green" : "primary"}`} onClick={() => void react("star")}><Star size={16} fill={video.starred ? "currentColor" : "none"} /> {video.stars} estrelas</button><button className={`sp-button ${video.liked ? "green" : "ghost"}`} onClick={() => void react("like")}><Heart size={16} fill={video.liked ? "currentColor" : "none"} /> {video.likes} curtidas</button></div></section><aside className="sp-card sp-video-detail-info"><div className="sp-post-head"><Link href={`/profile/${video.authorUsername}`}><Avatar profile={{ name: video.authorName, photoUrl: video.authorPhotoUrl }} large /></Link><div className="sp-post-meta"><strong>{video.authorName}</strong><span>@{video.authorUsername}</span></div><RoleBadge role={video.authorRole} /></div><span className="sp-type-label">{sportLabels[video.sport]}</span><h1 className="sp-display">{video.description}</h1><div className="sp-tag-cloud">{video.tags.map((tag) => <Link href={`/discover?q=${encodeURIComponent(tag.replace(/^#/, ""))}`} className="sp-tag" key={tag}>#{tag.replace(/^#/, "")}</Link>)}</div><div className="sp-comments">{comments.map((item) => <div className="sp-comment" key={item.id}><strong>{item.name}</strong>{item.body}</div>)}<div className="sp-comment-row"><input value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void sendComment(); }} placeholder="Comente algo útil…" aria-label="Escreva um comentário" /><button className="sp-icon-button" onClick={() => void sendComment()} aria-label="Enviar comentário"><Send size={15} /></button></div></div></aside></div></div></>;
}

export function PersistentSettings({ profile: passedProfile, notify, onProfileChanged }: { profile?: AppProfile; notify: (message: string) => void; onProfileChanged?: (profile: AppProfile) => void }) {
  const profile = passedProfile!;
  const { signOut } = useClerk(); const [notifications, setNotifications] = useState(true); const [privateProfile, setPrivateProfile] = useState(false);
  return <><PageTop eyebrow="Ajuste sua experiência" profile={profile} /><div className="sp-page-intro"><div><span className="sp-kicker">Configurações</span><h1 className="sp-display">Seu espaço,<br /><span>suas regras.</span></h1></div><p>Gerencie seu perfil esportivo e as preferências da sua conta SPORT+.</p></div><div className="sp-settings-grid"><section className="sp-card sp-settings-card"><span className="sp-kicker">Conta</span><h2>Perfil</h2><Link className="sp-setting-row" href="/profile"><div><strong>Dados pessoais</strong><span>{profile.name} · @{profile.username}</span></div><ArrowRight size={16} /></Link><button className="sp-setting-row" onClick={() => void signOut({ redirectUrl: "/welcome" })}><div><strong>Sair da conta</strong><span>Encerrar sua sessão com segurança</span></div><LogOut size={16} /></button></section><section className="sp-card sp-settings-card"><span className="sp-kicker">Preferências</span><h2>Como o SPORT+ fala com você</h2><button className="sp-toggle-row" onClick={() => setNotifications((value) => !value)} aria-pressed={notifications}><div><strong>Notificações da comunidade</strong><span>Novos desafios, convites e comentários</span></div><span className={`sp-toggle ${notifications ? "on" : ""}`}><span /></span></button><button className="sp-toggle-row" onClick={() => setPrivateProfile((value) => !value)} aria-pressed={privateProfile}><div><strong>Perfil mais reservado</strong><span>Controle visual para a próxima fase</span></div><span className={`sp-toggle ${privateProfile ? "on" : ""}`}><span /></span></button><button className="sp-setting-row" onClick={() => notify("Para suporte, use o canal de ajuda da comunidade.")}><div><strong>Ajuda e segurança</strong><span>Denúncias, bloqueios e suporte</span></div><ArrowRight size={16} /></button></section></div></>;
}