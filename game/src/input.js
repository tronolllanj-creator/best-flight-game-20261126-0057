export function createInput(canvas) {
  const keys = {};
  const mouse = { x: 0, y: 0, dx: 0, dy: 0, down: false };
  const clickQueue = [];
  let lastMouseX = 0;
  let lastMouseY = 0;

  function onKeyDown(e) {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys[e.code] = false;
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.dx = mouse.x - lastMouseX;
    mouse.dy = mouse.y - lastMouseY;
    lastMouseX = mouse.x;
    lastMouseY = mouse.y;
  }

  function onMouseDown(e) {
    if (e.button === 0) {
      mouse.down = true;
      clickQueue.push({ x: mouse.x, y: mouse.y, time: performance.now() });
    }
  }

  function onMouseUp(e) {
    if (e.button === 0) mouse.down = false;
  }

  function onContextMenu(e) { e.preventDefault(); }

  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', onContextMenu);

  function pollActions() {
    return {
      drop: keys['KeyE'] === true,
      confirm: keys['Enter'] === true,
      restart: keys['KeyR'] === true,
      pause: keys['KeyP'] === true || keys['Escape'] === true,
      mute: keys['KeyM'] === true,
      pitch: (keys['ArrowUp'] ? -1 : 0) + (keys['ArrowDown'] ? 1 : 0) +
             (keys['KeyW'] ? -1 : 0) + (keys['KeyS'] ? 1 : 0),
      roll: (keys['ArrowLeft'] ? -1 : 0) + (keys['ArrowRight'] ? 1 : 0) +
            (keys['KeyA'] ? -1 : 0) + (keys['KeyD'] ? 1 : 0),
      throttleUp: keys['KeyW'] === true,
      throttleDown: keys['KeyS'] === true,
      airbrake: keys['Space'] === true,
      mouseSteer: mouse.down ? { x: mouse.dx, y: mouse.dy } : null
    };
  }

  function clearClickQueue() {
    clickQueue.length = 0;
  }

  function destroy() {
    canvas.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('contextmenu', onContextMenu);
  }

  return {
    keys,
    mouse,
    clickQueue,
    pollActions,
    clearClickQueue,
    destroy,
    actions: {
      get drop() { return keys['KeyE'] === true; },
      get confirm() { return keys['Enter'] === true; },
      get restart() { return keys['KeyR'] === true; },
      get pause() { return keys['KeyP'] === true || keys['Escape'] === true; },
      get mute() { return keys['KeyM'] === true; }
    }
  };
}
