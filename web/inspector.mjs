const sensors = ['Danger ahead','Danger right','Danger left','Facing left','Facing right','Facing up','Facing down','Food left','Food right','Food up','Food down'];
const actions = ['Straight','Turn right','Turn left'];
const fmt = n => Number(n).toLocaleString('en-US', { maximumSignificantDigits: 7 });
const ns = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, text) {
  const el = document.createElementNS(ns, tag);
  Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
  if (text !== undefined) el.textContent = text;
  return el;
}
export function createInspector(worker) {
  let lastFrame = "", animate = false;
  let state, selected = [1,0], spacing = 115, inspecting = false, wasRunning = false;
  const hosts = ['network','network-large'].map(id => {
    const host = document.getElementById(id);
    const ui = document.createElement('section');
    ui.className = 'calculation';
    ui.innerHTML = `<div class="inspection-controls"><button type="button" class="inspect-pause">Pause & inspect</button><button type="button" class="inspect-step" hidden>Next board</button><label>Network spacing <input class="inspect-spacing" type="range" min="100" max="220" value="115"></label></div><h3>Live calculation</h3><p class="inspection-action"></p><label class="neuron-picker-label">Inspect neuron <select class="neuron-picker"></select></label><div class="neuron-summary"></div><details class="math-details"><summary>Show all inputs × weights</summary><div class="math-table-wrap"></div></details>`;
    host.after(ui);
    ui.querySelector('.inspect-pause').onclick = () => {
      if (!inspecting) { wasRunning = !!state?.running; inspecting = true; worker.postMessage({type:'run',value:false}); }
      else { inspecting = false; worker.postMessage({type:'run',value:wasRunning}); }
      render(state);
    };
    ui.querySelector('.inspect-step').onclick = () => worker.postMessage({type:'step'});
    ui.querySelector('.inspect-spacing').oninput = e => { spacing = +e.target.value; render(state); };
    ui.querySelector('.neuron-picker').onchange = e => { selected = e.target.value.split(':').map(Number); render(state); };
    host.addEventListener('click', e => choose(e.target));
    host.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { if (e.target.dataset.layer) { e.preventDefault(); choose(e.target); } }
    });
    function choose(el) { if (el.dataset.layer !== undefined) { selected = [+el.dataset.layer,+el.dataset.neuron]; render(state); } }
    return {host,ui};
  });
  function render(s) {
    if (!s?.inspection) return;
    const frame = `${s.mode}:${s.steps}:${s.game.steps}:${s.updates}`;
    animate = s.running && !inspecting && frame !== lastFrame;
    lastFrame = frame;
    state = s;
    const {activations: layers, sums, weights, preferred} = s.inspection;
    if (!layers[selected[0]] || selected[1] >= layers[selected[0]].length) selected = [1,0];
    const [l,n] = selected, last = layers.length - 1;
    const name = (layer,i) => layer === 0 ? sensors[i] : layer === last ? actions[i] : `Hidden ${layer} · neuron ${i+1}`;
    hosts.forEach(({host,ui}, index) => {
      if (index && !document.getElementById('network-dialog').open) return;
      const width = 70 + last * spacing + 145, height = 280;
      const svg = svgEl('svg',{viewBox:`0 0 ${width} ${height}`,class:'interactive-network',role:'group','aria-label':'Interactive neural network. Select a neuron to inspect its calculation.'});
      svg.style.width = spacing <= 115 ? "100%" : `${Math.max(host.clientWidth, 320) * spacing / 115}px`;
      const counts = layers.map((a,i) => i === 0 || i === last ? a.length : Math.min(8,a.length));
      const indices = counts.map((c,i) => Array.from({length:c},(_,j) => j));
      // Keep an inspected hidden neuron visible even if it is outside the usual sample.
      if (l > 0 && l < last && n >= counts[l]) indices[l][counts[l]-1] = n;
      const y = (i,j) => 64 + indices[i].indexOf(j) * 175 / (counts[i]-1);
      const links = svgEl('g',{class:'network-links'}); svg.append(links);
      for (let k=1;k<layers.length;k++) for (const j of indices[k]) for (const i of indices[k-1]) {
        links.append(svgEl('line',{x1:50+(k-1)*spacing,y1:y(k-1,i),x2:50+k*spacing,y2:y(k,j),class:`${k===l && j===n?'selected-link':''} ${animate && layers[k-1][i] !== 0 && weights[k-1].w[j*layers[k-1].length+i] !== 0 ? 'forward-active' : ''}`,style:`animation-delay:${(k-1)*80}ms`}));
      }
      layers.forEach((a,k) => {
        const x = 50 + k*spacing, max = Math.max(1e-9,...a.map(Math.abs));
        svg.append(svgEl('text',{x,y:21,'text-anchor':'middle',class:'network-label'},k===0?'Inputs':k===last?'Outputs':`Hidden ${k}`));
        svg.append(svgEl('text',{x,y:41,'text-anchor':'middle',class:'network-count'},`${a.length} ${k===0?'signals':k===last?'Q-values':'neurons'}`));
        indices[k].forEach(j => {
          const node = svgEl('circle',{cx:x,cy:y(k,j),r:7,class:`network-node ${k===l&&j===n?'selected-node':''} ${k===last&&j===preferred?'preferred-node':''}`,opacity:.35+.65*Math.min(1,Math.abs(a[j])/max),tabindex:0,role:'button','aria-label':`${name(k,j)}: ${fmt(a[j])}`,'aria-pressed':String(k===l&&j===n),'data-layer':k,'data-neuron':j});
          node.append(svgEl('title',{},`${name(k,j)}: ${fmt(a[j])}`)); svg.append(node);
          if (k===last) { svg.append(svgEl('text',{x:x+15,y:y(k,j)-4,class:'network-action'},actions[j])); svg.append(svgEl('text',{x:x+15,y:y(k,j)+16,class:'network-score'},fmt(a[j]))); }
        });
        if (counts[k]<a.length) svg.append(svgEl('text',{x,y:263,'text-anchor':'middle',class:'network-count'},`+${a.length-counts[k]} more · use selector`));
      });
      host.replaceChildren(svg);
      ui.querySelector('.inspect-pause').textContent = inspecting ? 'Resume live view' : 'Pause & inspect';
      ui.querySelector('.inspect-step').hidden = !inspecting;
      ui.querySelector('.inspect-spacing').value = spacing;
      ui.querySelector('.inspection-action').textContent = `${inspecting?'Paused snapshot':'Current board'} · Network preference: ${actions[preferred]} (${fmt(layers[last][preferred])}). Q-values estimate future reward, not probabilities.${s.mode==='train' ? ' Curiosity may choose a different move during training.' : ''}`;
      const picker = ui.querySelector('.neuron-picker');
      const shape = layers.map(a=>a.length).join(':');
      if (picker.dataset.shape !== shape) {
        picker.replaceChildren(); layers.forEach((a,k) => a.forEach((_,j) => { const option=document.createElement('option'); option.value=`${k}:${j}`;option.textContent=name(k,j);picker.append(option); })); picker.dataset.shape=shape;
      }
      picker.value = `${l}:${n}`;
      const summary = ui.querySelector('.neuron-summary');
      if (!l) {
        summary.textContent = `${name(l,n)} · input ${n+1}: ${layers[0][n]} (${layers[0][n]?'yes':'no'}). This is a board signal; no weights, bias, or activation function are applied at the input.`;
        ui.querySelector('.math-details').hidden = true;
      } else {
        const inputs=layers[l-1], layer=weights[l-1], bias=layer.b[n], sum=sums[l-1][n], result=layers[l][n];
        const products=inputs.map((v,i)=>v*layer.w[n*inputs.length+i]);
        summary.innerHTML = `<strong>${name(l,n)}</strong><ol><li>Receive ${inputs.length} inputs from ${l===1?'the board signals':`Hidden ${l-1}`}.</li><li>Multiply each input by its learned weight.</li><li>Add the weighted inputs, then bias ${fmt(bias)}.</li><li>Weighted sum z = ${fmt(sum)}.</li><li>${l===last?'Linear output: keep z as the Q-value.':`ReLU: max(0, ${fmt(sum)}).`}</li><li>Result: <strong>${fmt(result)}</strong>.</li></ol>`;
        ui.querySelector('.math-details').hidden = false;
        const table = document.createElement('table');
        table.innerHTML = '<thead><tr><th>Incoming neuron</th><th>Input</th><th>Weight</th><th>Product</th></tr></thead>';
        const body=document.createElement('tbody'); inputs.forEach((v,i)=>{const row=document.createElement('tr');[name(l-1,i),fmt(v),fmt(layer.w[n*inputs.length+i]),fmt(products[i])].forEach(t=>{const cell=document.createElement('td');cell.textContent=t;row.append(cell);});body.append(row);});table.append(body);
        const equation=document.createElement('p');equation.className='math-equation';equation.textContent=`z = ${products.map(fmt).join(' + ')} + bias (${fmt(bias)}) = ${fmt(sum)}. Displayed numbers are rounded; calculations use full precision.`;
        ui.querySelector('.math-table-wrap').replaceChildren(table,equation);
      }
    });
  }
  return {render};
}
