import * as React from "react";

/**
 * Thin-line icon set in the Streamline "Ultimate Light" aesthetic:
 * 24px grid, no fill, currentColor stroke, 1.5 weight, rounded caps/joins.
 * Replaces emojis everywhere for a cohesive, non-AI-slop look.
 */
export type IconName =
  | "overview" | "memory" | "reminders" | "chat" | "logs" | "settings" | "logout"
  | "edit" | "delete" | "add" | "play" | "pause" | "clone" | "history" | "save"
  | "close" | "send" | "refresh" | "check" | "checkCircle" | "alert" | "info"
  | "user" | "eye" | "eyeOff" | "cost" | "messages" | "inbox" | "arrowDownLeft"
  | "arrowUpRight" | "camera" | "image" | "bolt" | "pulse" | "power" | "menu"
  | "chevronDown" | "minus" | "external" | "mic" | "search" | "location" | "document" | "plus" | "arrowLeft" | "checkDouble";

const P: Record<IconName, React.ReactNode> = {
  overview: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  memory: (<><path d="M12 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 9 18a3 3 0 0 0 3 1.5A3 3 0 0 0 15 18a3 3 0 0 0 2-5.3 3 3 0 0 0-2-5.2 3 3 0 0 0-3-3Z" /><path d="M12 5v14" /></>),
  reminders: (<><circle cx="12" cy="13" r="7" /><path d="M12 10v3.2l2.2 1.6" /><path d="M5.5 3.5 3 6" /><path d="M18.5 3.5 21 6" /></>),
  chat: (<path d="M20.5 12a8 8 0 0 1-11.4 7.2L4 20.5l1.4-4.8A8 8 0 1 1 20.5 12Z" />),
  logs: (<><path d="M8 6h12M8 12h12M8 18h8" /><circle cx="4" cy="6" r="0.9" /><circle cx="4" cy="12" r="0.9" /><circle cx="4" cy="18" r="0.9" /></>),
  settings: (<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" /><circle cx="12" cy="12" r="3" /></>),
  logout: (<><path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M9.5 16 5.5 12l4-4" /><path d="M5.5 12H16" /></>),
  edit: (<><path d="M4 20h4L18 10l-4-4L4 16v4Z" /><path d="M13 7l4 4" /></>),
  delete: (<><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6.5 7 7.5 20h9L17.5 7" /><path d="M10 11v5M14 11v5" /></>),
  add: (<path d="M12 5v14M5 12h14" />),
  minus: (<path d="M5 12h14" />),
  play: (<path d="M7 5.5 18 12 7 18.5V5.5Z" />),
  pause: (<><path d="M9 5v14M15 5v14" /></>),
  clone: (<><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" /><path d="M4 15.5V6a2 2 0 0 1 2-2h9.5" /></>),
  history: (<><path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3L3.5 8" /><path d="M3.5 4v4h4" /><path d="M12 8v4.2l3 1.8" /></>),
  save: (<><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7V4.5" /><rect x="8" y="13" width="8" height="6.5" rx="0.5" /></>),
  close: (<path d="M6 6l12 12M18 6 6 18" />),
  send: (<><path d="M21 4 3 11l6.5 2.2L12 20l9-16Z" /><path d="M9.5 13.2 13 9.5" /></>),
  refresh: (<><path d="M20 11.5A8 8 0 1 0 18 17" /><path d="M20 4.5V10h-5.5" /></>),
  check: (<path d="M5 12.5 9.5 17 19 7" />),
  checkDouble: (<><path d="M2 13l3.5 3.5L13 7" /><path d="M10.5 16.5 12 18l7.5-10" /></>),
  checkCircle: (<><circle cx="12" cy="12" r="8.5" /><path d="M8 12.2l2.8 2.8L16 9" /></>),
  alert: (<><path d="M12 4 2.6 20h18.8L12 4Z" /><path d="M12 10v4.5M12 17.5h.01" /></>),
  info: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>),
  eye: (<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>),
  eyeOff: (<><path d="M3 3l18 18" /><path d="M10.6 6.1A11 11 0 0 1 12 6c6 0 10 6 10 6a18.5 18.5 0 0 1-3.2 3.6M6.5 6.6A18.5 18.5 0 0 0 2 12s4 6 10 6a11 11 0 0 0 4.1-.8" /><path d="M9.6 9.6a3 3 0 0 0 4.2 4.2" /></>),
  cost: (<><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18" /><circle cx="16.5" cy="14" r="1.2" /></>),
  messages: (<><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4.5 7 12 13l7.5-6" /></>),
  inbox: (<><path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5Z" /><path d="M4 13h4l1.5 2.5h5L16 13h4" /></>),
  arrowDownLeft: (<><path d="M17 7 7.5 16.5" /><path d="M7 9.5V17h7.5" /></>),
  arrowUpRight: (<><path d="M7 17 16.5 7.5" /><path d="M9.5 7H17v7.5" /></>),
  camera: (<><rect x="3" y="7" width="18" height="13" rx="2.5" /><circle cx="12" cy="13.5" r="3.5" /><path d="M8 7l1.5-2.5h5L16 7" /></>),
  image: (<><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="8.5" cy="9" r="1.6" /><path d="M21 15.5 16 10.5 5 19.5" /></>),
  bolt: (<path d="M13 2.5 4.5 13.5H11l-1 8L19.5 10H13l0-7.5Z" />),
  pulse: (<path d="M2.5 12.5H7l2-6 3.5 11 2.5-5h6.5" />),
  power: (<><path d="M12 3.5v8" /><path d="M7.5 6.8a7 7 0 1 0 9 0" /></>),
  menu: (<path d="M4 7h16M4 12h16M4 17h16" />),
  chevronDown: (<path d="M6 9.5 12 15.5 18 9.5" />),
  external: (<><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" /><path d="M12 18v3" /></>),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.8-3.8" /></>),
  location: (<><path d="M12 21s6.5-5.4 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.6 12 21 12 21Z" /><circle cx="12" cy="10.5" r="2.5" /></>),
  document: (<><path d="M6.5 3h6l5 5v12.5a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5v-17a.5.5 0 0 1 .5-.5Z" /><path d="M12.5 3v5h5" /></>),
  plus: (<path d="M12 5v14M5 12h14" />),
  arrowLeft: (<path d="M14.5 5 8 12l6.5 7" />),
};

export function Icon({
  name,
  className,
  size = 18,
  strokeWidth = 1.5,
  label,
}: {
  name: IconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {P[name]}
    </svg>
  );
}
