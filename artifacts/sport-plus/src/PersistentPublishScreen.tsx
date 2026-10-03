import { useEffect, useMemo, useState } from "react";
import { Activity, Check, Plus, Send, Video } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, PageTop, uploadFile, type AppProfile, type Sport, sportLabels } from "./persistent";

const sports: Sport[] = ["futebol", "futsal", "vôlei", "handebol", "basquete", "tênis", "atletismo", "corrida", "natação", "outros"];

export function PersistentPublishScreen({ profile: passedProfile, notify }: { profile?: AppProfile; notify: (message: string) => void }) {
  const profile = passedProfile!;
  const [, setLocation] = useLocation();
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({ description: "", sport: "futebol" as Sport, tags: "" });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);
  const isPhotos = files.length > 0 && files[0].type.startsWith("image/");
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview)), [previews]);

  const chooseFiles = (selected: FileList | null) => {
    if (!selected?.length) return;
    const incoming = Array.from(selected);
    const images = incoming.every((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    const videos = incoming.length === 1 && ["video/mp4", "video/quicktime"].includes(incoming[0].type);
    if (!images && !videos) {
      notify("Escolha um vídeo ou até 10 fotos. Não misture formatos na mesma publicação.");
      return;
    }
    if (images && incoming.length > 10) {
      notify("Cada carrossel aceita no máximo 10 fotos.");
      return;
    }
    if (incoming.some((file) => file.size > (file.type.startsWith("video/") ? 150 : 10) * 1024 * 1024)) {
      notify("O limite é 150 MB para vídeo e 10 MB por foto.");
      return;
    }
    if (profile.role === "spectator") {
      notify("Contas espectadoras não podem publicar.");
      return;
    }
    setFiles(incoming);
    setPhotoIndex(0);
  };

  const tags = form.tags.split(",").map((tag) => tag.trim().replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "")).filter(Boolean).slice(0, 10);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (profile.role === "spectator") { notify("Contas espectadoras não podem publicar."); return; }
    if (!files.length || !form.description.trim()) return;
    setBusy(true);
    try {
      const uploaded = [];
      for (let index = 0; index < files.length; index += 1) {
        setProgress(`Enviando ${index + 1} de ${files.length}…`);
        const file = files[index];
        const objectPath = await uploadFile(file);
        uploaded.push({ objectPath, contentType: file.type, originalName: file.name });
      }
      await apiRequest("/api/videos", {
        method: "POST",
        body: JSON.stringify({ description: form.description, sport: form.sport, tags, media: uploaded }),
      });
      notify("Publicação salva no feed.");
      setLocation("/feed");
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Não foi possível publicar");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  if (profile.role === "spectator") return <><PageTop eyebrow="Publicação indisponível" profile={profile} /><div className="sp-empty"><Activity size={25} /><h3>Publicação disponível para atletas e professores</h3><p>Como espectador, você pode assistir, seguir perfis e interagir com as publicações.</p><Link className="sp-button primary" href="/feed">Voltar ao feed</Link></div></>;

  return <>
    <PageTop eyebrow="Compartilhe seu movimento" profile={profile} />
    <div className="sp-form-page">
      <div className="sp-page-intro compact"><div><span className="sp-kicker">Nova publicação</span><h1 className="sp-display">Mostre seu<br /><span>esporte.</span></h1></div><p>Compartilhe uma sessão em vídeo ou um carrossel de até 10 fotos.</p></div>
      <form className="sp-card sp-publish-card" onSubmit={submit}>
        <div className="sp-upload-zone">
          {files.length ? isPhotos
            ? <div className="sp-publish-carousel">{previews.map((src, index) => <img className={index === photoIndex ? "active" : ""} key={src} src={src} alt={`Prévia ${index + 1} de ${files.length}`} />)}<div className="sp-publish-carousel-controls"><button type="button" className="sp-icon-button" onClick={() => setPhotoIndex((index) => (index + files.length - 1) % files.length)} aria-label="Foto anterior">‹</button><span>{photoIndex + 1} / {files.length}</span><button type="button" className="sp-icon-button" onClick={() => setPhotoIndex((index) => (index + 1) % files.length)} aria-label="Próxima foto">›</button></div></div>
            : <video src={previews[0]} controls className="sp-upload-preview" />
            : <><Video size={29} /><strong>Selecione um vídeo ou fotos</strong><span>MP4/MOV · até 150MB · ou até 10 fotos (10MB cada)</span></>}
          <label className="sp-button primary small" htmlFor="publish-media"><Plus size={14} /> {files.length ? "Trocar arquivo(s)" : "Escolher arquivo(s)"}</label>
          <input id="publish-media" type="file" multiple accept="video/mp4,video/quicktime,video/*,image/jpeg,image/png,image/webp" onChange={(event) => chooseFiles(event.target.files)} data-testid="input-publish-video" />
        </div>
        {files.length > 0 && <div className="sp-file-name"><Check size={14} /> {files.length === 1 ? files[0].name : `${files.length} fotos selecionadas`}</div>}
        <label>Descrição<textarea rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Ex.: Treino de ataque no vôlei. Quem topa uma sessão?" required /></label>
        <div className="sp-form-grid"><label>Esporte<select value={form.sport} onChange={(event) => setForm((current) => ({ ...current, sport: event.target.value as Sport }))}>{sports.map((sport) => <option key={sport} value={sport}>{sportLabels[sport]}</option>)}</select></label><label>Hashtags <span className="sp-label-hint">separe por vírgulas, sem #</span><input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="volei, treino, parceiro" /></label></div>
        <div className="sp-tag-cloud">{tags.map((tag) => <span className="sp-tag" key={tag}>#{tag}</span>)}</div>
        <div className="sp-form-footer"><Link href="/feed" className="sp-button ghost">Cancelar</Link><button className="sp-button primary" type="submit" disabled={!files.length || !form.description.trim() || busy}><Send size={15} /> {busy ? progress || "Publicando…" : isPhotos ? "Publicar fotos" : "Publicar vídeo"}</button></div>
      </form>
    </div>
  </>;
}