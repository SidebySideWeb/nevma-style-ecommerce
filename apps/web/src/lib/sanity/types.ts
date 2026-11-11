/** Sanity `photo` object as returned by GROQ (with asset expanded). */
export type PhotoTone = 'black' | 'ink' | 'ink2' | 'bone';

export type SanityImageAsset = {
  _id?: string;
  url?: string;
  metadata?: {
    dimensions?: { width?: number; height?: number; aspectRatio?: number };
    lqip?: string;
  } | null;
};

export type SanityHotspot = {
  x?: number;
  y?: number;
  height?: number;
  width?: number;
};

export type SanityCrop = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

export type SanityImage = {
  asset?: SanityImageAsset | null;
  hotspot?: SanityHotspot | null;
  crop?: SanityCrop | null;
} | null;

export type Photo = {
  alt?: string | null;
  position?: string | null;
  zoom?: number | null;
  placeholder?: string | null;
  tone?: PhotoTone | null;
  image?: SanityImage;
} | null;

export type ProseMarkDef = {
  _key: string;
  _type: string;
  href?: string;
};

export type ProseSpan = {
  _type: 'span';
  _key?: string;
  text?: string;
  marks?: string[];
};

export type ProseBlock = {
  _type: 'block';
  _key?: string;
  style?: 'normal' | 'h3' | string;
  listItem?: 'bullet' | string;
  level?: number;
  markDefs?: ProseMarkDef[];
  children?: ProseSpan[];
};

export type ProseNotice = {
  _type: 'notice';
  _key?: string;
  text?: string;
};

export type ProseTableRow = {
  _type?: 'tableRow';
  _key?: string;
  cells?: string[];
};

export type ProseTable = {
  _type: 'simpleTable';
  _key?: string;
  head?: string[];
  rows?: ProseTableRow[];
  cta?: string | null;
};

export type ProseNode = ProseBlock | ProseNotice | ProseTable;

export type Prose = ProseNode[] | null | undefined;
