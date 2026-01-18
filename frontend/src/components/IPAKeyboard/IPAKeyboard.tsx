import { useState, useCallback } from 'react';

interface IPAKeyboardProps {
  onSymbolClick: (symbol: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// IPA symbols organized by category
const IPA_CATEGORIES = {
  'Vowels (Front)': ['i', 'y', 'ɪ', 'ʏ', 'e', 'ø', 'ɛ', 'œ', 'æ', 'a', 'ɶ'],
  'Vowels (Central)': ['ɨ', 'ʉ', 'ɘ', 'ɵ', 'ə', 'ɜ', 'ɞ', 'ɐ', 'ä'],
  'Vowels (Back)': ['ɯ', 'u', 'ʊ', 'ɤ', 'o', 'ɔ', 'ʌ', 'ɑ', 'ɒ'],
  'Plosives': ['p', 'b', 't', 'd', 'ʈ', 'ɖ', 'c', 'ɟ', 'k', 'g', 'q', 'ɢ', 'ʔ'],
  'Nasals': ['m', 'ɱ', 'n', 'ɳ', 'ɲ', 'ŋ', 'ɴ'],
  'Trills': ['ʙ', 'r', 'ʀ'],
  'Taps/Flaps': ['ⱱ', 'ɾ', 'ɽ'],
  'Fricatives': ['ɸ', 'β', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'ʂ', 'ʐ', 'ç', 'ʝ', 'x', 'ɣ', 'χ', 'ʁ', 'ħ', 'ʕ', 'h', 'ɦ'],
  'Approximants': ['ʋ', 'ɹ', 'ɻ', 'j', 'ɰ', 'l', 'ɭ', 'ʎ', 'ʟ'],
  'Affricates': ['t͡s', 'd͡z', 't͡ʃ', 'd͡ʒ', 't͡ɕ', 'd͡ʑ'],
  'Clicks': ['ʘ', 'ǀ', 'ǃ', 'ǂ', 'ǁ'],
  'Implosives': ['ɓ', 'ɗ', 'ʄ', 'ɠ', 'ʛ'],
  'Suprasegmentals': ['ˈ', 'ˌ', 'ː', 'ˑ', '|', '‖', '.', '‿'],
  'Tones': ['˥', '˦', '˧', '˨', '˩', '↑', '↓', '↗', '↘'],
  'Diacritics': ['̥', '̬', '̤', '̰', '̼', '̪', '̺', '̻', '̹', '̜', '̟', '̠', '̈', '̽', '̩', '̯', '˞', '̃', 'ⁿ', 'ˡ', '̚', '̴', '̝', '̞', '̘', '̙'],
} as const;

export function IPAKeyboard({ onSymbolClick, isOpen, onClose }: IPAKeyboardProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Vowels (Front)');
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);

  const handleSymbolClick = useCallback(
    (symbol: string) => {
      onSymbolClick(symbol);
      // Add to recent, keep max 20
      setRecentSymbols((prev) => {
        const filtered = prev.filter((s) => s !== symbol);
        return [symbol, ...filtered].slice(0, 20);
      });
    },
    [onSymbolClick]
  );

  if (!isOpen) return null;

  const categories = Object.keys(IPA_CATEGORIES);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        width: '400px',
        maxHeight: '400px',
        backgroundColor: 'var(--color-bg-secondary, #1a1a1a)',
        border: '1px solid var(--color-border, #333)',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid var(--color-border, #333)',
          backgroundColor: 'var(--color-bg-tertiary, #2a2a2a)',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text, #fff)' }}>
          IPA Keyboard
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted, #888)',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>

      {/* Recent symbols */}
      {recentSymbols.length > 0 && (
        <div
          style={{
            padding: '8px',
            borderBottom: '1px solid var(--color-border, #333)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #888)', marginBottom: '4px' }}>
            Recent
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
            {recentSymbols.map((symbol, idx) => (
              <button
                key={`recent-${idx}`}
                type="button"
                onClick={() => handleSymbolClick(symbol)}
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  backgroundColor: 'var(--color-bg-tertiary, #2a2a2a)',
                  border: '1px solid var(--color-border, #333)',
                  borderRadius: '4px',
                  color: 'var(--color-text, #fff)',
                  cursor: 'pointer',
                }}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          padding: '8px',
          borderBottom: '1px solid var(--color-border, #333)',
        }}
      >
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: activeCategory === category ? 'var(--color-primary, #3b82f6)' : 'transparent',
              border: '1px solid var(--color-border, #333)',
              borderRadius: '4px',
              color: activeCategory === category ? 'white' : 'var(--color-text-muted, #888)',
              cursor: 'pointer',
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Symbols grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {IPA_CATEGORIES[activeCategory as keyof typeof IPA_CATEGORIES].map((symbol, idx) => (
            <button
              key={`${activeCategory}-${idx}`}
              type="button"
              onClick={() => handleSymbolClick(symbol)}
              title={`U+${symbol.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}`}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                backgroundColor: 'var(--color-bg, #0a0a0a)',
                border: '1px solid var(--color-border, #333)',
                borderRadius: '4px',
                color: 'var(--color-text, #fff)',
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary, #2a2a2a)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg, #0a0a0a)';
              }}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Footer with help */}
      <div
        style={{
          padding: '6px 12px',
          borderTop: '1px solid var(--color-border, #333)',
          fontSize: '11px',
          color: 'var(--color-text-muted, #666)',
        }}
      >
        Click a symbol to insert it at cursor position
      </div>
    </div>
  );
}

export default IPAKeyboard;
