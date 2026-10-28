/* Exact formula structures from the provided workbook (unit dB/m).
   direct: (A1-A2-20 log10(S2/S1))/(S2-S1)*1000
   angle:  (A1-A2-20 log10(L2/L1))/(2*(L2-L1))*1000
   Equal-height method replaces A1-A2 by G2-G1. */
(function (root) {
  'use strict';
  const parse = (value) => {
    if (typeof value === 'number') return value;
    if (value === '' || value == null) return NaN;
    return Number(String(value).trim().replace(/\s/g,'').replace(',','.'));
  };
  function compute({kind, path1, path2, level1, level2, mode='fixed'}) {
    const a = parse(level1), b=parse(level2), x=parse(path1), y=parse(path2);
    if (![a,b,x,y].every(Number.isFinite)) return {ok:false, error:'Введите все четыре числовых значения.'};
    if (x<=0 || y<=0 || y<=x) return {ok:false, error:'Пути должны быть положительными, причём второй путь больше первого.'};
    const measured = mode === 'equal' ? b-a : a-b;
    const geom = 20*Math.log10(y/x);
    const roundtrip = kind === 'angle' ? 2*(y-x) : (y-x);
    const material = measured-geom;
    const alpha = material/roundtrip*1000;
    if (!Number.isFinite(alpha)) return {ok:false, error:'Не удалось вычислить коэффициент.'};
    return {ok:true,alpha,measured,geom,material,roundtrip, path1:x,path2:y,kind,mode,negative:alpha<0};
  }
  function directPaths(t,pair){t=parse(t);if(!(t>0))return [NaN,NaN];return pair==='34'?[6*t,8*t]:[2*t,4*t];}
  function anglePaths(t,deg){t=parse(t);deg=parse(deg);if(!(t>0&&deg>=45&&deg<=70))return[NaN,NaN];const c=Math.cos(deg*Math.PI/180);return[t/c,2*t/c];}

  // Typical longitudinal-wave velocity in PMMA wedge (m/s), assumed fixed for this calculator.
  const ORGGLASS_SPEED = 2700;

  // ГОСТ Р 50.05.05-2018, 7.1.12, формула (2):
  // N = S*f*cos(alpha) / (pi * Ct * cos(beta)), where Ct is mm/microsecond.
  // alpha is refracted angle in metal, beta is incident angle in the wedge.
  // No wedge sound path appears in this standard formula.
  function nearField({shape='circle',frequency,diameter,length,width,metalVelocity,angle}) {
    const f=parse(frequency), cm=parse(metalVelocity), cw=ORGGLASS_SPEED, alpha=parse(angle);
    if (![f,cm,cw,alpha].every(Number.isFinite)) return {ok:false,error:'Заполните частоту, скорости и угол ввода.'};
    if (!(f>0&&cm>0&&cw>0&&alpha>=45&&alpha<=70))
      return {ok:false,error:'Проверьте частоту, скорости и угол ввода 45–70°.'};
    const sine=(cw/cm)*Math.sin(alpha*Math.PI/180);
    if (!(sine>=0&&sine<1)) return {ok:false,error:'Для введённых скоростей невозможно вычислить угол в призме по закону Снеллиуса.'};
    const beta=Math.asin(sine);
    let area=NaN;
    if (shape==='circle') {
      const d=parse(diameter);
      if (!(d>0)) return {ok:false,error:'Укажите диаметр пьезоэлемента, мм.'};
      area=Math.PI*d*d/4;
    } else if (shape==='rectangle') {
      const a=parse(length),b=parse(width);
      if (!(a>0&&b>0)) return {ok:false,error:'Укажите обе стороны пьезоэлемента, мм.'};
      area=a*b;
    } else return {ok:false,error:'Неизвестная форма пьезоэлемента.'};
    const n=area*f*Math.cos(alpha*Math.PI/180)/(Math.PI*(cm/1000)*Math.cos(beta));
    const lambda=cm/(1000*f);
    if (![n,lambda,beta,area].every(Number.isFinite)||n<=0) return {ok:false,error:'Не удалось рассчитать ближнюю зону.'};
    return {ok:true,n,area,lambda,incidentDegrees:beta*180/Math.PI,cosPrism:Math.cos(beta),prismVelocity:cw,shape};
  }

  // ГОСТ Р 50.05.05-2018 7.1.12, formula (3): N = S/(pi*lambda).
  // Round element: N=D^2*f/(4*c_l), f MHz, c_l mm/us.
  // Rectangular: equivalent-area approximation, not exact axial near-field.
  function directNearField({shape='circle',frequency,diameter,length,width,metalVelocity}) {
    const f=parse(frequency), c=parse(metalVelocity);
    if (![f,c].every(Number.isFinite) || f<=0 || c<=0)
      return {ok:false,error:'Укажите положительные частоту и скорость продольной волны.'};
    let area;
    if (shape==='circle') {
      const d=parse(diameter);
      if (!(d>0)) return {ok:false,error:'Введите диаметр пьезоэлемента.'};
      area=Math.PI*d*d/4;
    } else if (shape==='rectangle') {
      const a=parse(length), b=parse(width);
      if (!(a>0&&b>0)) return {ok:false,error:'Введите длину и ширину пьезоэлемента.'};
      area=a*b;
    } else return {ok:false,error:'Неизвестная форма пьезоэлемента.'};
    const lambda=c/(1000*f);
    const n=area/(Math.PI*lambda);
    if (![lambda,n].every(Number.isFinite) || n<=0)
      return {ok:false,error:'Не удалось рассчитать ближнюю зону.'};
    return {ok:true,n,area,lambda,approximateShape:shape==='rectangle'};
  }
  function correction(alphaObj,alphaSop,L){const a=parse(alphaObj), b=parse(alphaSop), l=parse(L);if(![a,b,l].every(Number.isFinite)||l<=0)return NaN;return 2*(a-b)*l/1000;}
  root.UZKCalc={parse,compute,directPaths,anglePaths,nearField,directNearField,correction,ORGGLASS_SPEED};
})(typeof window !== 'undefined' ? window : globalThis);
