//==========
// Act as an expert senior developer and code refactoring specialist.

//I need you to refactor and shorten the attached code. Your goal is to compress it as much as possible, ensuring the final output is strictly under 700 lines of code.

//Please adhere to the following strict constraints:

//Target Audience/Skill Level: Keep the coding style at an introductory computer science level (CS 1 or CS 2). Use clear, straightforward logic. Avoid overly advanced patterns, complex external libraries, or hyper-abstract functional programming concepts that a second-year student wouldn't understand.

//Feature Parity: All current features, backend logic, and functionalities must remain 100% identical. Do not remove or alter how the program works.

//Visual Parity: The website must have absolutely zero visual changes. The UI, layout, styling, and responsiveness must look exactly the same as the original.

//How to Shorten: Achieve the line reduction by eliminating redundant code, combining duplicate logic into clean helper functions, removing unnecessary whitespace/comments, and optimizing basic control flows (like nested loops or redundant if/else statements).
//==========
const canvas = document.getElementById('studioCanvas');
const ctx = canvas.getContext('2d');

const onionCanvas = document.getElementById('onionCanvas');
const onionCtx = onionCanvas.getContext('2d');

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
const sizeRange = document.getElementById('sizeRange');
const opacityRange = document.getElementById('opacityRange');
const colorPicker = document.getElementById('colorPicker');
const colorLabel = document.getElementById('colorValue');
const brushName = document.getElementById('brushName');
const sizeLabel = document.getElementById('sizeValue');
const opacityLabel = document.getElementById('opacityValue');
const fpsLabel = document.getElementById('fpsValue');
const fpsDisplay = document.getElementById('fpsDisplay');
const onionToggle = document.getElementById('onionToggle');
const onionOpacityRange = document.getElementById('onionOpacityRange');
const onionOpacityLabel = document.getElementById('onionOpacityValue');
const frameCount = document.getElementById('frameCount');
const frameDeck = document.getElementById('frameDeck');
const brushButtons = document.querySelectorAll('.brush-button');
const swatches = document.querySelectorAll('.color-swatch');
const homeBtn = document.getElementById('homeBtn');
const saveGalleryBtn = document.getElementById('saveGalleryBtn');
const newAnimBtn = document.getElementById('newAnimBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

// ====== APP SETTINGS AND STATE (SIMPLE, EXPLICIT) ======
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

let devicePixelRatio = window.devicePixelRatio;
if (devicePixelRatio === undefined || devicePixelRatio === null) {
  devicePixelRatio = 1;
}

// ====== MODAL UI FUNCTIONS ======
let studioNameModalCallback = null;
let studioNameModalData = null;

function showStudioNameModal(title, defaultValue, callback, data) {
  var modal = document.getElementById('studioNameModal');
  var titleEl = document.getElementById('studioNameModalTitle');
  var input = document.getElementById('studioNameInput');
  var confirmBtn = document.getElementById('studioNameConfirm');
  var cancelBtn = document.getElementById('studioNameCancel');
  
  titleEl.textContent = title;
  input.value = defaultValue;
  studioNameModalCallback = callback;
  studioNameModalData = data;
  
  modal.style.display = 'flex';
  input.focus();
  input.select();

  function handleConfirm() {
    if (input.value.trim()) {
      studioNameModalCallback(input.value.trim(), studioNameModalData);
      modal.style.display = 'none';
    }
  }

  function handleCancel() {
    modal.style.display = 'none';
  }

  confirmBtn.onclick = handleConfirm;
  cancelBtn.onclick = handleCancel;
  input.onkeypress = function(e) {
    if (e.key === 'Enter') handleConfirm();
  };
  input.onkeydown = function(e) {
    if (e.key === 'Escape') handleCancel();
  };
}

let brushMode = 'technical';
let brushSize = 28;
let brushOpacity = 0.92;
let brushColor = '#000000';

const ONION_OPACITY_DEFAULT = 0.4;
let onionOpacity = ONION_OPACITY_DEFAULT;
let onionEnabled = true;

let timeline = [];
let activeFrame = 0;
let playing = false;

let pointerDown = false;
let lastPoint = null;

let undoStack = [];
let redoStack = [];

let lastTime = 0;

// We remove the dirty-rectangle optimization entirely.

const thumbSource = document.createElement('canvas');
thumbSource.width = BASE_WIDTH;
thumbSource.height = BASE_HEIGHT;

const onionSource = document.createElement('canvas');
const onionSourceCtx = onionSource.getContext('2d');
onionSource.width = BASE_WIDTH;
onionSource.height = BASE_HEIGHT;

let projects = [];
let currentProjectId = null;

// ----------------------
// Canvas setup
// ----------------------
function setupCanvas() {
  canvas.width = BASE_WIDTH;
  canvas.height = BASE_HEIGHT;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.zIndex = '1';

  if (canvas.parentElement) {
    canvas.parentElement.style.position = 'relative';
  }

  onionCanvas.width = BASE_WIDTH;
  onionCanvas.height = BASE_HEIGHT;
  onionCanvas.style.width = '100%';
  onionCanvas.style.height = '100%';
  onionCanvas.style.position = 'absolute';
  onionCanvas.style.top = '0';
  onionCanvas.style.left = '0';
  onionCanvas.style.zIndex = '0';
  onionCanvas.style.pointerEvents = 'none';

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  clearCanvas(false);
}

// ----------------------
// Event binding (explicit handlers)
// ----------------------
function bindEvents() {
  canvas.addEventListener('pointerdown', onPointerDown);

  canvas.addEventListener('dragover', function(e) {
    e.preventDefault();
  });
  canvas.addEventListener('drop', onCanvasDrop);

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  playPauseBtn.addEventListener('click', function() {
    setPlayback(!playing);
  });

  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  clearBtn.addEventListener('click', function() {
    clearCanvas(true);
  });
  addFrameBtn.addEventListener('click', addBlankFrame);
  removeFrameBtn.addEventListener('click', removeCurrentFrame);
  duplicateFrameBtn.addEventListener('click', duplicateFrame);

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleCanvasFullscreen);
  }

  prevFrameBtn.addEventListener('click', function() {
    selectFrame(activeFrame - 1);
  });
  nextFrameBtn.addEventListener('click', function() {
    selectFrame(activeFrame + 1);
  });

  fpsRange.addEventListener('input', function(e) {
    syncFPS(Number(e.target.value));
  });
  timelinePlayback.addEventListener('input', function(e) {
    syncFPS(Number(e.target.value));
  });

  onionToggle.addEventListener('change', function(e) {
    setOnionSkin(e.target.checked);
  });
  onionOpacityRange.addEventListener('input', function(e) {
    setOnionOpacity(Number(e.target.value) / 100);
  });

  fpsDownBtn.addEventListener('click', function() {
    var v = Number(fpsRange.value) - 1;
    if (v < 1) v = 1;
    syncFPS(v);
  });
  fpsUpBtn.addEventListener('click', function() {
    var v = Number(fpsRange.value) + 1;
    if (v > 60) v = 60;
    syncFPS(v);
  });

  sizeRange.addEventListener('input', function(e) {
    brushSize = Number(e.target.value);
    if (!brushSize || brushSize < 1) brushSize = 1;
    sizeLabel.textContent = brushSize;
  });

  opacityRange.addEventListener('input', function(e) {
    var v = Number(e.target.value);
    if (!v) v = 100;
    brushOpacity = v / 100;
    opacityLabel.textContent = Math.round(brushOpacity * 100);
  });

  colorPicker.addEventListener('input', function(e) {
    setColor(e.target.value);
  });

  frameDeck.addEventListener('click', onFrameDeckClick);

  for (var i = 0; i < brushButtons.length; i++) {
    var btn = brushButtons[i];
    btn.addEventListener('click', onBrushSelect);
  }

  for (var j = 0; j < swatches.length; j++) {
    var sw = swatches[j];
    sw.draggable = true;
    sw.addEventListener('click', onSwatchClick);
    sw.addEventListener('dragstart', onColorDragStart);
    sw.addEventListener('dragend', onColorDragEnd);
  }

  if (homeBtn) {
    homeBtn.addEventListener('click', function() {
      location.href = 'index.html';
    });
  }

  if (saveGalleryBtn) {
    saveGalleryBtn.addEventListener('click', saveToGallery);
  }

  if (newAnimBtn) {
    newAnimBtn.addEventListener('click', createMultiplePrompt);
  }

  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
  document.addEventListener('mozfullscreenchange', updateFullscreenButton);
  document.addEventListener('MSFullscreenChange', updateFullscreenButton);

  window.addEventListener('keydown', onGlobalShortcut);
}

// ----------------------
// Save / Load from localStorage (simple, safe)
// ----------------------
function loadProjects() {
  var raw = null;
  try {
    raw = localStorage.getItem('mason_projects');
  } catch (e) {
    raw = null;
  }

  if (raw) {
    try {
      projects = JSON.parse(raw);
    } catch (err) {
      projects = [];
    }
  } else {
    projects = [];
  }

  var cur = null;
  try {
    cur = localStorage.getItem('mason_current');
  } catch (e) {
    cur = null;
  }

  if (cur) {
    currentProjectId = cur;
  } else {
    currentProjectId = null;
  }
}

function saveProjects() {
  try {
    localStorage.setItem('mason_projects', JSON.stringify(projects));
  } catch (e) {
    // ignore storage errors for simplicity
  }

  if (currentProjectId) {
    try {
      localStorage.setItem('mason_current', currentProjectId);
    } catch (e) {
      // ignore
    }
  }
}

function saveToGallery() {
  var pid = currentProjectId;
  if (!pid) {
    pid = Date.now().toString();
  }

  showStudioNameModal(
    'Name Your Animation',
    'My Animation',
    function(animationName, projectId) {
      var project = {
        id: projectId,
        name: animationName,
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
        var frame = timeline[i];
        if (frame && frame.imageData) {
          tctx.clearRect(0, 0, thumbSource.width, thumbSource.height);
          tctx.putImageData(frame.imageData, 0, 0);
          t2.clearRect(0, 0, tmp.width, tmp.height);
          t2.drawImage(thumbSource, 0, 0, tmp.width, tmp.height);
          var dataUrl = tmp.toDataURL('image/png');
          project.frames.push(dataUrl);
          if (!project.thumb) {
            project.thumb = dataUrl;
          }
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
      alert('Saved to gallery');
    },
    pid
  );
}

function loadProject(id) {
  var project = null;
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].id === id) {
      project = projects[i];
      break;
    }
  }

  if (!project) {
    return;
  }

  var tmp = document.createElement('canvas');
  tmp.width = BASE_WIDTH;
  tmp.height = BASE_HEIGHT;
  var t2 = tmp.getContext('2d');

  timeline = [];
  var framesLoaded = 0;
  var totalFrames = project.frames.length;

  if (totalFrames === 0) {
    finishLoadingProject(id);
    return;
  }

  for (var j = 0; j < project.frames.length; j++) {
    (function(index) {
      var frameData = project.frames[index];
      var img = new Image();
      img.onload = function() {
        try {
          t2.clearRect(0, 0, tmp.width, tmp.height);
          t2.drawImage(img, 0, 0, tmp.width, tmp.height);
          var imageData = t2.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT);
          timeline[index] = { imageData: imageData };
        } catch (err) {
          timeline[index] = { imageData: ctx.createImageData(BASE_WIDTH, BASE_HEIGHT) };
        }

        framesLoaded = framesLoaded + 1;
        if (framesLoaded === totalFrames) {
          finishLoadingProject(id);
        }
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
  timeline = [];
  var blank = ctx.createImageData(BASE_WIDTH, BASE_HEIGHT);
  timeline.push({ imageData: blank });
  activeFrame = 0;
  restoreFrame();
  renderTimeline();

  currentProjectId = Date.now().toString();
  var project = {
    id: currentProjectId,
    name: name || ('Animation ' + currentProjectId),
    created: Date.now(),
    fps: Number(fpsRange.value) || 12,
    frames: []
  };
  projects.unshift(project);
  saveProjects();
}

function createMultiplePrompt() {
  var raw = prompt('How many new animations?', '3');
  var count = parseInt(raw, 10);
  if (!count || count < 1) {
    count = 0;
  }

  for (var i = 0; i < count; i++) {
    createNewProject('Animation ' + (Date.now() + i));
  }

  if (count > 0) {
    alert('Created ' + count + ' animations');
  }
}

// ----------------------
// Brush and color controls
// ----------------------
function onBrushSelect(e) {
  var ds = e.currentTarget.dataset.brush;
  if (!ds) {
    brushMode = 'technical';
  } else {
    brushMode = ds;
  }

  var t = e.currentTarget.textContent;
  if (t) {
    t = t.trim();
    var parts = t.split('\n');
    brushName.textContent = parts[0];
  }

  for (var i = 0; i < brushButtons.length; i++) {
    var btn = brushButtons[i];
    var active = false;
    if (btn.dataset.brush === brushMode) {
      active = true;
    }
    if (active) {
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-checked', 'false');
    }
  }
}

function setColor(hex) {
  brushColor = hex;
  colorPicker.value = hex;
  colorLabel.textContent = hex;
  updateSwatches();
}

function setOnionSkin(enabled) {
  if (enabled) {
    onionEnabled = true;
  } else {
    onionEnabled = false;
  }
  if (onionToggle) {
    onionToggle.checked = onionEnabled;
  }
  restoreFrame();
}

function setOnionOpacity(value) {
  var v = value;
  if (v < 0.1) v = 0.1;
  if (v > 1) v = 1;
  onionOpacity = v;
  if (onionOpacityLabel) {
    onionOpacityLabel.textContent = Math.round(onionOpacity * 100);
  }
  restoreFrame();
}

function onSwatchClick(e) {
  var c = e.currentTarget.dataset.color;
  setColor(c);
}

function onColorDragStart(e) {
  var c = e.currentTarget.dataset.color;
  try {
    e.dataTransfer.setData('text/plain', c);
    e.dataTransfer.effectAllowed = 'copy';
  } catch (err) {
    // ignore
  }
  e.currentTarget.classList.add('dragging');
}

function onColorDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
}

function updateSwatches() {
  for (var i = 0; i < swatches.length; i++) {
    var sw = swatches[i];
    if (sw.dataset.color === brushColor) {
      sw.classList.add('active');
    } else {
      sw.classList.remove('active');
    }
  }
}

function onGlobalShortcut(e) {
  var target = e.target;
  if (target) {
    var tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
  }

  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    toggleCanvasFullscreen();
    return;
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    selectFrame(activeFrame + 1);
    return;
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    selectFrame(activeFrame - 1);
    return;
  }
}

function toggleCanvasFullscreen() {
  var current = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
  if (current) {
    exitFullscreen();
    return;
  }

  var target = canvas.parentElement || canvas;
  if (target.requestFullscreen) {
    target.requestFullscreen();
  } else if (target.webkitRequestFullscreen) {
    target.webkitRequestFullscreen();
  } else if (target.mozRequestFullScreen) {
    target.mozRequestFullScreen();
  } else if (target.msRequestFullscreen) {
    target.msRequestFullscreen();
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}

function updateFullscreenButton() {
  var current = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
  if (!fullscreenBtn) return;
  if (current) {
    fullscreenBtn.textContent = 'Exit Fullscreen';
  } else {
    fullscreenBtn.textContent = 'Fullscreen';
  }
}

function onCanvasDrop(e) {
  e.preventDefault();
  var color = '';
  try {
    color = e.dataTransfer.getData('text/plain');
  } catch (err) {
    color = '';
  }

  if (!color) {
    return;
  }

  saveUndoState();
  fillArea(getPointFromEvent(e), color);
  commitFrame();
}

function syncFPS(v) {
  var f = v;
  if (!f || isNaN(f)) {
    f = 12;
  }
  if (f < 1) f = 1;
  if (f > 60) f = 60;

  fpsRange.value = f;
  timelinePlayback.value = f;
  fpsLabel.textContent = f;
  fpsDisplay.textContent = f;
}

function getPointFromEvent(e) {
  var r = canvas.getBoundingClientRect();
  var x = e.clientX - r.left;
  var y = e.clientY - r.top;
  var scaledX = (x * BASE_WIDTH) / r.width;
  var scaledY = (y * BASE_HEIGHT) / r.height;
  return { x: scaledX, y: scaledY };
}

// ----------------------
// UNDO, REDO, & TIMELINE MANAGEMENT (simple full-frame copies)
// ----------------------
function cloneImageData(imageData) {
  var w = imageData.width;
  var h = imageData.height;
  var src = imageData.data;
  var dst = new Uint8ClampedArray(w * h * 4);
  for (var i = 0; i < dst.length; i++) {
    dst[i] = src[i];
  }
  return new ImageData(dst, w, h);
}

function saveUndoState() {
  var currentData = null;
  if (timeline[activeFrame] && timeline[activeFrame].imageData) {
    currentData = cloneImageData(timeline[activeFrame].imageData);
  } else {
    currentData = ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT);
  }

  undoStack.push({ frame: activeFrame, imageData: currentData });
  redoStack = [];
}

function undo() {
  if (undoStack.length === 0) {
    return;
  }

  var currentData = null;
  if (timeline[activeFrame] && timeline[activeFrame].imageData) {
    currentData = cloneImageData(timeline[activeFrame].imageData);
  } else {
    currentData = ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT);
  }

  redoStack.push({ frame: activeFrame, imageData: currentData });

  var state = undoStack.pop();
  activeFrame = state.frame;
  ctx.putImageData(state.imageData, 0, 0);
  commitFrame();
}

function redo() {
  if (redoStack.length === 0) {
    return;
  }

  var currentData = null;
  if (timeline[activeFrame] && timeline[activeFrame].imageData) {
    currentData = cloneImageData(timeline[activeFrame].imageData);
  } else {
    currentData = ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT);
  }

  undoStack.push({ frame: activeFrame, imageData: currentData });

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

// Commit the entire canvas as the frame image. No dirty rects.
function commitFrame() {
  var displayImage = ctx.getImageData(0, 0, BASE_WIDTH, BASE_HEIGHT);
  var copy = cloneImageData(displayImage);

  timeline[activeFrame] = { imageData: copy };
  renderTimeline();
}

function restoreFrame() {
  var frame = timeline[activeFrame];
  if (!frame) {
    return;
  }

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

  if (frame.imageData) {
    ctx.putImageData(frame.imageData, 0, 0);
  }
}

function addBlankFrame() {
  var blank = ctx.createImageData(BASE_WIDTH, BASE_HEIGHT);
  timeline.splice(activeFrame + 1, 0, { imageData: blank });
  activeFrame = activeFrame + 1;
  restoreFrame();
  renderTimeline();
}

function duplicateFrame() {
  var frame = timeline[activeFrame];
  if (!frame || !frame.imageData) {
    return;
  }

  var copy = cloneImageData(frame.imageData);
  timeline.splice(activeFrame + 1, 0, { imageData: copy });
  activeFrame = activeFrame + 1;
  restoreFrame();
  renderTimeline();
}

function removeCurrentFrame() {
  if (timeline.length <= 1) {
    return;
  }
  timeline.splice(activeFrame, 1);
  activeFrame = Math.max(0, activeFrame - 1);
  restoreFrame();
  renderTimeline();
}

function selectFrame(index) {
  if (index < 0) index = 0;
  if (index > timeline.length - 1) index = timeline.length - 1;
  if (index === activeFrame) {
    return;
  }
  commitFrame();
  activeFrame = index;
  restoreFrame();
  renderTimeline();
}

// ----------------------
// Playback controls
// ----------------------
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
  var fpsValue = Math.round(1000 / delta);
  fpsCounter.textContent = 'FPS ' + fpsValue;

  if (playing) {
    var targetInterval = 1000 / Number(fpsRange.value);
    if (delta >= targetInterval) {
      lastTime = timestamp;
      activeFrame = activeFrame + 1;
      if (activeFrame >= timeline.length) {
        activeFrame = 0;
      }
      restoreFrame();
      renderTimeline();
    }
  } else {
    lastTime = timestamp;
  }

  requestAnimationFrame(loop);
}

// ----------------------
// Drawing primitives
// ----------------------
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
    var alpha = brushOpacity * 0.28;
    if (alpha < 0.12) alpha = 0.12;
    ctx.globalAlpha = alpha;

    for (var i = 0; i < 4; i++) {
      var jit = brushSize * 0.35;
      var rx = Math.random() - 0.5;
      var ry = Math.random() - 0.5;
      var x = point.x + rx * jit;
      var y = point.y + ry * jit;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.1, y + 0.1);
      ctx.stroke();
    }

    if (isDown) {
      ctx.globalAlpha = ctx.globalAlpha * 0.5;
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
  var steps = Math.ceil(dist / 2);
  if (steps < 2) steps = 2;

  for (var i = 0; i <= steps; i++) {
    var t = i / steps;
    var x = start.x + dx * t;
    var y = start.y + dy * t;
    drawDot({ x: x, y: y }, false);
  }
}

function fillArea(point, fillColor) {
  var imageData = null;
  if (timeline[activeFrame] && timeline[activeFrame].imageData) {
    imageData = cloneImageData(timeline[activeFrame].imageData);
  } else {
    imageData = ctx.createImageData(BASE_WIDTH, BASE_HEIGHT);
  }

  var pixels = imageData.data;
  var x = Math.floor(point.x);
  var y = Math.floor(point.y);
  var width = BASE_WIDTH;

  if (x < 0 || x >= width || y < 0 || y >= BASE_HEIGHT) {
    return;
  }

  var idx = (y * width + x) * 4;
  var tr = pixels[idx];
  var tg = pixels[idx + 1];
  var tb = pixels[idx + 2];
  var ta = pixels[idx + 3];

  var fill = hexToRgbaArray(fillColor);
  if (tr === fill[0] && tg === fill[1] && tb === fill[2] && ta === fill[3]) {
    return;
  }

  var stack = [];
  stack.push(x);
  stack.push(y);

  while (stack.length > 0) {
    var yy = stack.pop();
    var xx = stack.pop();

    if (xx < 0 || xx >= width || yy < 0 || yy >= BASE_HEIGHT) {
      continue;
    }

    var i2 = (yy * width + xx) * 4;
    if (pixels[i2] !== tr || pixels[i2 + 1] !== tg || pixels[i2 + 2] !== tb || pixels[i2 + 3] !== ta) {
      continue;
    }

    pixels[i2] = fill[0];
    pixels[i2 + 1] = fill[1];
    pixels[i2 + 2] = fill[2];
    pixels[i2 + 3] = fill[3];

    stack.push(xx + 1);
    stack.push(yy);
    stack.push(xx - 1);
    stack.push(yy);
    stack.push(xx);
    stack.push(yy + 1);
    stack.push(xx);
    stack.push(yy - 1);
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
  var r = parseInt(cleanHex.substring(0, 2), 16);
  var g = parseInt(cleanHex.substring(2, 4), 16);
  var b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b, 255];
}

// ----------------------
// MOUSE / POINTER EVENT HANDLERS
// ----------------------
function onPointerDown(e) {
  if (playing) {
    return;
  }

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
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch (err) {
    // ignore
  }
  lastPoint = point;
  drawDot(point, true);
}

function onPointerMove(e) {
  if (!pointerDown) {
    return;
  }
  if (playing) {
    return;
  }
  var point = getPointFromEvent(e);
  if (lastPoint) {
    drawLine(lastPoint, point);
  }
  lastPoint = point;
}

function onPointerUp(e) {
  if (!pointerDown) {
    return;
  }
  pointerDown = false;
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch (err) {
    // ignore
  }
  commitFrame();
  lastPoint = null;
}

// ----------------------
// TIMELINE UI RENDERING
// ----------------------
function renderTimeline() {
  frameDeck.innerHTML = '';
  var thumbCtx = thumbSource.getContext('2d');

  for (var i = 0; i < timeline.length; i++) {
    var card = document.createElement('div');
    card.className = 'frame-card';
    card.draggable = true;
    card.dataset.frameIndex = i;
    if (i === activeFrame) {
      card.className = card.className + ' active';
    }

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

  frameCount.textContent = timeline.length;
}

// Frame drag-and-drop
let draggedFrameIndex = null;

function onFrameDeckClick(e) {
  var btn = e.target.closest('button');
  if (!btn) {
    return;
  }
  if (!frameDeck.contains(btn)) {
    return;
  }

  var idx = Number(btn.dataset.index);
  var action = btn.dataset.action;
  if (action === 'delete') {
    if (timeline.length <= 1) {
      return;
    }
    timeline.splice(idx, 1);
    if (activeFrame > timeline.length - 1) {
      activeFrame = timeline.length - 1;
    }
    restoreFrame();
    renderTimeline();
    return;
  }

  selectFrame(idx);
}

function onFrameDragStart(e) {
  var card = e.target.closest('.frame-card');
  if (card && card.dataset.frameIndex !== undefined) {
    draggedFrameIndex = Number(card.dataset.frameIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', card.innerHTML);
    card.style.opacity = '0.5';
  }
}

function onFrameDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function onFrameDragEnd(e) {
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
  if (card && card.dataset.frameIndex !== undefined && draggedFrameIndex !== null) {
    var targetIndex = Number(card.dataset.frameIndex);
    if (draggedFrameIndex !== targetIndex) {
      var draggedFrame = timeline[draggedFrameIndex];
      timeline.splice(draggedFrameIndex, 1);
      var insertIndex = draggedFrameIndex < targetIndex ? targetIndex - 1 : targetIndex;
      timeline.splice(insertIndex, 0, draggedFrame);
      
      if (activeFrame === draggedFrameIndex) {
        activeFrame = insertIndex;
      } else if (draggedFrameIndex < activeFrame && insertIndex >= activeFrame) {
        activeFrame = activeFrame - 1;
      } else if (draggedFrameIndex > activeFrame && insertIndex < activeFrame) {
        activeFrame = activeFrame + 1;
      }
      
      restoreFrame();
      renderTimeline();
    }
  }
}

// ----------------------
// APPLICATION INITIALIZATION
// ----------------------
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

  requestAnimationFrame(function(t) {
    lastTime = t;
    loop(t);
  });
}

window.addEventListener('DOMContentLoaded', init);
