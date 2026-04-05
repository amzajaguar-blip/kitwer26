'use client';
/**
 * @module import-engine/CommandButton
 * Single import command trigger button. ≥44px touch target (WCAG 2.5.5).
 */
import React, { useCallback } from 'react';
import { T } from './types';

interface CommandButtonProps {
  label:    string;
  command:  string;
  variant:  'primary' | 'danger' | 'secondary';
  disabled: boolean;
  onClick:  (command: string) => void;
}

export function CommandButton({ label, command, variant, disabled, onClick }: CommandButtonProps): React.ReactElement {
  const bg    = variant === 'primary' ? T.cyan : variant === 'danger' ? T.red : T.bgCardHover;
  const color = variant === 'primary' || variant === 'danger' ? T.bgPrimary : T.text;

  const handleClick = useCallback(() => {
    if (variant === 'danger' && !window.confirm(`⚠ Sei sicuro di voler eseguire:\n"${command}"\n\nQuesta operazione è irreversibile.`)) return;
    onClick(command);
  }, [command, variant, onClick]);

  return (
    <button
      type="button"
      aria-label={`Run command: ${label}`}
      disabled={disabled}
      onClick={handleClick}
      style={{
        minHeight: '44px', minWidth: '44px',
        padding: '10px 18px',
        backgroundColor: disabled ? T.bgCard : bg,
        color: disabled ? T.textDim : color,
        border: `1px solid ${disabled ? T.border : bg}`,
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: T.font, fontSize: '13px', fontWeight: 700,
        opacity: disabled ? 0.5 : 1,
        width: '100%', textAlign: 'left',
        transition: 'opacity 0.15s, background-color 0.15s',
      }}
    >
      {label}
    </button>
  );
}
