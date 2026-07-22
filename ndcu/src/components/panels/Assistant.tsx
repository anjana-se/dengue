import { useRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PRIMARY } from '../../theme';
import { useStore } from '../../store/useStore';
import { DengueGuardMark } from '../common/DengueGuardLogo';

/**
 * Compact Markdown element styling so assistant replies (bold, lists, links)
 * sit tightly inside the chat bubble. Text color/size/line-height are inherited
 * from the bubble container.
 */
const MD_COMPONENTS: Components = {
  p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
  ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: 18 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 4px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.92em' }}>
      {children}
    </code>
  ),
};

export default function Assistant() {
  const chat = useStore((s) => s.chat);
  const sendChat = useStore((s) => s.sendChat);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const send = () => {
    if (!inputRef.current) return;
    sendChat(inputRef.current.value);
    inputRef.current.value = '';
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 14 }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8e5',
          overflow: 'hidden',
          maxWidth: 820,
          width: '100%',
          margin: '0 auto',
        }}
      >
        <div style={{ padding: '13px 18px', borderBottom: '1px solid #eef1f0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <DengueGuardMark size={22} />
          <span style={{ fontSize: 15, fontWeight: 700, color: PRIMARY }}>DengueGuard Assistant</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#0b6b57', background: '#E7F7F0', padding: '2px 8px', borderRadius: 12 }}>
            EN · සිං · த
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {chat.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '76%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                  background: m.role === 'user' ? PRIMARY : '#f2f5f4',
                  color: m.role === 'user' ? '#fff' : '#0f2d27',
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  animation: 'dg-in .3s',
                }}
              >
                {m.role === 'user' ? (
                  m.content
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 14, borderTop: '1px solid #eef1f0', display: 'flex', gap: 10 }}>
          <input
            ref={inputRef}
            placeholder="Ask about zone risk, work orders, guidance…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            style={{
              flex: 1,
              padding: '11px 14px',
              border: '1px solid #d5ddda',
              borderRadius: 22,
              fontSize: 14,
              fontFamily: 'Inter',
              outline: 'none',
            }}
          />
          <button
            onClick={send}
            style={{
              padding: '0 20px',
              border: 'none',
              borderRadius: 22,
              background: PRIMARY,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'Inter',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
