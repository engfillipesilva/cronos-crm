import React from 'react';

const COLORS = [
  '#FF4D4D', '#FF9F43', '#FFCD3C', '#2ecc71', '#00d2d3', '#54a0ff', '#5f27cd', '#ff9ff3',
  '#ee5253', '#10ac84', '#0abde3', '#2e86de', '#341f97', '#f368e0', '#8395a7', '#222f3e'
];

export default function ColorPicker({ selectedColor, onSelect }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(8, 1fr)', 
      gap: '8px', 
      padding: '8px',
      background: 'var(--bg-tertiary)',
      borderRadius: '8px',
      marginTop: '8px'
    }}>
      {COLORS.map(color => (
        <button
          key={color}
          onClick={(e) => { e.stopPropagation(); onSelect(color); }}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: color,
            border: selectedColor === color ? '2px solid #fff' : 'none',
            cursor: 'pointer',
            padding: 0,
            boxShadow: selectedColor === color ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
            transition: 'transform 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          title={color}
        />
      ))}
    </div>
  );
}
