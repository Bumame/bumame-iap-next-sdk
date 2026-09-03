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
  const [open, setOpen] = useState(false);
  const view = profileMenuView(principal, roleLabel);
  const linkChildren = <><ProfileIcon/>{profileLabel}</>;
  const link = renderProfileLink
    ? renderProfileLink({ href: profileHref, children: linkChildren })
    : <a href={profileHref} style={menuItemStyle}>{linkChildren}</a>;

  return <details className={className} style={rootStyle} onToggle={(event) => setOpen(event.currentTarget.open)}>
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
      <ChevronIcon open={open}/>
    </summary>
    <div role="menu" style={menuStyle}>
      <div role="menuitem">{link}</div>
      <div style={dividerStyle}/>
      <button type="button" role="menuitem" onClick={() => void onLogout()} style={logoutStyle}><LogoutIcon/>{logoutLabel}</button>
    </div>
  </details>;
}

export function profileMenuView(principal: Principal, roleLabel?: string) {
  const name = principal.name?.trim() || principal.email?.trim() || "Bumame user";
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.length ? parts.map((part) => part[0]).join("").toUpperCase() : "?";
  return { name, role: friendlyRole(roleLabel?.trim() || principal.roles[0] || "User"), initials };
}

function friendlyRole(value: string) {
  const role = value.includes(".") ? value.split(".").at(-1) || value : value;
  return role.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ProfileIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.25"/><path d="M5.75 19c.65-3.25 2.75-5 6.25-5s5.6 1.75 6.25 5"/></svg>;
}

function LogoutIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 5H6.75A1.75 1.75 0 0 0 5 6.75v10.5C5 18.22 5.78 19 6.75 19H10"/><path d="m14.5 8 4 4-4 4M9 12h9"/></svg>;
}

function ChevronIcon({ open }: { open: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: "#7b879f", transition: "transform .16s ease", transform: open ? "rotate(180deg)" : "none" }}><path d="m6 8 4 4 4-4"/></svg>;
}

const rootStyle: CSSProperties = { position: "relative", display: "inline-block" };
const summaryStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 10, minHeight: 42, padding: "3px 5px 3px 8px", cursor: "pointer", listStyle: "none", userSelect: "none", borderRadius: 999, background: "transparent", WebkitTapHighlightColor: "transparent" };
const identityStyle: CSSProperties = { display: "grid", minWidth: 0, textAlign: "right" };
const nameStyle: CSSProperties = { maxWidth: 210, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#17213a", fontSize: 14, lineHeight: 1.3, fontWeight: 700 };
const roleStyle: CSSProperties = { maxWidth: 210, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#66728d", fontSize: 12, lineHeight: 1.25, fontWeight: 500 };
const avatarStyle: CSSProperties = { display: "grid", placeItems: "center", flex: "0 0 auto", width: 38, height: 38, overflow: "hidden", border: "1px solid #dce5f5", borderRadius: "50%", background: "linear-gradient(145deg,#4777d7,#204eab)", color: "#fff", fontSize: 12, fontWeight: 750, letterSpacing: ".2px" };
const imageStyle: CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
const menuStyle: CSSProperties = { position: "absolute", zIndex: 1000, top: "calc(100% + 9px)", right: 0, minWidth: 218, padding: 8, border: "1px solid #e1e7f0", borderRadius: 14, background: "#fff", boxShadow: "0 14px 34px rgba(23,33,58,.13)" };
const menuItemStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 11, minHeight: 42, padding: "0 11px", borderRadius: 9, color: "#17213a", textDecoration: "none", fontSize: 14, fontWeight: 550 };
const logoutStyle: CSSProperties = { ...menuItemStyle, width: "100%", border: 0, background: "transparent", color: "#b42318", cursor: "pointer", fontFamily: "inherit", textAlign: "left" };
const dividerStyle: CSSProperties = { height: 1, margin: "5px 4px", background: "#e8edf5" };
