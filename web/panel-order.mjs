// Reorder existing DOM cards so game state, controls and open details are retained.
const storageKey = 'snake-lab-panel-order-v1';
const columns = [
  {selector:'.controls-column', name:'Left panels', labels:['Learning settings','Neural network']},
  {selector:'.play-column', name:'Right panels', labels:['Move explanation','Move scores']},
];
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { /* Use the original order if storage is unavailable. */ }
const live = document.createElement('p');
live.className = 'visually-hidden';
live.setAttribute('role','status');
document.querySelector('main').append(live);
const groups = [];
function save() {
  const order = Object.fromEntries(groups.map(({column,selector}) => [selector, [...column.children].filter(el=>el.dataset.panelId).map(el=>el.dataset.panelId)]));
  try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch { /* Reordering still works without persistence. */ }
}
columns.forEach(({selector,name,labels}) => {
  const column = document.querySelector(selector);
  if (!column) return;
  const original = [...column.children].filter(el => el.classList.contains('panel'));
  original.forEach((card,index) => {
    card.dataset.panelId = `${selector.slice(1)}-${index}`;
    card.dataset.panelName = labels[index];
    const tools = document.createElement('div');
    tools.className = 'panel-move-controls';
    tools.setAttribute('role','group');
    tools.setAttribute('aria-label',`Reorder ${labels[index]}`);
    const caption = document.createElement('span'); caption.textContent = 'Move this box'; tools.append(caption);
    for (const direction of [-1,1]) {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = direction < 0 ? '↑ Move up' : '↓ Move down';
      button.dataset.direction = direction;
      button.setAttribute('aria-label',`${direction<0?'Move up':'Move down'}: ${labels[index]}`);
      button.onclick = () => {
        const cards = [...column.children].filter(el=>el.dataset.panelId);
        const position = cards.indexOf(card), neighbor = cards[position+direction];
        if (!neighbor) return;
        if (direction<0) column.insertBefore(card,neighbor);
        else column.insertBefore(neighbor,card);
        update(); save();
        live.textContent = `${labels[index]} moved ${direction<0?'up':'down'} in ${name.toLowerCase()}. Position ${position+direction+1} of ${cards.length}.`;
        if (button.disabled) tools.querySelector('button:not(:disabled)').focus({preventScroll:true});
        card.scrollIntoView({block:'nearest',behavior:'instant'});
      };
      tools.append(button);
    }
    card.prepend(tools);
  });
  const group = {column,selector}; groups.push(group);
  const order = saved[selector];
  if (Array.isArray(order) && order.length===original.length && new Set(order).size===original.length && order.every(id=>original.some(card=>card.dataset.panelId===id))) {
    order.forEach(id=>column.append(original.find(card=>card.dataset.panelId===id)));
  }
  const reset = document.createElement('button'); reset.type='button';reset.className='panel-order-reset';reset.textContent='Reset panel order';
  reset.setAttribute('aria-label',`Reset ${name.toLowerCase()} to their original order`);
  reset.onclick=()=>{ original.forEach(card=>column.insertBefore(card,reset));update();save();live.textContent=`${name} restored to their original order.`; };
  column.append(reset);
  function update() {
    const cards=[...column.children].filter(el=>el.dataset.panelId);
    cards.forEach((card,index)=>card.querySelectorAll('.panel-move-controls button').forEach(button=>{
      button.disabled = +button.dataset.direction<0 ? index===0 : index===cards.length-1;
    }));
  }
  update();
});
