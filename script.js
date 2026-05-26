
const canvas = document.getElementById('studioCanvas');
const ctx = canvas.getContext('2d');
const fpsCounter = document.getElementById('fpsCounter');
const playPauseBtn = document.getElementById('playPauseBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const addFrameBtn = document.getElementById('addFrameBtn');
const removeFrameBtn = document.getElementById('removeFrameBtn');
const duplicateFrameBtn = document.getElementById('duplicateFrameBtn');
const prevFrameBtn = document.getElementById('prevFrameBtn');
const nextFrameBtn = document.getElementById('nextFrameBtn');
const fpsRange = document.getElementById('fpsRange');
const fpsDownBtn = document.getElementById('fpsDownBtn');
const fpsUpBtn = document.getElementById('fpsUpBtn');
const timelinePlayback = document.getElementById('timelinePlayback');
const onionRange = document.getElementById('onionOpacityRange');
const onionLabel = document.getElementById('onionOpacityValue');
const sizeRange = document.getElementById('sizeRange');
const opacityRange = document.getElementById('opacityRange');
const colorPicker = document.getElementById('colorPicker');
const colorLabel = document.getElementById('colorValue');
const brushName = document.getElementById('brushName');
const sizeLabel = document.getElementById('sizeValue');
const opacityLabel = document.getElementById('opacityValue');
const fpsLabel = document.getElementById('fpsValue');
const fpsDisplay = document.getElementById('fpsDisplay');
const frameCount = document.getElementById('frameCount');
const frameDeck = document.getElementById('frameDeck');
const brushButtons = document.querySelectorAll('.brush-button');
const swatches = document.querySelectorAll('.color-swatch');
const homeBtn = document.getElementById('homeBtn');
const saveGalleryBtn = document.getElementById('saveGalleryBtn');
const newAnimBtn = document.getElementById('newAnimBtn');


// 2. APP SETTINGS AND STATE (MEMORY)

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;
let devicePixelRatio = window.devicePixelRatio || 1;

let brushMode = 'technical';
let brushSize = 28;
let brushOpacity = 0.92;
let brushColor = '#000000';
let onionOpacity = 0.35;

let timeline = [];
let activeFrame = 0;
let playing = false;
let pointerDown = false;
let lastPoint = null;

let undoStack = [];
let redoStack = [];
let lastTime = 0;


const thumbSource = document.createElement('canvas');
thumbSource.width = BASE_WIDTH;
thumbSource.height = BASE_HEIGHT;

let projects = [];
let currentProjectId = null;


// 3. INITIAL SETUP FUNCTIONS

function setupCanvas() {
  canvas.width = BASE_WIDTH * devicePixelRatio;
  canvas.height = BASE_HEIGHT * devicePixelRatio;
  canvas.style.width = BASE_WIDTH + 'px';
  canvas.style.height = BASE_HEIGHT + 'px';
  
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  clearCanvas(false);
}

function bindEvents() {
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', onCanvasDrop);
  
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  
  playPauseBtn.addEventListener('click', () => setPlayback(!playing));
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  clearBtn.addEventListener('click', () => clearCanvas(true));
  addFrameBtn.addEventListener('click', addBlankFrame);
  removeFrameBtn.addEventListener('click', removeCurrentFrame);
  duplicateFrameBtn.addEventListener('click', duplicateFrame);
  
  prevFrameBtn.addEventListener('click', () => selectFrame(activeFrame - 1));
  nextFrameBtn.addEventListener('click', () => selectFrame(activeFrame + 1));
  
  fpsRange.addEventListener('input', (e) => syncFPS(Number(e.target.value)));
  timelinePlayback.addEventListener('input', (e) => syncFPS(Number(e.target.value)));
  
  fpsDownBtn.addEventListener('click', () => syncFPS(Math.max(1, Number(fpsRange.value) - 1)));
  fpsUpBtn.addEventListener('click', () => syncFPS(Math.min(60, Number(fpsRange.value) + 1)));
  onionRange.addEventListener('input', (e) => syncOnion(Number(e.target.value)));
  
  sizeRange.addEventListener('input', (e) => { 
    brushSize = Number(e.target.value) || 1; 
    sizeLabel.textContent = brushSize; 
  });
  
  opacityRange.addEventListener('input', (e) => { 
    brushOpacity = (Number(e.target.value) || 1) / 100; 
    opacityLabel.textContent = Math.round(brushOpacity * 100); 
  });
  
  colorPicker.addEventListener('input', (e) => setColor(e.target.value));
  frameDeck.addEventListener('click', onFrameDeckClick);
  
  brushButtons.forEach(btn => btn.addEventListener('click', onBrushSelect));
  
  swatches.forEach(swatch => {
    swatch.draggable = true;
    swatch.addEventListener('click', onSwatchClick);
    swatch.addEventListener('dragstart', onColorDragStart);
    swatch.addEventListener('dragend', onColorDragEnd);
  });
  
  if (homeBtn) homeBtn.addEventListener('click', () => location.href = 'index.html');
  if (saveGalleryBtn) saveGalleryBtn.addEventListener('click', saveToGallery);
  if (newAnimBtn) newAnimBtn.addEventListener('click', createMultiplePrompt);
}


// 4. SAVE & LOAD SYSTEM (LOCAL STORAGE)

function loadProjects() {
  try { 
    projects = JSON.parse(localStorage.getItem('mason_projects') || '[]'); 
  } catch (e) { 
    projects = []; 
  }
  currentProjectId = localStorage.getItem('mason_current') || null;
}

function saveProjects() {
  localStorage.setItem('mason_projects', JSON.stringify(projects));
  if (currentProjectId) {
    localStorage.setItem('mason_current', currentProjectId);
  }
}

function saveToGallery() {
  let project = {
    id: currentProjectId || Date.now().toString(),
    name: 'Animation ' + Date.now(),
    created: Date.now(),
    fps: Number(fpsRange.value) || 12,
    frames: [],
    thumb: null
  };

  let tctx = thumbSource.getContext('2d');
  let tmp = document.createElement('canvas');
  tmp.width = 640;
  tmp.height = 360;
  let t2 = tmp.getContext('2d');

  for (let i = 0; i < timeline.length; i++) {
    tctx.putImageData(timeline[i].imageData, 0, 0);
    t2.clearRect(0, 0, tmp.width, tmp.height);
    t2.drawImage(thumbSource, 0, 0, tmp.width, tmp.height);
    project.frames.push(tmp.toDataURL('image/png'));
    if (!project.thumb) project.thumb = tmp.toDataURL('image/png');
  }

  let existing = projects.find(p => p.id === project.id);
  if (existing) {
    existing.name = project.name;
    existing.created = project.created;
    existing.fps = project.fps;
    existing.frames = project.frames;
    existing.thumb = project.thumb;
  } else {
    projects.unshift(project);
  }

  currentProjectId = project.id;
  saveProjects();
  alert('Saved to gallery');
}

function loadProject(id) {
  let project = projects.find(p => p.id === id);
  if (!project) return;

  let tmp = document.createElement('canvas');
  tmp.width = BASE_WIDTH;
  tmp.height = BASE_HEIGHT;
  let t2 = tmp.getContext('2d');
  
  timeline = [];
  let framesLoaded = 0;
  let totalFrames = project.frames.length;

  project.frames.forEach((frameData, index) => {
    let img = new Image();
    img.onload = function() {
      try {
        t2.clearRect(0, 0, tmp.width, tmp.height);
        t2.drawImage(img, 0, 0, tmp.width, tmp.height);
        timeline[index] = { imageData: t2.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT) };
      } catch (e) {
        timeline[index] = { imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) };
      }
      
      framesLoaded++;
      if (framesLoaded === totalFrames) {
        finishLoadingProject(id);
      }
    };
    img.src = frameData;
  });
}

function finishLoadingProject(id) {
  activeFrame = 0;
  restoreFrame();
  renderTimeline();
  currentProjectId = id;
  saveProjects();
}

function createNewProject(name) {
  timeline = [{ imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) }];
  activeFrame = 0;
  restoreFrame();
  renderTimeline();
  currentProjectId = Date.now().toString();
  projects.unshift({
    id: currentProjectId,
    name: name || ('Animation ' + currentProjectId),
    created: Date.now(),
    fps: Number(fpsRange.value) || 12,
    frames: []
  });
  saveProjects();
}

function createMultiplePrompt() {
  let count = parseInt(prompt('How many new animations?', '3'), 10) || 0;
  for (let i = 0; i < count; i++) {
    createNewProject('Animation ' + (Date.now() + i));
  }
  if (count > 0) alert('Created ' + count + ' animations');
}

// 5. BRUSH & COLOR CONTROLS

function onBrushSelect(e) {
  brushMode = e.currentTarget.dataset.brush || 'technical';
  brushName.textContent = e.currentTarget.textContent.trim().split('\n')[0];
  
  brushButtons.forEach(btn => {
    let isActive = btn.dataset.brush === brushMode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-checked', isActive);
  });
}

function setColor(hex) { 
  brushColor = hex; 
  colorPicker.value = hex; 
  colorLabel.textContent = hex; 
  updateSwatches(); 
}

function onSwatchClick(e) { 
  setColor(e.currentTarget.dataset.color); 
}

function onColorDragStart(e) { 
  e.dataTransfer.setData('text/plain', e.currentTarget.dataset.color); 
  e.dataTransfer.effectAllowed = 'copy'; 
  e.currentTarget.classList.add('dragging'); 
}


function onColorDragEnd(e) { 
  e.currentTarget.classList.remove('dragging'); 
}

function updateSwatches() { 
  swatches.forEach(swatch => {
    swatch.classList.toggle('active', swatch.dataset.color === brushColor);
  });
}

function onCanvasDrop(e) { 
  e.preventDefault(); 
  let color = e.dataTransfer.getData('text/plain'); 
  if (!color) return; 
  saveUndoState(); 
  fillArea(getPointFromEvent(e), color); 
  commitFrame(); 
}

function syncFPS(v) { 
  let f = Math.max(1, Math.min(60, v || 12)); 
  fpsRange.value = f; 
  timelinePlayback.value = f; 
  fpsLabel.textContent = f; 
  fpsDisplay.textContent = f; 
}

function syncOnion(v) { 
  onionOpacity = (v || 0) / 100; 
  onionLabel.textContent = v || 0; 
  restoreFrame(); 
}

function getPointFromEvent(e) { 
  let r = canvas.getBoundingClientRect(); 
  return { 
    x: ((e.clientX - r.left) * BASE_WIDTH) / r.width, 
    y: ((e.clientY - r.top) * BASE_HEIGHT) / r.height 
  }; 
}


// 6. UNDO, REDO, & TIMELINE MANAGEMENT

function saveUndoState() {
  undoStack.push({ frame: activeFrame, imageData: ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT) });
  redoStack = [];
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push({ frame: activeFrame, imageData: ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT) });
  let state = undoStack.pop();
  activeFrame = state.frame;
  ctx.putImageData(state.imageData, 0, 0);
  commitFrame();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push({ frame: activeFrame, imageData: ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT) });
  let state = redoStack.pop();
  activeFrame = state.frame;
  ctx.putImageData(state.imageData, 0, 0);
  commitFrame();
}

function clearCanvas(save) {
  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  if (save) { saveUndoState(); commitFrame(); }
}

function commitFrame() {
  timeline[activeFrame] = { imageData: ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT) };
  renderTimeline();
}

function restoreFrame() {
  let frame = timeline[activeFrame];
  if (!frame) return;
  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  if (onionOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = onionOpacity;
    if (activeFrame > 0 && timeline[activeFrame - 1]) {
      ctx.putImageData(timeline[activeFrame - 1].imageData, 0, 0);
    }
    if (activeFrame < timeline.length - 1 && timeline[activeFrame + 1]) {
      ctx.putImageData(timeline[activeFrame + 1].imageData, 0, 0);
    }
    ctx.restore();
  }
  ctx.putImageData(frame.imageData, 0, 0);
}

function addBlankFrame() {
  timeline.splice(activeFrame + 1, 0, { imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) });
  activeFrame++;
  restoreFrame();
  renderTimeline();
}

function duplicateFrame() {
  let frame = timeline[activeFrame];
  if (!frame) return;
  let copy = ctx.createImageData(frame.imageData.width, frame.imageData.height);
  copy.data.set(new Uint8ClampedArray(frame.imageData.data));
  timeline.splice(activeFrame + 1, 0, { imageData: copy });
  activeFrame++;
  restoreFrame();
  renderTimeline();
}

function removeCurrentFrame() {
  if (timeline.length <= 1) return;
  timeline.splice(activeFrame, 1);
  activeFrame = Math.max(0, activeFrame - 1);
  restoreFrame();
  renderTimeline();
}

function selectFrame(index) {
  index = Math.max(0, Math.min(timeline.length - 1, index));
  if (index === activeFrame) return;
  commitFrame();
  activeFrame = index;
  restoreFrame();
  renderTimeline();
}


// 7. PLAYBACK LOOP ENGINE

function setPlayback(on) {
  playing = on;
  playPauseBtn.textContent = playing ? 'Pause' : 'Play';
  if (playing) { 
    lastTime = performance.now(); 
  } else { 
    commitFrame(); 
  }
}

function loop(timestamp) {
  let delta = timestamp - lastTime;
  fpsCounter.textContent = 'FPS ' + Math.round(1000 / Math.max(delta, 1));

  if (playing) {
    let targetInterval = 1000 / Number(fpsRange.value); 
    
    if (delta >= targetInterval) {
      lastTime = timestamp; 
      activeFrame = (activeFrame + 1) % timeline.length; 
      restoreFrame();
      renderTimeline();
    }
  } else {
    lastTime = timestamp;
  }
  
  requestAnimationFrame(loop);
}


// 8. CANVAS DRAWING MECHANICS

function drawDot(point, isDown) {
  if (brushMode === 'eraser') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = brushOpacity;
    ctx.beginPath();
    ctx.arc(point.x, point.y, brushSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (brushMode === 'airbrush') {
    let r = brushSize * 0.75;
    let g = ctx.createRadialGradient(point.x, point.y, r * 0.05, point.x, point.y, r);
    g.addColorStop(0, hexToRgba(brushColor, brushOpacity));
    g.addColorStop(0.6, hexToRgba(brushColor, brushOpacity * 0.35));
    g.addColorStop(1, hexToRgba(brushColor, 0));
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (brushMode === 'pencil') {
    ctx.save();
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize * 0.55;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = Math.max(0.12, brushOpacity * 0.28);
    
    for (let i = 0; i < 4; i++) {
      let jit = brushSize * 0.35;
      let x = point.x + (Math.random() - 0.5) * jit;
      let y = point.y + (Math.random() - 0.5) * jit;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.1, y + 0.1);
      ctx.stroke();
    }
    if (isDown) {
      ctx.globalAlpha *= 0.5;
      ctx.fillStyle = brushColor;
      ctx.beginPath();
      ctx.arc(point.x, point.y, brushSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha = brushOpacity;
  ctx.fillStyle = brushColor;
  ctx.beginPath();
  ctx.arc(point.x, point.y, brushSize * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLine(start, end) {
  let dx = end.x - start.x;
  let dy = end.y - start.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  let steps = Math.max(2, Math.ceil(dist / 2));
  for (let i = 0; i <= steps; i++) {
    drawDot({ x: start.x + (dx / steps) * i, y: start.y + (dy / steps) * i }, false);
  }
}

function fillArea(point, fillColor) {
  let imageData = ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT);
  let pixels = imageData.data;
  let x = Math.floor(point.x);
  let y = Math.floor(point.y);
  let width = BASE_WIDTH;
  let idx = (y * width + x) * 4;
  
  let tr = pixels[idx];
  let tg = pixels[idx + 1];
  let tb = pixels[idx + 2];
  let ta = pixels[idx + 3];
  
  let fill = hexToRgbaArray(fillColor);
  if (tr === fill[0] && tg === fill[1] && tb === fill[2] && ta === fill[3]) return;
  
  let stack = [x, y];
  while (stack.length > 0) {
    y = stack.pop();
    x = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= BASE_HEIGHT) continue;
    idx = (y * width + x) * 4;
    if (pixels[idx] !== tr || pixels[idx + 1] !== tg || pixels[idx + 2] !== tb || pixels[idx + 3] !== ta) continue;
    
    pixels[idx] = fill[0];
    pixels[idx + 1] = fill[1];
    pixels[idx + 2] = fill[2];
    pixels[idx + 3] = fill[3];
    
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  ctx.putImageData(imageData, 0, 0);
}

function hexToRgba(hex, alpha) {
  let cleanHex = hex.replace('#', '');
  let r = parseInt(cleanHex.substring(0, 2), 16);
  let g = parseInt(cleanHex.substring(2, 4), 16);
  let b = parseInt(cleanHex.substring(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function hexToRgbaArray(hex) {
  let cleanHex = hex.replace('#', '');
  let r = parseInt(cleanHex.substring(0, 2), 16);
  let g = parseInt(cleanHex.substring(2, 4), 16);
  let b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b, 255];
}

// 9. MOUSE / POINTER EVENT HANDLERS

function onPointerDown(e) {
  if (playing) return;
  let point = getPointFromEvent(e);
  if (brushMode === 'fill') {
    saveUndoState();
    fillArea(point, brushColor);
    commitFrame();
    return;
  }
  saveUndoState();
  pointerDown = true;
  canvas.setPointerCapture(e.pointerId);
  lastPoint = point;
  drawDot(point, true);
}

function onPointerMove(e) {
  if (!pointerDown || playing) return;
  let point = getPointFromEvent(e);
  if (lastPoint) drawLine(lastPoint, point);
  lastPoint = point;
}

function onPointerUp(e) {
  if (!pointerDown) return;
  pointerDown = false;
  canvas.releasePointerCapture(e.pointerId);
  commitFrame();
  lastPoint = null;
}


// 10. TIMELINE UI RENDERING

function renderTimeline() {
  frameDeck.innerHTML = '';
  let thumbCtx = thumbSource.getContext('2d');
  
  for (let i = 0; i < timeline.length; i++) {
    let card = document.createElement('div');
    card.className = 'frame-card' + (i === activeFrame ? ' active' : '');
    
    // Custom wrapper layout matches the click detection rules
    let btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'frame-selector-btn';
    btn.textContent = 'Frame ' + (i + 1);
    btn.dataset.index = i;
    
    let shell = document.createElement('div');
    shell.className = 'frame-thumb';
    
    let thumb = document.createElement('canvas');
    thumb.width = 128;
    thumb.height = 72;
    
    if (timeline[i] && timeline[i].imageData) {
      thumbCtx.putImageData(timeline[i].imageData, 0, 0);
      thumb.getContext('2d').drawImage(thumbSource, 0, 0, 128, 72);
    }
    shell.appendChild(thumb);
    
    let acts = document.createElement('div');
    acts.className = 'frame-actions';
    
    let goBtn = document.createElement('button');
    goBtn.type = 'button';
    goBtn.className = 'small';
    goBtn.textContent = 'Go';
    goBtn.dataset.index = i;
    goBtn.dataset.action = 'goto';
    
    let delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'small';
    delBtn.textContent = 'Del';
    delBtn.dataset.index = i;
    delBtn.dataset.action = 'delete';
    
    acts.appendChild(goBtn);
    acts.appendChild(delBtn);
    card.appendChild(btn);
    card.appendChild(shell);
    card.appendChild(acts);
    frameDeck.appendChild(card);
  }
  frameCount.textContent = timeline.length;
}

function onFrameDeckClick(e) {
  let btn = e.target.closest('button');
  if (!btn || !frameDeck.contains(btn)) return;
  let idx = Number(btn.dataset.index);
  
  if (btn.dataset.action === 'delete') {
    if (timeline.length <= 1) return;
    timeline.splice(idx, 1);
    activeFrame = Math.min(activeFrame, timeline.length - 1);
    restoreFrame();
    renderTimeline();
    return;
  }
  selectFrame(idx);
}


// 11. APPLICATION INITIALIZATION

function init() {
  setupCanvas();
  bindEvents();
  loadProjects();

  if (currentProjectId) {
    let proj = projects.find(p => p.id === currentProjectId);
    if (proj && proj.frames && proj.frames.length) {
      loadProject(currentProjectId);
    } else {
      timeline.push({ imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) });
      restoreFrame();
      renderTimeline();
    }
  } else {
    timeline.push({ imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) });
    restoreFrame();
    renderTimeline();
  }

  setColor(brushColor);
  syncFPS(Number(fpsRange.value));
  syncOnion(Number(onionRange.value));
  
  requestAnimationFrame(function(t) { 
    lastTime = t; 
    loop(t); 
  });
}

window.addEventListener('DOMContentLoaded', init);