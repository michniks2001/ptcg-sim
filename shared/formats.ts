export type SupportStatus = 'verified' | 'experimental' | 'unavailable';
export interface RulesProfile {
  firstTurnDrawCard: boolean; firstTurnUseSupporter: boolean; attackFirstTurn: boolean;
  unlimitedRetreat?: boolean; historicalConfusion?: boolean; historicalRetreatPayment?: boolean;
  mulliganDrawMultiplier: number; setupCoinAfterSelection?: boolean;
  firstTurnUseTrainer?:boolean; unlimitedStadium?:boolean; replaceSameNameStadium?:boolean;
  legacyBurn?:boolean; supporterCleanupAtEndTurn?:boolean;
  pre2002PowerConditions?:boolean;
}
export const rulesProfiles: Record<string, RulesProfile> = {
  'wotc-1999': { firstTurnDrawCard:true, firstTurnUseSupporter:true, attackFirstTurn:true, unlimitedRetreat:true, historicalConfusion:true, historicalRetreatPayment:true, mulliganDrawMultiplier:2, setupCoinAfterSelection:true,unlimitedStadium:true,replaceSameNameStadium:true,pre2002PowerConditions:true },
  'ex-2004': { firstTurnDrawCard:false,firstTurnUseSupporter:false,attackFirstTurn:true,mulliganDrawMultiplier:1,supporterCleanupAtEndTurn:true,legacyBurn:true },
  'dp-2007': { firstTurnDrawCard:true,firstTurnUseSupporter:false,firstTurnUseTrainer:false,attackFirstTurn:true,mulliganDrawMultiplier:1,supporterCleanupAtEndTurn:true,legacyBurn:true },
  'bw-2011': { firstTurnDrawCard:true,firstTurnUseSupporter:true,attackFirstTurn:true,mulliganDrawMultiplier:1,legacyBurn:true },
  'xy-2013': { firstTurnDrawCard:true,firstTurnUseSupporter:true,attackFirstTurn:false,mulliganDrawMultiplier:1,legacyBurn:true },
  'modern-2020': { firstTurnDrawCard:true, firstTurnUseSupporter:false, attackFirstTurn:false, mulliganDrawMultiplier:1 },
};
export interface FormatDefinition {
  id:string; label:string; era:string; effectiveDate:string; releaseCutoff:string;
  legalSets:string[] | null; regulationMarks?:string[]; bannedCards:string[];
  restrictedCards:Record<string,number>; reprints:Record<string,string>;
  deckSize:number; copyLimit:number; rulesProfile:string; status:SupportStatus;
  aiDecks:string[]; limitations:string[]; sources:string[];
  basicEnergyNames?:string[];
}
const base: FormatDefinition = {
  id:'base-fossil-1999',label:'Base–Fossil (1999)',era:'Wizards',effectiveDate:'1999-10-10',releaseCutoff:'1999-10-10',
  legalSets:['BS','JU','FO'],bannedCards:[],restrictedCards:{},reprints:{},deckSize:60,copyLimit:4,rulesProfile:'wotc-1999',
  status:'experimental',aiDecks:['practice','haymaker','rain-dance','wigglytuff'],
  limitations:['Legacy playable format. Mulligan compensation is grouped after setup; pre-Neo Confusion attack-discard timing remains incomplete.','Gastly BS #50 is unavailable; known upstream card defects remain.'],
  sources:['https://jklaczpokemon.com/pokemon-wotc-rules/'],
};
export const formatDefinitions: FormatDefinition[] = [base,
  { ...base,id:'base-1999',label:'Base Set (1999)',effectiveDate:'1999-01-09',releaseCutoff:'1999-01-09',legalSets:['BS'],aiDecks:['practice'],limitations:[...base.limitations,'Three competitive AI archetypes have not been validated for this restricted pool.'] },
  { ...base,id:'base-jungle-1999',label:'Base–Jungle (1999)',effectiveDate:'1999-06-16',releaseCutoff:'1999-06-16',legalSets:['BS','JU'],aiDecks:['practice','haymaker'],limitations:[...base.limitations,'Three AI archetypes have not been validated for this restricted pool.'] },
  { ...base,id:'base-rocket-2000',label:'Base–Rocket (2000) · Experimental',effectiveDate:'2000-04-24',releaseCutoff:'2000-04-24',legalSets:['BS','JU','FO','TR'],limitations:[...base.limitations,'Main-expansion snapshot; promotional releases and every new card interaction are not certified.'] },
  { ...base,id:'base-gym-2000',label:'Base–Gym (2000) · Experimental',effectiveDate:'2000-10-16',releaseCutoff:'2000-10-16',legalSets:['BS','JU','FO','TR','G1','G2'],limitations:[...base.limitations,'Main-expansion snapshot with historical Stadium rules; promotional releases and every Gym interaction are not certified.'] },
  { ...base,id:'base-neo-genesis-2000',label:'Base–Neo Genesis (2000) · Experimental',effectiveDate:'2000-12-16',releaseCutoff:'2000-12-16',legalSets:['BS','JU','FO','TR','G1','G2','N1'],limitations:[...base.limitations,'Main-expansion Unlimited snapshot, not the later Modified format. Baby Pokémon and every Neo interaction are not certified.'] },
  { ...base,id:'engine-sandbox',label:'Twinleaf card laboratory · Experimental',era:'Mixed eras',effectiveDate:'2026-10-15',releaseCutoff:'9999-12-31',legalSets:null,rulesProfile:'modern-2020',aiDecks:['practice','haymaker','rain-dance','wigglytuff'],sources:[],limitations:['Not a sanctioned historical or Unlimited format. Mixed-era engine exploration only.','Every additional implementation is unverified until covered by a specific test. Unknown metadata and defects are reported separately.'] },
  { ...base,id:'worlds-2024',label:'Worlds 2024 · Experimental',era:'Scarlet & Violet',effectiveDate:'2024-08-16',releaseCutoff:'2024-08-02',
    legalSets:['BRS','ASR','PGO','LOR','SIT','CRZ','SVI','PAL','OBF','MEW','PAR','PAF','TEF','TWM','SFA'],regulationMarks:['F','G','H'],basicEnergyNames:['Grass Energy','Fire Energy','Water Energy','Lightning Energy','Psychic Energy','Fighting Energy','Darkness Energy','Metal Energy'],reprints:{'Switch BS':'Switch SVI'},rulesProfile:'modern-2020',aiDecks:['iron-thorns-2024','roaring-moon-2024','miraidon-2024'],
    limitations:['Main expansion pool only; promotional release cutoffs and equivalent older reprints are not certified.','Competitive AI lists retain tournament card counts with compatible primary printings; heuristic strategy and card interactions remain experimental.'],sources:['https://www.pokemon.com/uk/play-pokemon/worlds/2024/tcg-senior','https://limitlesstcg.com/tournaments/420/decklists'] },
  ...['Expanded','GLC','RSPK'].map(name=>({...base,id:`${name.toLowerCase()}-pending-audit`,label:`${name} · Unavailable`,era:name,effectiveDate:'',releaseCutoff:'',legalSets:[],rulesProfile:'',status:'unavailable' as const,aiDecks:[],sources:[],limitations:['Upstream definitions were inspected, but a dated legality/banlist snapshot, complete engine behavior and three compatible AI decks are not yet certified.']})),
  ...[2004,2006,2010,2013,2016,2019,2022,2025,2026].map(year=>({...base,id:`worlds-${year}`,label:`Worlds ${year} · Unavailable`,era:String(year),effectiveDate:'',releaseCutoff:'',legalSets:[],rulesProfile:'',status:'unavailable' as const,aiDecks:[],sources:[],limitations:['Tournament-specific legality, historical engine behavior and three complete AI decks are not yet verified. No guessed snapshot is enabled.']})),
];
export const formatById = new Map(formatDefinitions.map(f=>[f.id,f]));
export interface LegalityCard { name?:string; fullName:string; set:string; basicEnergy:boolean; releaseDate?:string|null; regulationMark?:string; }
export function legalInFormat(card:LegalityCard, format:FormatDefinition):boolean {
  if(format.status==='unavailable' || format.bannedCards.includes(card.fullName))return false;
  if(format.reprints[card.fullName])return true;
  if(format.legalSets===null)return true;
  if(format.basicEnergyNames && card.basicEnergy)return format.basicEnergyNames.includes(card.name||'');
  if(!format.legalSets.includes(card.set))return false;
  if(format.regulationMarks && !format.regulationMarks.includes(card.regulationMark||''))return false;
  return !card.releaseDate || card.releaseDate<=format.releaseCutoff;
}
