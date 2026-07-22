"use client";

import { ChangeEvent, DragEvent, PointerEvent, WheelEvent, useCallback, useEffect, useRef, useState } from "react";

type Mode = "crop" | "pad" | "stretch";
type RatioPreset = { label: string; width: number; height: number };

const presets: RatioPreset[] = [
  { label: "1:1", width: 1, height: 1 },
  { label: "4:3", width: 4, height: 3 },
  { label: "3:4", width: 3, height: 4 },
  { label: "16:9", width: 16, height: 9 },
  { label: "9:16", width: 9, height: 16 },
  { label: "3:2", width: 3, height: 2 },
];

const modeCopy: Record<Mode, { title: string; hint: string }> = {
  crop: { title: "智能裁剪", hint: "铺满画布，超出部分会被裁掉" },
  pad: { title: "完整留白", hint: "保留整张图片，空白处补背景" },
  stretch: { title: "直接拉伸", hint: "填满目标尺寸，画面可能变形" },
};

export default function Home() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [objectUrl, setObjectUrl] = useState("");
  const [activeRatio, setActiveRatio] = useState("1:1");
  const [ratioW, setRatioW] = useState(1);
  const [ratioH, setRatioH] = useState(1);
  const [outW, setOutW] = useState(1080);
  const [outH, setOutH] = useState(1080);
  const [mode, setMode] = useState<Mode>("crop");
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [background, setBackground] = useState("transparent");
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, positionX: 0, positionY: 0 });
  const [isMovingSubject, setIsMovingSubject] = useState(false);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = Math.max(1, outW);
    canvas.height = Math.max(1, outH);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mode === "pad" && background !== "transparent") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (mode === "stretch") {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return;
    }

    const scale = mode === "crop"
      ? Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * (zoom / 100)
      : Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const drawW = image.naturalWidth * scale;
    const drawH = image.naturalHeight * scale;
    const x = mode === "crop" ? (canvas.width - drawW) / 2 + positionX : (canvas.width - drawW) / 2;
    const y = mode === "crop" ? (canvas.height - drawH) / 2 + positionY : (canvas.height - drawH) / 2;
    ctx.drawImage(image, x, y, drawW, drawH);
  }, [background, image, mode, outH, outW, positionX, positionY, zoom]);

  useEffect(() => draw(), [draw]);
  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  const loadFile = (file?: File) => {
    if (!file) return;
    if (file.type !== "image/png" && !file.name.toLowerCase().endsWith(".png")) {
      setNotice("请选择 PNG 格式的图片");
      return;
    }
    const url = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setObjectUrl(url);
      setImage(nextImage);
      setFileName(file.name.replace(/\.png$/i, ""));
      const nextWidth = nextImage.naturalWidth;
      setOutW(nextWidth);
      setOutH(Math.max(1, Math.round(nextWidth * ratioH / ratioW)));
      setNotice("");
    };
    nextImage.onerror = () => {
      URL.revokeObjectURL(url);
      setNotice("图片无法读取，请换一张 PNG 试试");
    };
    nextImage.src = url;
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    loadFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    loadFile(event.dataTransfer.files?.[0]);
  };

  const chooseRatio = (preset: RatioPreset) => {
    setActiveRatio(preset.label);
    setRatioW(preset.width);
    setRatioH(preset.height);
    setOutH(Math.max(1, Math.round(outW * preset.height / preset.width)));
  };

  const setCustomRatio = (dimension: "w" | "h", value: number) => {
    const safeValue = Math.max(1, value || 1);
    setActiveRatio("custom");
    if (dimension === "w") {
      setRatioW(safeValue);
      setOutH(Math.max(1, Math.round(outW * ratioH / safeValue)));
    } else {
      setRatioH(safeValue);
      setOutH(Math.max(1, Math.round(outW * safeValue / ratioW)));
    }
  };

  const changeOutputWidth = (value: number) => {
    const next = Math.max(1, Math.min(12000, value || 1));
    setOutW(next);
    setOutH(Math.max(1, Math.round(next * ratioH / ratioW)));
  };

  const changeOutputHeight = (value: number) => {
    const next = Math.max(1, Math.min(12000, value || 1));
    setOutH(next);
    setOutW(Math.max(1, Math.round(next * ratioW / ratioH)));
  };

  const swapRatio = () => {
    setRatioW(ratioH);
    setRatioH(ratioW);
    setOutW(outH);
    setOutH(outW);
    const matching = presets.find((item) => item.width === ratioH && item.height === ratioW);
    setActiveRatio(matching?.label ?? "custom");
  };

  const beginMoveSubject = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!image || mode !== "crop") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      positionX,
      positionY,
    };
    setIsMovingSubject(true);
  };

  const moveSubject = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isMovingSubject || !image || mode !== "crop") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const deltaX = (event.clientX - dragStartRef.current.x) * (outW / rect.width);
    const deltaY = (event.clientY - dragStartRef.current.y) * (outH / rect.height);
    setPositionX(Math.round(dragStartRef.current.positionX + deltaX));
    setPositionY(Math.round(dragStartRef.current.positionY + deltaY));
  };

  const endMoveSubject = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isMovingSubject) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsMovingSubject(false);
  };

  const zoomSubject = (event: WheelEvent<HTMLCanvasElement>) => {
    if (!image || mode !== "crop") return;
    event.preventDefault();
    setZoom((current) => Math.max(10, Math.min(1000, current + (event.deltaY > 0 ? -10 : 10))));
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    draw();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName || "image"}-${ratioW}x${ratioH}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("PNG 已生成，正在下载");
    }, "image/png");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="比例工坊首页">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>比例工坊</span>
        </a>
        <span className="privacy"><i aria-hidden="true" /> 图片只在本机处理，不会上传</span>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow"><span /> PNG 比例调整器</p>
        <h1>把图片变成<span>刚刚好的比例</span></h1>
        <p>无需安装，不损失透明通道。上传一张 PNG，选择比例，即刻导出。</p>
      </section>

      <section className={`workspace ${image ? "has-image" : ""}`}>
        <div className="control-panel">
          <div className="panel-heading">
            <span className="step">01</span>
            <div><h2>选择图片</h2><p>支持带透明背景的 PNG</p></div>
          </div>

          <div
            className={`drop-zone ${dragging ? "is-dragging" : ""} ${image ? "is-compact" : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input ref={fileInputRef} type="file" accept="image/png,.png" onChange={onFileChange} />
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <span className="upload-icon" aria-hidden="true">↑</span>
              {image ? "更换图片" : "选择 PNG 图片"}
            </button>
            <p>{image ? `${fileName}.png · ${image.naturalWidth} × ${image.naturalHeight}px` : "或将图片拖放到这里"}</p>
          </div>

          <div className="divider" />

          <div className="panel-heading">
            <span className="step">02</span>
            <div><h2>目标比例</h2><p>选择常用比例或自定义</p></div>
          </div>

          <div className="ratio-grid">
            {presets.map((preset) => (
              <button
                type="button"
                key={preset.label}
                className={activeRatio === preset.label ? "active" : ""}
                onClick={() => chooseRatio(preset)}
              >
                <span className="ratio-shape" style={{ aspectRatio: `${preset.width}/${preset.height}` }} />
                {preset.label}
              </button>
            ))}
          </div>

          <div className={`custom-ratio ${activeRatio === "custom" ? "active" : ""}`}>
            <label>自定义</label>
            <input aria-label="自定义比例宽" type="number" min="1" value={ratioW} onChange={(e) => setCustomRatio("w", Number(e.target.value))} />
            <span>:</span>
            <input aria-label="自定义比例高" type="number" min="1" value={ratioH} onChange={(e) => setCustomRatio("h", Number(e.target.value))} />
            <button type="button" onClick={swapRatio} aria-label="交换宽高">⇄</button>
          </div>

          <div className="divider" />

          <div className="panel-heading">
            <span className="step">03</span>
            <div><h2>填充方式</h2><p>决定画面如何适配新比例</p></div>
          </div>

          <div className="mode-list">
            {(Object.keys(modeCopy) as Mode[]).map((item) => (
              <button key={item} type="button" className={mode === item ? "active" : ""} onClick={() => setMode(item)}>
                <span className={`mode-icon ${item}`} aria-hidden="true"><i /></span>
                <span><strong>{modeCopy[item].title}</strong><small>{modeCopy[item].hint}</small></span>
                <b aria-hidden="true" />
              </button>
            ))}
          </div>

          {mode === "crop" && (
            <div className="focus-controls">
              <label>缩放 <input type="range" min="10" max="1000" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label>
              <label>左右移动 <input type="range" min={-outW} max={outW} value={positionX} onChange={(e) => setPositionX(Number(e.target.value))} /></label>
              <label>上下移动 <input type="range" min={-outH} max={outH} value={positionY} onChange={(e) => setPositionY(Number(e.target.value))} /></label>
              <p>{zoom}% · 拖动预览图移动主体，滚轮自由缩放</p>
            </div>
          )}

          {mode === "pad" && (
            <div className="background-row">
              <span>背景</span>
              <button type="button" className={background === "transparent" ? "active checker" : "checker"} onClick={() => setBackground("transparent")} aria-label="透明背景" />
              {["#ffffff", "#111111", "#f2f0e9"].map((color) => (
                <button key={color} type="button" className={background === color ? "active" : ""} style={{ background: color }} onClick={() => setBackground(color)} aria-label={`背景颜色 ${color}`} />
              ))}
              <input type="color" value={background === "transparent" ? "#ffffff" : background} onChange={(e) => setBackground(e.target.value)} aria-label="自定义背景色" />
            </div>
          )}
        </div>

        <div className="preview-panel">
          <div className="preview-toolbar">
            <div><span className="live-dot" /> 实时预览</div>
            {image && <span>{outW} × {outH}px</span>}
          </div>

          <div className="canvas-stage">
            {image ? (
              <div
                className="canvas-wrap"
                style={{
                  aspectRatio: `${outW}/${outH}`,
                  width: `${Math.min(720, Math.round(560 * outW / outH))}px`,
                  maxWidth: "100%",
                }}
              >
                <canvas
                  ref={canvasRef}
                  aria-label="处理后的 PNG 预览"
                  onPointerDown={beginMoveSubject}
                  onPointerMove={moveSubject}
                  onPointerUp={endMoveSubject}
                  onPointerCancel={endMoveSubject}
                  onWheel={zoomSubject}
                />
                {mode === "crop" && <span className="drag-hint">拖动图片移动主体</span>}
              </div>
            ) : (
              <div className="empty-preview">
                <div className="empty-art" aria-hidden="true"><span /><i /></div>
                <strong>你的图片将在这里出现</strong>
                <p>选择左侧的 PNG 图片开始调整</p>
              </div>
            )}
          </div>

          <div className="output-bar">
            <div className="dimension-control">
              <label>输出尺寸</label>
              <div>
                <input aria-label="输出宽度" type="number" min="1" max="12000" value={outW} onChange={(e) => changeOutputWidth(Number(e.target.value))} />
                <span>×</span>
                <input aria-label="输出高度" type="number" min="1" max="12000" value={outH} onChange={(e) => changeOutputHeight(Number(e.target.value))} />
                <em>px</em>
              </div>
            </div>
            <button className="download-button" type="button" disabled={!image} onClick={download}>
              <span aria-hidden="true">↓</span> 导出 PNG
            </button>
          </div>
          {notice && <p className="notice" role="status">{notice}</p>}
        </div>
      </section>

      <footer><span>比例工坊</span><p>免费 · 无水印 · 本地处理</p></footer>
    </main>
  );
}
