export const PASSIVE_ATK = {
  color:  '#bb86fc',
  bg:     '#1e1030',
  border: 'border-left:4px solid #bb86fc',
};

export const PASSIVE_DEF = {
  color:  '#ff9d00',
  bg:     '#2a1800',
  border: 'border-left:4px solid #ff9d00',
};

export const MOVE_ATK = {
  color:  '#26c6da',
  bg:     '#0a2428',
  border: 'border-left:4px solid #26c6da',
};

export function passiveBadge(name, level = null, theme) {
  return `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
      <span style="
        background:${theme.color};color:#000;
        font-size:0.65rem;font-weight:900;
        font-family:'Exo 2',sans-serif;
        letter-spacing:0.06em;padding:2px 7px;
        border-radius:20px;text-transform:uppercase;
      ">Passive</span>
      <strong style="color:${theme.color};">${name}</strong>
      ${level != null ? `<span style="color:${theme.color}99;font-size:0.8rem;">(Lv.${level})</span>` : ''}
    </div>
  `;
}

export function moveBadge(name, level = null, theme = MOVE_ATK) {
  return `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
      <span style="
        background:${theme.color};color:#000;
        font-size:0.65rem;font-weight:900;
        font-family:'Exo 2',sans-serif;
        letter-spacing:0.06em;padding:2px 7px;
        border-radius:20px;text-transform:uppercase;
      ">Move Effect</span>
      <strong style="color:${theme.color};">${name}</strong>
      ${level != null ? `<span style="color:${theme.color}99;font-size:0.8rem;">(Lv.${level})</span>` : ''}
    </div>
  `;
}