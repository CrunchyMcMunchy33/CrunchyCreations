// HTML elements
var canvas = document.getElementById('studioCanvas');
var ctx = canvas.getContext('2d');
var fpsCounter = document.getElementById('fpsCounter');
var playPauseBtn = document.getElementById('playPauseBtn');
var undoBtn = document.getElementById('undoBtn');
var redoBtn = document.getElementById('redoBtn');
var clearBtn = document.getElementById('clearBtn');
var addFrameBtn = document.getElementById('addFrameBtn');
var removeFrameBtn = document.getElementById('removeFrameBtn');
var duplicateFrameBtn = document.getElementById('duplicateFrameBtn');
var prevFrameBtn = document.getElementById('prevFrameBtn');
var nextFrameBtn = document.getElementById('nextFrameBtn');
var fpsRange = document.getElementById('fpsRange');
var fpsDownBtn = document.getElementById('fpsDownBtn');
var fpsUpBtn = document.getElementById('fpsUpBtn');
var timelinePlayback = document.getElementById('timelinePlayback');
var onionRange = document.getElementById('onionOpacityRange');
var onionLabel = document.getElementById('onionOpacityValue');
var sizeRange = document.getElementById('sizeRange');
var opacityRange = document.getElementById('opacityRange');
var colorPicker = document.getElementById('colorPicker');
var colorLabel = document.getElementById('colorValue');
var brushName = document.getElementById('brushName');
var sizeLabel = document.getElementById('sizeValue');
var opacityLabel = document.getElementById('opacityValue');
var fpsLabel = document.getElementById('fpsValue');
var fpsDisplay = document.getElementById('fpsDisplay');
var frameCount = document.getElementById('frameCount');
var frameDeck = document.getElementById('frameDeck');
var brushButtons = document.querySelectorAll('.brush-button');
var swatches = document.querySelectorAll('.color-swatch');
var homeBtn = document.getElementById('homeBtn');
var saveGalleryBtn = document.getElementById('saveGalleryBtn');
var newAnimBtn = document.getElementById('newAnimBtn');

// Settings and state
var BASE_WIDTH = 1280, BASE_HEIGHT = 720;
var devicePixelRatio = window.devicePixelRatio || 1;
var brushMode = 'technical', brushSize = 28, brushOpacity = 0.92;
var brushColor = '#ffffff', onionOpacity = 0.35;
var timeline = [], activeFrame = 0, playing = false;
var pointerDown = false, lastPoint = null;
var undoStack = [], redoStack = [];
var lastTime = 0, accumulator = 0;
var thumbSource = document.createElement('canvas');
thumbSource.width = BASE_WIDTH;
thumbSource.height = BASE_HEIGHT;
var projects = [], currentProjectId = null;

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
  canvas.addEventListener('dragover', e => e.preventDefault());
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
  fpsRange.addEventListener('input', e => syncFPS(Number(e.target.value)));
  timelinePlayback.addEventListener('input', e => syncFPS(Number(e.target.value)));
  fpsDownBtn.addEventListener('click', () => syncFPS(Math.max(1, Number(fpsRange.value) - 1)));
  fpsUpBtn.addEventListener('click', () => syncFPS(Math.min(60, Number(fpsRange.value) + 1)));
  onionRange.addEventListener('input', e => syncOnion(Number(e.target.value)));
  sizeRange.addEventListener('input', e => { brushSize = Number(e.target.value) || 1; sizeLabel.textContent = brushSize; });
  opacityRange.addEventListener('input', e => { brushOpacity = (Number(e.target.value) || 1) / 100; opacityLabel.textContent = Math.round(brushOpacity * 100); });
  colorPicker.addEventListener('input', e => setColor(e.target.value));
  frameDeck.addEventListener('click', onFrameDeckClick);
  for (var i = 0; i < brushButtons.length; i++) brushButtons[i].addEventListener('click', onBrushSelect);
  for (var i = 0; i < swatches.length; i++) {
    swatches[i].draggable = true;
    swatches[i].addEventListener('click', onSwatchClick);
    swatches[i].addEventListener('dragstart', onColorDragStart);
    swatches[i].addEventListener('dragend', onColorDragEnd);
  }
  if (homeBtn) homeBtn.addEventListener('click', () => location.href = 'index.html');
  if (saveGalleryBtn) saveGalleryBtn.addEventListener('click', saveToGallery);
  if (newAnimBtn) newAnimBtn.addEventListener('click', createMultiplePrompt);
}
function loadProjects() {
  try { projects = JSON.parse(localStorage.getItem('mason_projects') || '[]'); } 
  catch (e) { projects = []; }
  currentProjectId = localStorage.getItem('mason_current') || null;
}

function saveProjects() {
  localStorage.setItem('mason_projects', JSON.stringify(projects));
  if (currentProjectId) localStorage.setItem('mason_current', currentProjectId);
}

function saveToGallery() {
  var project = {
    id: currentProjectId || Date.now().toString(),
    name: 'Animation ' + Date.now(),
    created: Date.now(),
    fps: Number(fpsRange.value) || 12,
    frames: [],
    thumb: null
  };

  var tctx = thumbSource.getContext('2d');
  var tmp = document.createElement('canvas');
  tmp.width = 640;
  tmp.height = 360;
  var t2 = tmp.getContext('2d');

  for (var i = 0; i < timeline.length; i++) {
    tctx.putImageData(timeline[i].imageData, 0, 0);
    t2.clearRect(0, 0, tmp.width, tmp.height);
    t2.drawImage(thumbSource, 0, 0, tmp.width, tmp.height);
    project.frames.push(tmp.toDataURL('image/png'));
    if (!project.thumb) project.thumb = tmp.toDataURL('image/png');
  }

  var existing = null;
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].id === project.id) { existing = projects[i]; break; }
  }
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
  var project = null;
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].id === id) { project = projects[i]; break; }
  }
  if (!project) return;

  var tmp = document.createElement('canvas');
  tmp.width = BASE_WIDTH;
  tmp.height = BASE_HEIGHT;
  var t2 = tmp.getContext('2d');
  timeline = [];
  var framesLoaded = 0, totalFrames = project.frames.length;

  for (var i = 0; i < totalFrames; i++) {
    (function(frameData) {
      var img = new Image();
      img.onload = function() {
        try {
          t2.clearRect(0, 0, tmp.width, tmp.height);
          t2.drawImage(img, 0, 0, tmp.width, tmp.height);
          timeline.push({ imageData: t2.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT) });
        } catch (e) {
          timeline.push({ imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) });
        }
        if (++framesLoaded === totalFrames) {
          if (timeline.length === 0) timeline.push({ imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) });
          activeFrame = 0;
          restoreFrame();
          renderTimeline();
          currentProjectId = id;
          saveProjects();
        }
      };
      img.onerror = function() {
        timeline.push({ imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) });
        if (++framesLoaded === totalFrames) {
          if (timeline.length === 0) timeline.push({ imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) });
          activeFrame = 0;
          restoreFrame();
          renderTimeline();
          currentProjectId = id;
          saveProjects();
        }
      };
      img.src = frameData;
    })(project.frames[i]);
  }
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
  var count = parseInt(prompt('How many new animations?', '3'), 10) || 0;
  for (var i = 0; i < count; i++) createNewProject('Animation ' + (Date.now() + i));
  if (count > 0) alert('Created ' + count + ' animations');
}

function onBrushSelect(e) {
  brushMode = e.currentTarget.dataset.brush || 'technical';
  brushName.textContent = e.currentTarget.textContent.trim();
  for (var i = 0; i < brushButtons.length; i++) {
    var isActive = brushButtons[i].dataset.brush === brushMode;
    brushButtons[i].classList.toggle('active', isActive);
    brushButtons[i].setAttribute('aria-checked', isActive);
  }
}

function setColor(hex) { brushColor = hex; colorPicker.value = hex; colorLabel.textContent = hex; updateSwatches(); }
function onSwatchClick(e) { setColor(e.currentTarget.dataset.color); }
function onColorDragStart(e) { e.dataTransfer.setData('text/plain', e.currentTarget.dataset.color); e.dataTransfer.effectAllowed = 'copy'; e.currentTarget.classList.add('dragging'); }
function onColorDragEnd(e) { e.currentTarget.classList.remove('dragging'); }
function updateSwatches() { for (var i = 0; i < swatches.length; i++) swatches[i].classList.toggle('active', swatches[i].dataset.color === brushColor); }
function onCanvasDrop(e) { e.preventDefault(); var color = e.dataTransfer.getData('text/plain'); if (!color) return; saveUndoState(); fillArea(getPointFromEvent(e), color); commitFrame(); }
function syncFPS(v) { var f = Math.max(1, Math.min(60, v || 12)); fpsRange.value = f; timelinePlayback.value = f; fpsLabel.textContent = f; fpsDisplay.textContent = f; }
function syncOnion(v) { onionOpacity = (v || 0) / 100; onionLabel.textContent = v || 0; restoreFrame(); }
function getPointFromEvent(e) { var r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) * BASE_WIDTH) / r.width, y: ((e.clientY - r.top) * BASE_HEIGHT) / r.height }; }

function saveUndoState() {
  undoStack.push({ frame: activeFrame, imageData: ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT) });
  redoStack = [];
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push({ frame: activeFrame, imageData: ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT) });
  var state = undoStack.pop();
  activeFrame = state.frame;
  ctx.putImageData(state.imageData, 0, 0);
  commitFrame();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push({ frame: activeFrame, imageData: ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT) });
  var state = redoStack.pop();
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
  var frame = timeline[activeFrame];
  if (!frame) return;
  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  if (onionOpacity > 0 && activeFrame > 0 && timeline[activeFrame - 1]) {
    ctx.save();
    ctx.globalAlpha = onionOpacity;
    ctx.putImageData(timeline[activeFrame - 1].imageData, 0, 0);
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
  var frame = timeline[activeFrame];
  if (!frame) return;
  var copy = ctx.createImageData(frame.imageData.width, frame.imageData.height);
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

function setPlayback(on) {
  playing = on;
  playPauseBtn.textContent = playing ? 'Pause' : 'Play';
  if (playing) { accumulator = 0; lastTime = performance.now(); }
  else { commitFrame(); }
}

function loop(timestamp) {
  var delta = timestamp - lastTime;
  lastTime = timestamp;
  fpsCounter.textContent = 'FPS ' + Math.round(1000 / Math.max(delta, 1));

  if (playing) {
    var targetTime = 1000 / Number(fpsRange.value);
    accumulator += delta;
    while (accumulator >= targetTime) {
      accumulator -= targetTime;
      activeFrame = (activeFrame + 1) % timeline.length;
      restoreFrame();
      renderTimeline();
    }
  }
  requestAnimationFrame(loop);
}

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
    var r = brushSize * 0.75;
    var g = ctx.createRadialGradient(point.x, point.y, r * 0.05, point.x, point.y, r);
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
    for (var i = 0; i < 4; i++) {
      var jit = brushSize * 0.35;
      var x = point.x + (Math.random() - 0.5) * jit;
      var y = point.y + (Math.random() - 0.5) * jit;
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
  var dx = end.x - start.x;
  var dy = end.y - start.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var steps = Math.max(2, Math.ceil(dist / 2));
  for (var i = 0; i <= steps; i++) {
    drawDot({ x: start.x + dx / steps * i, y: start.y + dy / steps * i }, false);
  }
}


function fillArea(point, fillColor) {
  var imageData = ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT);
  var pixels = imageData.data;
  var x = Math.floor(point.x);
  var y = Math.floor(point.y);
  var width = BASE_WIDTH;
  var idx = (y * width + x) * 4;
  var tr = pixels[idx], tg = pixels[idx + 1], tb = pixels[idx + 2], ta = pixels[idx + 3];
  var fill = hexToRgbaArray(fillColor);
  if (tr === fill[0] && tg === fill[1] && tb === fill[2] && ta === fill[3]) return;
  
  var stack = [x, y];
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
  var v = parseInt(hex.replace('#', ''), 16);
  return 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + alpha + ')';
}

function hexToRgbaArray(hex) {
  var v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 255];
}

function onPointerDown(e) {
  if (playing) return;
  var point = getPointFromEvent(e);
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
  var point = getPointFromEvent(e);
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

function renderTimeline() {
  frameDeck.innerHTML = '';
  var thumbCtx = thumbSource.getContext('2d');
  for (var i = 0; i < timeline.length; i++) {
    var card = document.createElement('div');
    card.className = 'frame-card' + (i === activeFrame ? ' active' : '');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Frame ' + (i + 1);
    btn.dataset.index = i;
    var shell = document.createElement('div');
    shell.className = 'frame-thumb';
    var thumb = document.createElement('canvas');
    thumb.width = 128;
    thumb.height = 72;
    thumbCtx.putImageData(timeline[i].imageData, 0, 0);
    thumb.getContext('2d').drawImage(thumbSource, 0, 0, 128, 72);
    shell.appendChild(thumb);
    var acts = document.createElement('div');
    acts.className = 'frame-actions';
    var goBtn = document.createElement('button');
    goBtn.type = 'button';
    goBtn.className = 'small';
    goBtn.textContent = 'Go';
    goBtn.dataset.index = i;
    goBtn.dataset.action = 'goto';
    var delBtn = document.createElement('button');
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
  var btn = e.target.closest('button');
  if (!btn || !frameDeck.contains(btn)) return;
  var idx = Number(btn.dataset.index);
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

function init() {
  setupCanvas();
  bindEvents();
  loadProjects();

  if (currentProjectId) {
    var proj = null;
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].id === currentProjectId) { proj = projects[i]; break; }
    }
    if (proj && proj.frames && proj.frames.length) {
      loadProject(currentProjectId);
    } else {
      timeline.push({ imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) });
      restoreFrame();
    }
  } else {
    timeline.push({ imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) });
    restoreFrame();
  }

  setColor(brushColor);
  syncFPS(Number(fpsRange.value));
  syncOnion(Number(onionRange.value));
  requestAnimationFrame(function(t) { lastTime = t; loop(t); });
}

window.addEventListener('DOMContentLoaded', init);
