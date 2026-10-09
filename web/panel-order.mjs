// Move existing cards between side columns without recreating game controls.
const storageKey = 'snake-lab-panel-order-v1';
const columns = ['.controls-column','.play-column'].map(selector=>({selector,column:document.querySelector(selector)}));
const labels = ['Learning settings','Neural network','Move explanation','Move scores'];
const originals = columns.map(({column},side)=>[...column.children].filter(el=>el.classList.contains('panel')));
const cards = originals.flat();
const live = document.createElement('p'); live.className='visually-hidden';live.setAttribute('role','status');document.querySelector('main').append(live);
let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}catch{}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(Object.fromEntries(columns.map(({selector,column})=>[selector,[...column.children].filter(el=>el.dataset.panelId).map(el=>el.dataset.panelId)]))));}catch{}}
function refresh(){columns.forEach(({column},side)=>{const children=[...column.children].filter(el=>el.dataset.panelId);children.forEach((card,index)=>{card.querySelectorAll('.panel-move-controls button').forEach(button=>{const direction=button.dataset.move;button.disabled=direction==='up'?index===0:direction==='down'?index===children.length-1:direction==='left'?side===0:side===1;});});});}
originals.forEach((group,side)=>group.forEach((card,index)=>{
  card.dataset.panelId=`${columns[side].selector.slice(1)}-${index}`;card.dataset.panelName=labels[side*2+index];
  const controls=document.createElement('div');controls.className='panel-move-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label',`Reorder ${card.dataset.panelName}`);
  const caption=document.createElement('span');caption.textContent='Move this box';controls.append(caption);
  for(const [direction,text] of [['up','↑ Move up'],['down','↓ Move down'],['left','← Move left'],['right','→ Move right']]){
    const button=document.createElement('button');button.type='button';button.textContent=text;button.dataset.move=direction;button.setAttribute('aria-label',`Move ${direction}: ${card.dataset.panelName}`);
    button.onclick=()=>{
      const current=card.parentElement,currentSide=columns.findIndex(g=>g.column===current),siblings=[...current.children].filter(el=>el.dataset.panelId),position=siblings.indexOf(card);
      if(direction==='up'||direction==='down'){const neighbor=siblings[position+(direction==='up'?-1:1)];if(!neighbor)return;if(direction==='up')current.insertBefore(card,neighbor);else current.insertBefore(neighbor,card);}
      else{const target=columns[currentSide+(direction==='left'?-1:1)]?.column;if(!target)return;target.insertBefore(card,target.querySelector('.panel-order-reset'));}
      refresh();save();live.textContent=`${card.dataset.panelName} moved ${direction}.`;
      if(button.disabled)controls.querySelector('button:not(:disabled)')?.focus({preventScroll:true});card.scrollIntoView({block:'nearest',behavior:'instant'});
    };controls.append(button);
  }card.prepend(controls);
}));
const savedIds=columns.flatMap(({selector})=>Array.isArray(saved[selector])?saved[selector]:[]);
if(savedIds.length===cards.length&&new Set(savedIds).size===cards.length&&savedIds.every(id=>cards.some(card=>card.dataset.panelId===id))){columns.forEach(({selector,column})=>saved[selector].forEach(id=>column.append(cards.find(card=>card.dataset.panelId===id))));}
columns.forEach(({column},side)=>{const reset=document.createElement('button');reset.type='button';reset.className='panel-order-reset';reset.textContent='Reset panel layout';reset.setAttribute('aria-label','Reset all side panels to their original positions');reset.onclick=()=>{originals.forEach((group,i)=>group.forEach(card=>columns[i].column.insertBefore(card,columns[i].column.querySelector('.panel-order-reset'))));refresh();save();live.textContent='Side panels restored to their original positions.';};column.append(reset);});
refresh();
// The center has one card: move it vertically in explicit, reversible increments.
const game = document.querySelector('.board-panel');
if (game) {
  const positionKey = 'snake-lab-game-offset-v1';
  let offset = 0;
  try { const value = Number(localStorage.getItem(positionKey)); if (Number.isFinite(value)) offset = Math.max(0, Math.min(800, value)); } catch {}
  const controls = document.createElement('div'); controls.className = 'panel-move-controls game-move-controls';
  controls.setAttribute('role','group'); controls.setAttribute('aria-label','Move the game vertically');
  const caption = document.createElement('span'); caption.textContent = 'Move game box'; controls.append(caption);
  const up = document.createElement('button'), down = document.createElement('button'), reset = document.createElement('button');
  up.textContent = '↑ Move game up'; down.textContent = '↓ Move game down'; reset.textContent = 'Reset position';
  [up,down,reset].forEach(button=>{button.type='button'; controls.append(button);});
  game.prepend(controls);
  function position() {
    game.style.setProperty('--game-offset', `${offset}px`);
    up.disabled = offset === 0; down.disabled = offset === 800; reset.disabled = offset === 0;
    try { localStorage.setItem(positionKey, String(offset)); } catch {}
  }
  function move(delta) {
    offset = Math.max(0,Math.min(800,offset+delta)); position();
    live.textContent = `Game position ${offset===0?'at the top':`${offset} pixels below the top`}.`;
    if (document.activeElement?.disabled) (offset===0?down:up).focus({preventScroll:true});
    game.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  up.onclick = ()=>move(-80); down.onclick = ()=>move(80); reset.onclick = ()=>{offset=0;position();live.textContent='Game position reset to the top.';down.focus({preventScroll:true});};
  position();
}
