(() => {
  const ground = document.getElementById("habitatGround");
  const groundCtx = ground.getContext("2d");
  const canvas = document.getElementById("world");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const makeFly = (x, y, sex) => ({x,y,angle:sex==="male"?0.2:Math.PI+0.2,sex,energy:100,hunger:0,hydration:100,detected:false});
  const state = {
    running:false, elapsed:0, lastFrame:0, wallClosed:true,
    flies:[makeFly(.25,.5,"male"),makeFly(.75,.5,"female")],
    foods:[
      {id:"fruit-m",type:"fruit",x:.15,y:.30,amount:100,label:"FRUIT",side:"male"},
      {id:"yeast-m",type:"yeast",x:.34,y:.72,amount:100,label:"YEAST",side:"male"},
      {id:"sugar-m",type:"sugar",x:.15,y:.78,amount:100,label:"SUGAR",side:"male"},
      {id:"fruit-f",type:"fruit",x:.85,y:.30,amount:100,label:"FRUIT",side:"female"},
      {id:"yeast-f",type:"yeast",x:.66,y:.72,amount:100,label:"YEAST",side:"female"},
      {id:"sugar-f",type:"sugar",x:.85,y:.78,amount:100,label:"SUGAR",side:"female"}
    ],
    waters:[{x:.35,y:.28,amount:100,side:"male"},{x:.65,y:.28,amount:100,side:"female"}],
    events:[]
  };
  let width=0,height=0,dpr=1,raf=0;
  function drawGround(){
    const w=window.innerWidth,h=Math.max(document.documentElement.scrollHeight,window.innerHeight);
    ground.style.height=h+"px";const ratio=Math.min(window.devicePixelRatio||1,2);
    ground.width=Math.round(w*ratio);ground.height=Math.round(h*ratio);
    groundCtx.setTransform(ratio,0,0,ratio,0,0);groundCtx.clearRect(0,0,w,h);
    const tile=Math.max(92,Math.min(150,w/8)),angle=-.105,cx=w/2,cy=h/2;
    const cols=Math.ceil((w+h)/tile)+4,rows=Math.ceil((w+h)/tile)+4,points=[];
    for(let r=-2;r<rows;r++){points[r]=[];for(let c=-2;c<cols;c++){
      const gx=(c-cols/2)*tile,gy=(r-rows/2)*tile;
      const seed=Math.sin((c+17)*127.1+(r+29)*311.7)*43758.5453;
      const seed2=Math.sin((c+43)*269.5+(r+11)*183.3)*24634.6345;
      points[r][c]={x:cx+gx*Math.cos(angle)-gy*Math.sin(angle)+(seed-Math.floor(seed)-.5)*10,
      y:cy+gx*Math.sin(angle)+gy*Math.cos(angle)+(seed2-Math.floor(seed2)-.5)*10+gy*gy*.000025};
    }}
    for(let r=0;r<rows-1;r++)for(let c=0;c<cols-1;c++){
      const a=points[r][c],b=points[r][c+1],d=points[r+1][c],e=points[r+1][c+1];
      const base=(r+c)%2===0?48:25,variation=Math.round((Math.sin(c*8.2+r*3.7)+1)*5);
      groundCtx.beginPath();groundCtx.moveTo(a.x,a.y);groundCtx.lineTo(b.x,b.y);groundCtx.lineTo(e.x,e.y);groundCtx.lineTo(d.x,d.y);groundCtx.closePath();
      groundCtx.fillStyle=`rgb(${base+variation},${base+variation},${base+variation+2})`;groundCtx.fill();
      groundCtx.strokeStyle="rgba(0,0,0,.28)";groundCtx.lineWidth=2;groundCtx.stroke();
    }
    const shade=groundCtx.createRadialGradient(cx,cy,Math.min(w,h)*.12,cx,cy,Math.max(w,h)*.78);
    shade.addColorStop(0,"rgba(0,0,0,0)");shade.addColorStop(1,"rgba(0,0,0,.32)");
    groundCtx.fillStyle=shade;groundCtx.fillRect(0,0,w,h);
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
    const x=fly.x*width,y=fly.y*height,isFemale=fly.sex==="female";
    ctx.save();ctx.translate(x,y);ctx.rotate(fly.angle);
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
  function draw(){
    if(!width||!height)return;ctx.clearRect(0,0,width,height);
    // Slightly zoomed-out layout: two equal habitat compartments.
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
    ctx.save();ctx.fillStyle="#fff";ctx.font="bold 11px system-ui";ctx.shadowColor="#000";ctx.shadowBlur=6;
    ctx.fillText("MALE · COMPARTMENT A",18,58);ctx.textAlign="right";ctx.fillText("FEMALE · COMPARTMENT B",width-18,58);ctx.restore();
    if(!state.wallClosed&&state.flies.some(f=>f.detected)){
      ctx.save();ctx.fillStyle="#bce8d5";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText("NEARBY FLY DETECTED*",width/2,height-58);ctx.restore();
    }
  }
  function moveFly(fly,dt){
    fly.hunger=Math.min(100,fly.hunger+dt*1.15);fly.hydration=Math.max(0,fly.hydration-dt*.42);fly.energy=Math.max(0,fly.energy-dt*.12);
    const side=fly.sex==="male"?"male":"female";
    let foods=state.foods.filter(food=>food.amount>0&&( !state.wallClosed || food.side===side));
    if(state.wallClosed)foods=foods.filter(food=>food.side===side);
    const nearest=foods.sort((a,b)=>Math.hypot(a.x-fly.x,a.y-fly.y)-Math.hypot(b.x-fly.x,b.y-fly.y))[0];
    const waters=state.waters.filter(w=>w.amount>0&&(!state.wallClosed||w.side===side));
    const nearestWater=waters.sort((a,b)=>Math.hypot(a.x-fly.x,a.y-fly.y)-Math.hypot(b.x-fly.x,b.y-fly.y))[0];
    const target=fly.hydration<55?(nearestWater||nearest):(nearest||nearestWater);
    if(!target)return;
    const dx=target.x-fly.x,dy=target.y-fly.y,distance=Math.hypot(dx,dy);
    if(distance>.035){
      fly.angle=Math.atan2(dy,dx);const step=Math.min(distance,dt*.035);
      fly.x+=dx/distance*step;fly.y+=dy/distance*step;
    }else if(state.waters.includes(target)){
      fly.hydration=Math.min(100,fly.hydration+dt*6);target.amount=Math.max(0,target.amount-dt*.2);
    }else{
      fly.hunger=Math.max(0,fly.hunger-dt*5);target.amount=Math.max(0,target.amount-dt*.25);
    }
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
    $("positionStat").textContent=Math.round(m.x*100)+", "+Math.round(m.y*100);
    $("energyStat").textContent=Math.round(m.energy)+"%";$("hungerStat").textContent=Math.round(m.hunger)+"%";$("waterStat").textContent=Math.round(m.hydration)+"%";
    $("femalePositionStat").textContent=Math.round(f.x*100)+", "+Math.round(f.y*100);
    $("femaleEnergyStat").textContent=Math.round(f.energy)+"%";$("femaleHungerStat").textContent=Math.round(f.hunger)+"%";$("femaleWaterStat").textContent=Math.round(f.hydration)+"%";
    ["fruit","yeast","sugar"].forEach(type=>{const item=state.foods.find(x=>x.id===type+"-m");$(type+"Amount").textContent=Math.round(item.amount)+"%";});
    $("waterAmount").textContent=Math.round(state.waters[0].amount)+"%";
    const t=Math.floor(state.elapsed);$("simClock").textContent="Day 1 · "+String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0");
  }
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