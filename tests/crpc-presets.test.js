const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function makeElement(id, gl) {
  const element = {
    id,
    value: '',
    textContent: '',
    style: {},
    options: [],
    files: [],
    clientWidth: id === 'gamutCanvas' ? 1280 : 320,
    clientHeight: id === 'gamutCanvas' ? 720 : 160,
    width: 0,
    height: 0,
    listeners: {},
    classList: {
      values: new Set(),
      add(name) { this.values.add(name); },
      remove(name) { this.values.delete(name); },
      toggle(name, force) { if (force) this.values.add(name); else this.values.delete(name); }
    },
    appendChild(child) { this.options.push(child); return child; },
    querySelector(selector) {
      const match = selector.match(/option\[value="(.+)"\]/);
      return match ? this.options.find((option) => option.value === match[1]) || null : null;
    },
    addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); },
    setAttribute(name, value) { this[name] = value; },
    setPointerCapture() {},
    getContext(type) { return type === 'webgl' ? gl : null; }
  };
  Object.defineProperty(element, 'innerHTML', {
    get() { return ''; },
    set() { this.options = []; }
  });
  return element;
}

function makeGl() {
  return {
    ARRAY_BUFFER: 0x8892, ELEMENT_ARRAY_BUFFER: 0x8893, STATIC_DRAW: 0x88E4, TRIANGLES: 0x0004, LINES: 0x0001, POINTS: 0x0000,
    UNSIGNED_INT: 0x1405, UNSIGNED_SHORT: 0x1403, FLOAT: 0x1406, VERTEX_SHADER: 0x8B31, FRAGMENT_SHADER: 0x8B30,
    LINK_STATUS: 0x8B82, COMPILE_STATUS: 0x8B81, COLOR_BUFFER_BIT: 0x4000, DEPTH_BUFFER_BIT: 0x0100, DEPTH_TEST: 0x0B71, BLEND: 0x0BE2,
    SRC_ALPHA: 0x0302, ONE_MINUS_SRC_ALPHA: 0x0303,
    createBuffer: () => ({}), createShader: () => ({}), shaderSource() {}, compileShader() {}, getShaderParameter: () => true, getShaderInfoLog: () => '',
    createProgram: () => ({}), attachShader() {}, linkProgram() {}, getProgramParameter: () => true, getProgramInfoLog: () => '',
    bindBuffer() {}, bufferData() {}, useProgram() {}, getAttribLocation: () => 0, enableVertexAttribArray() {}, vertexAttribPointer() {},
    getUniformLocation: () => ({}), uniformMatrix4fv() {}, uniform1f() {}, uniform3fv() {}, viewport() {}, clearColor() {}, clear() {}, enable() {}, blendFunc() {}, depthMask() {}, drawElements() {}, drawArrays() {}
  };
}

async function loadApp() {
  const gl = makeGl();
  const ids = ['gamutCanvas','presetSelect1','presetSelect2','profileInput1','profileInput2','opacityRange1','opacityRange2','solidToggle1','solidToggle2','solidColor1','solidColor2','detailRange','surfaceMode','pointsMode','status','profileName1','profileName2','profileMeta1','profileMeta2','profileVolume1','profileVolume2','profileReadout2','profileSummary','lRange','aRange','bRange','labelL','labelPosA','labelNegA','labelPosB','labelNegB'];
  const elements = Object.fromEntries(ids.map((id) => [id, makeElement(id, gl)]));
  elements.detailRange.value = '9';
  const context = {
    console,
    document: {
      getElementById: (id) => elements[id] || (elements[id] = makeElement(id, gl)),
      createElement: () => makeElement('option', gl)
    },
    window: { devicePixelRatio: 1, addEventListener() {}, clearTimeout() {}, setTimeout() { return 0; } },
    requestAnimationFrame() {}, setTimeout() { return 0; }, clearTimeout() {},
    fetch: async (url) => {
      const clean = String(url).replace(/^\.\//, '');
      const bytes = fs.readFileSync(path.join(root, clean));
      return {
        ok: true,
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      };
    },
    DataView, Float32Array, Uint16Array, Uint32Array, Infinity, Math, Array, Object, String, Number, Boolean, Error, RegExp, Set, Promise, isFinite
  };
  context.globalThis = context;
  const code = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\nglobalThis.__test = { profileSlots, presetSelects, buildAndRender, parseICCProfile, presets };';
  vm.runInNewContext(code, context, { filename: 'app.js' });
  await new Promise((resolve) => setImmediate(resolve));
  return { elements, app: context.__test };
}

(async () => {
  const expectedFiles = Array.from({ length: 7 }, (_, index) => path.join(root, 'profiles', `CGATS21_CRPC${index + 1}.icc`));
  for (const file of expectedFiles) assert.ok(fs.existsSync(file), `${path.basename(file)} should be bundled`);

  const { elements, app } = await loadApp();
  assert.strictEqual(elements.presetSelect1.value, 'crpc6');
  assert.deepStrictEqual(elements.presetSelect1.options.slice(0, 7).map((option) => option.textContent), [
    'CGATS21 CRPC-1', 'CGATS21 CRPC-2', 'CGATS21 CRPC-3', 'CGATS21 CRPC-4', 'CGATS21 CRPC-5', 'CGATS21 CRPC-6', 'CGATS21 CRPC-7'
  ]);
  assert.match(elements.profileMeta1.textContent, /ICC/i);
  assert.strictEqual(elements.profileVolume1.textContent, 'Volume: 389,023 cubic Lab units');

  elements.presetSelect2.value = 'crpc7';
  await elements.presetSelect2.listeners.change[0]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(elements.profileMeta2.textContent, /ICC/i);
  assert.strictEqual(elements.profileVolume2.textContent, 'Volume: 525,551 cubic Lab units');
  assert.match(elements.profileSummary.textContent, /compared with CGATS21 CRPC-7/);

  assert.strictEqual(app.presets.crpc1.iccPath, './profiles/CGATS21_CRPC1.icc');
  assert.strictEqual(app.presets.crpc6.iccPath, './profiles/CGATS21_CRPC6.icc');
  for (let index = 1; index <= 7; index++) {
    elements.presetSelect1.value = `crpc${index}`;
    await elements.presetSelect1.listeners.change[0]();
    assert.match(elements.profileMeta1.textContent, /ICC/i, `CRPC-${index} should use its bundled ICC`);
    assert.match(elements.profileVolume1.textContent, /cubic Lab units/, `CRPC-${index} should show volume`);
  }

  assert.strictEqual(elements.opacityRange1.value, '0.5');
  elements.opacityRange1.value = '0.25';
  elements.opacityRange1.listeners.input[0]();
  assert.strictEqual(app.profileSlots[0].opacity, 0.25);
  elements.solidToggle2.checked = true;
  elements.solidToggle2.listeners.change[0]();
  assert.strictEqual(app.profileSlots[1].solid, true);
  elements.solidColor2.value = '#ff33aa';
  elements.solidColor2.listeners.input[0]();
  assert.deepStrictEqual(Array.from(app.profileSlots[1].solidColor), [1, 0.2, 0.6666666666666666]);

  const nColorProfile = app.parseICCProfile(createNColorICC(), 'Synthetic 5CLR.icc');
  assert.strictEqual(nColorProfile.channels, 5);
  assert.strictEqual(nColorProfile.space, '5CLR');
  assert.match(nColorProfile.meta, /5CLR/);
  assert.deepStrictEqual(Array.from(nColorProfile.transform([0, 0, 0, 0, 0]).map(Math.round)), [0, -128, -128]);
  assert.deepStrictEqual(Array.from(nColorProfile.transform([1, 1, 1, 1, 1]).map(Math.round)), [100, 127, 127]);
  app.profileSlots[1].profile = nColorProfile;
  await app.buildAndRender();
  assert.ok(app.profileSlots[1].geometry.pointCount > 0);
  assert.ok(app.profileSlots[1].geometry.indexCount > 0);
  console.log('CRPC preset tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

function createNColorICC() {
  const inputChannels = 5;
  const outputChannels = 3;
  const gridPoints = 2;
  const inputTablesBytes = inputChannels * 256;
  const clutBytes = gridPoints ** inputChannels * outputChannels;
  const outputTablesBytes = outputChannels * 256;
  const tagSize = 48 + inputTablesBytes + clutBytes + outputTablesBytes;
  const totalSize = 132 + 12 + tagSize;
  const bytes = Buffer.alloc(totalSize);
  bytes.writeUInt32BE(totalSize, 0);
  bytes.write('mntr', 12, 'ascii');
  bytes.write('5CLR', 16, 'ascii');
  bytes.write('Lab ', 20, 'ascii');
  bytes.write('acsp', 36, 'ascii');
  bytes.writeUInt32BE(1, 128);
  bytes.write('A2B0', 132, 'ascii');
  bytes.writeUInt32BE(144, 136);
  bytes.writeUInt32BE(tagSize, 140);
  bytes.write('mft1', 144, 'ascii');
  bytes[152] = inputChannels;
  bytes[153] = outputChannels;
  bytes[154] = gridPoints;
  let cursor = 144 + 48;
  for (let channel = 0; channel < inputChannels; channel++) {
    for (let i = 0; i < 256; i++) bytes[cursor++] = i;
  }
  for (let entry = 0; entry < gridPoints ** inputChannels; entry++) {
    const value = Math.round((entry / (gridPoints ** inputChannels - 1)) * 255);
    bytes[cursor++] = value;
    bytes[cursor++] = value;
    bytes[cursor++] = value;
  }
  for (let channel = 0; channel < outputChannels; channel++) {
    for (let i = 0; i < 256; i++) bytes[cursor++] = i;
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
