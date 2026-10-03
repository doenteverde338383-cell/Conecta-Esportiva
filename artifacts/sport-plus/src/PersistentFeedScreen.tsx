import { useEffect, useRef, useState } from "react";
import { Activity, ChevronDown, Heart, MessageCircle, Plus, RefreshCw, Search, Send, Share2, Star, Swords, Video, Volume2, VolumeX } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, Avatar, RoleBadge, sportLabels, type ApiVideo, type AppProfile } from "./persistent";

type Comment = { id: string; name: string; body: string };

export function PersistentFeedScreen({ profile: passedProfile, notify, onCompose }: {
  profile?: AppProfile; notify: (message: string) => void; onCompose: () => void;
}) {
  const profile = passedProfile!;
  const [videos, setVideos] = useState<ApiVideo[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentItems, setCommentItems] = useState<Record<string, Comment[]>>({});
  const [commentLoading, setCommentLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const inFlight = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const requestVersion = useRef(0);
  const [, setLocation] = useLocation();

  const load = async (nextPage = false) => {
    if (inFlight.current || (nextPage && !cursorRef.current)) return;
    const version = requestVersion.current;
    inFlight.current = true;
    nextPage ? setLoadingMore(true) : setLoading(true);
    try {
      const query = new URLSearchParams({ limit: "12" });
      if (nextPage && cursorRef.current) query.set("cursor", cursorRef.current);
      const result = await apiRequest<{ videos: ApiVideo[]; nextCursor: string | null }>(`/api/videos?${query}`);
      if (version !== requestVersion.current) return;
      setVideos((current) => nextPage ? [...current, ...result.videos] : result.videos);
      cursorRef.current = result.nextCursor;
      setCursor(result.nextCursor);
      setActiveId((current) => nextPage ? current : result.videos[0]?.id ?? null);
    } catch (cause) {
      if (version === requestVersion.current) notify(cause instanceof Error ? cause.message : "Não foi possível carregar o feed");
    } finally {
      if (version === requestVersion.current) {
        inFlight.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = (visible.target as HTMLElement).dataset.videoId;
      if (!id) return;
      setActiveId(id);
      if (id === videos[videos.length - 1]?.id && cursorRef.current) void load(true);
    }, { root, threshold: [0.65, 0.85] });
    root.querySelectorAll<HTMLElement>("[data-video-id]").forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [videos]);

  useEffect(() => {
    for (const [id, video] of Object.entries(videoRefs.current)) {
      if (!video) continue;
      video.muted = muted;
      if (id === activeId) void video.play().catch(() => undefined);
      else video.pause();
    }
  }, [activeId, muted, videos]);

  const refresh = async () => {
    const version = ++requestVersion.current;
    inFlight.current = true;
    cursorRef.current = null;
    setCursor(null);
    setVideos([]);
    setActiveId(null);
    rootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setLoading(true);
    setLoadingMore(false);
    try {
      const result = await apiRequest<{ videos: ApiVideo[]; nextCursor: string | null }>("/api/videos?limit=12");
      if (version !== requestVersion.current) return;
      setVideos(result.videos);
      cursorRef.current = result.nextCursor;
      setCursor(result.nextCursor);
      setActiveId(result.videos[0]?.id ?? null);
    } catch (cause) {
      if (version === requestVersion.current) notify(cause instanceof Error ? cause.message : "Não foi possível atualizar o feed");
    } finally {
      if (version === requestVersion.current) {
        inFlight.current = false;
        setLoading(false);
      }
    }
  };

  const toggleReaction = async (video: ApiVideo, type: "like" | "star") => {
    try {
      const result = await apiRequest<{ active: boolean; count: number }>(`/api/videos/${video.id}/${type}`, { method: "POST" });
      setVideos((items) => items.map((item) => item.id !== video.id ? item : {
        ...item,
        [type === "like" ? "liked" : "starred"]: result.active,
        [type === "like" ? "likes" : "stars"]: result.count,
      }));
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível registrar a interação"); }
  };

  const share = async (video: ApiVideo) => {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    const url = `${window.location.origin}${basePath}/video/${video.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `SPORT+ · ${video.authorName}`, text: video.description, url });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        notify("Link do vídeo copiado.");
      } else {
        window.prompt("Copie o link do vídeo:", url);
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name !== "AbortError") notify("Não foi possível compartilhar o vídeo.");
    }
  };

  const openComments = async (videoId: string) => {
    setCommentsOpen((current) => current === videoId ? null : videoId);
    if (commentItems[videoId]) return;
    setCommentLoading(true);
    try {
      const result = await apiRequest<{ comments: Comment[] }>(`/api/videos/${videoId}/comments`);
      setCommentItems((current) => ({ ...current, [videoId]: result.comments }));
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível carregar comentários"); }
    finally { setCommentLoading(false); }
  };

  const submitComment = async (videoId: string) => {
    if (!commentText.trim()) return;
    try {
      const result = await apiRequest<{ comment: { id: string; body: string } }>(`/api/videos/${videoId}/comments`, {
        method: "POST", body: JSON.stringify({ body: commentText }),
      });
      setCommentItems((current) => ({ ...current, [videoId]: [...(current[videoId] ?? []), { ...result.comment, name: profile.name }] }));
      setVideos((current) => current.map((video) => video.id === videoId ? { ...video, comments: video.comments + 1 } : video));
      setCommentText("");
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível comentar"); }
  };

  const openChallenge = (video: ApiVideo) => {
    if (profile.role === "spectator") { notify("Contas espectadoras não podem criar desafios."); return; }
    setLocation(`/challenges/new?videoId=${encodeURIComponent(video.id)}&username=${encodeURIComponent(video.authorUsername)}`);
  };

  const renderMedia = (video: ApiVideo, index: number) => {
    const media = video.media?.length ? video.media : [{ url: video.videoUrl, contentType: "video/mp4", objectPath: "", originalName: "" }];
    if (media[0].contentType.startsWith("image/")) {
      return <div className="sp-image-carousel" aria-label={`Fotos de ${video.authorName}`}>
        {media.map((item, photoIndex) => <img key={item.objectPath || item.url} src={item.url} alt={`Foto ${photoIndex + 1} da publicação de ${video.authorName}`} loading={index > 1 ? "lazy" : "eager"} />)}
      </div>;
    }
    return <video
      ref={(node) => { videoRefs.current[video.id] = node; }}
      className="sp-video-player"
      src={media[0].url}
      autoPlay={index === 0}
      muted={muted}
      loop
      playsInline
      preload={index < 2 ? "auto" : "metadata"}
      controls={false}
      onClick={(event) => {
        const player = event.currentTarget;
        if (player.paused) void player.play().catch(() => undefined);
        else player.pause();
      }}
      aria-label={`Vídeo de ${video.authorName} sobre ${sportLabels[video.sport]}`}
    />;
  };

  if (loading) return <div className="sp-video-feed-shell"><div className="sp-auth-loading"><span className="sp-video-spinner" /><span>Carregando vídeos da comunidade…</span></div></div>;

  return <div className="sp-video-feed-shell">
    <header className="sp-video-feed-header">
      <Link href="/feed" className="sp-logo"><span className="sp-logo-mark"><Activity size={16} strokeWidth={3} /></span>SPORT<span>+</span></Link>
      <div className="sp-video-feed-header-actions">
        <span className="sp-video-feed-live"><span /> FEED DA COMUNIDADE</span>
        <button className="sp-feed-search sp-feed-refresh" aria-label="Atualizar feed" title="Atualizar feed" onClick={() => void refresh()} data-testid="button-refresh-feed"><RefreshCw size={16} /></button>
        <Link href="/discover" className="sp-feed-search" aria-label="Pesquisar vídeos e pessoas"><Search size={17} /></Link>
        {profile.role !== "spectator" && <button className="sp-feed-compose" onClick={onCompose} aria-label="Publicar vídeo"><Plus size={18} /></button>}
      </div>
    </header>
    <div className="sp-video-feed" ref={rootRef} data-testid="vertical-video-feed">
      {videos.map((video, index) => {
        const isPhoto = video.media?.[0]?.contentType.startsWith("image/");
        return <article className={`sp-video-slide ${index % 3 === 0 ? "lime" : index % 3 === 1 ? "blue" : "violet"} ${isPhoto ? "photo-slide" : ""}`} key={video.id} data-video-id={video.id} data-testid={`video-slide-${index + 1}`}>
          {renderMedia(video, index)}
          <div className="sp-video-shade" />
          <div className="sp-video-slide-top">
            <span className="sp-video-index">{String(index + 1).padStart(2, "0")} / {cursor ? "∞" : String(videos.length).padStart(2, "0")}</span>
            {!isPhoto && activeId === video.id && <span className="sp-video-playing"><span /> REPRODUZINDO</span>}
          </div>
          <div className="sp-video-info">
            <div className="sp-video-author">
              <Link href={`/profile/${video.authorUsername}`} aria-label={`Abrir perfil de ${video.authorName}`}><Avatar profile={{ name: video.authorName, photoUrl: video.authorPhotoUrl }} index={index} /></Link>
              <div><strong>{video.authorName}</strong><span>@{video.authorUsername}</span></div>
              <RoleBadge role={video.authorRole} />
            </div>
            <Link href={`/discover?sport=${encodeURIComponent(video.sport)}`} className="sp-video-sport">{sportLabels[video.sport]}</Link>
            <p>{video.description}</p>
            <div className="sp-video-tags">{video.tags.map((tag) => <Link key={tag} href={`/discover?q=${encodeURIComponent(tag.replace(/^#/, ""))}`}>#{tag.replace(/^#/, "")}</Link>)}</div>
          </div>
          <aside className="sp-video-actions" aria-label={`Ações do vídeo de ${video.authorName}`}>
            <button className={`sp-video-action ${video.starred ? "active" : ""}`} onClick={() => void toggleReaction(video, "star")} aria-pressed={video.starred} data-testid={`button-video-star-${video.id}`}><Star size={23} fill={video.starred ? "currentColor" : "none"} /><span>{video.stars}</span></button>
            <button className={`sp-video-action ${video.liked ? "active like" : ""}`} onClick={() => void toggleReaction(video, "like")} aria-pressed={video.liked} data-testid={`button-video-like-${video.id}`}><Heart size={23} fill={video.liked ? "currentColor" : "none"} /><span>{video.likes}</span></button>
            <button className="sp-video-action" onClick={() => void openComments(video.id)} aria-expanded={commentsOpen === video.id} data-testid={`button-video-comment-${video.id}`}><MessageCircle size={23} /><span>{video.comments}</span></button>
            <button className="sp-video-action" onClick={() => void share(video)} data-testid={`button-video-share-${video.id}`}><Share2 size={22} /><span>Enviar</span></button>
            {profile.role !== "spectator" && <button className="sp-video-action" onClick={() => openChallenge(video)} data-testid={`button-video-challenge-${video.id}`}><Swords size={22} /><span>Desafiar</span></button>}
            {!isPhoto && <button className="sp-video-action sound" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Ativar som" : "Desativar som"} data-testid={`button-video-sound-${video.id}`}>{muted ? <VolumeX size={21} /> : <Volume2 size={21} />}<span>{muted ? "Som" : "Mudo"}</span></button>}
          </aside>
          {commentsOpen === video.id && <section className="sp-video-comments" aria-label="Comentários">
            <div className="sp-comments-head"><strong>Comentários</strong><button className="sp-icon-button" onClick={() => setCommentsOpen(null)} aria-label="Fechar comentários">×</button></div>
            {commentLoading && <p className="sp-muted-text">Carregando comentários…</p>}
            {(commentItems[video.id] ?? []).map((comment) => <div className="sp-comment" key={comment.id}><strong>{comment.name}</strong>{comment.body}</div>)}
            {!commentLoading && !commentItems[video.id]?.length && <p className="sp-muted-text">Seja a primeira pessoa a comentar.</p>}
            <div className="sp-comment-row"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submitComment(video.id); }} placeholder="Comente algo útil…" aria-label="Escreva um comentário" /><button className="sp-icon-button" onClick={() => void submitComment(video.id)} aria-label="Enviar comentário"><Send size={15} /></button></div>
          </section>}
        </article>;
      })}
      {!videos.length && <div className="sp-empty"><Video size={28} /><h3>Seu feed ainda está vazio</h3><p>Publique o primeiro vídeo da comunidade.</p>{profile.role !== "spectator" && <button className="sp-button primary" onClick={onCompose}><Plus size={15} /> Publicar vídeo</button>}</div>}
    </div>
    {loadingMore && <div className="sp-video-feed-hint">Carregando mais publicações…</div>}
    {videos.length > 0 && <div className="sp-video-feed-hint"><ChevronDown size={15} /> deslize para descobrir o próximo</div>}
  </div>;
}