import { useEffect, useMemo, useState } from "react";
import { getGalleryCategories, type GalleryCategoryId, type GalleryImage } from "./utils/galleryUtils";
import "./styles-gallery.css";

type GalleryPageProps = {
  onBack: () => void;
};

export function GalleryPage({ onBack }: GalleryPageProps) {
  const categories = useMemo(() => getGalleryCategories(), []);
  const [activeCategory, setActiveCategory] = useState<GalleryCategoryId>(() => categories[0]?.id ?? "");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [orientationById, setOrientationById] = useState<Record<string, GalleryImage["orientation"]>>({});

  const active = categories.find((category) => category.id === activeCategory) ?? categories[0] ?? null;
  const images = active?.images ?? [];
  const previewImage = previewIndex === null ? null : images[previewIndex] ?? null;

  useEffect(() => {
    if (!activeCategory && categories[0]) {
      setActiveCategory(categories[0].id);
    }
  }, [activeCategory, categories]);

  const openPreview = (image: GalleryImage) => {
    const index = images.findIndex((item) => item.id === image.id);
    if (index >= 0) setPreviewIndex(index);
  };

  const closePreview = () => setPreviewIndex(null);

  const showPrevious = () => {
    if (!images.length) return;
    setPreviewIndex((current) => (current === null ? 0 : (current - 1 + images.length) % images.length));
  };

  const showNext = () => {
    if (!images.length) return;
    setPreviewIndex((current) => (current === null ? 0 : (current + 1) % images.length));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (previewIndex === null) return;
      if (event.key === "Escape") closePreview();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, images.length]);

  return (
    <main className="gallery-page">
      <div className="gallery-noise" aria-hidden="true" />
      <header className="gallery-nav">
        <button className="gallery-brand" onClick={onBack} type="button" aria-label="返回首页">
          <span className="gallery-brand-mark">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="16" r="14" />
              <path d="M16 6 L19 13 L26 16 L19 19 L16 26 L13 19 L6 16 L13 13 Z" />
            </svg>
          </span>
          <span>Squidward's Lab</span>
        </button>
        <button className="gallery-back" onClick={onBack} type="button">
          返回首页
        </button>
      </header>

      <section className="gallery-hero">
        <span className="gallery-kicker">Personal Gallery</span>
        <h1>相册展示</h1>
        <p>根据 `src/assets/gallery` 下的文件夹自动生成分类。现在会直接读取你已有的 Black and white、Humanities、Scenery 等目录。</p>
      </section>

      <section className="gallery-toolbar" aria-label="相册分类">
        {categories.map((category) => (
          <button
            key={category.id}
            className={activeCategory === category.id ? "active" : ""}
            onClick={() => {
              setActiveCategory(category.id);
              setPreviewIndex(null);
            }}
            type="button"
          >
            {category.label}
            <span>{category.images.length}</span>
          </button>
        ))}
      </section>

      <section className="gallery-section">
        <div className="gallery-section-title">
          <h2>{active?.label ?? "相册"}</h2>
          <p>{active?.description ?? "还没有读取到照片。"}</p>
        </div>

        {images.length > 0 ? (
          <div className="gallery-grid">
            {images.map((image, index) => (
              <button
                className={`gallery-card ${orientationById[image.id] ?? image.orientation}`}
                key={image.id}
                onClick={() => openPreview(image)}
                style={{ animationDelay: `${Math.min(index * 36, 360)}ms` }}
                type="button"
              >
                <img
                  src={image.src}
                  alt={`${active?.label ?? "Gallery"} ${image.name}`}
                  loading="lazy"
                  onLoad={(event) => {
                    const img = event.currentTarget;
                    const ratio = img.naturalWidth / Math.max(img.naturalHeight, 1);
                    const orientation = ratio > 1.18 ? "landscape" : ratio < 0.84 ? "portrait" : "square";
                    setOrientationById((current) => (current[image.id] === orientation ? current : { ...current, [image.id]: orientation }));
                  }}
                />
                <span>{image.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="gallery-empty">
            <strong>还没有读取到照片</strong>
            <span>请把图片放入 `src/assets/gallery/分类文件夹/`，然后重新运行项目。</span>
          </div>
        )}
      </section>

      {previewImage && (
        <div className="gallery-preview" role="dialog" aria-modal="true" aria-label="图片预览" onClick={closePreview}>
          <button className="preview-close" onClick={closePreview} type="button" aria-label="关闭预览">
            ×
          </button>
          <button
            className="preview-arrow preview-prev"
            onClick={(event) => {
              event.stopPropagation();
              showPrevious();
            }}
            type="button"
            aria-label="上一张"
          >
            ‹
          </button>
          <img src={previewImage.src} alt={previewImage.name} onClick={(event) => event.stopPropagation()} />
          <button
            className="preview-arrow preview-next"
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            type="button"
            aria-label="下一张"
          >
            ›
          </button>
          <div className="preview-caption">{previewImage.name}</div>
        </div>
      )}
    </main>
  );
}
