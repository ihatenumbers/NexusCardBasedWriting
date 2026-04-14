import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  items: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive';
  }[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, items }) => {
  const [coords, setCoords] = useState({ x, y });

  useEffect(() => {
    const menuWidth = 200;
    const menuHeight = items.length * 40;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let finalX = x;
    let finalY = y;

    if (x + menuWidth > screenWidth) finalX = x - menuWidth;
    if (y + menuHeight > screenHeight) finalY = y - menuHeight;

    setCoords({ x: finalX, y: finalY });

    const handleClickOutside = () => onClose();
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('contextmenu', handleClickOutside);

    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [x, y, items.length, onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          position: 'fixed',
          top: coords.y,
          left: coords.x,
          zIndex: 9999,
        }}
        className="min-w-[200px] bg-[#151619] border border-[#2a2b2f] rounded-lg shadow-2xl py-1 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-[#2a2b2f] ${
              item.variant === 'destructive' ? 'text-red-400 hover:text-red-300' : 'text-gray-300'
            }`}
          >
            {item.icon && <span className="opacity-70">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
