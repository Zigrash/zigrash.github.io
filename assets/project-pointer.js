(()=>{
  'use strict';
  // A short, tapered red trail follows the pointer tip on mouse/trackpad devices.
  const trailCanvas=document.getElementById('cursor-trail');
  const trailMedia=window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduceTrailMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(trailCanvas&&trailMedia.matches&&!reduceTrailMotion){
    const trailContext=trailCanvas.getContext('2d',{alpha:true});
    const trailToggle=document.getElementById('trail-toggle');
    let trailEnabled=true;
    trailToggle.hidden=false;
    trailToggle.addEventListener('click',()=>{
      trailEnabled=!trailEnabled;
      trailToggle.setAttribute('aria-pressed',String(trailEnabled));
      trailToggle.textContent=`Trail + drawing: ${trailEnabled?'On':'Off'}`;
      if(!trailEnabled){
        trailPoints.length=0;
        completedStrokes.length=0;
        drawingActive=false;
        selectingText=false;
        pointerDownActive=false;
        textSelectionAllowed=false;
        if(trailFrame){cancelAnimationFrame(trailFrame);trailFrame=0}
        if(trailFadeTimer){clearTimeout(trailFadeTimer);trailFadeTimer=0}
        trailContext.clearRect(0,0,window.innerWidth,window.innerHeight);
        previousBounds=null;
        clickPulse.classList.remove('active');
      }
    });
    const clickPulse=document.createElement('span');
    clickPulse.id='click-pulse';
    clickPulse.setAttribute('aria-hidden','true');
    document.body.append(clickPulse);
    document.addEventListener('pointerdown',event=>{
      if(!trailEnabled||event.pointerType!=='mouse'||event.button!==0)return;
      clickPulse.style.left=`${event.clientX}px`;
      clickPulse.style.top=`${event.clientY}px`;
      clickPulse.classList.remove('active');
      void clickPulse.offsetWidth;
      clickPulse.classList.add('active');
    },{passive:true});
    const trailPoints=[];
    const completedStrokes=[];
    let trailFrame=0;
    let trailFadeTimer=0;
    let previousBounds=null;
    let drawingActive=false;
    let selectingText=false;
    let pointerDownActive=false;
    let textSelectionAllowed=false;
    const strokeHoldDuration=10000;
    const strokeFadeDuration=1200;
    const trailLifetime=420;
    function resizeTrailCanvas(){
      const ratio=Math.min(window.devicePixelRatio||1,1.5);
      trailCanvas.width=Math.round(window.innerWidth*ratio);
      trailCanvas.height=Math.round(window.innerHeight*ratio);
      trailCanvas.style.width=`${window.innerWidth}px`;
      trailCanvas.style.height=`${window.innerHeight}px`;
      trailContext.setTransform(ratio,0,0,ratio,0,0);
      previousBounds=null;
      requestTrailFrame();
    }
    function requestTrailFrame(){
      if(trailEnabled&&!trailFrame)trailFrame=requestAnimationFrame(drawTrail);
    }
    function scheduleTrailFade(){
      if(trailFadeTimer)clearTimeout(trailFadeTimer);
      trailFadeTimer=0;
      const now=performance.now();
      let nextFade=Infinity;
      completedStrokes.forEach(stroke=>{
        const startsAt=stroke.releasedAt+strokeHoldDuration;
        if(startsAt>now)nextFade=Math.min(nextFade,startsAt);
      });
      if(Number.isFinite(nextFade)){
        trailFadeTimer=setTimeout(()=>{trailFadeTimer=0;requestTrailFrame()},Math.max(1,nextFade-now));
      }
    }
    function includeTrailBounds(left,top,right,bottom){
      const padding=18;
      if(previousBounds){
        const minX=Math.min(previousBounds.left,left-padding),minY=Math.min(previousBounds.top,top-padding);
        const maxX=Math.max(previousBounds.left+previousBounds.width,right+padding);
        const maxY=Math.max(previousBounds.top+previousBounds.height,bottom+padding);
        previousBounds={left:minX,top:minY,width:maxX-minX,height:maxY-minY};
      }else previousBounds={left:left-padding,top:top-padding,width:right-left+padding*2,height:bottom-top+padding*2};
    }
    function strokeSides(points){
      const leftSide=[],rightSide=[];
      points.forEach((point,index)=>{
        const before=points[Math.max(0,index-1)],after=points[Math.min(points.length-1,index+1)];
        const dx=after.x-before.x,dy=after.y-before.y;
        const length=Math.hypot(dx,dy)||1;
        const nx=-dy/length,ny=dx/length;
        const progress=index/(points.length-1);
        const width=(.2+3.3*Math.pow(progress,.72))/2;
        leftSide.push([point.x+nx*width,point.y+ny*width]);
        rightSide.push([point.x-nx*width,point.y-ny*width]);
      });
      return {leftSide,rightSide};
    }
    function strokePath(leftSide,rightSide,start,end){
      const path=new Path2D();
      path.moveTo(leftSide[start][0],leftSide[start][1]);
      for(let i=start+1;i<=end;i++)path.lineTo(leftSide[i][0],leftSide[i][1]);
      for(let i=end;i>=start;i--)path.lineTo(rightSide[i][0],rightSide[i][1]);
      path.closePath();
      return path;
    }
    function completeStroke(points,releasedAt){
      const {leftSide,rightSide}=strokeSides(points);
      let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
      points.forEach(point=>{
        left=Math.min(left,point.x);top=Math.min(top,point.y);
        right=Math.max(right,point.x);bottom=Math.max(bottom,point.y);
      });
      completedStrokes.push({path:strokePath(leftSide,rightSide,0,points.length-1),left,top,right,bottom,releasedAt});
      scheduleTrailFade();
    }
    function drawTrail(now){
      trailFrame=0;
      if(previousBounds){
        trailContext.clearRect(previousBounds.left,previousBounds.top,previousBounds.width,previousBounds.height);
        previousBounds=null;
      }
      trailContext.fillStyle='#e21e2b';
      let fadingStrokes=false;
      for(let i=completedStrokes.length-1;i>=0;i--){
        const stroke=completedStrokes[i];
        const elapsed=now-stroke.releasedAt;
        if(elapsed>=strokeHoldDuration+strokeFadeDuration){completedStrokes.splice(i,1);continue}
        if(elapsed>=strokeHoldDuration)fadingStrokes=true;
        const opacity=elapsed<=strokeHoldDuration?1:1-(elapsed-strokeHoldDuration)/strokeFadeDuration;
        trailContext.globalAlpha=.78*opacity;
        trailContext.fill(stroke.path);
        includeTrailBounds(stroke.left,stroke.top,stroke.right,stroke.bottom);
      }
      trailContext.globalAlpha=1;
      while(!drawingActive&&trailPoints.length&&now-trailPoints[0].time>trailLifetime)trailPoints.shift();
      function paintStroke(points,fade){
        if(points.length<2)return;
        let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
        points.forEach(point=>{left=Math.min(left,point.x);top=Math.min(top,point.y);right=Math.max(right,point.x);bottom=Math.max(bottom,point.y)});
        includeTrailBounds(left,top,right,bottom);
        const {leftSide,rightSide}=strokeSides(points);
        trailContext.globalAlpha=fade*.78;
        trailContext.shadowColor='rgba(226,30,43,.72)';
        trailContext.shadowBlur=4;
        trailContext.fill(strokePath(leftSide,rightSide,0,points.length-1));
        trailContext.shadowBlur=0;
        trailContext.globalAlpha=1;
      }
      if(trailPoints.length>1){
        const fade=drawingActive?1:Math.max(0,1-(now-trailPoints[trailPoints.length-1].time)/trailLifetime);
        paintStroke(trailPoints,fade);
      }
      if(!trailFadeTimer&&completedStrokes.length)scheduleTrailFade();
      if(fadingStrokes||!drawingActive&&trailPoints.length>1)requestTrailFrame();
    }
    function isTextUnderPointer(x,y){
      let node=null,offset=0;
      if(document.caretPositionFromPoint){
        const position=document.caretPositionFromPoint(x,y);
        if(position){node=position.offsetNode;offset=position.offset}
      }else if(document.caretRangeFromPoint){
        const range=document.caretRangeFromPoint(x,y);
        if(range){node=range.startContainer;offset=range.startOffset}
      }
      if(!node||node.nodeType!==Node.TEXT_NODE)return false;
      const text=node.textContent||'';
      for(const index of [offset,offset-1]){
        if(index<0||index>=text.length||/\s/.test(text[index]))continue;
        const charRange=document.createRange();
        charRange.setStart(node,index);
        charRange.setEnd(node,index+1);
        const rect=charRange.getBoundingClientRect();
        if(rect.width&&rect.height&&x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom)return true;
      }
      return false;
    }
    document.addEventListener('pointerdown',event=>{
      if(!trailEnabled||event.pointerType!=='mouse'||event.button!==0)return;
      pointerDownActive=true;
      textSelectionAllowed=isTextUnderPointer(event.clientX,event.clientY);
      trailPoints.length=0;
      drawingActive=true;
      selectingText=false;
      trailPoints.push({x:event.clientX,y:event.clientY,time:performance.now()});
      requestTrailFrame();
    },{passive:true});
    function cancelTrailForTextSelection(){
      if(!drawingActive)return;
      selectingText=true;
      drawingActive=false;
      trailPoints.length=0;
      requestTrailFrame();
    }
    document.addEventListener('selectstart',event=>{
      if(!pointerDownActive)return;
      if(!textSelectionAllowed){event.preventDefault();return}
      cancelTrailForTextSelection();
    },true);
    function finishDrawing(event){
      if(event&&event.pointerType&&event.pointerType!=='mouse')return;
      if(drawingActive){
        drawingActive=false;
        if(trailPoints.length>1){
          const releasedAt=performance.now();
          completeStroke(trailPoints.splice(0),releasedAt);
          requestTrailFrame();
        }else trailPoints.length=0;
      }
      selectingText=false;
      pointerDownActive=false;
      textSelectionAllowed=false;
    }
    document.addEventListener('pointerup',finishDrawing,{passive:true});
    document.addEventListener('pointercancel',finishDrawing,{passive:true});
    window.addEventListener('blur',()=>finishDrawing(),{passive:true});
    document.addEventListener('pointermove',event=>{
      if(!trailEnabled||event.pointerType!=='mouse'||selectingText)return;
      const last=trailPoints[trailPoints.length-1];
      if(!last||Math.hypot(event.clientX-last.x,event.clientY-last.y)>1.5){
        trailPoints.push({x:event.clientX,y:event.clientY,time:performance.now()});
        const maxPoints=drawingActive?900:22;
        if(trailPoints.length>maxPoints)trailPoints.shift();
      }
      requestTrailFrame();
    },{passive:true});
    window.addEventListener('resize',resizeTrailCanvas,{passive:true});
    resizeTrailCanvas();
  }
})();
