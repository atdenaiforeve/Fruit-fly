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
    {id:"landmark-dew-garden",type:"water-feature",label:"Dew garden",x:.22,y:.27,radius:.065,description:"A cluster of tiny dew beads catching the light."},
    {id:"landmark-petal-fan",type:"landmark",label:"Flower petal fan",x:.78,y:.27,radius:.075,description:"Curved pink petals spread across the ground."},
    {id:"landmark-seed-pod-tunnel",type:"shelter",label:"Seed-pod tunnel",x:.19,y:.87,radius:.07,description:"A hollow seed pod forming a small natural tunnel."},
    {id:"landmark-root-bridge",type:"landmark",label:"Twisted root bridge",x:.81,y:.87,radius:.075,description:"A raised twisting root with space beneath it."},
    {id:"landmark-bark-chip",type:"obstacle",label:"Bark chip",x:.52,y:.78,radius:.045,description:"A small piece of loose bark."}
  ];
  // Suitable egg-laying locations are environment features, not nests or active egg production.
  const eggLayingSites = [
    {id:"site-fermenting-fruit-m",type:"egg-laying-site",siteType:"fermenting-fruit",label:"Fermenting fruit patch",x:.30,y:.22,side:"male",radius:.055,description:"A food-rich fruit surface that may suit egg laying."},
    {id:"site-fermenting-fruit-f",type:"egg-laying-site",siteType:"fermenting-fruit",label:"Fermenting fruit patch",x:.70,y:.22,side:"female",radius:.055,description:"A food-rich fruit surface that may suit egg laying."},
    {id:"site-sheltered-damp-m",type:"egg-laying-site",siteType:"sheltered-damp-spot",label:"Sheltered damp spot",x:.20,y:.72,side:"male",radius:.06,description:"A protected, moist patch beneath leaf cover."},
    {id:"site-sheltered-damp-f",type:"egg-laying-site",siteType:"sheltered-damp-spot",label:"Sheltered damp spot",x:.80,y:.72,side:"female",radius:.06,description:"A protected, moist patch beneath leaf cover."},
    {id:"site-decaying-leaf-m",type:"egg-laying-site",siteType:"decaying-plant-matter",label:"Decaying leaf litter",x:.39,y:.88,side:"male",radius:.06,description:"Soft decaying plant material with nearby food."},
    {id:"site-decaying-leaf-f",type:"egg-laying-site",siteType:"decaying-plant-matter",label:"Decaying leaf litter",x:.61,y:.88,side:"female",radius:.06,description:"Soft decaying plant material with nearby food."}
  ];
  const state = {
    running:false, elapsed:0, lastFrame:0, wallClosed:true,
    flies:[makeFly(.25,.5,"male"),makeFly(.75,.5,"female")],
    foods:[
      {id:"fruit-m",type:"fruit",x:.12,y:.13,amount:100,label:"FRUIT",side:"male"},
      {id:"yeast-m",type:"yeast",x:.39,y:.48,amount:100,label:"YEAST",side:"male"},
      {id:"sugar-m",type:"sugar",x:.13,y:.89,amount:100,label:"SAP",side:"male"},
      {id:"fruit-f",type:"fruit",x:.88,y:.13,amount:100,label:"FRUIT",side:"female"},
      {id:"yeast-f",type:"yeast",x:.61,y:.48,amount:100,label:"YEAST",side:"female"},
      {id:"sugar-f",type:"sugar",x:.87,y:.89,amount:100,label:"SAP",side:"female"}
    ],
    waters:[{x:.32,y:.68,amount:100,side:"male"},{x:.68,y:.68,amount:100,side:"female"}],
    events:[]
  };
  // Public sensory interface for a future neural model. IDs and labels stay stable.
  window.FruitFlyWorld = {
    getEnvironment(){return {terrain:terrain.map(x=>({...x})),features:landmarks.map(x=>({...x})),eggLayingSites:eggLayingSites.map(x=>({...x})),food:state.foods.map(x=>({id:x.id,type:"food",label:x.label,subtype:x.type,x:x.x,y:x.y,amount:x.amount})),water:state.waters.map((x,i)=>({id:"water-source-"+(i+1),type:"water",label:"Water / moisture",x:x.x,y:x.y,amount:x.amount}))};},
    getObservation(subjectId){
      const fly=state.flies.find(x=>x.sex===subjectId||("fly-"+(x.sex==="male"?"001":"002"))===subjectId);
      if(!fly)return null;
      const entities=[...terrain,...landmarks,...eggLayingSites,...state.foods.map(x=>({...x,type:"food",description:x.type+" food source"})),...state.waters.map((x,i)=>({...x,id:"water-source-"+(i+1),type:"water",label:"Water / moisture",description:"Moisture source"}))];
      const nearby=entities.map(e=>({...e,distance:Math.hypot(e.x-fly.x,e.y-fly.y)})).filter(e=>e.distance<.42).sort((a,b)=>a.distance-b.distance);
      const underfoot=terrain.filter(t=>Math.hypot(t.x-fly.x,t.y-fly.y)<t.radius+.035).sort((a,b)=>Math.hypot(a.x-fly.x,a.y-fly.y)-Math.hypot(b.x-fly.x,b.y-fly.y))[0]||terrain[0];
      return {subjectId:"fly-"+(fly.sex==="male"?"001":"002"),terrainUnderfoot:underfoot,nearbyEntities:nearby,wallClosed:state.wallClosed,needs:{hunger:fly.hunger,hydration:fly.hydration,energy:fly.energy}};
    }
  };
  let width=0,height=0,dpr=1,raf=0,zoomLevel=1;
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
    const x=resource.x*width,y=resource.y*height;
    ctx.save();ctx.translate(x,y);ctx.scale(.82,.82);
    ctx.shadowColor="rgba(0,0,0,.48)";ctx.shadowBlur=12;ctx.shadowOffsetY=5;
    if(type==="fruit"){
      const skin=ctx.createRadialGradient(-7,-9,2,0,0,27);
      skin.addColorStop(0,"#e4ad70");skin.addColorStop(.42,"#b87548");skin.addColorStop(.82,"#75452f");skin.addColorStop(1,"#38291f");
      ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,0,25,19,-.22,0,Math.PI*2);ctx.fill();
      ctx.shadowColor="transparent";ctx.strokeStyle="rgba(255,213,155,.42)";ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(-1,-1,21,15,-.22,Math.PI*1.08,Math.PI*1.9);ctx.stroke();
      ctx.fillStyle="rgba(80,45,29,.5)";for(let i=0;i<12;i++){const px=Math.sin(i*8.7)*15,py=Math.cos(i*5.3)*9;ctx.beginPath();ctx.arc(px,py,1,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle="#66834a";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(2,-14);ctx.quadraticCurveTo(6,-20,10,-22);ctx.stroke();
      ctx.fillStyle="#78975b";ctx.beginPath();ctx.ellipse(12,-20,6,2.6,-.3,0,Math.PI*2);ctx.fill();
    }else if(type==="yeast"){
      const mound=ctx.createLinearGradient(0,-13,0,14);mound.addColorStop(0,"#e0d0a5");mound.addColorStop(.45,"#a9956b");mound.addColorStop(1,"#574a36");
      ctx.fillStyle=mound;ctx.beginPath();ctx.ellipse(0,0,23,14,.12,0,Math.PI*2);ctx.fill();
      ctx.shadowColor="transparent";for(let i=0;i<24;i++){const angle=i*2.399,r=3+(i%5)*3.2,px=Math.cos(angle)*r,py=Math.sin(angle)*r*.52;ctx.fillStyle=i%3?"rgba(245,226,177,.72)":"rgba(84,69,46,.35)";ctx.beginPath();ctx.arc(px,py,1+(i%3)*.55,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle="rgba(255,238,196,.55)";ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(-2,-3,16,7,.12,Math.PI*1.1,Math.PI*1.8);ctx.stroke();
    }else if(type==="sugar"){
      const sap=ctx.createRadialGradient(-4,-5,1,0,0,24);sap.addColorStop(0,"rgba(255,246,188,.95)");sap.addColorStop(.4,"rgba(222,178,85,.85)");sap.addColorStop(1,"rgba(117,80,37,.45)");
      ctx.fillStyle="rgba(54,44,28,.5)";ctx.beginPath();ctx.ellipse(0,3,25,14,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=sap;ctx.beginPath();ctx.ellipse(0,0,20,10,-.08,0,Math.PI*2);ctx.fill();
      ctx.shadowColor="transparent";ctx.fillStyle="rgba(255,255,226,.8)";ctx.beginPath();ctx.ellipse(-6,-3,6,2,-.25,0,Math.PI*2);ctx.fill();
    }else{
      const pool=ctx.createRadialGradient(-5,-5,1,0,0,24);pool.addColorStop(0,"#e2ffff");pool.addColorStop(.28,"#9fe0e3");pool.addColorStop(.7,"#438e9a");pool.addColorStop(1,"#244d55");
      ctx.fillStyle="rgba(13,30,30,.5)";ctx.beginPath();ctx.ellipse(0,3,24,15,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=pool;ctx.beginPath();ctx.ellipse(0,0,21,13,-.08,0,Math.PI*2);ctx.fill();
      ctx.shadowColor="transparent";ctx.strokeStyle="rgba(255,255,255,.68)";ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(-4,-3,9,4,-.2,Math.PI*1.1,Math.PI*1.8);ctx.stroke();
      ctx.fillStyle="rgba(255,255,255,.7)";ctx.beginPath();ctx.arc(-7,-5,2,0,Math.PI*2);ctx.fill();
    }
    ctx.shadowColor="rgba(0,0,0,.8)";ctx.shadowBlur=4;ctx.fillStyle="#f3eee2";ctx.font="bold 9px system-ui";ctx.textAlign="center";ctx.fillText(resource.label||"WATER",0,34);
    ctx.restore();
  }
  function drawFly(fly){
    const x=fly.x*width,y=fly.y*height,isFemale=fly.sex==="female",isFlying=!!fly.isFlying;
    ctx.save();ctx.translate(x,y);ctx.scale(.82,.82);ctx.rotate(fly.angle);
    // Soft ground shadow anchors the fly to the habitat.
    ctx.fillStyle="rgba(0,0,0,.34)";ctx.beginPath();ctx.ellipse(1,9,19,7,0,0,Math.PI*2);ctx.fill();
    // Translucent, veined wings; blue motion blur appears only while travelling.
    for(const side of [-1,1]){
      ctx.save();ctx.translate(-4,side*7);ctx.rotate(side*-.48);
      const wing=ctx.createLinearGradient(-10,-12,9,15);wing.addColorStop(0,"rgba(238,250,245,.88)");wing.addColorStop(.55,isFlying?"rgba(139,203,224,.55)":"rgba(204,226,222,.58)");wing.addColorStop(1,"rgba(101,151,165,.16)");
      ctx.fillStyle=wing;ctx.strokeStyle="rgba(225,244,239,.76)";ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(0,-7,7,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.strokeStyle="rgba(118,158,162,.52)";ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(0,-20);ctx.quadraticCurveTo(-3,-7,0,7);ctx.moveTo(0,-10);ctx.lineTo(-5,-3);ctx.moveTo(0,-2);ctx.lineTo(5,4);ctx.stroke();
      if(isFlying){ctx.strokeStyle="rgba(113,190,222,.34)";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(-2,-8,8,18,0,0,Math.PI*2);ctx.stroke();}
      ctx.restore();
    }
    // Legs with small joints.
    ctx.strokeStyle=isFemale?"#5d4638":"#34443d";ctx.lineWidth=1.35;ctx.lineCap="round";
    for(const side of [-1,1]){for(let i=0;i<3;i++){const sx=-3+i*4,sy=side*3;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx-3,side*(9+i));ctx.lineTo(sx-7,side*(13+i));ctx.stroke();ctx.fillStyle="#9c8060";ctx.beginPath();ctx.arc(sx-3,side*(9+i),1.1,0,Math.PI*2);ctx.fill();}}
    // Thorax and segmented abdomen with subtle natural highlights.
    const thorax=ctx.createRadialGradient(-3,-4,1,0,0,9);thorax.addColorStop(0,isFemale?"#d69a70":"#a9c6b1");thorax.addColorStop(.55,isFemale?"#94664d":"#526b5d");thorax.addColorStop(1,"#26372f");
    ctx.fillStyle=thorax;ctx.beginPath();ctx.ellipse(-1,0,8,6,0,0,Math.PI*2);ctx.fill();
    const abdomen=ctx.createLinearGradient(0,-7,0,7);abdomen.addColorStop(0,isFemale?"#d18b61":"#71877a");abdomen.addColorStop(.45,isFemale?"#9d553c":"#344a40");abdomen.addColorStop(1,"#172923");
    ctx.fillStyle=abdomen;ctx.beginPath();ctx.ellipse(9,0,isFemale?14:12,6,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=isFemale?"rgba(231,178,137,.68)":"rgba(190,214,195,.52)";ctx.lineWidth=.8;
    for(let i=0;i<(isFemale?4:3);i++){const px=3+i*4.5;ctx.beginPath();ctx.moveTo(px,-5);ctx.quadraticCurveTo(px+1,0,px,5);ctx.stroke();}
    // Head and compound eye highlights.
    const head=ctx.createRadialGradient(14,-3,1,15,0,7);head.addColorStop(0,isFemale?"#d18a68":"#b5c9a7");head.addColorStop(.55,isFemale?"#96513d":"#46594a");head.addColorStop(1,"#1c2b25");
    ctx.fillStyle=head;ctx.beginPath();ctx.arc(17,0,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=isFemale?"#6d2928":"#a02f2c";ctx.beginPath();ctx.arc(18,-4,3.1,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="rgba(255,226,208,.8)";ctx.beginPath();ctx.arc(17,-5,1,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#d8c7a6";ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(19,-4);ctx.quadraticCurveTo(23,-9,24,-10);ctx.moveTo(19,4);ctx.quadraticCurveTo(23,9,24,10);ctx.stroke();
    ctx.restore();
  }
  function drawEnvironment(){
    // Ground patches are visual regions, not just decorative labels.
    const patches=[
      {x:.29,y:.48,rx:.13,ry:.18,colors:["#718c5c","#405c3d","#263d2c"],stroke:"rgba(185,207,143,.45)"},
      {x:.72,y:.47,rx:.12,ry:.18,colors:["#ad8052","#725036","#3d3025"],stroke:"rgba(215,171,116,.4)"},
      {x:.50,y:.50,rx:.19,ry:.25,colors:["rgba(135,137,119,.22)","rgba(77,83,68,.15)","rgba(43,49,39,.1)"],stroke:"rgba(190,190,155,.14)"}
    ];
    patches.forEach((p,index)=>{
      const px=p.x*width,py=p.y*height,rx=p.rx*width,ry=p.ry*height;
      ctx.save();ctx.shadowColor="rgba(0,0,0,.38)";ctx.shadowBlur=18;ctx.shadowOffsetY=7;
      const g=ctx.createRadialGradient(px-rx*.25,py-ry*.32,2,px,py,Math.max(rx,ry));
      g.addColorStop(0,p.colors[0]);g.addColorStop(.62,p.colors[1]);g.addColorStop(1,p.colors[2]);
      ctx.fillStyle=g;ctx.strokeStyle=p.stroke;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(px,py,rx,ry,-.12,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.shadowColor="transparent";
      for(let i=0;i<42;i++){const angle=i*2.399+index,dist=.18+((i*37)%79)/100;const sx=px+Math.cos(angle)*rx*dist,sy=py+Math.sin(angle)*ry*dist;ctx.fillStyle=index===0?(i%2?"rgba(184,204,135,.35)":"rgba(25,43,27,.3)"):index===1?(i%2?"rgba(213,168,111,.32)":"rgba(43,30,21,.3)"):"rgba(230,220,184,.1)";ctx.beginPath();ctx.ellipse(sx,sy,1.5+(i%3),.7+(i%2),angle,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    });
    // Pebbles: rounded stones with individual highlights, shading and ground shadows.
    ctx.save();for(let i=0;i<9;i++){
      const x=(.445+(i%3)*.035)*width,y=(.215+Math.floor(i/3)*.028)*height,rx=7+(i%3)*2,ry=5+(i%2)*2;
      ctx.shadowColor="rgba(0,0,0,.5)";ctx.shadowBlur=5;ctx.shadowOffsetY=3;
      const stone=ctx.createLinearGradient(x-rx,y-ry,x+rx,y+ry);stone.addColorStop(0,"#c0b9aa");stone.addColorStop(.35,["#85877f","#aaa194","#6d7472"][i%3]);stone.addColorStop(1,"#383d3a");
      ctx.fillStyle=stone;ctx.beginPath();ctx.ellipse(x,y,rx,ry,.3*i,0,Math.PI*2);ctx.fill();
      ctx.shadowColor="transparent";ctx.strokeStyle="rgba(235,228,207,.42)";ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(x-1,y-1,rx*.58,ry*.35,.3*i,Math.PI,Math.PI*1.8);ctx.stroke();
    }
    // Curled leaf shelter.
    ctx.fillStyle="#71834e";ctx.strokeStyle="#b0b77a";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(.16*width,.64*height);ctx.quadraticCurveTo(.19*width,.54*height,.27*width,.59*height);ctx.quadraticCurveTo(.31*width,.64*height,.26*width,.70*height);ctx.quadraticCurveTo(.21*width,.66*height,.16*width,.64*height);ctx.fill();ctx.stroke();
    ctx.strokeStyle="#d0c58b";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(.17*width,.64*height);ctx.quadraticCurveTo(.23*width,.62*height,.28*width,.60*height);ctx.stroke();
    // Twig arch.
    ctx.strokeStyle="#b18a5e";ctx.lineWidth=7;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(.73*width,.68*height);ctx.quadraticCurveTo(.78*width,.55*height,.83*width,.68*height);ctx.stroke();
    ctx.strokeStyle="#d0aa78";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(.73*width,.67*height);ctx.quadraticCurveTo(.78*width,.56*height,.83*width,.67*height);ctx.stroke();
    // Dew garden: several clear beads sitting on a dark damp patch.
    ctx.save();
    ctx.fillStyle="rgba(55,91,76,.48)";ctx.beginPath();ctx.ellipse(.22*width,.27*height,.065*width,.026*height,-.12,0,Math.PI*2);ctx.fill();
    for(let i=0;i<7;i++){
      const dx=(.185+(i%4)*.021)*width,dy=(.255+Math.floor(i/4)*.025+(i%2)*.006)*height;
      const rr=3+(i%3)*1.2;ctx.fillStyle="rgba(166,222,224,.72)";ctx.beginPath();ctx.arc(dx,dy,rr,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="rgba(255,255,255,.78)";ctx.beginPath();ctx.arc(dx-rr*.3,dy-rr*.35,rr*.25,0,Math.PI*2);ctx.fill();
    }
    // Fallen flower petal fan.
    ctx.translate(.78*width,.27*height);
    for(let i=0;i<5;i++){ctx.save();ctx.rotate(i*Math.PI*2/5);ctx.fillStyle=i%2?"#bd7182":"#d995a0";ctx.strokeStyle="rgba(244,202,194,.8)";ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(0,-17,8,19,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
    ctx.fillStyle="#c6a45d";ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();ctx.restore();
    // Hollow seed-pod tunnel on the lower left.
    ctx.save();ctx.translate(.19*width,.87*height);ctx.fillStyle="#72563b";ctx.strokeStyle="#b58c5d";ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(0,0,34,15,-.12,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle="#241d17";ctx.beginPath();ctx.ellipse(0,-2,23,8,-.12,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="rgba(221,181,125,.65)";ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(-2,-1,19,6,-.12,0,Math.PI*2);ctx.stroke();ctx.restore();
    // Twisted root bridge on the lower right, with a visible opening underneath.
    ctx.save();ctx.strokeStyle="#513b28";ctx.lineWidth=12;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(.75*width,.89*height);ctx.bezierCurveTo(.77*width,.81*height,.84*width,.81*height,.87*width,.89*height);ctx.stroke();
    ctx.strokeStyle="#a47b4e";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(.75*width,.885*height);ctx.bezierCurveTo(.77*width,.815*height,.84*width,.815*height,.87*width,.885*height);ctx.stroke();ctx.restore();
    // Potential egg-laying locations: subtle textured patches, mirrored across both compartments.
    const sites=[
      {x:.30,y:.22,kind:"fruit"},{x:.70,y:.22,kind:"fruit"},
      {x:.20,y:.72,kind:"shelter"},{x:.80,y:.72,kind:"shelter"},
      {x:.39,y:.88,kind:"litter"},{x:.61,y:.88,kind:"litter"}
    ];
    sites.forEach(site=>{
      const x=site.x*width,y=site.y*height;
      ctx.save();
      if(site.kind==="fruit"){
        ctx.fillStyle="rgba(105,65,39,.68)";ctx.beginPath();ctx.ellipse(x,y,19,10,-.18,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#a96d45";ctx.beginPath();ctx.ellipse(x-3,y-2,13,6,-.18,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#d5b47c";ctx.beginPath();ctx.arc(x+8,y-5,2,0,Math.PI*2);ctx.fill();
      }else if(site.kind==="shelter"){
        ctx.fillStyle="rgba(60,83,48,.72)";ctx.beginPath();ctx.ellipse(x,y,18,10,-.2,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="#a5ad70";ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,14,Math.PI*1.05,Math.PI*1.9);ctx.stroke();
        ctx.fillStyle="rgba(143,185,153,.72)";ctx.beginPath();ctx.arc(x,y+2,3,0,Math.PI*2);ctx.fill();
      }else{
        ctx.fillStyle="rgba(105,76,47,.72)";ctx.beginPath();ctx.ellipse(x,y,19,9,.12,0,Math.PI*2);ctx.fill();
        for(let k=0;k<4;k++){ctx.strokeStyle=k%2?"#b18b5e":"#71804b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-13+k*7,y+3);ctx.lineTo(x-7+k*7,y-4+(k%2)*5);ctx.stroke();}
      }
      ctx.restore();
    });
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
    ctx.fillText("DEW GARDEN",.22*width,.32*height);
    ctx.fillText("PETAL FAN",.78*width,.32*height);
    ctx.fillText("SEED-POD TUNNEL",.19*width,.92*height);
    ctx.fillText("ROOT BRIDGE",.81*width,.92*height);
    ctx.fillText("EGG SITE · FRUIT",.30*width,.25*height);
    ctx.fillText("EGG SITE · SHELTER",.20*width,.75*height);
    ctx.fillText("EGG SITE · LEAF LITTER",.39*width,.91*height);
    ctx.fillText("OPEN GROUND",.50*width,.56*height);
    ctx.restore();
  }
  function draw(){
    if(!width||!height)return;ctx.clearRect(0,0,width,height);
    // Zoom around the centre so users can inspect details without losing the habitat controls.
    ctx.save();ctx.translate(width/2,height/2);ctx.scale(zoomLevel*.96,zoomLevel*.96);ctx.translate(-width/2,-height/2);
    // Slightly zoomed-out layout: two equal habitat compartments.
    drawEnvironment();
    state.foods.forEach(food=>drawResource(food,food.type));
    state.waters.forEach(w=>drawResource({...w,label:"WATER"},"water"));
    // Natural-looking bark partition. The visual changes, but the same boundary rules apply.
    if(state.wallClosed){
      ctx.save();
      const x=width/2, top=34, bottom=height-34;
      ctx.shadowColor="rgba(20,13,7,.48)";ctx.shadowBlur=13;ctx.shadowOffsetX=3;
      const bark=ctx.createLinearGradient(x-10,0,x+10,0);
      bark.addColorStop(0,"#4b3321");bark.addColorStop(.22,"#9b7046");
      bark.addColorStop(.48,"#c49a65");bark.addColorStop(.72,"#805637");bark.addColorStop(1,"#3c291c");
      ctx.fillStyle=bark;ctx.beginPath();ctx.roundRect(x-8,top,16,bottom-top,8);ctx.fill();
      ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.shadowOffsetX=0;
      ctx.strokeStyle="rgba(235,197,143,.58)";ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(x-3,top+10);ctx.bezierCurveTo(x-6,height*.3,x+2,height*.56,x-2,bottom-12);ctx.stroke();
      ctx.strokeStyle="rgba(48,29,17,.48)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x+3,top+18);ctx.bezierCurveTo(x+6,height*.35,x-2,height*.7,x+4,bottom-18);ctx.stroke();
      for(let y=top+34;y<bottom-20;y+=Math.max(90,height*.11)){
        ctx.fillStyle="rgba(43,27,17,.48)";ctx.beginPath();ctx.ellipse(x+((Math.floor(y/34)%2)?2:-2),y,2.2,5,0,0,Math.PI*2);ctx.fill();
      }
      ctx.fillStyle="#d8b887";ctx.beginPath();ctx.ellipse(x,top+3,10,5,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="rgba(62,40,24,.8)";ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(x,top+3,10,5,0,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }else{
      ctx.save();ctx.strokeStyle="rgba(151,207,164,.72)";ctx.lineWidth=2.5;ctx.setLineDash([3,10]);
      ctx.beginPath();ctx.moveTo(width/2,34);ctx.lineTo(width/2,height-34);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle="rgba(151,207,164,.9)";
      ctx.beginPath();ctx.arc(width/2,42,4,0,Math.PI*2);ctx.arc(width/2,height-42,4,0,Math.PI*2);ctx.fill();
      ctx.restore();
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
      fly.exploreTarget={x:minX+Math.random()*(maxX-minX),y:.10+Math.random()*.80};
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
    fly.y=Math.max(.08,Math.min(.92,fly.y));
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
  function setZoom(next){zoomLevel=Math.max(.7,Math.min(2.2,Math.round(next*100)/100));$("zoomLevel").textContent=Math.round(zoomLevel*100)+"%";$("zoomOut").disabled=zoomLevel<=.7;$("zoomIn").disabled=zoomLevel>=2.2;draw();}
  $("zoomIn").addEventListener("click",()=>setZoom(zoomLevel+.15));
  $("zoomOut").addEventListener("click",()=>setZoom(zoomLevel-.15));
  $("zoomReset").addEventListener("click",()=>setZoom(1));
  $("wallToggle").addEventListener("click",()=>setWall(!state.wallClosed));
  $("startBtn").addEventListener("click",()=>{if(state.running)return;state.running=true;state.lastFrame=performance.now();$("startBtn").disabled=true;$("pauseBtn").disabled=false;$("runStatus").innerHTML='<span class="status-dot" style="background:#86d5b5"></span> RUNNING';log("Simulation started. Basic placeholder movement is active.");raf=requestAnimationFrame(frame);});
  $("pauseBtn").addEventListener("click",()=>{state.running=false;cancelAnimationFrame(raf);$("startBtn").disabled=false;$("pauseBtn").disabled=true;$("runStatus").innerHTML='<span class="status-dot"></span> PAUSED';log("Simulation paused.");});
  $("resetBtn").addEventListener("click",()=>{state.running=false;cancelAnimationFrame(raf);state.elapsed=0;state.flies=[makeFly(.25,.5,"male"),makeFly(.75,.5,"female")];state.foods.forEach(x=>x.amount=100);state.waters.forEach(x=>x.amount=100);state.events=[];$("startBtn").disabled=false;$("pauseBtn").disabled=true;$("runStatus").innerHTML='<span class="status-dot"></span> PAUSED';setWall(true);log("Habitat reset. Both subjects restored to separate compartments.");renderStats();draw();});
  window.addEventListener("resize",resize);resize();renderStats();setWall(true);
})();