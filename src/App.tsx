import { useState } from "react";
import { SwordApp } from "./SwordApp";
import type { AppMode } from "./types";
import "./styles.css";
import "./styles-home.css";

type Page = "home" | AppMode;

export default function App() {
  const [page, setPage] = useState<Page>("home");

  if (page !== "home") {
    return <SwordApp effectMode={page} onBack={() => setPage("home")} />;
  }

  return (
    <div className="home-shell">
      <div className="home-content">
        <div className="home-logo">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" stroke="url(#grad1)" strokeWidth="2" fill="none" />
            <path d="M40 15 L45 35 L65 40 L45 45 L40 65 L35 45 L15 40 L35 35 Z" fill="url(#grad1)" opacity="0.8" />
            <circle cx="40" cy="40" r="8" fill="url(#grad1)" />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#66f0ff" />
                <stop offset="100%" stopColor="#ffb4a8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className="home-title">Squidward‘s Lab</h1>
        <p className="home-subtitle">基于AI编程的娱乐实验小站</p>

        <div className="home-cards">
          <button className="home-card" onClick={() => setPage("nebula")} type="button">
            <div className="card-icon nebula-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="4" fill="currentColor" />
                <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                <circle cx="12" cy="16" r="2" fill="currentColor" opacity="0.5" />
                <circle cx="36" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
                <circle cx="38" cy="34" r="2" fill="currentColor" opacity="0.5" />
                <circle cx="10" cy="32" r="1.5" fill="currentColor" opacity="0.4" />
              </svg>
            </div>
            <h2>星云粒子</h2>
            <p>粒子跟随手势扩散与聚合，模拟星云般的流动效果。</p>
            <span className="card-enter">进入</span>
          </button>

          <button className="home-card" onClick={() => setPage("sword")} type="button">
            <div className="card-icon sword-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M24 4 L28 20 L24 44 L20 20 Z" fill="currentColor" opacity="0.9" />
                <path d="M12 18 L36 18 L32 22 L16 22 Z" fill="currentColor" opacity="0.7" />
                <circle cx="24" cy="18" r="3" fill="currentColor" />
                <path d="M18 28 L24 24 L30 28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
              </svg>
            </div>
            <h2>万剑归宗</h2>
            <p>手势控制飞剑阵列，张开展开剑阵，捏合万剑归一。</p>
            <span className="card-enter">进入</span>
          </button>

          <button className="home-card" onClick={() => setPage("particleText")} type="button">
            <div className="card-icon text-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M10 36 L18 12 H23 L31 36 H26 L24 30 H17 L15 36 H10Z" fill="currentColor" opacity="0.9" />
                <path d="M34 12 H39 V36 H34 V12Z" fill="currentColor" opacity="0.72" />
                <circle cx="12" cy="10" r="1.8" fill="currentColor" opacity="0.55" />
                <circle cx="39" cy="38" r="1.6" fill="currentColor" opacity="0.5" />
                <circle cx="31" cy="8" r="1.2" fill="currentColor" opacity="0.42" />
              </svg>
            </div>
            <h2>粒子文字</h2>
            <p>输入文字或选择预设，让粒子聚合成 AI、中文或自定义文本。</p>
            <span className="card-enter">进入</span>
          </button>

          <button className="home-card" onClick={() => setPage("mouseUniverse")} type="button">
            <div className="card-icon mouse-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M16 8 L36 28 L27 30 L23 40 L16 8Z" fill="currentColor" opacity="0.88" />
                <circle cx="31" cy="13" r="2" fill="currentColor" opacity="0.62" />
                <circle cx="37" cy="19" r="1.4" fill="currentColor" opacity="0.5" />
                <circle cx="10" cy="34" r="2.2" fill="currentColor" opacity="0.5" />
                <circle cx="39" cy="37" r="1.8" fill="currentColor" opacity="0.42" />
              </svg>
            </div>
            <h2>鼠标粒子宇宙</h2>
            <p>移动、点击、长按、拖动和双击鼠标，操控一片霓虹粒子宇宙。</p>
            <span className="card-enter">进入</span>
          </button>
        </div>

        <footer className="home-footer">
          <p>基于实时交互的粒子特效演示</p>
        </footer>
      </div>

      <div className="home-bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
    </div>
  );
}
