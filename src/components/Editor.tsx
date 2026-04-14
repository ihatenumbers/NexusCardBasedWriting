import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  isActive: boolean;
  placeholder?: string;
  triggerWords?: { word: string; cardId: string }[];
  onTriggerClick?: (cardId: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ 
  content, 
  onChange, 
  isActive, 
  placeholder,
  triggerWords = [],
  onTriggerClick
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync local content when external content changes (e.g. from DB)
  useEffect(() => {
    if (!isEditing) {
      setLocalContent(content);
    }
  }, [content, isEditing]);

  useEffect(() => {
    if (isEditing && isActive && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      // Auto-resize height to content
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isEditing, isActive, localContent]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localContent !== content) {
      onChange(localContent);
    }
  };

  const handleChange = (val: string) => {
    setLocalContent(val);
    onChange(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'i')) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = localContent.substring(start, end);
      const symbol = e.key === 'b' ? '**' : '*';

      const newText = 
        localContent.substring(0, start) + 
        symbol + selectedText + symbol + 
        localContent.substring(end);

      handleChange(newText);
      
      // Reset selection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + symbol.length,
          end + symbol.length
        );
      }, 0);
    }
  };

  const highlightTriggerWords = (text: string) => {
    if (!text || triggerWords.length === 0) return text;

    let parts: (string | React.ReactNode)[] = [text];
    
    triggerWords.forEach(({ word, cardId }) => {
      const newParts: (string | React.ReactNode)[] = [];
      parts.forEach((part) => {
        if (typeof part !== 'string') {
          newParts.push(part);
          return;
        }

        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedWord})`, 'gi');
        const split = part.split(regex);
        
        split.forEach((s, idx) => {
          if (s.toLowerCase() === word.toLowerCase()) {
            newParts.push(
              <span
                key={`${cardId}-${s}-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTriggerClick?.(cardId);
                }}
                className="text-purple-400 border-b border-purple-500/50 cursor-pointer hover:bg-purple-500/10 transition-colors"
              >
                {s}
              </span>
            );
          } else if (s !== '') {
            newParts.push(s);
          }
        });
      });
      parts = newParts;
    });

    return parts;
  };

  const processMarkdownChildren = (children: any): any => {
    return React.Children.map(children, child => {
      if (typeof child === 'string') {
        return highlightTriggerWords(child);
      }
      if (React.isValidElement(child)) {
        const element = child as React.ReactElement<any>;
        if (element.props.children) {
          return React.cloneElement(element, {
            children: processMarkdownChildren(element.props.children)
          });
        }
      }
      return child;
    });
  };

  const renderContent = useMemo(() => {
    if (!content) return <span className="text-gray-600 italic">{placeholder || 'Click to write...'}</span>;

    return (
      <div className="markdown-body prose prose-invert prose-sm max-w-none text-gray-300">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{processMarkdownChildren(children)}</p>,
            li: ({ children }) => <li className="mb-1 list-disc ml-4">{processMarkdownChildren(children)}</li>,
            ul: ({ children }) => <ul className="mb-2">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal ml-4">{children}</ol>,
            h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-white border-b border-[#2a2b2f] pb-1">{processMarkdownChildren(children)}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-white">{processMarkdownChildren(children)}</h2>,
            h3: ({ children }) => <h3 className="text-md font-bold mb-1 text-white">{processMarkdownChildren(children)}</h3>,
            strong: ({ children }) => <strong className="font-bold text-white">{processMarkdownChildren(children)}</strong>,
            em: ({ children }) => <em className="italic text-gray-200">{processMarkdownChildren(children)}</em>,
            code: ({ children }) => <code className="bg-[#1a1b1e] px-1 rounded text-pink-400 font-mono text-[0.9em]">{children}</code>,
            pre: ({ children }) => <pre className="bg-[#1a1b1e] p-2 rounded-md my-2 overflow-x-auto border border-[#2a2b2f]">{children}</pre>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-500/50 pl-3 italic my-2 text-gray-400">{processMarkdownChildren(children)}</blockquote>
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }, [content, triggerWords, placeholder, onTriggerClick]);

  if (isEditing && isActive) {
    return (
      <textarea
        ref={textareaRef}
        value={localContent}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => e.stopPropagation()}
        placeholder={placeholder}
        className="min-h-full w-full bg-transparent border-none outline-none focus:ring-0 p-0 resize-none text-gray-300 leading-relaxed no-drag overflow-hidden"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      onMouseDown={(e) => e.stopPropagation()}
      className="min-h-full w-full cursor-text text-gray-300 leading-relaxed whitespace-pre-wrap break-words no-drag"
    >
      {renderContent}
    </div>
  );
};
