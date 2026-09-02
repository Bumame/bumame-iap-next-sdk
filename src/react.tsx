"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { Principal } from "./types.js";

export interface IapProfileMenuProps {
  principal: Principal;
  profileHref?: string;
  roleLabel?: string;
  showIdentity?: boolean;
  onLogout: () => void | Promise<void>;
  profileLabel?: string;
  logoutLabel?: string;
  className?: string;
  renderProfileLink?: (input: { href: string; children: ReactNode }) => ReactNode;
}

export function IapProfileMenu({
  principal,
  profileHref = "https://account.bumame.com/profile",
  roleLabel,
  showIdentity = true,
  onLogout,
  profileLabel = "Profile settings",
  logoutLabel = "Log out",
  className,
  renderProfileLink,
}: IapProfileMenuProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const view = profileMenuView(principal, roleLabel);
  const linkChildren = <><span aria-hidden="true">⚙</span>{profileLabel}</>;
  const link = renderProfileLink
    ? renderProfileLink({ href: profileHref, children: linkChildren })
    : <a href={profileHref} style={menuItemStyle}>{linkChildren}</a>;

  return <details className={className} style={rootStyle}>
    <summary aria-label="Account menu" style={summaryStyle}>
      {showIdentity && <span style={identityStyle}>
        <strong style={nameStyle}>{view.name}</strong>
        <span style={roleStyle}>{view.role}</span>
      </span>}
      <span style={avatarStyle}>
        {principal.picture && !imageFailed
          ? <img src={principal.picture} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} style={imageStyle}/>
          : <span aria-hidden="true">{view.initials}</span>}
      </span>
    </summary>
    <div role="menu" style={menuStyle}>
      <div role="menuitem">{link}</div>
      <div style={dividerStyle}/>
      <button type="button" role="menuitem" onClick={() => void onLogout()} style={logoutStyle}><span aria-hidden="true">↪</span>{logoutLabel}</button>
    </div>
  </details>;
}

export function profileMenuView(principal: Principal, roleLabel?: string) {
  const name = principal.name?.trim() || principal.email?.trim() || "Bumame user";
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.length ? parts.map((part) => part[0]).join("").toUpperCase() : "?";
  return { name, role: roleLabel?.trim() || principal.roles[0] || "User", initials };
}

const rootStyle: CSSProperties = { position: "relative", display: "inline-block" };
const summaryStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 12, cursor: "pointer", listStyle: "none", userSelect: "none" };
const identityStyle: CSSProperties = { display: "grid", minWidth: 0, textAlign: "right" };
const nameStyle: CSSProperties = { maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 };
const roleStyle: CSSProperties = { maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#667085", fontSize: 12 };
const avatarStyle: CSSProperties = { display: "grid", placeItems: "center", width: 36, height: 36, overflow: "hidden", borderRadius: "50%", background: "#dbe8ff", color: "#174ea6", fontSize: 12, fontWeight: 700 };
const imageStyle: CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
const menuStyle: CSSProperties = { position: "absolute", zIndex: 1000, top: "calc(100% + 10px)", right: 0, minWidth: 210, padding: 8, border: "1px solid #e4e7ec", borderRadius: 12, background: "#fff", boxShadow: "0 14px 36px rgba(16,24,40,.14)" };
const menuItemStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: "#101828", textDecoration: "none", fontSize: 14 };
const logoutStyle: CSSProperties = { ...menuItemStyle, width: "100%", border: 0, background: "transparent", color: "#b42318", cursor: "pointer", fontFamily: "inherit", textAlign: "left" };
const dividerStyle: CSSProperties = { height: 1, margin: "5px 4px", background: "#eaecf0" };
