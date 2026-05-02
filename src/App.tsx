import { useEffect, useState } from "react";
import { GalleryPage } from "./GalleryPage";
import { SwordApp } from "./SwordApp";
import type { AppMode } from "./types";
import "./styles.css";
import "./styles-home.css";

type Page = "home" | "gallery" | AppMode;

type LabCard = {
  mode: AppMode;
  title: string;
  description: string;
  icon: "nebula" | "sword" | "text" | "mouse";
};

const labCards: LabCard[] = [
  {
    mode: "nebula",
    title: "星云粒子",
    description: "粒子跟随手势散开与聚合，模拟星云般的流动效果。",
    icon: "nebula",
  },
  {
    mode: "sword",
    title: "万剑归宗",
    description: "手势控制飞剑阵列，张开与推送形成剑势演示。",
    icon: "sword",
  },
  {
    mode: "particleText",
    title: "粒子文字",
    description: "输入文字或短句，让粒子聚合成发光文字。",
    icon: "text",
  },
  {
    mode: "mouseUniverse",
    title: "鼠标粒子宇宙",
    description: "鼠标移动、点击、拖动产生吸附、冲击波与星云轨迹。",
    icon: "mouse",
  },
];

function getInitialPage(): Page {
  return window.location.pathname === "/gallery" ? "gallery" : "home";
}

function LabIcon({ type }: { type: LabCard["icon"] }) {
  if (type === "sword") {
    return (
      <svg width="46" height="46" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M24 5 L28.5 21 L24 43 L19.5 21 Z" fill="currentColor" opacity="0.92" />
        <path d="M12 19 L36 19 L31.5 23 L16.5 23 Z" fill="currentColor" opacity="0.62" />
        <circle cx="24" cy="19" r="3.1" fill="currentColor" opacity="0.82" />
      </svg>
    );
  }

  if (type === "text") {
    return (
      <svg width="46" height="46" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M9 36 L17.5 12 H23 L31 36 H25.5 L24 30.5 H16.5 L14.8 36 H9Z" fill="currentColor" opacity="0.9" />
        <path d="M34 12 H39 V36 H34 V12Z" fill="currentColor" opacity="0.72" />
        <circle cx="11" cy="10" r="1.6" fill="currentColor" opacity="0.52" />
        <circle cx="39" cy="38" r="1.7" fill="currentColor" opacity="0.5" />
      </svg>
    );
  }

  if (type === "mouse") {
    return (
      <svg width="46" height="46" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M15 7 L37 29 L27.6 30.8 L23 41 Z" fill="currentColor" opacity="0.88" />
        <circle cx="31" cy="13" r="2" fill="currentColor" opacity="0.56" />
        <circle cx="38" cy="19" r="1.3" fill="currentColor" opacity="0.45" />
        <circle cx="10" cy="35" r="2" fill="currentColor" opacity="0.42" />
      </svg>
    );
  }

  return (
    <svg width="46" height="46" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="4.2" fill="currentColor" />
      <circle cx="24" cy="24" r="11" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.58" />
      <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.28" />
      <circle cx="12" cy="16" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="38" cy="34" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage);

  useEffect(() => {
    const handlePopState = () => setPage(getInitialPage());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateHome = () => {
    window.history.pushState(null, "", "/");
    setPage("home");
  };

  const navigateGallery = () => {
    window.history.pushState(null, "", "/gallery");
    setPage("gallery");
  };

  const openLabMode = (mode: AppMode) => {
    if (window.location.pathname !== "/") {
      window.history.pushState(null, "", "/");
    }
    setPage(mode);
  };

  if (page === "gallery") {
    return <GalleryPage onBack={navigateHome} />;
  }

  if (page !== "home") {
    return <SwordApp effectMode={page} onBack={navigateHome} />;
  }

  return (
    <main className="home-shell">
      <div className="home-stars" aria-hidden="true" />
      <div className="home-planet" aria-hidden="true">
        <div className="planet-signal">
          <div className="signal-core">
            <span />
          </div>
          <div className="signal-line" />
        </div>
      </div>

      <header className="home-nav">
        <button className="home-brand" type="button" aria-label="Squidward's Lab 首页">
          <span className="brand-mark">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="16" r="14" />
              <path d="M16 6 L19 13 L26 16 L19 19 L16 26 L13 19 L6 16 L13 13 Z" />
            </svg>
          </span>
          <span>Squidward's Lab</span>
        </button>
      </header>

      <section className="home-hero" id="home-hero">
        <div className="hero-copy">
          <h1>
            基于 <span>AI</span> 编程的
            <br />
            娱乐实验小站
          </h1>
          <p>这是一个个人静态站点，专注于用 AI 与编程创造视觉互动游戏，探索创意与技术的边界。</p>
        </div>
      </section>

      <section className="home-section" id="game-lab">
        <div className="section-heading">
          <h2>游戏实验室</h2>
          <p>当前核心内容 · 视觉互动游戏</p>
        </div>
        <div className="lab-grid">
          {labCards.map((card) => (
            <button className="lab-card" key={card.mode} onClick={() => openLabMode(card.mode)} type="button">
              <span className={`lab-icon ${card.icon}-icon`}>
                <LabIcon type={card.icon} />
              </span>
              <span className="lab-card-copy">
                <strong>{card.title}</strong>
                <span>{card.description}</span>
              </span>
              <span className="lab-enter">进入</span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-section upcoming-section" id="works">
        <div className="section-heading">
          <h2>更多内容</h2>
        </div>
        <button className="album-card album-card-button" onClick={navigateGallery} type="button">
          <span className="album-icon">
            <svg width="54" height="54" viewBox="0 0 54 54" fill="none" aria-hidden="true">
              <rect x="9" y="12" width="36" height="30" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.55" />
              <path d="M14 36 L23 27 L29 33 L33 29 L40 36" stroke="currentColor" strokeWidth="2" opacity="0.55" />
              <circle cx="35" cy="21" r="3" fill="currentColor" opacity="0.45" />
            </svg>
          </span>
          <span>
            <strong>相册展示</strong>
            <small>记录灵感与瞬间，点击进入 Gallery。</small>
          </span>
        </button>
      </section>

      <footer className="home-footer" id="about">
        <span>© 2026 Squidward's Lab · 个人娱乐实验站点</span>
        <span className="footer-links">GitHub · Mail · More</span>
      </footer>
    </main>
  );
}
