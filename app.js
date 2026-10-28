(function(){
'use strict';
const c=window.UZKCalc;const $=id=>document.getElementById(id);
const defaults={tab:'direct',pair:'12',dpath:'auto',apath:'manual',mode:'fixed',directT:'',directS1:'',directS2:'',angleT:'',angleDeg:'',angleL1:'',angleL2:'',directNearShape:'circle',directNearFrequency:'',directNearDiameter:'',directNearLength:'',directNearWidth:'',directNearVelocity:'5900',nearShape:'circle',nearFrequency:'',nearDiameter:'',nearLength:'',nearWidth:'',nearSteelVelocity:'3230',signal1:'',signal2:'',sopAlpha:'',correctionL:''};
let state={...defaults};try{const old=JSON.parse(localStorage.getItem('uzk_calc_state_v1')||'null');if(old&&typeof old==='object')state={...state,...old};}catch(e){}
const ids={directT:'direct-t',directS1:'direct-s1',directS2:'direct-s2',directNearFrequency:'direct-near-frequency',directNearDiameter:'direct-near-diameter',directNearLength:'direct-near-length',directNearWidth:'direct-near-width',directNearVelocity:'direct-near-velocity',angleT:'angle-t',angleDeg:'angle-deg',angleL1:'angle-l1',angleL2:'angle-l2',nearFrequency:'near-frequency',nearDiameter:'near-diameter',nearLength:'near-length',nearWidth:'near-width',nearSteelVelocity:'near-steel-velocity',signal1:'signal1',signal2:'signal2',sopAlpha:'sop-alpha',correctionL:'correction-l'};
const format=(n,d=2)=>Number.isFinite(n)?n.toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const save=()=>{try{localStorage.setItem('uzk_calc_state_v1',JSON.stringify(state));}catch(e){}};
function rerender(){
  document.querySelectorAll('[data-tab]').forEach(b=>{let active=b.dataset.tab===state.tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});
  $('direct-content').hidden=state.tab!=='direct';$('angle-content').hidden=state.tab!=='angle';
  document.querySelectorAll('[data-pair]').forEach(b=>b.classList.toggle('active',b.dataset.pair===state.pair));
  document.querySelectorAll('[data-dpath]').forEach(b=>b.classList.toggle('active',b.dataset.dpath===state.dpath));
  document.querySelectorAll('[data-apath]').forEach(b=>b.classList.toggle('active',b.dataset.apath===state.apath));
  document.querySelectorAll('[name="measurement"]').forEach(el=>el.checked=el.value===state.mode);
  document.querySelectorAll('.mode').forEach(el=>el.classList.toggle('chosen',el.querySelector('input').value===state.mode));
  let equal=state.mode==='equal';
  $('measurement-label1').textContent=(equal?'Усиление G₁, дБ':'Уровень A₁, дБ');
  $('measurement-label2').textContent=(equal?'Усиление G₂, дБ':'Уровень A₂, дБ');
  $('measurement-note').innerHTML=equal?'<b>Если сигналы выровняли по высоте</b><span>Запишите усиление (дБ) для каждого сигнала. У более слабого сигнала необходимое усиление больше. Используем ΔA = G₂ − G₁. Две одинаковые высоты (80% / 80%) вводить нельзя.</span>':'<b>При неизменном усилении</b><span>Используем ΔA = A₁ − A₂. Вводите амплитудные уровни сигналов в дБ на одной шкале.</span>';
  const p1=$('signal1'),p2=$('signal2');p1.placeholder=equal?'Например, 28':'Например, 70';p2.placeholder=equal?'Например, 36':'Например, 62';
  Object.entries(ids).forEach(([name,id])=>{if(document.activeElement!==$(id) && $(id).value!==state[name])$(id).value=state[name];});
  const dp=c.directPaths(state.directT,state.pair);if(state.dpath==='auto'){state.directS1=Number.isFinite(dp[0])?format(dp[0],2):'';state.directS2=Number.isFinite(dp[1])?format(dp[1],2):'';}
  $('direct-s1').disabled=state.dpath==='auto';$('direct-s2').disabled=state.dpath==='auto';$('direct-s1').value=state.directS1;$('direct-s2').value=state.directS2;
  // Прямой ПЭП: N по формуле для прямого преобразователя; проверка t >= 3N.
  document.querySelectorAll('[data-dnshape]').forEach(b=>b.classList.toggle('active',b.dataset.dnshape===state.directNearShape));
  $('direct-near-diameter-wrap').hidden=state.directNearShape!=='circle';
  $('direct-near-rect-wrap').hidden=state.directNearShape!=='rectangle';
  const dn=c.directNearField({shape:state.directNearShape,frequency:state.directNearFrequency,
    diameter:state.directNearDiameter,length:state.directNearLength,width:state.directNearWidth,
    metalVelocity:state.directNearVelocity});
  const dt=c.parse(state.directT);
  const directThicknessOK=Number.isFinite(dt)&&dt>0;
  const directChecked=dn.ok&&directThicknessOK;
  const directPass=directChecked&&dt+1e-8>=3*dn.n;
  $('direct-near-wavelength').textContent=dn.ok?format(dn.lambda,3)+' мм':'— мм';
  $('direct-near-n').textContent=dn.ok?format(dn.n,2)+' мм':'— мм';
  $('direct-near-t').textContent=directThicknessOK?format(dt,2)+' мм':'— мм';
  $('direct-near-3n').textContent=dn.ok?format(3*dn.n,2)+' мм':'— мм';
  const directStatus=$('direct-near-status');
  directStatus.className='nearzone-status '+(directChecked?(directPass?'pass':'fail'):'pending');
  directStatus.textContent=!dn.ok?dn.error:!directThicknessOK?'Укажи толщину металла t для сравнения с 3N.':
    directPass?'Условие t ≥ 3N выполнено ('+format(dt,2)+' ≥ '+format(3*dn.n,2)+' мм). Для 1–2 донных сигналов допустима дальнезонная геометрическая поправка 6 дБ.'+
      (dn.approximateShape?' Для прямоугольного пьезоэлемента N — оценка по площади.':''):
      'Условие t ≥ 3N НЕ выполнено ('+format(dt,2)+' < '+format(3*dn.n,2)+' мм). Нельзя автоматически применять дальнезонную геометрическую поправку; нужна АРД или иная подтверждённая методика.';
  if(state.apath==='auto') {const ap=c.anglePaths(state.angleT,state.angleDeg);state.angleL1=Number.isFinite(ap[0])?format(ap[0],2):'';state.angleL2=Number.isFinite(ap[1])?format(ap[1],2):'';}
  $('angle-l1').disabled=state.apath==='auto';$('angle-l2').disabled=state.apath==='auto';$('angle-l1').value=state.angleL1;$('angle-l2').value=state.angleL2;
  $('angle-pathnote').textContent=state.apath==='auto'?'Условная геометрия: L₁ = t / cos θ; L₂ = 2t / cos θ. Применяйте только если схема прозвучивания это допускает.':'Для реальной геометрии предпочтительно вводить пути, определённые по развертке дефектоскопа.';
  const deg=c.parse(state.angleDeg);$('angle-warning').hidden=!(state.tab==='angle'&&Number.isFinite(deg)&&deg>52);
  // Calculate effective near-field length from probe parameters (not from a manually entered N).
  document.querySelectorAll('[data-nshape]').forEach(b=>b.classList.toggle('active',b.dataset.nshape===state.nearShape));
  $('near-diameter-wrap').hidden=state.nearShape!=='circle';
  $('near-rectangle-fields').hidden=state.nearShape!=='rectangle';
  const near=c.nearField({shape:state.nearShape,frequency:state.nearFrequency,diameter:state.nearDiameter,
    length:state.nearLength,width:state.nearWidth,metalVelocity:state.nearSteelVelocity,
    angle:state.angleDeg});
  const l1=c.parse(state.angleL1);
  const validL1=Number.isFinite(l1)&&l1>0;
  const checked=near.ok&&validL1;
  const nearPass=checked&&l1+1e-8>=3*near.n;
  const angleRangeOK=Number.isFinite(deg)&&deg>=45&&deg<=52;
  const minT=near.ok?3*near.n*Math.cos(deg*Math.PI/180):NaN;
  $('nearzone-incidence').textContent=near.ok?format(near.incidentDegrees,2)+'°':'— °';
  $('nearzone-cosine').textContent=near.ok?format(near.cosPrism,4):'—';
  $('nearzone-wavelength').textContent=near.ok?format(near.lambda,3)+' мм':'— мм';
  $('nearzone-n').textContent=near.ok?format(near.n,2)+' мм':'— мм';
  $('nearzone-l1').textContent=validL1?format(l1,2)+' мм':'— мм';
  $('nearzone-3n').textContent=near.ok?format(3*near.n,2)+' мм':'— мм';
  $('nearzone-tmin').textContent=Number.isFinite(minT)?format(minT,2)+' мм':'— мм';
  const status=$('nearzone-status');
  status.className='nearzone-status '+(checked?(nearPass?'pass':'fail'):'pending');
  status.textContent=!near.ok?near.error:!validL1?'Укажите акустический путь L₁ до первого угла для проверки L₁ ≥ 3N.':
    nearPass?'Условие выполнено: L₁ = '+format(l1,2)+' мм ≥ 3N = '+format(3*near.n,2)+' мм. '+
      'Ближняя зона оценена по формуле ГОСТ Р 50.05.05-2018, п. 7.1.12.':
      'Условие НЕ выполнено: L₁ = '+format(l1,2)+' мм < 3N = '+format(3*near.n,2)+' мм. Результат нельзя применять для настройки чувствительности по данной схеме.';
  let x=state.tab==='direct'?state.directS1:state.angleL1, y=state.tab==='direct'?state.directS2:state.angleL2;
  let calc=c.compute({kind:state.tab,path1:x,path2:y,level1:state.signal1,level2:state.signal2,mode:state.mode});
  if(state.tab==='angle' && (!Number.isFinite(deg)||deg<45||deg>70))calc={ok:false,error:'Введите угол ввода в диапазоне 45–70°.'};
  if(state.tab==='angle' && !(c.parse(state.angleT)>0))calc={ok:false,error:'Введите толщину металла больше нуля.'};
  $('alpha-number').textContent=calc.ok?format(calc.alpha,2):'—';
  $('result-breakdown').hidden=!calc.ok;
  $('result-message').textContent=calc.ok?(calc.negative?'Отрицательный результат: проверьте измеренные уровни, пути и поправку.':(state.tab==='angle' ? (!checked?'Расчёт предварительный: не заполнены характеристики ПЭП или путь L₁.':(!nearPass?'Не соблюдено L₁ ≥ 3N. Результат нельзя использовать для настройки чувствительности.':(!angleRangeOK?'Вне диапазона 45–52° по ГОСТ Р 50.05.05-2018: нужно отдельное обоснование.':'L₁ ≥ 3N выполнено. Расчёт по приближённой модели; остальные ограничения методики сохраняются.'))) : (!directChecked?'Предварительный расчёт: N или толщина не заданы. Поправка чувствительности отключена.':(!directPass?'Толщина t < 3N: упрощённая геометрическая поправка не обоснована, поправка чувствительности отключена.':(state.pair==='34'?'t ≥ 3N, но расчёт по 3–4 сигналам приближённый.':'t ≥ 3N. Для измерения по А.2 ГОСТ дополнительно требуется балластный ПЭП.'))))):(c.parse(x)>0||state.signal1||state.signal2?calc.error:'Введите результаты измерений — калькулятор рассчитает затухание.');
  if(calc.ok){$('delta-measured').textContent=format(calc.measured)+' дБ';$('delta-geom').textContent=format(calc.geom)+' дБ';$('delta-material').textContent=format(calc.material)+' дБ';$('delta-distance').textContent=format(calc.roundtrip)+' мм';}
  const okForCorrection=calc.ok && calc.alpha>=0 && (state.tab==='direct'?(directChecked&&directPass):(checked&&nearPass&&angleRangeOK));
  const gc=c.correction(okForCorrection?calc.alpha:NaN,state.sopAlpha,state.correctionL);$('correction-result').textContent=Number.isFinite(gc)?(gc>=0?'+':'')+format(gc,2)+' дБ':'— дБ';
  save();
}
Object.entries(ids).forEach(([name,id])=>{$(id).addEventListener('input',e=>{state[name]=e.target.value;rerender();});});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;state.signal1='';state.signal2='';const gd=$('guide-direct'),ga=$('guide-angle');if(gd&&ga){gd.open=state.tab==='direct';ga.open=state.tab==='angle';}rerender();}));
document.querySelectorAll('[data-pair]').forEach(b=>b.addEventListener('click',()=>{state.pair=b.dataset.pair;rerender();}));
document.querySelectorAll('[data-dpath]').forEach(b=>b.addEventListener('click',()=>{state.dpath=b.dataset.dpath;rerender();}));
document.querySelectorAll('[data-apath]').forEach(b=>b.addEventListener('click',()=>{state.apath=b.dataset.apath;rerender();}));
document.querySelectorAll('[data-nshape]').forEach(b=>b.addEventListener('click',()=>{state.nearShape=b.dataset.nshape;rerender();}));
document.querySelectorAll('[data-dnshape]').forEach(b=>b.addEventListener('click',()=>{state.directNearShape=b.dataset.dnshape;rerender();}));
document.querySelectorAll('[name="measurement"]').forEach(b=>b.addEventListener('change',()=>{if(state.mode!==b.value){state.mode=b.value;state.signal1='';state.signal2='';rerender();}}));
$('example').addEventListener('click',()=>{let eq=state.mode==='equal';if(state.tab==='direct'){state.directT='100';state.dpath='auto';state.directNearShape='circle';state.directNearFrequency='2,5';state.directNearDiameter='12';state.directNearLength='';state.directNearWidth='';state.directNearVelocity='5900';if(state.pair==='34'){state.signal1=eq?'28':'50';state.signal2=eq?'40,40':'37,60';}else{state.signal1=eq?'28':'70';state.signal2=eq?'43,92':'54,08';}}else{state.angleT='40';state.angleDeg='50';state.nearShape='circle';state.nearFrequency='2,5';state.nearDiameter='12';state.nearLength='';state.nearWidth='';state.nearSteelVelocity='3230';state.apath='auto';state.signal1=eq?'20':'70';state.signal2=eq?'32':'58';}rerender();});
$('reset').addEventListener('click',()=>{const tab=state.tab,mode=state.mode;state={...defaults,tab,mode};rerender();});
rerender();
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
