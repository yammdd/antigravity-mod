import React from 'react';

export default function SliderField({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <div className="field">
      <div className="field-head">
        <span>{label}</span>
        <span className="field-value">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
