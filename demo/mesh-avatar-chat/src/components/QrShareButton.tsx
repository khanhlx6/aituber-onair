import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { type UiLanguage, getStrings } from '../lib/i18n';

interface QrShareButtonProps {
  lang: UiLanguage;
}

/**
 * Replaces the GitHub text link on the main screen: shows a compact QR code
 * for the current page URL. Clicking opens a dialog with a large, scannable
 * code so the page can be opened on a phone by scanning it.
 */
export function QrShareButton({ lang }: QrShareButtonProps) {
  const strings = getStrings(lang);
  const [open, setOpen] = useState(false);
  const url = typeof window === 'undefined' ? '' : window.location.href;

  return (
    <>
      <button
        type="button"
        className="qr-button"
        title={strings.qr.open}
        aria-label={strings.qr.open}
        onClick={() => setOpen(true)}
      >
        <QRCodeSVG
          value={url}
          size={22}
          level="L"
          bgColor="transparent"
          fgColor="currentColor"
          marginSize={0}
        />
      </button>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div
            className="sheet qr-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-head">
              <h2 id="qr-title">{strings.qr.title}</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label={strings.settings.close}
              >
                ×
              </button>
            </div>
            <div className="qr-body">
              <QRCodeSVG
                value={url}
                size={220}
                level="M"
                bgColor="#ffffff"
                fgColor="#2a2433"
                marginSize={4}
              />
              <p className="hint">{strings.qr.hint}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
