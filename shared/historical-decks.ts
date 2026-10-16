import { allCatalog, type Deck } from './decks';
import { formatById, legalInFormat } from './formats';
type List = [name:string,set:string,quantity:number][];
// Tournament card counts are retained. Primary compatible printings are selected
// explicitly within each expansion; cosmetic tournament printings may differ.
export const historicalDeckLists: {id:string;name:string;source:string;formatId:string;list:List}[] = [
 {id:'iron-thorns-2024',name:'Iron Thorns · Cifuentes 2024',source:'https://limitlesstcg.com/decks/list/12238',formatId:'worlds-2024',list:[
  ['Iron Thorns ex','TWM',4],['Arven','OBF',4],["Professor's Research",'SVI',3],['Judge','SVI',3],["Boss's Orders",'PAL',3],["Colress's Tenacity",'SFA',2],['Iono','PAL',1],['Penny','SVI',1],["Giovanni's Charisma",'MEW',1],['Pokégear 3.0','SVI',4],['Crushing Hammer','SVI',4],['Pokémon Catcher','SVI',4],['Techno Radar','PAR',2],['Canceling Cologne','ASR',2],['Prime Catcher','TEF',1],['Earthen Vessel','PAR',1],['Energy Loto','ASR',1],['Lost Vacuum','LOR',1],['Future Booster Energy Capsule','TEF',3],['Technical Machine: Turbo Energize','PAR',1],['Lost City','LOR',3],['Lightning Energy','BS',7],['Double Turbo Energy','BRS',4],
 ]},
 {id:'roaring-moon-2024',name:'Roaring Moon · Shiokawa 2024',source:'https://limitlesstcg.com/decks/list/12239',formatId:'worlds-2024',list:[
  ['Roaring Moon ex','PAR',4],['Pecharunt ex','SFA',2],['Squawkabilly ex','PAL',2],['Roaring Moon','TEF',1],['Fezandipiti ex','SFA',1],['Radiant Greninja','ASR',1],["Professor Sada's Vitality",'PAR',4],['Judge','SVI',2],["Boss's Orders",'PAL',1],['Dark Patch','ASR',4],['Earthen Vessel','PAR',4],['Nest Ball','SVI',4],['Ultra Ball','SVI',4],['Trekking Shoes','ASR',4],['Pokémon Catcher','SVI',4],['Pokégear 3.0','SVI',2],['Prime Catcher','TEF',1],['Night Stretcher','SFA',1],['Pal Pad','SVI',1],['PokéStop','PGO',4],['Darkness Energy','SVE',9],
 ]},
 {id:'miraidon-2024',name:'Miraidon · Parker 2024',source:'https://limitlesstcg.com/decks/list/12241',formatId:'worlds-2024',list:[
  ['Miraidon ex','SVI',2],['Iron Hands ex','PAR',2],['Squawkabilly ex','PAL',2],['Raikou V','BRS',1],['Bloodmoon Ursaluna ex','TWM',1],['Mew ex','MEW',1],['Lumineon V','BRS',1],['Fezandipiti ex','SFA',1],['Zapdos','PGO',1],['Radiant Greninja','ASR',1],['Iron Bundle','PAR',1],['Arven','OBF',4],["Boss's Orders",'PAL',3],["Professor's Research",'SVI',1],['Electric Generator','SVI',4],['Nest Ball','SVI',4],['Ultra Ball','SVI',4],['Switch Cart','ASR',2],['Prime Catcher','TEF',1],['Forest Seal Stone','SIT',2],['Bravery Charm','PAL',1],['Rescue Board','TEF',1],['Town Store','OBF',1],['Lightning Energy','BS',16],['Double Turbo Energy','BRS',2],
 ]},
];
const normalize=(s:string)=>s.normalize('NFKD').replace(/[^a-z0-9]/gi,'').toLowerCase();
let indexedCount=-1;
const printingIndex=new Map<string,typeof allCatalog>();
export function historicalDeck(id:string, formatId?:string):Deck {
 if(indexedCount!==allCatalog.length){printingIndex.clear();for(const c of allCatalog){const key=`${normalize(c.name)}:${c.set}`;printingIndex.set(key,[...(printingIndex.get(key)||[]),c]);}indexedCount=allCatalog.length;}
 const source=historicalDeckLists.find(d=>d.id===id);if(!source)throw Error('Unknown historical deck.');
 const format=formatById.get(formatId||source.formatId)!;
 return {version:1,id:`example-${source.id}`,name:source.name,formatId:format.id,cards:source.list.map(([name,set,quantity])=>{
  const c=(printingIndex.get(`${normalize(name)}:${set}`)||[]).filter(c=>c.playable&&legalInFormat(c,format)).sort((a,b)=>a.number-b.number)[0];
  if(!c)throw Error(`Missing legal implementation: ${name} ${set}`);return {cardId:c.cardId,quantity};
 })};
}
export function availableHistoricalDecks():Deck[] {
 return historicalDeckLists.flatMap(d=>{try{return [historicalDeck(d.id)];}catch{return [];}});
}
