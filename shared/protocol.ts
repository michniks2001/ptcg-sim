export interface BoardTarget { playerId: number; slot: 'active' | 'bench'; index: number; }
export interface EffectView { id: string; name: string; source: string; description: string; scope: string; duration?: string; }
export interface AttachmentView { card: CardView; kind: 'basic-energy' | 'special-energy' | 'tool' | 'attachment'; }
export interface GameplayEvent { id: number; kind: 'trainer' | 'attack' | 'attachment' | 'coin' | 'ability'; text: string; card?: CardView; target?: BoardTarget; result?: 'Heads' | 'Tails'; }
export interface CardView { id: number; name: string; fullName: string; image: string; kind: 'pokemon' | 'energy' | 'trainer'; energyKind?: 'basic' | 'special'; hp?: number; stage?: string; types?: string[]; provides?: string[]; weakness?: {type: string; value?: number}[]; resistance?: {type: string; value?: number}[]; retreat?: number; text: string; attacks: { name: string; damage: number; cost: string[]; text: string }[]; powers: { name: string; text: string }[]; }
export interface PokemonView { card?: CardView; hidden?: boolean; damage: number; attackBonus?: number; energy: CardView[]; conditions: string[]; attachments?: AttachmentView[]; effects?: EffectView[]; conditionDetails?: EffectView[]; }
export interface PlayerView { id: number; name: string; active: PokemonView; bench: PokemonView[]; hand: CardView[]; handCount: number; deckCount: number; prizes: number; discard: CardView[]; }
export interface ActionView { id: string; source: string; label: string; group: string; target?: string; boardTarget?: BoardTarget; kind: 'play' | 'energy' | 'evolve' | 'attack' | 'ability' | 'retreat' | 'end'; damage?: number; }
export interface PromptChoice { key: string; label: string; card?: CardView; boardTarget?: BoardTarget; fromTarget?: BoardTarget; }
export interface MulliganView { own: CardView[][]; opponent: CardView[][]; }
export interface PromptView { mulliganDraw?: { options: { key: string; count: number }[]; defaultKey: string }; battlefield?: 'pokemon' | 'attachment' | 'damage'; id: number; type: string; message: string; min: number; max: number; cancel: boolean; choices: PromptChoice[]; displayCards?: CardView[]; context?: 'deck' | 'discard'; payment?: string[]; paymentInOrder?: boolean; ordered?: boolean; sourceZone?: 'hand' | 'deck' | 'discard' | 'own-board' | 'opponent-board'; }
export interface MatchView { mulligans?: MulliganView; events?: GameplayEvent[]; fieldEffects?: EffectView[]; revision: number; format: string; turn: number; phase: string; activePlayer: number; winner: number | null; players: PlayerView[]; actions: ActionView[]; prompt?: PromptView; logs: string[]; diagnostics: string[]; fault?: string; }
export interface Reply { ok: boolean; error?: string; token?: string; state?: MatchView; }
export interface MatchView { abilitySession?: { label: string; mode: 'damage' | 'attachment'; available: boolean; message?: string }; }
export interface PlayerView { stadium?:CardView[]; lostZone?:CardView[]; usedGX?:boolean; usedVSTAR?:boolean; }
export interface PromptChoice { damageAmount?:number; }
export interface PromptView { damageTotal?:number; }
