const canvas = document.getElementById('studioCanvas');
const ctx = canvas.getContext('2d');
const onionCanvas = document.getElementById('onionCanvas');
const onionCtx = onionCanvas.getContext('2d');
const fpsCounter = document.getElementById('fpsCounter'), playPauseBtn = document.getElementById('playPauseBtn'), undoBtn = document.getElementById('undoBtn'), redoBtn = document.getElementById('redoBtn'), clearBtn = document.getElementById('clearBtn'), addFrameBtn = document.getElementById('addFrameBtn'), removeFrameBtn = document.getElementById('removeFrameBtn'), duplicateFrameBtn = document.getElementById('duplicateFrameBtn'), prevFrameBtn = document.getElementById('prevFrameBtn'), nextFrameBtn = document.getElementById('nextFrameBtn');
const fpsRange = document.getElementById('fpsRange'), fpsDownBtn = document.getElementById('fpsDownBtn'), fpsUpBtn = document.getElementById('fpsUpBtn'), timelinePlayback = document.getElementById('timelinePlayback'), sizeRange = document.getElementById('sizeRange'), opacityRange = document.getElementById('opacityRange');
const colorPicker = document.getElementById('colorPicker'), colorLabel = document.getElementById('colorValue'), brushName = document.getElementById('brushName'), sizeLabel = document.getElementById('sizeValue'), opacityLabel = document.getElementById('opacityValue'), fpsLabel = document.getElementById('fpsValue'), fpsDisplay = document.getElementById('fpsDisplay');
const onionToggle = document.getElementById('onionToggle'), onionOpacityRange = document.getElementById('onionOpacityRange'), onionOpacityLabel = document.getElementById('onionOpacityValue'), frameCount = document.getElementById('frameCount'), frameDeck = document.getElementById('frameDeck');
const mudFrequencyRange = document.getElementById('mudFrequencyRange'), mudFrequencyLabel = document.getElementById('mudFrequencyValue');
const hairThicknessRange = document.getElementById('hairThicknessRange'), hairThicknessLabel = document.getElementById('hairThicknessValue');
const hairFrequencyRange = document.getElementById('hairFrequencyRange'), hairFrequencyLabel = document.getElementById('hairFrequencyValue');
const brushButtons = document.querySelectorAll('.brush-button');
const swatches = document.querySelectorAll('.color-swatch');
const homeBtn = document.getElementById('homeBtn');
const saveGalleryBtn = document.getElementById('saveGalleryBtn');
const newAnimBtn = document.getElementById('newAnimBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const BASE_WIDTH = 1920, BASE_HEIGHT = 1080, ONION_OPACITY_DEFAULT = 0.4;
let devicePixelRatio = window.devicePixelRatio;
if (devicePixelRatio === undefined || devicePixelRatio === null) devicePixelRatio = 1;
let studioNameModalCallback = null, studioNameModalData = null;
let brushMode = 'technical', brushSize = 28, brushOpacity = 0.92, brushColor = '#000000';
let mudSplashFrequency = 6, hairThickness = 2, hairFrequency = 7;
let smearColor = null;
let onionOpacity = ONION_OPACITY_DEFAULT, onionEnabled = true;
let timeline = [], activeFrame = 0, playing = false;
let pointerDown = false, lastPoint = null, shapeStartPoint = null, shapeBaseImage = null;
let undoStack = [], redoStack = [], lastTime = 0;
let projects = [], currentProjectId = null, draggedFrameIndex = null;
const thumbSource = document.createElement('canvas');
thumbSource.width = BASE_WIDTH; thumbSource.height = BASE_HEIGHT;
const onionSource = document.createElement('canvas');
const onionSourceCtx = onionSource.getContext('2d');
onionSource.width = BASE_WIDTH; onionSource.height = BASE_HEIGHT;
function setText(el, value) { if (el) el.textContent = value; }
function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }
function withTry(fn) { try { fn(); } catch (e) { } }
function showStudioNameModal(title, defaultValue, callback, data) {
  var modal = document.getElementById('studioNameModal');
  var titleEl = document.getElementById('studioNameModalTitle');
  var input = document.getElementById('studioNameInput');
  var confirmBtn = document.getElementById('studioNameConfirm');
  var cancelBtn = document.getElementById('studioNameCancel');
  if (!modal || !titleEl || !input || !confirmBtn || !cancelBtn) return;
  titleEl.textContent = title;
  input.value = defaultValue;
  studioNameModalCallback = callback;
  studioNameModalData = data;
  modal.style.display = 'flex';
  input.focus();
  input.select();
  function confirm() {
    var value = input.value.trim();
    if (!value) return;
    studioNameModalCallback(value, studioNameModalData);
    modal.style.display = 'none';
  }
  function cancel() { modal.style.display = 'none'; }
  confirmBtn.onclick = confirm;
  cancelBtn.onclick = cancel;
  input.onkeypress = function(e) { if (e.key === 'Enter') confirm(); };
  input.onkeydown = function(e) { if (e.key === 'Escape') cancel(); };
}
function showSaveSuccessModal() {
  var modal = document.getElementById('saveSuccessModal');
  var closeBtn = document.getElementById('saveSuccessClose');
  var homeActionBtn = document.getElementById('saveSuccessHome');
  var stayBtn = document.getElementById('saveSuccessStay');
  if (!modal) return;
  function closeModal() { modal.style.display = 'none'; }
  modal.style.display = 'flex';
  if (closeBtn) closeBtn.onclick = closeModal;
  if (stayBtn) stayBtn.onclick = closeModal;
  if (homeActionBtn) homeActionBtn.onclick = function() { location.href = 'index.html'; };
}
function setupCanvas() {
  function placeCanvas(el, z, pointerEvents) {
    el.width = BASE_WIDTH;
    el.height = BASE_HEIGHT;
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.position = 'absolute';
    el.style.top = '0';
    el.style.left = '0';
    el.style.zIndex = String(z);
    if (pointerEvents) el.style.pointerEvents = pointerEvents;
  }
  placeCanvas(canvas, 1);
  placeCanvas(onionCanvas, 0, 'none');
  if (canvas.parentElement) canvas.parentElement.style.position = 'relative';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  clearCanvas(false);
}
function bindEvents() {
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('dragover', function(e) { e.preventDefault(); });
  canvas.addEventListener('drop', onCanvasDrop);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  playPauseBtn.addEventListener('click', function() { setPlayback(!playing); });
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  clearBtn.addEventListener('click', function() { clearCanvas(true); });
  addFrameBtn.addEventListener('click', addBlankFrame);
  removeFrameBtn.addEventListener('click', removeCurrentFrame);
  duplicateFrameBtn.addEventListener('click', duplicateFrame);
  if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleCanvasFullscreen);
  prevFrameBtn.addEventListener('click', function() { selectFrame(activeFrame - 1); });
  nextFrameBtn.addEventListener('click', function() { selectFrame(activeFrame + 1); });
  fpsRange.addEventListener('input', function(e) { syncFPS(Number(e.target.value)); });
  timelinePlayback.addEventListener('input', function(e) { syncFPS(Number(e.target.value)); });
  onionToggle.addEventListener('change', function(e) { setOnionSkin(e.target.checked); });
  onionOpacityRange.addEventListener('input', function(e) { setOnionOpacity(Number(e.target.value) / 100); });
  fpsDownBtn.addEventListener('click', function() { syncFPS(Number(fpsRange.value) - 1); });
  fpsUpBtn.addEventListener('click', function() { syncFPS(Number(fpsRange.value) + 1); });
  sizeRange.addEventListener('input', function(e) {
    brushSize = clamp(Number(e.target.value) || 1, 1, 100);
    setText(sizeLabel, brushSize);
  });
  opacityRange.addEventListener('input', function(e) {
    var v = Number(e.target.value) || 100;
    brushOpacity = clamp(v, 1, 100) / 100;
    setText(opacityLabel, Math.round(brushOpacity * 100));
  });
  colorPicker.addEventListener('input', function(e) { setColor(e.target.value); });
  if (mudFrequencyRange) {
    mudFrequencyRange.addEventListener('input', function(e) {
      mudSplashFrequency = clamp(Number(e.target.value) || 1, 1, 12);
      setText(mudFrequencyLabel, mudSplashFrequency);
    });
  }
  if (hairThicknessRange) {
    hairThicknessRange.addEventListener('input', function(e) {
      hairThickness = clamp(Number(e.target.value) || 1, 1, 10);
      setText(hairThicknessLabel, hairThickness);
    });
  }
  if (hairFrequencyRange) {
    hairFrequencyRange.addEventListener('input', function(e) {
      hairFrequency = clamp(Number(e.target.value) || 1, 1, 20);
      setText(hairFrequencyLabel, hairFrequency);
    });
  }
  frameDeck.addEventListener('click', onFrameDeckClick);
  for (var i = 0; i < brushButtons.length; i++) brushButtons[i].addEventListener('click', onBrushSelect);
  for (var j = 0; j < swatches.length; j++) {
    var sw = swatches[j];
    sw.draggable = true;
    sw.addEventListener('click', onSwatchClick);
    sw.addEventListener('dragstart', onColorDragStart);
    sw.addEventListener('dragend', onColorDragEnd);
  }
  if (homeBtn) homeBtn.addEventListener('click', function() { location.href = 'index.html'; });
  if (saveGalleryBtn) saveGalleryBtn.addEventListener('click', saveToGallery);
  if (newAnimBtn) newAnimBtn.addEventListener('click', createSingleAnimation);
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
  document.addEventListener('mozfullscreenchange', updateFullscreenButton);
  document.addEventListener('MSFullscreenChange', updateFullscreenButton);
  window.addEventListener('keydown', onGlobalShortcut);
}
function loadProjects() {
  var raw = null;
  withTry(function() { raw = localStorage.getItem('mason_projects'); });
  if (raw) {
    withTry(function() { projects = JSON.parse(raw) || []; });
    if (!Array.isArray(projects)) projects = [];
  } else projects = [];
  var cur = null;
  withTry(function() { cur = localStorage.getItem('mason_current'); });
  currentProjectId = cur || null;
}
function saveProjects() {
  withTry(function() { localStorage.setItem('mason_projects', JSON.stringify(projects)); });
  if (currentProjectId) withTry(function() { localStorage.setItem('mason_current', currentProjectId); });
}
function saveToGallery() {
  var pid = currentProjectId || Date.now().toString();
  showStudioNameModal('Name Your Animation', 'My Animation', function(animationName, projectId) {
    var project = { id: projectId, name: animationName, created: Date.now(), fps: Number(fpsRange.value) || 12, frames: [], thumb: null };
    var tctx = thumbSource.getContext('2d');
    var tmp = document.createElement('canvas');
    tmp.width = 640;
    tmp.height = 360;
    var t2 = tmp.getContext('2d');
    for (var i = 0; i < timeline.length; i++) {
      var frame = timeline[i];
      if (frame && frame.imageData) {
        tctx.clearRect(0, 0, thumbSource.width, thumbSource.height);
        tctx.putImageData(frame.imageData, 0, 0);
        t2.clearRect(0, 0, tmp.width, tmp.height);
        t2.drawImage(thumbSource, 0, 0, tmp.width, tmp.height);
        var dataUrl = tmp.toDataURL('image/png');
        project.frames.push(dataUrl);
        if (!project.thumb) project.thumb = dataUrl;
      } else {
        project.frames.push('');
      }
    }
    var foundIndex = -1;
    for (var k = 0; k < projects.length; k++) {
      if (projects[k].id === project.id) {
        foundIndex = k;
        break;
      }
    }
    if (foundIndex >= 0) {
      projects[foundIndex].name = project.name;
      projects[foundIndex].created = project.created;
      projects[foundIndex].fps = project.fps;
      projects[foundIndex].frames = project.frames;
      projects[foundIndex].thumb = project.thumb;
    } else {
      projects.unshift(project);
    }
    currentProjectId = project.id;
    saveProjects();
    showSaveSuccessModal();
  }, pid);
}
function loadProject(id) {
  var project = null;
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].id === id) {
      project = projects[i];
      break;
    }
  }
  if (!project) return;
  var tmp = document.createElement('canvas');
  tmp.width = BASE_WIDTH;
  tmp.height = BASE_HEIGHT;
  var t2 = tmp.getContext('2d');
  timeline = [];
  var framesLoaded = 0;
  var totalFrames = project.frames.length;
  if (totalFrames === 0) return finishLoadingProject(id);
  for (var j = 0; j < project.frames.length; j++) {
    (function(index) {
      var frameData = project.frames[index];
      var img = new Image();
      img.onload = function() {
        try {
          t2.clearRect(0, 0, tmp.width, tmp.height);
          t2.drawImage(img, 0, 0, tmp.width, tmp.height);
          timeline[index] = { imageData: t2.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT) };
        } catch (err) {
          timeline[index] = { imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) };
        }
        framesLoaded++;
        if (framesLoaded === totalFrames) finishLoadingProject(id);
      };
      img.src = frameData;
    })(j);
  }
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
  projects.unshift({ id: currentProjectId, name: name || ('Animation ' + currentProjectId), created: Date.now(), fps: Number(fpsRange.value) || 12, frames: [] });
  saveProjects();
}
function createSingleAnimation() { createNewProject('Animation ' + Date.now()); }
function onBrushSelect(e) {
  var ds = e.currentTarget.dataset.brush;
  brushMode = ds || 'technical';
  var t = e.currentTarget.textContent;
  if (t && brushName) {
    var parts = t.trim().split('\n');
    brushName.textContent = parts[0];
  }
  for (var i = 0; i < brushButtons.length; i++) {
    var btn = brushButtons[i];
    var active = btn.dataset.brush === brushMode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  }
}
function setColor(hex) {
  brushColor = hex;
  colorPicker.value = hex;
  setText(colorLabel, hex);
  updateSwatches();
}
function setOnionSkin(enabled) {
  onionEnabled = !!enabled;
  if (onionToggle) onionToggle.checked = onionEnabled;
  restoreFrame();
}
function setOnionOpacity(value) {
  onionOpacity = clamp(value, 0.1, 1);
  setText(onionOpacityLabel, Math.round(onionOpacity * 100));
  restoreFrame();
}
function onSwatchClick(e) { setColor(e.currentTarget.dataset.color); }
function onColorDragStart(e) {
  var c = e.currentTarget.dataset.color;
  withTry(function() {
    e.dataTransfer.setData('text/plain', c);
    e.dataTransfer.effectAllowed = 'copy';
  });
  e.currentTarget.classList.add('dragging');
}
function onColorDragEnd(e) { e.currentTarget.classList.remove('dragging'); }
function updateSwatches() {
  for (var i = 0; i < swatches.length; i++) {
    swatches[i].classList.toggle('active', swatches[i].dataset.color === brushColor);
  }
}
function onGlobalShortcut(e) {
  var target = e.target;
  if (target) {
    var tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
  }
  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    return toggleCanvasFullscreen();
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    return selectFrame(activeFrame + 1);
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    return selectFrame(activeFrame - 1);
  }
}
function toggleCanvasFullscreen() {
  var current = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
  if (current) return exitFullscreen();
  var target = canvas.parentElement || canvas;
  if (target.requestFullscreen) target.requestFullscreen();
  else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
  else if (target.mozRequestFullScreen) target.mozRequestFullScreen();
  else if (target.msRequestFullscreen) target.msRequestFullscreen();
}
function exitFullscreen() {
  if (document.exitFullscreen) document.exitFullscreen();
  else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
  else if (document.msExitFullscreen) document.msExitFullscreen();
}
function updateFullscreenButton() {
  if (!fullscreenBtn) return;
  var current = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
  fullscreenBtn.textContent = current ? 'Exit Fullscreen' : 'Fullscreen';
}
function onCanvasDrop(e) {
  e.preventDefault();
  var color = '';
  withTry(function() { color = e.dataTransfer.getData('text/plain'); });
  if (!color) return;
  saveUndoState();
  fillArea(getPointFromEvent(e), color);
  commitFrame();
}
function syncFPS(v) {
  var f = clamp(Number(v) || 12, 1, 60);
  fpsRange.value = f;
  timelinePlayback.value = f;
  setText(fpsLabel, f);
  setText(fpsDisplay, f);
}
function getPointFromEvent(e) {
  var r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * BASE_WIDTH) / r.width,
    y: ((e.clientY - r.top) * BASE_HEIGHT) / r.height
  };
}
function cloneImageData(imageData) {
  var w = imageData.width;
  var h = imageData.height;
  var src = imageData.data;
  var dst = new Uint8ClampedArray(w * h * 4);
  for (var i = 0; i < dst.length; i++) dst[i] = src[i];
  return new ImageData(dst, w, h);
}
function getFrameSnapshot() { return timeline[activeFrame] && timeline[activeFrame].imageData ? cloneImageData(timeline[activeFrame].imageData) : ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT); }
function saveUndoState() { undoStack.push({ frame: activeFrame, imageData: getFrameSnapshot() }); redoStack = []; }
function undo() {
  if (undoStack.length === 0) return;
  redoStack.push({ frame: activeFrame, imageData: getFrameSnapshot() });
  var state = undoStack.pop();
  activeFrame = state.frame;
  ctx.putImageData(state.imageData, 0, 0);
  commitFrame();
}
function redo() {
  if (redoStack.length === 0) return;
  undoStack.push({ frame: activeFrame, imageData: getFrameSnapshot() });
  var state = redoStack.pop();
  activeFrame = state.frame;
  ctx.putImageData(state.imageData, 0, 0);
  commitFrame();
}
function clearCanvas(save) {
  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  if (save) {
    saveUndoState();
    commitFrame();
  }
}
function commitFrame() {
  timeline[activeFrame] = { imageData: cloneImageData(ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT)) };
  renderTimeline();
}
function restoreFrame() {
  var frame = timeline[activeFrame];
  if (!frame) return;
  onionCtx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  if (!playing && onionEnabled && activeFrame > 0) {
    var previous = timeline[activeFrame - 1];
    if (previous && previous.imageData) {
      onionSourceCtx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
      onionSourceCtx.putImageData(previous.imageData, 0, 0);
      onionCtx.save();
      onionCtx.globalAlpha = onionOpacity;
      onionCtx.drawImage(onionSource, 0, 0);
      onionCtx.restore();
    }
  }
  if (frame.imageData) ctx.putImageData(frame.imageData, 0, 0);
}
function addBlankFrame() {
  timeline.splice(activeFrame + 1, 0, { imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) });
  activeFrame++;
  restoreFrame();
  renderTimeline();
}
function duplicateFrame() {
  var frame = timeline[activeFrame];
  if (!frame || !frame.imageData) return;
  timeline.splice(activeFrame + 1, 0, { imageData: cloneImageData(frame.imageData) });
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
  index = clamp(index, 0, timeline.length - 1);
  if (index === activeFrame) return;
  commitFrame();
  activeFrame = index;
  restoreFrame();
  renderTimeline();
}
function setPlayback(on) {
  if (on) {
    playing = true;
    playPauseBtn.textContent = 'Pause';
    lastTime = performance.now();
    restoreFrame();
  } else {
    playing = false;
    playPauseBtn.textContent = 'Play';
    commitFrame();
    restoreFrame();
  }
}
function loop(timestamp) {
  var delta = timestamp - lastTime;
  if (delta <= 0) delta = 1;
  setText(fpsCounter, 'FPS ' + Math.round(1000 / delta));
  if (playing) {
    var targetInterval = 1000 / Number(fpsRange.value);
    if (delta >= targetInterval) {
      lastTime = timestamp;
      activeFrame++;
      if (activeFrame >= timeline.length) activeFrame = 0;
      restoreFrame();
      renderTimeline();
    }
  } else {
    lastTime = timestamp;
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
    ctx.globalAlpha = Math.max(brushOpacity * 0.28, 0.12);
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
  if (brushMode === 'mudsplash') {
    var splashCount = clamp(mudSplashFrequency, 1, 12);
    ctx.save();
    ctx.fillStyle = brushColor;
    for (var m = 0; m < splashCount; m++) {
      var angle = Math.random() * Math.PI * 2;
      var distance = brushSize * (0.18 + Math.random() * 1.7);
      var dropX = point.x + Math.cos(angle) * distance;
      var dropY = point.y + Math.sin(angle) * distance;
      var dropR = brushSize * (0.05 + Math.random() * 0.18);
      ctx.globalAlpha = brushOpacity * (0.2 + Math.random() * 0.65);
      ctx.beginPath();
      ctx.arc(dropX, dropY, dropR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (brushMode === 'hair') {
    var tapStrands = clamp(hairFrequency, 1, 20);
    var tapWidth = Math.max(0.4, hairThickness * 0.45);
    var tapLength = brushSize * 0.7;
    var tapSpread = Math.max(1, brushSize * 0.35);
    ctx.save();
    ctx.strokeStyle = brushColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var h = 0; h < tapStrands; h++) {
      var offset = tapStrands === 1 ? 0 : ((h / (tapStrands - 1)) - 0.5) * 2 * tapSpread;
      var jitter = (Math.random() - 0.5) * Math.max(0.6, brushSize * 0.08);
      var sx = point.x + offset + jitter;
      var sy = point.y - tapLength * 0.5;
      var ex = point.x + offset + jitter;
      var ey = point.y + tapLength * 0.5;
      ctx.globalAlpha = brushOpacity * (0.22 + Math.random() * 0.45);
      ctx.lineWidth = tapWidth * (0.85 + Math.random() * 0.3);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  if (brushMode === 'smear') {
    var sampled = sampleCanvasColor(point);
    if (!smearColor) smearColor = sampled;
    var mixedCarry = blendColor(smearColor, sampled, 0.5);
    applySmearBlend(point, mixedCarry, brushOpacity * 0.35);
    smearColor = mixedCarry;
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
  if (brushMode === 'smear') {
    var startColor = smearColor || sampleCanvasColor(start);
    var endColor = sampleCanvasColor(end);
    var dxSmear = end.x - start.x;
    var dySmear = end.y - start.y;
    var distSmear = Math.sqrt(dxSmear * dxSmear + dySmear * dySmear);
    var stepsSmear = Math.max(2, Math.ceil(distSmear / 2));
    for (var ss = 0; ss <= stepsSmear; ss++) {
      var ts = ss / stepsSmear;
      var point = { x: start.x + dxSmear * ts, y: start.y + dySmear * ts };
      var gradColor = blendColor(startColor, endColor, ts);
      applySmearBlend(point, gradColor, brushOpacity * 0.38);
    }
    smearColor = endColor;
    return;
  }
  if (brushMode === 'mudsplash') {
    var mudDx = end.x - start.x;
    var mudDy = end.y - start.y;
    var mudDist = Math.sqrt(mudDx * mudDx + mudDy * mudDy);
    var mudSpacing = Math.max(brushSize * 0.85, 8);
    var mudSteps = Math.max(1, Math.ceil(mudDist / mudSpacing));
    for (var ms = 0; ms <= mudSteps; ms++) {
      var mt = ms / mudSteps;
      drawDot({ x: start.x + mudDx * mt, y: start.y + mudDy * mt }, false);
    }
    return;
  }
  if (brushMode === 'hair') {
    var hairDx = end.x - start.x;
    var hairDy = end.y - start.y;
    var hairDist = Math.sqrt(hairDx * hairDx + hairDy * hairDy);
    if (hairDist <= 0.001) {
      drawDot(end, false);
      return;
    }
    var hairNx = -hairDy / hairDist;
    var hairNy = hairDx / hairDist;
    var strandCount = clamp(hairFrequency, 1, 20);
    var strandSpread = Math.max(1, brushSize * 0.36);
    var strandWidth = Math.max(0.4, hairThickness * 0.45);
    ctx.save();
    ctx.strokeStyle = brushColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var hs = 0; hs < strandCount; hs++) {
      var hOffset = strandCount === 1 ? 0 : ((hs / (strandCount - 1)) - 0.5) * 2 * strandSpread;
      var hJitter = (Math.random() - 0.5) * Math.max(0.7, brushSize * 0.07);
      var sx = start.x + hairNx * hOffset + hJitter;
      var sy = start.y + hairNy * hOffset + hJitter;
      var ex = end.x + hairNx * hOffset + hJitter;
      var ey = end.y + hairNy * hOffset + hJitter;
      ctx.globalAlpha = brushOpacity * (0.24 + Math.random() * 0.4);
      ctx.lineWidth = strandWidth * (0.85 + Math.random() * 0.3);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  var dx = end.x - start.x;
  var dy = end.y - start.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var steps = Math.max(2, Math.ceil(dist / 2));
  for (var i = 0; i <= steps; i++) {
    var t = i / steps;
    drawDot({ x: start.x + dx * t, y: start.y + dy * t }, false);
  }
}
function isShapeTool(mode) {
  return mode === 'shape-ellipse' || mode === 'shape-rect' || mode === 'shape-line';
}
function drawCurrentShape(start, end) {
  var left = Math.min(start.x, end.x);
  var top = Math.min(start.y, end.y);
  var width = Math.abs(end.x - start.x);
  var height = Math.abs(end.y - start.y);
  ctx.save();
  ctx.globalAlpha = brushOpacity;
  ctx.strokeStyle = brushColor;
  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (brushMode === 'shape-ellipse') {
    ctx.beginPath();
    ctx.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (brushMode === 'shape-rect') {
    ctx.strokeRect(left, top, width, height);
  } else if (brushMode === 'shape-line') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  ctx.restore();
}
function fillArea(point, fillColor) {
  var imageData = timeline[activeFrame] && timeline[activeFrame].imageData
    ? cloneImageData(timeline[activeFrame].imageData)
    : ctx.createImageData(BASE_WIDTH, BASE_HEIGHT);
  var pixels = imageData.data;
  var x = Math.floor(point.x);
  var y = Math.floor(point.y);
  if (x < 0 || x >= BASE_WIDTH || y < 0 || y >= BASE_HEIGHT) return;
  var idx = (y * BASE_WIDTH + x) * 4;
  var tr = pixels[idx];
  var tg = pixels[idx + 1];
  var tb = pixels[idx + 2];
  var ta = pixels[idx + 3];
  var fill = hexToRgbaArray(fillColor);
  if (tr === fill[0] && tg === fill[1] && tb === fill[2] && ta === fill[3]) return;
  var stack = [x, y];
  while (stack.length > 0) {
    var yy = stack.pop();
    var xx = stack.pop();
    if (xx < 0 || xx >= BASE_WIDTH || yy < 0 || yy >= BASE_HEIGHT) continue;
    var i2 = (yy * BASE_WIDTH + xx) * 4;
    if (pixels[i2] !== tr || pixels[i2 + 1] !== tg || pixels[i2 + 2] !== tb || pixels[i2 + 3] !== ta) continue;
    pixels[i2] = fill[0];
    pixels[i2 + 1] = fill[1];
    pixels[i2 + 2] = fill[2];
    pixels[i2 + 3] = fill[3];
    stack.push(xx + 1, yy, xx - 1, yy, xx, yy + 1, xx, yy - 1);
  }
  ctx.putImageData(imageData, 0, 0);
}
function hexToRgba(hex, alpha) {
  var cleanHex = hex.replace('#', '');
  var r = parseInt(cleanHex.substring(0, 2), 16);
  var g = parseInt(cleanHex.substring(2, 4), 16);
  var b = parseInt(cleanHex.substring(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
function hexToRgbaArray(hex) {
  var cleanHex = hex.replace('#', '');
  return [
    parseInt(cleanHex.substring(0, 2), 16),
    parseInt(cleanHex.substring(2, 4), 16),
    parseInt(cleanHex.substring(4, 6), 16),
    255
  ];
}
function sampleCanvasColor(point) {
  var x = clamp(Math.floor(point.x), 0, BASE_WIDTH - 1);
  var y = clamp(Math.floor(point.y), 0, BASE_HEIGHT - 1);
  var px = ctx.getImageData(x, y, 1, 1).data;
  return { r: px[0], g: px[1], b: px[2], a: px[3] / 255 };
}
function blendColor(c1, c2, t) {
  return {
    r: Math.round(c1.r * (1 - t) + c2.r * t),
    g: Math.round(c1.g * (1 - t) + c2.g * t),
    b: Math.round(c1.b * (1 - t) + c2.b * t),
    a: c1.a * (1 - t) + c2.a * t
  };
}
function applySmearBlend(point, targetColor, strength) {
  var radius = Math.max(1, Math.floor(brushSize * 0.14));
  var s = clamp(strength, 0, 1);
  var left = clamp(Math.floor(point.x - radius), 0, BASE_WIDTH - 1);
  var right = clamp(Math.floor(point.x + radius), 0, BASE_WIDTH - 1);
  var top = clamp(Math.floor(point.y - radius), 0, BASE_HEIGHT - 1);
  var bottom = clamp(Math.floor(point.y + radius), 0, BASE_HEIGHT - 1);
  var width = right - left + 1;
  var height = bottom - top + 1;
  if (width <= 0 || height <= 0) return;
  var imageData = ctx.getImageData(left, top, width, height);
  var data = imageData.data;
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var dx = x + left - point.x;
      var dy = y + top - point.y;
      if ((dx * dx + dy * dy) > radius * radius) continue;
      var idx = (y * width + x) * 4;
      data[idx] = Math.round(data[idx] * (1 - s) + targetColor.r * s);
      data[idx + 1] = Math.round(data[idx + 1] * (1 - s) + targetColor.g * s);
      data[idx + 2] = Math.round(data[idx + 2] * (1 - s) + targetColor.b * s);
    }
  }
  ctx.putImageData(imageData, left, top);
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
  restoreFrame();
  pointerDown = true;
  withTry(function() { canvas.setPointerCapture(e.pointerId); });
  lastPoint = point;
  if (isShapeTool(brushMode)) {
    shapeStartPoint = point;
    shapeBaseImage = ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT);
    return;
  }
  if (brushMode === 'smear') {
    smearColor = sampleCanvasColor(point);
  }
  drawDot(point, true);
}
function onPointerMove(e) {
  if (!pointerDown || playing) return;
  var point = getPointFromEvent(e);
  if (isShapeTool(brushMode)) {
    if (shapeStartPoint && shapeBaseImage) {
      ctx.putImageData(shapeBaseImage, 0, 0);
      drawCurrentShape(shapeStartPoint, point);
      lastPoint = point;
    }
    return;
  }
  if (lastPoint) drawLine(lastPoint, point);
  lastPoint = point;
}
function onPointerUp(e) {
  if (!pointerDown) return;
  pointerDown = false;
  withTry(function() { canvas.releasePointerCapture(e.pointerId); });
  if (isShapeTool(brushMode)) {
    var endPoint = lastPoint || shapeStartPoint;
    if (shapeStartPoint && endPoint) {
      if (shapeBaseImage) ctx.putImageData(shapeBaseImage, 0, 0);
      drawCurrentShape(shapeStartPoint, endPoint);
    }
    shapeStartPoint = null;
    shapeBaseImage = null;
  }
  if (brushMode === 'smear') smearColor = null;
  commitFrame();
  lastPoint = null;
}
function renderTimeline() {
  frameDeck.innerHTML = '';
  var thumbCtx = thumbSource.getContext('2d');
  for (var i = 0; i < timeline.length; i++) {
    var card = document.createElement('div');
    card.className = i === activeFrame ? 'frame-card active' : 'frame-card';
    card.draggable = true;
    card.dataset.frameIndex = i;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'frame-selector-btn';
    btn.textContent = 'Frame ' + (i + 1);
    btn.dataset.index = i;
    var shell = document.createElement('div');
    shell.className = 'frame-thumb';
    var thumb = document.createElement('canvas');
    thumb.width = 128;
    thumb.height = 72;
    if (timeline[i] && timeline[i].imageData) {
      thumbCtx.clearRect(0, 0, thumbSource.width, thumbSource.height);
      thumbCtx.putImageData(timeline[i].imageData, 0, 0);
      thumb.getContext('2d').drawImage(thumbSource, 0, 0, 128, 72);
    }
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
    card.addEventListener('dragstart', onFrameDragStart);
    card.addEventListener('dragover', onFrameDragOver);
    card.addEventListener('dragend', onFrameDragEnd);
    card.addEventListener('drop', onFrameDrop);
    frameDeck.appendChild(card);
  }
  setText(frameCount, timeline.length);
}
function onFrameDeckClick(e) {
  var btn = e.target.closest('button');
  if (!btn || !frameDeck.contains(btn)) return;
  var idx = Number(btn.dataset.index);
  if (btn.dataset.action === 'delete') {
    if (timeline.length <= 1) return;
    timeline.splice(idx, 1);
    if (activeFrame > timeline.length - 1) activeFrame = timeline.length - 1;
    restoreFrame();
    renderTimeline();
    return;
  }
  selectFrame(idx);
}
function onFrameDragStart(e) {
  var card = e.target.closest('.frame-card');
  if (!card || card.dataset.frameIndex === undefined) return;
  draggedFrameIndex = Number(card.dataset.frameIndex);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', card.innerHTML);
  card.style.opacity = '0.5';
}
function onFrameDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function onFrameDragEnd() {
  var cards = frameDeck.querySelectorAll('.frame-card');
  cards.forEach(function(card) {
    card.style.opacity = '1';
    card.classList.remove('drag-over');
  });
  draggedFrameIndex = null;
}
function onFrameDrop(e) {
  e.preventDefault();
  var card = e.target.closest('.frame-card');
  if (!card || card.dataset.frameIndex === undefined || draggedFrameIndex === null) return;
  var targetIndex = Number(card.dataset.frameIndex);
  if (draggedFrameIndex === targetIndex) return;
  var draggedFrame = timeline[draggedFrameIndex];
  timeline.splice(draggedFrameIndex, 1);
  var insertIndex = draggedFrameIndex < targetIndex ? targetIndex - 1 : targetIndex;
  timeline.splice(insertIndex, 0, draggedFrame);
  if (activeFrame === draggedFrameIndex) activeFrame = insertIndex;
  else if (draggedFrameIndex < activeFrame && insertIndex >= activeFrame) activeFrame--;
  else if (draggedFrameIndex > activeFrame && insertIndex < activeFrame) activeFrame++;
  restoreFrame();
  renderTimeline();
}
function init() {
  setupCanvas();
  bindEvents();
  loadProjects();
  if (currentProjectId) {
    var proj = null;
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].id === currentProjectId) {
        proj = projects[i];
        break;
      }
    }
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
  if (onionToggle) onionToggle.checked = onionEnabled;
  if (onionOpacityRange) onionOpacityRange.value = Math.round(onionOpacity * 100);
  setOnionOpacity(onionOpacity);
  syncFPS(Number(fpsRange.value));
  setText(mudFrequencyLabel, mudSplashFrequency);
  setText(hairThicknessLabel, hairThickness);
  setText(hairFrequencyLabel, hairFrequency);
  requestAnimationFrame(function(t) { lastTime = t; loop(t); });
}
window.addEventListener('DOMContentLoaded', init);
