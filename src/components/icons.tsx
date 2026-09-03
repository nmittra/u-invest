import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...props }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

/* Brand mark: rulebook spine + candlesticks */
export function LogoMark({ size = 26, ...props }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 3.5h13.5a2.5 2.5 0 0 1 2.5 2.5v14.5H6.5A2.5 2.5 0 0 1 4 18V3.5Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 18a2.5 2.5 0 0 1 2.5-2.5H20" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 12V7.5" stroke="#f0a63c" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6.9 9h2.2v2.4H6.9z" fill="#f0a63c" stroke="none" />
      <path d="M12 13.5V6" stroke="#3ecf8e" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10.9 8h2.2v3.6h-2.2z" fill="#3ecf8e" stroke="none" />
      <path d="M16 13.5v-5" stroke="#e5564d" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M14.9 9.5h2.2v2.6h-2.2z" fill="#e5564d" stroke="none" />
    </svg>
  );
}

export const IconDesk = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z" />
  </svg>
);

export const IconRows = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5h16M4 10h16M4 15h16M4 20h10" />
    <circle cx="19.5" cy="20" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const IconBook = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 6.5C10.5 5 8.4 4.5 5 4.5v14c3.4 0 5.5.5 7 2 1.5-1.5 3.6-2 7-2v-14c-3.4 0-5.5.5-7 2Z" />
    <path d="M12 6.5v14" />
  </svg>
);

export const IconArchive = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5h16v4H4zM6 9v10h12V9" />
    <path d="M10 13h4" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconLock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const IconUnlock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 7.7-1.5" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M4.5 12.5 10 18 19.5 6.5" />
  </svg>
);

export const IconX = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" />
    <path d="M12 10v4.2" />
    <circle cx="12" cy="16.8" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="1.5" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
  </svg>
);

export const IconTarget = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

export const IconTrendUp = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 17.5 9 12l3.5 3.5 7.5-8" />
    <path d="M15 7.5h5v5" />
  </svg>
);

export const IconTrendDown = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 6.5 9 12l3.5-3.5 7.5 8" />
    <path d="M15 16.5h5v-5" />
  </svg>
);

export const IconScale = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4v16M7 20h10" />
    <path d="M12 6.5 5.5 8.5M12 6.5l6.5 2" />
    <path d="M3 14.5 5.5 8.5 8 14.5a2.7 2.7 0 0 1-5 0ZM16 14.5l2.5-6 2.5 6a2.7 2.7 0 0 1-5 0Z" />
  </svg>
);

export const IconFlag = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 21V4" />
    <path d="M6 4.5c4-2.2 8 2.2 12 0V13c-4 2.2-8-2.2-12 0" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4.5 19.5h15" />
  </svg>
);

export const IconPencil = (p: P) => (
  <svg {...base(p)}>
    <path d="m14.5 5 4.5 4.5L8.5 20H4v-4.5L14.5 5Z" />
    <path d="m12.5 7 4.5 4.5" />
  </svg>
);

export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 7h14M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
    <path d="M10.2 10.5v6M13.8 10.5v6" />
  </svg>
);

export const IconEye = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);

export const IconEyeOff = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 4l16 16" />
    <path d="M9.9 6.3A9.6 9.6 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17.6 17.6 0 0 1-3.2 3.7M6.1 8.3A16.8 16.8 0 0 0 2.5 12S6 18.2 12 18.2a9.3 9.3 0 0 0 3.5-.7" />
  </svg>
);

export const IconPulse = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 12h4l2.5-6.5L14 18l2.5-6H21" />
  </svg>
);

export const IconChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 9.5 6 6 6-6" />
  </svg>
);

export const IconShield = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5 5 6v6c0 4.6 3 7.6 7 8.5 4-.9 7-3.9 7-8.5V6l-7-2.5Z" />
    <path d="m8.8 11.8 2.3 2.3 4.3-4.6" />
  </svg>
);

export const IconBolt = (p: P) => (
  <svg {...base(p)}>
    <path d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5L13 3Z" />
  </svg>
);

export const IconAnchor = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="5.5" r="2.5" />
    <path d="M12 8v12M5 13H3.5a8.5 8.5 0 0 0 17 0H19M8.5 20H15" transform="translate(0,-1)" />
  </svg>
);

export const IconLayers = (p: P) => (
  <svg {...base(p)}>
    <path d="m12 3.5 8.5 4.5L12 12.5 3.5 8 12 3.5Z" />
    <path d="m4.5 12.5 7.5 4 7.5-4M4.5 16.5l7.5 4 7.5-4" opacity="0.75" />
  </svg>
);

export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m15.2 15.2 4.8 4.8" />
  </svg>
);

export const IconRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M19.8 3.6v3.6h-3.6" />
  </svg>
);

export const IconUpload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4.5 19.5h15" />
  </svg>
);
