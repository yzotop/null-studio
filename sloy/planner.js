// Dimensions, offsets and both projections share one coordinate system in centimetres.
const kitchenPlanner = (() => {
  const el = id => document.getElementById(id);
  const plan = el('drawing'), volume = el('volume'), list = el('module-list');
  const catalog = {
    drawer: {name:'Тумба с ящиками', w:60, h:90},
    narrow: {name:'Узкий шкаф', w:40, h:90},
    pantry: {name:'Пенал', w:60, h:210},
    sink: {name:'Тумба с мойкой', w:60, h:90},
    hob: {name:'Варочная панель', w:60, h:90},
    oven: {name:'Духовой шкаф', w:60, h:90},
    dishwasher: {name:'Посудомоечная машина', w:45, h:90},
    fridge: {name:'Холодильник', w:60, h:200}
  };
  const lanes = {main:'Основная стена', side:'Вторая стена', island:'Остров'};
  const finishes = {
    'Натуральный дуб':['#bf9867','#987549','#d7bb92'],
    'Светлый ясень':['#e4d4b7','#bfac89','#efe5d1'],
    'Оливковый дуб':['#879272','#657153','#afba96']
  };
  let items = [], nextId = 1, active = null, drag = null, mapping;
  let geometry = {};
  let previouslyPlaced = new Set();
  const selected = () => items.find(item => item.id === active);
  const note = message => { el('placement-info').textContent = message; };
  const label = item => catalog[item.kind].name + ' №' + item.id;
  function rails() {
    const main = el('length'), extra = el('extra'), mode = el('layout').value;
    if (!main.validity.valid || (mode !== 'straight' && !extra.validity.valid)) return {};
    const length = main.valueAsNumber, second = extra.valueAsNumber;
    const result = {main:{x:0,y:0,length,vertical:false}};
    if (mode === 'corner') result.side = {x:0,y:60,length:Math.max(0,second-60),vertical:true};
    if (mode === 'island') result.island = {x:(length-second)/2,y:155,length:second,vertical:false};
    return result;
  }
  function fits(item, rail, offset) {
    const lane = geometry[rail], width = catalog[item.kind].w;
    if (!lane || !Number.isInteger(offset) || offset < 0 || offset + width > lane.length) return false;
    return !items.some(other => other !== item && other.rail === rail &&
      other.at + catalog[other.kind].w <= lane.length &&
      other.at < offset + width && offset < other.at + catalog[other.kind].w);
  }
  function placed(item) {
    return geometry[item.rail] && item.at + catalog[item.kind].w <= geometry[item.rail].length;
  }
  function firstSpace(item) {
    for (const [rail,lane] of Object.entries(geometry)) {
      const stops = [0, ...items.filter(other => other !== item && other.rail === rail && placed(other))
        .map(other => other.at + catalog[other.kind].w)].sort((a,b)=>a-b);
      for (const at of stops) if (at < lane.length && fits(item,rail,at)) return {rail,at};
    }
    return null;
  }
  function insert(kind) {
    const item = {kind,id:nextId++,rail:null,at:0};
    const slot = firstSpace(item);
    if (slot) Object.assign(item,slot);
    items.push(item);
    active = item.id;
    return item;
  }
  function applyCollection(key) {
    items = []; nextId = 1; geometry = rails();
    const specs = key === 'city'
      ? [['sink','main',0],['drawer','main',60],['fridge','main',210],['hob','side',0]]
      : [['pantry','main',0],['sink','main',100],['hob','main',220],['drawer','island',0],['narrow','island',60]];
    for (const [kind,rail,at] of specs) items.push({kind,rail,at,id:nextId++});
    active = items[0].id;
    note('');
  }
  function svg(parent,tag,attrs,text) {
    const node = document.createElementNS('http://www.w3.org/2000/svg',tag);
    for (const [name,value] of Object.entries(attrs)) node.setAttribute(name,value);
    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
  }
  function box(rail,at,w) {
    const lane = geometry[rail];
    return {x:lane.x+(lane.vertical?0:at), y:lane.y+(lane.vertical?at:0),
      w:lane.vertical?60:w,d:lane.vertical?w:60};
  }
  function getBounds() {
    const rects = Object.keys(geometry).map(rail=>box(rail,0,geometry[rail].length));
    return {min:Math.min(...rects.map(r=>r.x)),max:Math.max(...rects.map(r=>r.x+r.w)),
      end:Math.max(...rects.map(r=>r.y+r.d))};
  }
  function text(parent,x,y,value,size=14) {
    svg(parent,'text',{x,y,'text-anchor':'middle',fill:'#303c31','font-family':'Arial,sans-serif','font-size':size,'pointer-events':'none'},value);
  }
  function drawPlan(bounds,colors) {
    const s = Math.min(390/(bounds.max-bounds.min),190/bounds.end);
    const x = (520-(bounds.max-bounds.min)*s)/2-bounds.min*s, y=(300-bounds.end*s)/2;
    mapping = {s,x,y};
    const rect = (parent,r,attrs) => svg(parent,'rect',{x:x+r.x*s,y:y+r.y*s,width:r.w*s,height:r.d*s,...attrs});
    for (const [key,lane] of Object.entries(geometry)) {
      const b = box(key,0,lane.length);
      rect(plan,b,{fill:'#edeade',stroke:'#929887','stroke-dasharray':'5 3','data-lane':key});
      const startX=x+b.x*s, startY=y+b.y*s;
      if (lane.vertical) {
        const lineX=startX-8, endY=startY+b.d*s;
        svg(plan,'path',{d:`M${lineX} ${y}V${endY}m-3 0h6 M${lineX-3} ${y}h6`,stroke:'#88927f',fill:'none'});
        text(plan,startX-35,(y+endY)/2,el('extra').value+' см');
      } else {
        svg(plan,'path',{d:`M${startX} ${startY-5}h${b.w*s}m0 -3v6 M${startX} ${startY-8}v6`,stroke:'#88927f',fill:'none'});
        text(plan,startX+b.w*s/2,startY-12,lane.length+' см');
      }
    }
    for (const item of items.filter(placed)) {
      const b = box(item.rail,item.at,catalog[item.kind].w);
      const group=svg(plan,'g',{'data-module':item.id,style:'cursor:grab'});
      svg(group,'title',{},label(item));
      rect(group,b,{fill:colors[0],stroke:item.id===active?'#a33c19':'#364334','stroke-width':item.id===active?3:1.3});
      const cx=x+(b.x+b.w/2)*s,cy=y+(b.y+b.d/2)*s;
      if (item.kind==='hob') {
        for (const dx of [-.23,.23]) for(const dy of [-.23,.23])
          svg(group,'circle',{cx:cx+dx*b.w*s,cy:cy+dy*b.d*s,r:Math.min(b.w,b.d)*s*.12,fill:'none',stroke:'#3e4a40'});
      }
      if(item.kind==='sink') svg(group,'rect',{x:cx-b.w*s*.34,y:cy-b.d*s*.32,width:b.w*s*.68,height:b.d*s*.64,rx:4,fill:'#dde2d9',stroke:'#76867e'});
      text(group,cx,cy+5,item.id,Math.max(8,Math.min(16,b.w*s*.45)));
    }
  }
  function drawVolume(bounds,colors) {
    const project = (x,y,z) => [x*.86-y*.62,x*.22+y*.44-z*.92];
    const solids = items.filter(placed).map(item=>({...box(item.rail,item.at,catalog[item.kind].w),item,h:catalog[item.kind].h}));
    const corners = [[bounds.min-8,-8],[bounds.max+8,-8],[bounds.max+8,bounds.end+8],[bounds.min-8,bounds.end+8]];
    const pts = corners.map(([x,y])=>project(x,y,0));
    for(const b of solids) for(const x of [b.x,b.x+b.w]) for(const y of [b.y,b.y+b.d]) pts.push(project(x,y,b.h));
    const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
    const lo=Math.min(...xs),hi=Math.max(...xs),bottom=Math.max(...ys),top=Math.min(...ys);
    const scale=Math.min(470/(hi-lo),246/(bottom-top));
    const point=(x,y,z=0)=>{
      const [u,v]=project(x,y,z);
      return [(u-(lo+hi)/2)*scale+260,(v-(top+bottom)/2)*scale+150].join(',');
    };
    function face(vertices,color,stroke='#625f51') {
      svg(volume,'polygon',{points:vertices.map(p=>point(...p)).join(' '),fill:color,stroke,'stroke-width':.85,'stroke-linejoin':'round'});
    }
    const line=(a,b,color)=>svg(volume,'polyline',{points:point(...a)+' '+point(...b),fill:'none',stroke:color,'stroke-width':1.4});
    face(corners,'#dfdacb','#bcb8a7');
    for(const key of Object.keys(geometry)) {
      const {x,y,w,d}=box(key,0,geometry[key].length);
      face([[x,y],[x+w,y],[x+w,y+d],[x,y+d]],'#d0cbb9','#b2af9e');
    }
    solids.sort((a,b)=>(a.x+a.w/2)*.62+(a.y+a.d/2)*.86-(b.x+b.w/2)*.62-(b.y+b.d/2)*.86);
    for(const {x,y,w,d,h,item} of solids) {
      const X=x+w,Y=y+d;
      face([[x,Y,0],[X,Y,0],[X,Y,h],[x,Y,h]],colors[0]);
      face([[X,y,0],[X,Y,0],[X,Y,h],[X,y,h]],colors[1]);
      face([[x,y,h],[X,y,h],[X,Y,h],[x,Y,h]],h>100?colors[2]:'#e4dfcd');
      const front=(u,v)=>item.rail==='side'?[X,Y-u*d,v*h]:[x+u*w,Y,v*h];
      const panel=(u,v,U,V,color)=>face([front(u,v),front(U,v),front(U,V),front(u,V)],color);
      panel(.015,.015,.985,.072,colors[1]);
      if (['pantry','narrow','sink','fridge','dishwasher'].includes(item.kind)) {
        panel(.07,.12,.93,.94,colors[2]);
        panel(.10,.145,.90,.92,colors[0]);
      }
      if (item.kind==='dishwasher') panel(.04,.84,.96,.96,'#89978c');
      if(item.kind==='oven') {
        panel(.07,.18,.93,.77,'#38413c'); panel(.13,.26,.87,.64,'#57605a');
      }
      if(item.kind==='drawer' || item.kind==='fridge') line(front(.02,.43),front(.98,.43),'#645f51');
      line(front(.37,.86),front(.69,.86),'#453f35');
      const surface=(u,v)=>[x+u*w,y+v*d,h];
      if(item.kind==='sink' || item.kind==='hob') {
        face([surface(.12,.15),surface(.88,.15),surface(.88,.85),surface(.12,.85)],item.kind==='sink'?'#a7b9b4':'#35413c');
        if(item.kind==='sink') {
          const base=surface(.50,.11), neck=[base[0],base[1],h+27];
          const spout=[base[0],base[1]+10,h+27];
          svg(volume,'polyline',{points:[base,neck,spout,[spout[0],spout[1],h+22]].map(p=>point(...p)).join(' '),fill:'none',stroke:'#53635c','stroke-width':2.7,'stroke-linejoin':'round'});
        }
        if(item.kind==='hob') for(const u of [.32,.68]) for(const v of [.33,.68]) {
          face(Array.from({length:14},(_,i)=>surface(u+.105*Math.cos(i*Math.PI/7),v+.105*Math.sin(i*Math.PI/7))),'#53605a','#a3a99e');
        }
      }
    }
  }
  function setOptions(select,options,value) {
    select.replaceChildren(...options.map(([key,name])=>new Option(name,key)));
    select.value=value;
  }
  function render() {
    geometry=rails();
    const item=selected(), valid=!!geometry.main;
    if (valid) {
      // Keep established positions when a longer wall makes a deferred module fit again.
      const accepted = [];
      const candidates = items.filter(placed).sort((a,b)=>Number(previouslyPlaced.has(b.id))-Number(previouslyPlaced.has(a.id)));
      for (const candidate of candidates) {
        if (accepted.some(i=>i.rail===candidate.rail && i.at<candidate.at+catalog[candidate.kind].w && candidate.at<i.at+catalog[i.kind].w)) {
          candidate.rail=null;
        } else accepted.push(candidate);
      }
      previouslyPlaced = new Set(accepted.map(i=>i.id));
    }
    plan.replaceChildren(); volume.replaceChildren(); mapping=null;
    if(valid) {
      const bounds=getBounds(),colors=finishes[el('picked').textContent] || finishes['Натуральный дуб'];
      drawPlan(bounds,colors); drawVolume(bounds,colors);
    } else {
      for(const board of [plan,volume]) text(board,260,150,'Заполните размеры планировки');
    }
    const off=items.filter(i=>!placed(i)).length;
    el('plan-caption').textContent=valid ? 'На плане: '+(items.length-off)+' из '+items.length+(off?' · Требуют места: '+off:'') : 'Проверьте размеры стен в задании.';
    el('plan-key').replaceChildren(...items.filter(placed).map(i=>{
      const entry=document.createElement('span');
      entry.textContent=i.id+' · '+catalog[i.kind].name;
      return entry;
    }));
    setOptions(list,items.map(i=>[i.id,label(i)+(placed(i)?'':' · вне плана')]),active);
    setOptions(el('rail'),Object.keys(geometry).map(key=>[key,lanes[key]]),item && geometry[item.rail]?item.rail:'main');
    el('offset').value=item?item.at:'';
    el('row-origin').textContent=el('rail').value==='side'?'На второй стене отсчёт начинается после угловых 60 см.':'Расстояние указано от левого края ряда.';
    for(const key of ['place','rail','offset']) el(key).disabled=!item || !valid;
    list.disabled=!items.length;
    el('remove').disabled=!item;
    for(const check of document.querySelectorAll('[name=equipment]')) check.checked=items.some(i=>catalog[i.kind].name===check.value);
  }
  function move(rail,offset) {
    const item=selected();
    if (!item || !fits(item,rail,offset)) {note('Для модуля не хватает свободного места в этой позиции.');return false;}
    Object.assign(item,{rail,at:offset}); render();
    note(label(item)+' · '+lanes[rail]+', '+offset+' см.');
    return true;
  }
  for(const [kind,spec] of Object.entries(catalog)) {
    const button=document.createElement('button');
    button.type='button';button.dataset.kind=kind;button.textContent=spec.name+' · '+spec.w+' см';
    button.addEventListener('click',()=>{
      const item=insert(kind);render();
      note(placed(item)?label(item)+' добавлен.':label(item)+' в списке. Освободите место для размещения.');
    });
    el('palette').append(button);
  }
  list.addEventListener('change',()=>{active=Number(list.value);render();note('');});
  el('rail').addEventListener('change',()=>{
    el('row-origin').textContent=el('rail').value==='side'?'На второй стене отсчёт начинается после угловых 60 см.':'Расстояние указано от левого края ряда.';
  });
  el('place').addEventListener('click',()=>move(el('rail').value,el('offset').valueAsNumber));
  el('remove').addEventListener('click',()=>{
    items=items.filter(i=>i.id!==active);active=items.at(-1)?.id??null;render();note('Модуль убран.');
  });
  for(const check of document.querySelectorAll('[name=equipment]')) {
    check.addEventListener('input',()=>{
      const kind=Object.keys(catalog).find(key=>catalog[key].name===check.value);
      if(check.checked) insert(kind);
      else {
        items=items.filter(i=>i.kind!==kind);
        if(!selected()) active=items.at(-1)?.id??null;
      }
      render();
    });
  }
  function world(event) {
    const pt=new DOMPoint(event.clientX,event.clientY).matrixTransform(plan.getScreenCTM().inverse());
    return {x:(pt.x-mapping.x)/mapping.s,y:(pt.y-mapping.y)/mapping.s};
  }
  function target(point,grab) {
    for(const [key,lane] of Object.entries(geometry)) {
      const b=box(key,0,lane.length);
      if(point.x<b.x || point.y<b.y || point.x>b.x+b.w || point.y>b.y+b.d) continue;
      const max=lane.length-catalog[selected().kind].w;
      const delta=lane.vertical?point.y-b.y:point.x-b.x;
      return [key,Math.max(0,Math.min(max,Math.round((delta-grab)/5)*5))];
    }
    return null;
  }
  plan.addEventListener('pointerdown',event=>{
    if(!mapping || !event.isPrimary || event.button!==0) return;
    const hit=event.target.closest('[data-module]');
    if(hit) {
      active=Number(hit.dataset.module);
      const i=selected(),p=world(event),lane=geometry[i.rail];
      drag={pointer:event.pointerId,grab:(lane.vertical?p.y-lane.y:p.x-lane.x)-i.at,startX:event.clientX,startY:event.clientY};
      plan.setPointerCapture(event.pointerId);render();note(label(i));
    } else if(selected()) {
      const slot=target(world(event),0);
      if(slot) move(...slot);
    }
  });
  plan.addEventListener('pointermove',event=>{
    if(!drag || drag.pointer!==event.pointerId || !mapping || Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<3) return;
    const slot=target(world(event),drag.grab);
    if(slot) move(...slot);
  });
  for(const name of ['pointercancel','lostpointercapture','pointerup']) plan.addEventListener(name,()=>{drag=null;});
  function describe() {
    return items.map(i=>label(i)+' ('+catalog[i.kind].w+' см) — '+(placed(i)?lanes[i.rail]+', от начала ряда '+i.at+' см':'требует места вне плана'));
  }
  geometry=rails();
  for(const kind of ['sink','drawer','hob','fridge']) insert(kind);
  return {applyCollection,render,describe};
})();
