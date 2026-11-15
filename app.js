(() => {
  const ground = document.getElementById("habitatGround");
  const groundCtx = ground.getContext("2d");
  const canvas = document.getElementById("world");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const makeFly = (x, y, sex) => ({x,y,angle:sex==="male"?0.2:Math.PI+0.2,sex,energy:100,hunger:0,hydration:100,detected:false});
  const terrain = [
    {id:"terrain-open-ground",type:"terrain",label:"Open ground",x:.50,y:.50,radius:.20,description:"Clear, open walking area."},
    {id:"terrain-moss-patch",type:"terrain",label:"Moss patch",x:.29,y:.48,radius:.105,description:"Soft, textured moss-covered ground."},
    {id:"terrain-bark-ridge",type:"terrain",label:"Bark ridge",x:.72,y:.47,radius:.105,description:"Raised rough bark surface."}
  ];
  const landmarks = [
    {id:"landmark-pebble-field",type:"obstacle",label:"Pebble field",x:.48,y:.25,radius:.055,description:"A cluster of small solid stones."},
    {id:"landmark-curled-leaf",type:"shelter",label:"Curled leaf shelter",x:.22,y:.63,radius:.075,description:"A curved leaf forming a sheltered space."},
    {id:"landmark-twig-arch",type:"landmark",label:"Twig arch",x:.78,y:.65,radius:.065,description:"A raised twig crossing the ground."},
    {id:"landmark-bark-chip",type:"obstacle",label:"Bark chip",x:.52,y:.78,radius:.045,description:"A small piece of loose bark."}
  ];
  const state = {
    running:false, elapsed:0, lastFrame:0, wallClosed:true,
    flies:[makeFly(.25,.5,"male"),makeFly(.75,.5,"female")],
    foods:[
      {id:"fruit-m",type:"fruit",x:.19,y:.46,amount:100,label:"FRUIT",side:"male"},
      {id:"yeast-m",type:"yeast",x:.29,y:.52,amount:100,label:"YEAST",side:"male"},
      {id:"sugar-m",type:"sugar",x:.35,y:.72,amount:100,label:"SAP",side:"male"},
      {id:"fruit-f",type:"fruit",x:.81,y:.46,amount:100,label:"FRUIT",side:"female"},
      {id:"yeast-f",type:"yeast",x:.71,y:.52,amount:100,label:"YEAST",side:"female"},
      {id:"sugar-f",type:"sugar",x:.65,y:.72,amount:100,label:"SAP",side:"female"}
    ],
    waters:[{x:.25,y:.61,amount:100,side:"male"},{x:.75,y:.61,amount:100,side:"female"}],
    events:[]
  };
  // Public sensory interface for a future neural model. IDs and labels stay stable.
  window.FruitFlyWorld = {
    getEnvironment(){return {terrain:terrain.map(x=>({...x})),features:landmarks.map(x=>({...x})),food:state.foods.map(x=>({id:x.id,type:"food",label:x.label,subtype:x.type,x:x.x,y:x.y,amount:x.amount})),water:state.waters.map((x,i)=>({id:"water-source-"+(i+1),type:"water",label:"Water / moisture",x:x.x,y:x.y,amount:x.amount}))};},
    getObservation(subjectId){
      const fly=state.flies.find(x=>x.sex===subjectId||("fly-"+(x.sex==="male"?"001":"002"))===subjectId);
      if(!fly)return null;
      const entities=[...terrain,...landmarks,...state.foods.map(x=>({...x,type:"food",description:x.type+" food source"})),...state.waters.map((x,i)=>({...x,id:"water-source-"+(i+1),type:"water",label:"Water / moisture",description:"Moisture source"}))];
      const nearby=entities.map(e=>({...e,distance:Math.hypot(e.x-fly.x,e.y-fly.y)})).filter(e=>e.distance<.42).sort((a,b)=>a.distance-b.distance);
      const underfoot=terrain.filter(t=>Math.hypot(t.x-fly.x,t.y-fly.y)<t.radius+.035).sort((a,b)=>Math.hypot(a.x-fly.x,a.y-fly.y)-Math.hypot(b.x-fly.x,b.y-fly.y))[0]||terrain[0];
      return {subjectId:"fly-"+(fly.sex==="male"?"001":"002"),terrainUnderfoot:underfoot,nearbyEntities:nearby,wallClosed:state.wallClosed,needs:{hunger:fly.hunger,hydration:fly.hydration,energy:fly.energy}};
    }
  };
  let width=0,height=0,dpr=1,raf=0;
  function drawGround(){
    const w=window.innerWidth,h=Math.max(document.documentElement.scrollHeight,window.innerHeight);
    ground.style.height=h+"px";const ratio=Math.min(window.devicePixelRatio||1,2);
    ground.width=Math.round(w*ratio);ground.height=Math.round(h*ratio);
    groundCtx.setTransform(ratio,0,0,ratio,0,0);groundCtx.clearRect(0,0,w,h);
    // Natural soil and leaf-litter base: no checkerboard or geometric tile pattern.
    const base=groundCtx.createLinearGradient(0,0,w,h);
    base.addColorStop(0,"#514637");base.addColorStop(.48,"#403b2e");base.addColorStop(1,"#302f27");
    groundCtx.fillStyle=base;groundCtx.fillRect(0,0,w,h);
    const glow=groundCtx.createRadialGradient(w*.48,h*.38,Math.min(w,h)*.04,w*.48,h*.38,Math.max(w,h)*.72);
    glow.addColorStop(0,"rgba(126,119,76,.22)");glow.addColorStop(.55,"rgba(73,91,54,.10)");glow.addColorStop(1,"rgba(0,0,0,.25)");
    groundCtx.fillStyle=glow;groundCtx.fillRect(0,0,w,h);
    // Repeatable fine soil grains, tiny leaf fragments and organic specks.
    for(let i=0;i<Math.floor(w*h/520);i++){
      const seed=Math.sin(i*127.1+19.7)*43758.5453;
      const seed2=Math.sin(i*269.5+83.1)*24634.6345;
      const x=(seed-Math.floor(seed))*w,y=(seed2-Math.floor(seed2))*h;
      const size=.5+((Math.sin(i*9.17)+1)*1.25);
      const tone=i%5;
      groundCtx.fillStyle=tone===0?"rgba(173,143,94,.20)":tone===1?"rgba(20,25,18,.24)":tone===2?"rgba(190,177,135,.12)":"rgba(11,15,12,.16)";
      groundCtx.beginPath();groundCtx.ellipse(x,y,size*1.8,size*.75,(i%7)*.35,0,Math.PI*2);groundCtx.fill();
    }
    // Scattered leaf litter and thin root fibres, placed consistently on every redraw.
    for(let i=0;i<Math.max(18,Math.floor(w/20));i++){
      const seed=Math.sin(i*71.3+5)*17341.7,seed2=Math.sin(i*37.9+91)*29173.1;
      const x=(seed-Math.floor(seed))*w,y=(seed2-Math.floor(seed2))*h;
      groundCtx.save();groundCtx.translate(x,y);groundCtx.rotate((i*1.73)%Math.PI);
      groundCtx.fillStyle=i%3===0?"rgba(117,112,62,.42)":i%3===1?"rgba(116,79,48,.38)":"rgba(82,98,55,.35)";
      groundCtx.beginPath();groundCtx.ellipse(0,0,5+(i%4)*2,1.5+(i%2),0,0,Math.PI*2);groundCtx.fill();
      groundCtx.restore();
    }
    const edge=groundCtx.createLinearGradient(0,0,0,h);
    edge.addColorStop(0,"rgba(0,0,0,.16)");edge.addColorStop(.2,"rgba(0,0,0,0)");edge.addColorStop(.8,"rgba(0,0,0,0)");edge.addColorStop(1,"rgba(0,0,0,.22)");
    groundCtx.fillStyle=edge;groundCtx.fillRect(0,0,w,h);
  }
  function resize(){
    drawGround();const rect=canvas.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);
    width=rect.width;height=rect.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);draw();
  }
  function log(message){
    const t=Math.floor(state.elapsed),time=String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0");
    state.events.unshift({time,message});state.events=state.events.slice(0,6);
    $("eventLog").innerHTML=state.events.map(e=>"<p><time>"+e.time+"</time><span>"+e.message+"</span></p>").join("");
  }
  function drawResource(resource,type){
    const x=resource.x*width,y=resource.y*height;ctx.save();
    if(type==="fruit"){
      ctx.fillStyle="#70452f";ctx.beginPath();ctx.ellipse(x,y,22,16,-.2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#bd8050";ctx.beginPath();ctx.ellipse(x-3,y-3,17,12,-.2,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="#668c58";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+2,y-13);ctx.lineTo(x+6,y-21);ctx.stroke();
    }else if(type==="yeast"){
      ctx.fillStyle="#8a7956";ctx.beginPath();ctx.ellipse(x,y,20,12,.15,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#d2c29a";for(let i=0;i<9;i++){const a=i*2.399,r=3+(i%4)*3;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r*.55,2.3,0,Math.PI*2);ctx.fill();}
    }else if(type==="sugar"){
      ctx.fillStyle="rgba(213,178,91,.34)";ctx.beginPath();ctx.ellipse(x,y,21,12,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#e6cf87";ctx.beginPath();ctx.ellipse(x,y,14,7,0,0,Math.PI*2);ctx.fill();
    }else{
      ctx.fillStyle="#3b8791";ctx.beginPath();ctx.ellipse(x,y,19,12,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#80cbd2";ctx.beginPath();ctx.ellipse(x-3,y-3,13,6,0,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle="#f0eeee";ctx.font="9px system-ui";ctx.textAlign="center";ctx.shadowColor="#000";ctx.shadowBlur=5;
    ctx.fillText(resource.label||"WATER",x,y+29);ctx.restore();
  }
  function drawFly(fly){
    const x=fly.x*width,y=fly.y*height,isFemale=fly.sex==="female",isFlying=!!fly.isFlying;
    ctx.save();ctx.translate(x,y);ctx.rotate(fly.angle);
    // Fast-flight wing blur: a faint cool-blue motion trail while moving;
    // wings return to their normal clear appearance when the fly settles.
    if(isFlying){
      ctx.fillStyle="rgba(126,190,218,.20)";ctx.strokeStyle="rgba(164,218,239,.42)";ctx.lineWidth=1;
      for(const side of [-1,1]){
        ctx.beginPath();ctx.ellipse(-5,side*10,9,15,side*-.55,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.ellipse(-5,side*5,8,13,side*-.55,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.strokeStyle=isFemale?"#f1dfbd":"#d4e8db";ctx.lineWidth=1.4;ctx.fillStyle=isFemale?"rgba(245,221,183,.78)":"rgba(185,222,225,.72)";
    ctx.beginPath();ctx.ellipse(-5,-7,7,12,-.55,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(-5,7,7,12,.55,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=isFemale?"#b97855":"#bd8568";ctx.beginPath();ctx.arc(-10,0,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=isFemale?"#a85e42":"#273b35";ctx.beginPath();ctx.ellipse(1,0,isFemale?13:11,isFemale?6:5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=isFemale?"#d99566":"#d99b70";ctx.beginPath();ctx.ellipse(isFemale?14:12,0,5,4,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=isFemale?"#ead1a6":"#d5c6a4";ctx.lineWidth=1;
    for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-1,side*3);ctx.lineTo(-5,side*12);ctx.lineTo(-10,side*14);ctx.moveTo(4,side*3);ctx.lineTo(7,side*11);ctx.stroke();}
    ctx.restore();
  }
  function drawEnvironment(){
    // Ground patches are visual regions, not just decorative labels.
    const patches=[
      {x:.29,y:.48,rx:.13,ry:.18,fill:"rgba(80,112,69,.62)",stroke:"rgba(157,184,126,.45)"},
      {x:.72,y:.47,rx:.12,ry:.18,fill:"rgba(112,78,49,.58)",stroke:"rgba(190,145,94,.42)"},
      {x:.50,y:.50,rx:.19,ry:.25,fill:"rgba(80,80,83,.18)",stroke:"rgba(190,190,195,.12)"}
    ];
    patches.forEach(p=>{ctx.save();ctx.fillStyle=p.fill;ctx.strokeStyle=p.stroke;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x*width,p.y*height,p.rx*width,p.ry*height,-.12,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();});
    // Pebbles: individually recognisable stones.
    ctx.save();for(let i=0;i<9;i++){const x=(.445+(i%3)*.035)*width,y=(.215+Math.floor(i/3)*.028)*height;ctx.fillStyle=["#777875","#a09a8e","#5e6262"][i%3];ctx.beginPath();ctx.ellipse(x,y,7+(i%3)*2,5+(i%2)*2,.3*i,0,Math.PI*2);ctx.fill();}
    // Curled leaf shelter.
    ctx.fillStyle="#71834e";ctx.strokeStyle="#b0b77a";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(.16*width,.64*height);ctx.quadraticCurveTo(.19*width,.54*height,.27*width,.59*height);ctx.quadraticCurveTo(.31*width,.64*height,.26*width,.70*height);ctx.quadraticCurveTo(.21*width,.66*height,.16*width,.64*height);ctx.fill();ctx.stroke();
    ctx.strokeStyle="#d0c58b";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(.17*width,.64*height);ctx.quadraticCurveTo(.23*width,.62*height,.28*width,.60*height);ctx.stroke();
    // Twig arch.
    ctx.strokeStyle="#b18a5e";ctx.lineWidth=7;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(.73*width,.68*height);ctx.quadraticCurveTo(.78*width,.55*height,.83*width,.68*height);ctx.stroke();
    ctx.strokeStyle="#d0aa78";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(.73*width,.67*height);ctx.quadraticCurveTo(.78*width,.56*height,.83*width,.67*height);ctx.stroke();
    // Bark chip.
    ctx.fillStyle="#765337";ctx.beginPath();ctx.moveTo(.49*width,.77*height);ctx.lineTo(.54*width,.75*height);ctx.lineTo(.56*width,.79*height);ctx.lineTo(.51*width,.81*height);ctx.closePath();ctx.fill();
    ctx.restore();
    // Labels are stable visual names that match the structured sensory catalogue.
    ctx.save();ctx.font="10px system-ui";ctx.textAlign="center";ctx.fillStyle="#f0eee5";ctx.shadowColor="#000";ctx.shadowBlur=5;
    ctx.fillText("MOSS PATCH",.29*width,.48*height+.21*height);
    ctx.fillText("BARK RIDGE",.72*width,.47*height+.21*height);
    ctx.fillText("PEBBLES",.50*width,.19*height);
    ctx.fillText("LEAF SHELTER",.22*width,.73*height);
    ctx.fillText("TWIG ARCH",.78*width,.72*height);
    ctx.fillText("OPEN GROUND",.50*width,.56*height);
    ctx.restore();
  }
  function draw(){
    if(!width||!height)return;ctx.clearRect(0,0,width,height);
    // Pull the scene back slightly so both complete compartments fit in view.
    ctx.save();ctx.translate(width*.05,height*.05);ctx.scale(.90,.90);
    // Slightly zoomed-out layout: two equal habitat compartments.
    drawEnvironment();
    state.foods.forEach(food=>drawResource(food,food.type));
    state.waters.forEach(w=>drawResource({...w,label:"WATER"},"water"));
    // Divider is a physical boundary while closed; it also blocks all cross-compartment sensing.
    if(state.wallClosed){
      ctx.save();ctx.strokeStyle="rgba(235,235,240,.88)";ctx.lineWidth=5;ctx.setLineDash([10,7]);
      ctx.beginPath();ctx.moveTo(width/2,34);ctx.lineTo(width/2,height-34);ctx.stroke();
      ctx.setLineDash([]);ctx.fillStyle="#eeeeef";ctx.font="bold 10px system-ui";ctx.textAlign="center";
      ctx.fillText("SEALED DIVIDER",width/2,height*.5);ctx.restore();
    }else{
      ctx.save();ctx.strokeStyle="rgba(137,208,174,.55)";ctx.lineWidth=2;ctx.setLineDash([4,8]);
      ctx.beginPath();ctx.moveTo(width/2,34);ctx.lineTo(width/2,height-34);ctx.stroke();ctx.restore();
    }
    state.flies.forEach(drawFly);
    // Outlines make the two separate habitat boxes easy to read.
    ctx.save();ctx.strokeStyle="rgba(235,235,240,.38)";ctx.lineWidth=1.5;
    ctx.strokeRect(8,104,width/2-16,height-124);ctx.strokeRect(width/2+8,104,width/2-16,height-124);ctx.restore();
    ctx.save();ctx.fillStyle="#fff";ctx.font="bold 11px system-ui";ctx.shadowColor="#000";ctx.shadowBlur=6;
    ctx.fillText("MALE · COMPARTMENT A",18,92);ctx.textAlign="right";ctx.fillText("FEMALE · COMPARTMENT B",width-18,92);ctx.restore();
    if(!state.wallClosed&&state.flies.some(f=>f.detected)){
      ctx.save();ctx.fillStyle="#bce8d5";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText("NEARBY FLY DETECTED*",width/2,height-58);ctx.restore();
    }
    ctx.restore();
  }
  function moveFly(fly,dt){
    fly.hunger=Math.min(100,fly.hunger+dt*1.15);fly.hydration=Math.max(0,fly.hydration-dt*.42);fly.energy=Math.max(0,fly.energy-dt*.12);
    const side=fly.sex==="male"?"male":"female";
    let foods=state.foods.filter(food=>food.amount>0&&( !state.wallClosed || food.side===side));
    if(state.wallClosed)foods=foods.filter(food=>food.side===side);
    const nearest=foods.sort((a,b)=>Math.hypot(a.x-fly.x,a.y-fly.y)-Math.hypot(b.x-fly.x,b.y-fly.y))[0];
    const waters=state.waters.filter(w=>w.amount>0&&(!state.wallClosed||w.side===side));
    const nearestWater=waters.sort((a,b)=>Math.hypot(a.x-fly.x,a.y-fly.y)-Math.hypot(b.x-fly.x,b.y-fly.y))[0];
    let target=null;
    // Only seek resources when a need is significant; otherwise explore the habitat.
    if(fly.hydration<62)target=nearestWater;
    if(!target&&fly.hunger>42)target=nearest;
    if(!fly.exploreTimer||fly.exploreTimer<=0||!fly.exploreTarget){
      const minX=state.wallClosed?(fly.sex==="male"?.06:.54):.06;
      const maxX=state.wallClosed?(fly.sex==="male"?.46:.94):.94;
      fly.exploreTarget={x:minX+Math.random()*(maxX-minX),y:.16+Math.random()*.68};
      fly.exploreTimer=6+Math.random()*9;
    }
    fly.exploreTimer-=dt;
    if(!target)target=fly.exploreTarget;
    const dx=target.x-fly.x,dy=target.y-fly.y,distance=Math.hypot(dx,dy);
    fly.isFlying=distance>.025;
    if(fly.isFlying){
      fly.angle=Math.atan2(dy,dx);const step=Math.min(distance,dt*.04725);
      fly.x+=dx/distance*step;fly.y+=dy/distance*step;
    }else if(state.waters.includes(target)){
      fly.hydration=Math.min(100,fly.hydration+dt*6);target.amount=Math.max(0,target.amount-dt*.2);
    }else if(state.foods.includes(target)){
      fly.hunger=Math.max(0,fly.hunger-dt*5);target.amount=Math.max(0,target.amount-dt*.25);
    }else if(target===fly.exploreTarget){fly.exploreTimer=0;}
    // The closed wall physically constrains each fly to its own half.
    if(state.wallClosed)fly.x=fly.sex==="male"?Math.min(.47,Math.max(.04,fly.x)):Math.min(.96,Math.max(.53,fly.x));
    else fly.x=Math.max(.04,Math.min(.96,fly.x));
    fly.y=Math.max(.12,Math.min(.88,fly.y));
  }
  function update(dt){
    state.elapsed+=dt;state.flies.forEach(f=>moveFly(f,dt));
    const [male,female]=state.flies;
    const distance=Math.hypot(male.x-female.x,male.y-female.y);
    const detected=!state.wallClosed&&distance<.24;
    if(detected&&!male.detected)log("A nearby fly entered the simple proximity-detection range.");
    male.detected=female.detected=detected;
    renderStats();draw();
  }
  function renderStats(){
    const [m,f]=state.flies;
    $("energyStat").textContent=Math.round(m.energy)+"%";$("hungerStat").textContent=Math.round(m.hunger)+"%";$("waterStat").textContent=Math.round(m.hydration)+"%";
    $("femaleEnergyStat").textContent=Math.round(f.energy)+"%";$("femaleHungerStat").textContent=Math.round(f.hunger)+"%";$("femaleWaterStat").textContent=Math.round(f.hydration)+"%";
    ["fruit","yeast","sugar"].forEach(type=>{const item=state.foods.find(x=>x.id===type+"-m");$(type+"Amount").textContent=Math.round(item.amount)+"%";});
    $("waterAmount").textContent=Math.round(state.waters[0].amount)+"%";
    const t=Math.floor(state.elapsed);$("simClock").textContent="Day 1 · "+String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0");
  }
  // The habitat API is deliberately separate from movement: a neural model can
  // read typed sensory observations without relying on screen pixels or UI text.
  function setWall(closed){
    state.wallClosed=closed;const button=$("wallToggle");
    button.textContent=closed?"▥ Wall: ON":"▥ Wall: REMOVED";button.classList.toggle("open",!closed);button.setAttribute("aria-pressed",String(closed));
    if(closed){state.flies[0].x=Math.min(.47,state.flies[0].x);state.flies[1].x=Math.max(.53,state.flies[1].x);state.flies.forEach(f=>f.detected=false);log("Divider sealed. Flies are isolated and cannot detect one another.");}
    else log("Divider removed. Flies can cross; simple proximity detection is enabled.");
    draw();
  }
  function frame(now){if(!state.running)return;const dt=Math.min((now-state.lastFrame)/1000,.08);state.lastFrame=now;update(dt);raf=requestAnimationFrame(frame);}
  $("wallToggle").addEventListener("click",()=>setWall(!state.wallClosed));
  $("startBtn").addEventListener("click",()=>{if(state.running)return;state.running=true;state.lastFrame=performance.now();$("startBtn").disabled=true;$("pauseBtn").disabled=false;$("runStatus").innerHTML='<span class="status-dot" style="background:#86d5b5"></span> RUNNING';log("Simulation started. Basic placeholder movement is active.");raf=requestAnimationFrame(frame);});
  $("pauseBtn").addEventListener("click",()=>{state.running=false;cancelAnimationFrame(raf);$("startBtn").disabled=false;$("pauseBtn").disabled=true;$("runStatus").innerHTML='<span class="status-dot"></span> PAUSED';log("Simulation paused.");});
  $("resetBtn").addEventListener("click",()=>{state.running=false;cancelAnimationFrame(raf);state.elapsed=0;state.flies=[makeFly(.25,.5,"male"),makeFly(.75,.5,"female")];state.foods.forEach(x=>x.amount=100);state.waters.forEach(x=>x.amount=100);state.events=[];$("startBtn").disabled=false;$("pauseBtn").disabled=true;$("runStatus").innerHTML='<span class="status-dot"></span> PAUSED';setWall(true);log("Habitat reset. Both subjects restored to separate compartments.");renderStats();draw();});
  window.addEventListener("resize",resize);resize();renderStats();setWall(true);
})();