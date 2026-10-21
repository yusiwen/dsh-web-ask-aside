/** Plugin-scoped styles. The bundle injects this text once per plugin lifetime. */
export const CSS = `
.dwa-trigger {
  position: fixed;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.28));
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-specific-menu, var(--dsw-alias-bg-elevated, #fff));
  color: var(--dsw-alias-label-primary, #111);
  box-shadow: var(--dsw-elevation-prominent, 0 8px 24px rgba(0,0,0,.18));
  backdrop-filter: var(--dsw-menu-backdrop-filter, none);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
}
.dwa-trigger:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.1));
}
.dwa-trigger:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #2f6feb);
  outline-offset: 1px;
}
.dwa-trigger:disabled {
  cursor: default;
  opacity: .72;
}
.dwa-trigger svg {
  flex: none;
}
.dwa-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 11;
  transform: translateX(-50%);
  max-width: min(420px, calc(100vw - 32px));
  padding: 7px 12px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.28));
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-specific-menu, var(--dsw-alias-bg-elevated, #fff));
  color: var(--dsw-alias-state-error-primary, #c62828);
  box-shadow: var(--dsw-elevation-prominent, 0 8px 24px rgba(0,0,0,.18));
  font-size: 12px;
  line-height: 18px;
  pointer-events: none;
}
.dwa-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.dwa-notice {
  padding: 16px;
  color: var(--dsw-alias-label-tertiary, #666);
  font-size: 12px;
  line-height: 18px;
}
.dwa-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`
