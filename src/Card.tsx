import { useState } from 'react';
import type { CardView } from '../shared/protocol';
export function Card({ card, onClick, small = false, selected = false, disabled = false, describedBy }: { card: CardView; onClick?: () => void; small?: boolean; selected?: boolean; disabled?: boolean; describedBy?: string }) {
  const [failed, setFailed] = useState(false);
  return <button type="button" className={`card ${small ? 'small' : ''} ${selected ? 'selected' : ''} ${card.kind}`} onClick={onClick} disabled={disabled} aria-describedby={describedBy} aria-label={card.name} title={card.name}>
    {!failed && <img src={card.image} alt="" onError={() => setFailed(true)} />}
    {failed && <span className="card-fallback"><strong>{card.name}</strong><span>{card.hp ? `${card.hp} HP · ${card.stage}` : card.kind}</span><span>{card.attacks.map(a => `${a.name} ${a.damage}`).join(' / ') || card.text}</span></span>}
  </button>;
}
