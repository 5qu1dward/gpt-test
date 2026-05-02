export type GalleryCategoryId = string;

export type GalleryImage = {
  id: string;
  src: string;
  name: string;
  category: GalleryCategoryId;
  orientation: "landscape" | "portrait" | "square";
};

export type GalleryCategory = {
  id: GalleryCategoryId;
  label: string;
  description: string;
  images: GalleryImage[];
};

const imageModules = import.meta.glob("../assets/gallery/**/*.{jpg,jpeg,png,webp,gif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const knownCategoryText: Record<string, Pick<GalleryCategory, "label" | "description">> = {
  "black and white": {
    label: "黑白影像",
    description: "去掉颜色之后，光影、线条和情绪会更安静地留下来。",
  },
  humanities: {
    label: "人文纪实",
    description: "关于人、街道、生活现场和那些刚好发生的瞬间。",
  },
  scenery: {
    label: "风景照片",
    description: "自然、城市和远处的颜色，适合慢慢看。",
  },
  daily: {
    label: "日常瞬间",
    description: "生活里那些轻轻发光的片段。",
  },
  travel: {
    label: "旅行记录",
    description: "路上遇见的风、光和城市。",
  },
  other: {
    label: "其他收藏",
    description: "暂时不想归类，但值得留下。",
  },
};

const preferredOrder = ["black and white", "humanities", "scenery", "daily", "travel", "other"];

function normalizeFolderName(folder: string) {
  return decodeURIComponent(folder).trim();
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCategoryText(folder: string): Pick<GalleryCategory, "label" | "description"> {
  const normalized = folder.toLowerCase();
  return (
    knownCategoryText[normalized] ?? {
      label: titleCase(folder),
      description: "从这个文件夹自动读取的照片合集。",
    }
  );
}

function cleanImageName(filename: string, index: number) {
  const stem = filename.replace(/\.[^.]+$/, "");
  if (/^[a-f0-9-]{20,}$/i.test(stem)) {
    return `Photo ${String(index + 1).padStart(2, "0")}`;
  }
  return stem.replace(/[-_]+/g, " ");
}

function getOrientation(filename: string): GalleryImage["orientation"] {
  const normalized = filename.toLowerCase();
  if (/(portrait|vertical|竖|portrait)/.test(normalized)) return "portrait";
  if (/(landscape|horizontal|横|wide)/.test(normalized)) return "landscape";
  return "square";
}

function parseImage(path: string, src: string): Omit<GalleryImage, "name"> & { filename: string } | null {
  const match = path.match(/\/gallery\/([^/]+)\/([^/]+)$/);
  if (!match) return null;

  const folder = normalizeFolderName(match[1]);
  return {
    id: path,
    src,
    filename: match[2],
    category: folder,
    orientation: getOrientation(match[2]),
  };
}

export function getGalleryCategories(): GalleryCategory[] {
  const grouped = new Map<GalleryCategoryId, Array<Omit<GalleryImage, "name"> & { filename: string }>>();

  Object.entries(imageModules).forEach(([path, src]) => {
    const image = parseImage(path, src);
    if (!image) return;

    const images = grouped.get(image.category) ?? [];
    images.push(image);
    grouped.set(image.category, images);
  });

  return Array.from(grouped.entries())
    .map(([id, rawImages]) => {
      const sortedImages = rawImages.sort((a, b) => a.filename.localeCompare(b.filename, "zh-CN"));
      const images = sortedImages.map((image, index) => ({
        id: image.id,
        src: image.src,
        category: image.category,
        orientation: image.orientation,
        name: cleanImageName(image.filename, index),
      }));

      return {
        id,
        ...getCategoryText(id),
        images,
      };
    })
    .sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a.id.toLowerCase());
      const bIndex = preferredOrder.indexOf(b.id.toLowerCase());
      if (aIndex >= 0 || bIndex >= 0) {
        return (aIndex >= 0 ? aIndex : 999) - (bIndex >= 0 ? bIndex : 999);
      }
      return a.label.localeCompare(b.label, "zh-CN");
    });
}
