import React from 'react';

export default function SegmentedControl({ options, value, onChange, full = false }) {
  return (
    <div
      className={`segmented ${full ? 'full' : ''}`}
      style={full ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`seg-item ${value === opt.id ? 'active' : ''}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
