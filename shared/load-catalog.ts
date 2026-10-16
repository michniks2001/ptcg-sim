import { registerCatalog, type CatalogCard } from './decks';
let loading: Promise<void> | undefined;
export function loadExpandedCatalog() {
  return loading ||= import('./expanded-catalog.json').then(m=>registerCatalog(m.default as CatalogCard[])).catch(e=>{loading=undefined;throw e;});
}
