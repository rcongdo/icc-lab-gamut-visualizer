"use strict";

const canvas = document.getElementById("gamutCanvas");
const presetSelects = [
  document.getElementById("presetSelect1"),
  document.getElementById("presetSelect2")
];
const profileInputs = [
  document.getElementById("profileInput1"),
  document.getElementById("profileInput2")
];
const opacityRanges = [
  document.getElementById("opacityRange1"),
  document.getElementById("opacityRange2")
];
const solidToggles = [
  document.getElementById("solidToggle1"),
  document.getElementById("solidToggle2")
];
const solidColorInputs = [
  document.getElementById("solidColor1"),
  document.getElementById("solidColor2")
];
const detailRange = document.getElementById("detailRange");
const surfaceMode = document.getElementById("surfaceMode");
const pointsMode = document.getElementById("pointsMode");
const statusEl = document.getElementById("status");
const profileNameEls = [
  document.getElementById("profileName1"),
  document.getElementById("profileName2")
];
const profileMetaEls = [
  document.getElementById("profileMeta1"),
  document.getElementById("profileMeta2")
];
const profileVolumeEls = [
  document.getElementById("profileVolume1"),
  document.getElementById("profileVolume2")
];
const profileReadout2 = document.getElementById("profileReadout2");
const profileSummaryEl = document.getElementById("profileSummary");
const lRangeEl = document.getElementById("lRange");
const aRangeEl = document.getElementById("aRange");
const bRangeEl = document.getElementById("bRange");
const axisLabelEls = {
  l: document.getElementById("labelL"),
  posA: document.getElementById("labelPosA"),
  negA: document.getElementById("labelNegA"),
  posB: document.getElementById("labelPosB"),
  negB: document.getElementById("labelNegB")
};

const D50 = [0.96422, 1, 0.82521];
const LAB_AXIS_SCALE = 120;
const L_AXIS_MIN = (0 - 50) / LAB_AXIS_SCALE;
const L_AXIS_MAX = (100 - 50) / LAB_AXIS_SCALE;
const CRPC_REFERENCE_DATA = {
  1: { paper: [85, 1, 5], c: [59, -24, -26], m: [56, 48, 0], y: [80, -2, 60], k: [37, 1, 4], volume: 84280 },
  2: { paper: [87, 0, 3], c: [57, -28, -34], m: [52, 58, -2], y: [82, -2, 72], k: [30, 1, 2], volume: 151311 },
  3: { paper: [95, 1, -4], c: [60, -26, -44], m: [56, 61, -2], y: [89, -3, 76], k: [32, 1, 1], volume: 165764 },
  4: { paper: [89, 0, 3], c: [55, -36, -38], m: [47, 66, -3], y: [83, -3, 83], k: [23, 1, 2], volume: 253711 },
  5: { paper: [92, 0, 0], c: [57, -37, -44], m: [48, 71, -4], y: [87, -4, 88], k: [19, 0, 1], volume: 331416 },
  6: { paper: [95, 1, -4], c: [56, -37, -50], m: [48, 75, -4], y: [89, -4, 93], k: [16, 0, 0], volume: 389023 },
  7: { paper: [97, 1, -4], c: [54, -42, -54], m: [47, 78, -10], y: [90, -4, 103], k: [14, 0, 0], volume: 525551 }
};
const presets = {
  "none": {
    name: "None",
    meta: "Comparison disabled",
    space: "NONE",
    channels: 0,
    disabled: true
  },
  "crpc1": createCrpcReferenceProfile(1),
  "crpc2": createCrpcReferenceProfile(2),
  "crpc3": createCrpcReferenceProfile(3),
  "crpc4": createCrpcReferenceProfile(4),
  "crpc5": createCrpcReferenceProfile(5),
  "crpc6": createCrpcReferenceProfile(6),
  "crpc7": createCrpcReferenceProfile(7),
  "srgb": {
    name: "sRGB IEC61966-2.1",
    meta: "RGB matrix/TRC profile",
    space: "RGB",
    channels: 3,
    matrix: [
      [0.4360747, 0.3850649, 0.1430804],
      [0.2225045, 0.7168786, 0.0606169],
      [0.0139322, 0.0971045, 0.7141733]
    ],
    trc: [srgbEotf, srgbEotf, srgbEotf]
  },
  "display-p3": {
    name: "Display P3",
    meta: "D65 primaries adapted to D50",
    space: "RGB",
    channels: 3,
    matrix: [
      [0.515074, 0.291970, 0.157100],
      [0.241170, 0.692250, 0.066580],
      [-0.001050, 0.041880, 0.784070]
    ],
    trc: [srgbEotf, srgbEotf, srgbEotf]
  },
  "adobe-rgb": {
    name: "Adobe RGB (1998)",
    meta: "Gamma 2.2 D65 profile adapted to D50",
    space: "RGB",
    channels: 3,
    matrix: [
      [0.6097559, 0.2052401, 0.1492240],
      [0.3111242, 0.6256560, 0.0632197],
      [0.0194811, 0.0608902, 0.7448387]
    ],
    trc: [gammaEotf(2.2), gammaEotf(2.2), gammaEotf(2.2)]
  },
  "rec2020": {
    name: "Rec. 2020",
    meta: "Wide gamut BT.2020 adapted to D50",
    space: "RGB",
    channels: 3,
    matrix: [
      [0.673459, 0.165661, 0.125100],
      [0.279033, 0.675338, 0.045628],
      [-0.001932, 0.029979, 0.797162]
    ],
    trc: [gammaEotf(2.4), gammaEotf(2.4), gammaEotf(2.4)]
  }
};

const presetOrder = ["crpc1", "crpc2", "crpc3", "crpc4", "crpc5", "crpc6", "crpc7", "srgb", "display-p3", "adobe-rgb", "rec2020", "none"];
let profileSlots;
let renderMode = "surface";
let rotationX = -0.32;
let rotationY = -0.72;
let zoom = 1.16;
let needsDraw = true;
let drag = null;

const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
if (!gl) {
  showStatus("WebGL is not available in this browser.", true);
  throw new Error("WebGL unavailable");
}

const program = createProgram(gl, `
  attribute vec3 aPosition;
  attribute vec3 aColor;
  uniform mat4 uMatrix;
  uniform float uPointSize;
  varying vec3 vColor;

  void main() {
    gl_Position = uMatrix * vec4(aPosition, 1.0);
    gl_PointSize = uPointSize;
    vColor = aColor;
  }
`, `
  precision mediump float;
  varying vec3 vColor;
  uniform float uAlpha;
  uniform float uUseSolid;
  uniform float uDrawPoints;
  uniform vec3 uSolidColor;

  void main() {
    vec2 p = gl_PointCoord - vec2(0.5);
    if (uDrawPoints > 0.5 && uAlpha > 0.98 && dot(p, p) > 0.25) discard;
    gl_FragColor = vec4(mix(vColor, uSolidColor, uUseSolid), uAlpha);
  }
`);

const lineProgram = createProgram(gl, `
  attribute vec3 aPosition;
  attribute vec3 aColor;
  uniform mat4 uMatrix;
  varying vec3 vColor;

  void main() {
    gl_Position = uMatrix * vec4(aPosition, 1.0);
    vColor = aColor;
  }
`, `
  precision mediump float;
  varying vec3 vColor;

  void main() {
    gl_FragColor = vec4(vColor, 1.0);
  }
`);

const axisBuffers = {
  lines: gl.createBuffer(),
  lineColors: gl.createBuffer()
};

profileSlots = [
  createProfileSlot(presets.crpc6, "#42c7b8"),
  createProfileSlot(presets.none, "#e4b84b")
];
populateProfileSelects();
syncVisualControls();
uploadAxisGeometry();
buildAndRender();
requestAnimationFrame(drawLoop);

presetSelects.forEach((select, index) => {
  select.addEventListener("change", () => {
    profileSlots[index].profile = presets[select.value] || profileSlots[index].uploadedProfile || presets.none;
    profileInputs[index].value = "";
    buildAndRender();
  });
});

profileInputs.forEach((input, index) => {
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      profileSlots[index].profile = parseICCProfile(buffer, file.name);
      profileSlots[index].uploadedProfile = profileSlots[index].profile;
      setUploadedOption(index, profileSlots[index].profile.name);
      buildAndRender();
      showStatus(`Loaded ${profileSlots[index].profile.name}.`);
    } catch (error) {
      showStatus(error.message || "Could not read this ICC profile.", true);
    }
  });
});

detailRange.addEventListener("input", () => buildAndRender());
opacityRanges.forEach((input, index) => {
  input.addEventListener("input", () => {
    profileSlots[index].opacity = Number(input.value);
    needsDraw = true;
  });
});
solidToggles.forEach((input, index) => {
  input.addEventListener("change", () => {
    profileSlots[index].solid = input.checked;
    needsDraw = true;
  });
});
solidColorInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    profileSlots[index].solidColor = hexToRgb(input.value);
    needsDraw = true;
  });
});
surfaceMode.addEventListener("click", () => setRenderMode("surface"));
pointsMode.addEventListener("click", () => setRenderMode("points"));

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  drag = { x: event.clientX, y: event.clientY, rx: rotationX, ry: rotationY };
});

canvas.addEventListener("pointermove", (event) => {
  if (!drag) return;
  rotationY = drag.ry + (event.clientX - drag.x) * 0.008;
  rotationX = clamp(drag.rx + (event.clientY - drag.y) * 0.008, -1.35, 1.35);
  needsDraw = true;
});

canvas.addEventListener("pointerup", () => {
  drag = null;
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoom = clamp(zoom * Math.exp(-event.deltaY * 0.001), 0.7, 4.2);
  needsDraw = true;
}, { passive: false });

window.addEventListener("resize", () => {
  needsDraw = true;
});

function setRenderMode(mode) {
  renderMode = mode;
  surfaceMode.classList.toggle("active", mode === "surface");
  pointsMode.classList.toggle("active", mode === "points");
  surfaceMode.setAttribute("aria-pressed", String(mode === "surface"));
  pointsMode.setAttribute("aria-pressed", String(mode === "points"));
  needsDraw = true;
}

function buildAndRender() {
  return rebuildProfiles();
}

async function rebuildProfiles() {
  const size = Number(detailRange.value);
  const token = Symbol("build");
  buildAndRender.token = token;
  await Promise.all(profileSlots.map((slot) => resolveSlotProfile(slot)));
  if (buildAndRender.token !== token) return;
  profileSlots.forEach((slot, index) => {
    slot.geometry = slot.renderProfile.disabled ? null : sampleProfile(slot.renderProfile, size);
    uploadGeometry(slot);
    updateProfileText(slot, index);
  });
  updateCombinedRanges();
  updateProfileSummary();
  needsDraw = true;
}

function sampleProfile(profile, size) {
  return profile.channels === 3 ? sampleRgbProfile(profile, size) : sampleDeviceProfile(profile, size);
}

function sampleRgbProfile(profile, size) {
  const vertices = [];
  const colors = [];
  const indices = [];
  const pointPositions = [];
  const pointColors = [];
  const ranges = {
    l: [Infinity, -Infinity],
    a: [Infinity, -Infinity],
    b: [Infinity, -Infinity]
  };
  let indexOffset = 0;

  const addVertex = (rgb) => {
    const lab = profileToLab(profile, rgb);
    updateRanges(ranges, lab);
    vertices.push(...labToScene(lab));
    colors.push(...profileToDisplayColor(profile, rgb, lab));
    return indexOffset++;
  };

  const addFace = (axis, fixed) => {
    const faceStart = indexOffset;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / (size - 1);
        const v = y / (size - 1);
        const rgb = [u, v, fixed];
        if (axis === 0) rgb.splice(0, 3, fixed, u, v);
        if (axis === 1) rgb.splice(0, 3, u, fixed, v);
        addVertex(rgb);
      }
    }
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const i = faceStart + y * size + x;
        if (fixed === 0) {
          indices.push(i, i + 1, i + size, i + 1, i + size + 1, i + size);
        } else {
          indices.push(i, i + size, i + 1, i + 1, i + size, i + size + 1);
        }
      }
    }
  };

  for (let axis = 0; axis < 3; axis++) {
    addFace(axis, 0);
    addFace(axis, 1);
  }

  const pointSize = Math.max(7, Math.round(size * 0.72));
  for (let r = 0; r < pointSize; r++) {
    for (let g = 0; g < pointSize; g++) {
      for (let b = 0; b < pointSize; b++) {
        if (r !== 0 && g !== 0 && b !== 0 && r !== pointSize - 1 && g !== pointSize - 1 && b !== pointSize - 1) {
          continue;
        }
        const rgb = [r / (pointSize - 1), g / (pointSize - 1), b / (pointSize - 1)];
        const lab = profileToLab(profile, rgb);
        pointPositions.push(...labToScene(lab));
        pointColors.push(...profileToDisplayColor(profile, rgb, lab));
      }
    }
  }

  return {
    vertices: new Float32Array(vertices),
    colors: new Float32Array(colors),
    indices: indexOffset > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
    points: new Float32Array(pointPositions),
    pointColors: new Float32Array(pointColors),
    ranges,
    vertexCount: vertices.length / 3,
    indexCount: indices.length,
    pointCount: pointPositions.length / 3
  };
}

function sampleDeviceProfile(profile, size) {
  const vertices = [];
  const colors = [];
  const indices = [];
  const pointPositions = [];
  const pointColors = [];
  const ranges = {
    l: [Infinity, -Infinity],
    a: [Infinity, -Infinity],
    b: [Infinity, -Infinity]
  };
  let indexOffset = 0;

  const pushSample = (device, targetPositions, targetColors) => {
    const lab = profileToLab(profile, device);
    updateRanges(ranges, lab);
    targetPositions.push(...labToScene(lab));
    targetColors.push(...profileToDisplayColor(profile, device, lab));
  };

  const addSliceVertex = (device) => {
    pushSample(device, vertices, colors);
    return indexOffset++;
  };

  const channels = profile.channels;
  const faceSize = channels > 4 ? Math.min(size, 11) : size;
  for (let freeA = 0; freeA < channels; freeA++) {
    for (let freeB = freeA + 1; freeB < channels; freeB++) {
      const fixedChannels = Array.from({ length: channels }, (_, channel) => channel).filter((channel) => channel !== freeA && channel !== freeB);
      forEachBinaryCombination(fixedChannels.length, (fixedValues) => {
        const faceStart = indexOffset;
        for (let y = 0; y < faceSize; y++) {
          for (let x = 0; x < faceSize; x++) {
            const device = Array(channels).fill(0);
            fixedChannels.forEach((channel, index) => {
              device[channel] = fixedValues[index];
            });
            device[freeA] = x / (faceSize - 1);
            device[freeB] = y / (faceSize - 1);
            addSliceVertex(device);
          }
        }
        for (let y = 0; y < faceSize - 1; y++) {
          for (let x = 0; x < faceSize - 1; x++) {
            const i = faceStart + y * faceSize + x;
            indices.push(i, i + 1, i + faceSize, i + 1, i + faceSize + 1, i + faceSize);
          }
        }
      });
    }
  }

  const pointSize = channels > 4 ? Math.max(4, Math.min(6, Math.round(size * 0.25))) : Math.max(6, Math.min(15, Math.round(size * 0.58)));
  forEachGridPoint(channels, pointSize, (device, coordinates) => {
    if (!coordinates.some((value) => value === 0 || value === pointSize - 1)) return;
    pushSample(device, pointPositions, pointColors);
  });

  return {
    vertices: new Float32Array(vertices),
    colors: new Float32Array(colors),
    indices: indexOffset > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
    points: new Float32Array(pointPositions),
    pointColors: new Float32Array(pointColors),
    ranges,
    vertexCount: vertices.length / 3,
    indexCount: indices.length,
    pointCount: pointPositions.length / 3
  };
}

function uploadGeometry(slot) {
  if (!slot.geometry) return;
  bindArray(slot.buffers.vertices, slot.geometry.vertices);
  bindArray(slot.buffers.colors, slot.geometry.colors);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, slot.buffers.indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, slot.geometry.indices, gl.STATIC_DRAW);
  bindArray(slot.buffers.points, slot.geometry.points);
  bindArray(slot.buffers.pointColors, slot.geometry.pointColors);
}

function uploadAxisGeometry() {
  const axisLines = new Float32Array([
    -1.18, 0, 0, 1.18, 0, 0,
    0, 0, -1.18, 0, 0, 1.18,
    0, L_AXIS_MIN, 0, 0, L_AXIS_MAX, 0
  ]);
  const axisColors = new Float32Array([
    0.26, 0.78, 0.72, 0.26, 0.78, 0.72,
    0.89, 0.72, 0.29, 0.89, 0.72, 0.29,
    0.95, 0.94, 0.89, 0.95, 0.94, 0.89
  ]);
  bindArray(axisBuffers.lines, axisLines);
  bindArray(axisBuffers.lineColors, axisColors);
}

function createProfileSlot(profile, color) {
  return {
    profile,
    renderProfile: profile,
    uploadedProfile: null,
    geometry: null,
    buffers: createGeometryBuffers(),
    opacity: 0.5,
    solid: false,
    solidColor: hexToRgb(color)
  };
}

function syncVisualControls() {
  profileSlots.forEach((slot, index) => {
    opacityRanges[index].value = String(slot.opacity);
    solidToggles[index].checked = slot.solid;
    solidColorInputs[index].value = rgbToHex(slot.solidColor);
  });
}

function drawLoop() {
  if (needsDraw) draw();
  requestAnimationFrame(drawLoop);
}

function draw() {
  needsDraw = false;
  const width = Math.max(1, Math.floor(canvas.clientWidth * window.devicePixelRatio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * window.devicePixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  gl.viewport(0, 0, width, height);
  gl.clearColor(0.05, 0.055, 0.07, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const aspect = width / height;
  const matrix = multiply(
    perspective(42 * Math.PI / 180, aspect, 0.1, 20),
    multiply(
      translate(0, 0, -3.15 / zoom),
      multiply(rotateX(rotationX), rotateY(rotationY))
    )
  );
  updateAxisLabels(matrix);

  drawLines(matrix);

  const activeSlots = profileSlots.filter((slot) => slot.geometry);
  if (renderMode === "surface") {
    gl.depthMask(false);
    activeSlots.forEach((slot, index) => drawSurface(slot, matrix, index));
    gl.depthMask(true);
  }
  activeSlots.forEach((slot, index) => drawPoints(slot, matrix, renderMode === "points" ? 1 : 0.72, index));
}

function drawSurface(slot, matrix, index) {
  gl.useProgram(program);
  setAttrib(program, "aPosition", slot.buffers.vertices);
  setAttrib(program, "aColor", slot.buffers.colors);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, "uMatrix"), false, matrix);
  gl.uniform1f(gl.getUniformLocation(program, "uPointSize"), 1);
  gl.uniform1f(gl.getUniformLocation(program, "uDrawPoints"), 0);
  setProfileUniforms(slot, slot.opacity);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, slot.buffers.indices);
  gl.drawElements(
    gl.TRIANGLES,
    slot.geometry.indexCount,
    slot.geometry.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
    0
  );
}

function drawPoints(slot, matrix, alpha, index) {
  gl.useProgram(program);
  setAttrib(program, "aPosition", slot.buffers.points);
  setAttrib(program, "aColor", slot.buffers.pointColors);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, "uMatrix"), false, matrix);
  gl.uniform1f(gl.getUniformLocation(program, "uPointSize"), renderMode === "points" ? 3.2 : 2.1 + index * 0.4);
  gl.uniform1f(gl.getUniformLocation(program, "uDrawPoints"), 1);
  setProfileUniforms(slot, alpha * slot.opacity);
  gl.drawArrays(gl.POINTS, 0, slot.geometry.pointCount);
}

function drawLines(matrix) {
  gl.useProgram(lineProgram);
  setAttrib(lineProgram, "aPosition", axisBuffers.lines);
  setAttrib(lineProgram, "aColor", axisBuffers.lineColors);
  gl.uniformMatrix4fv(gl.getUniformLocation(lineProgram, "uMatrix"), false, matrix);
  gl.drawArrays(gl.LINES, 0, 6);
}

function setProfileUniforms(slot, alpha) {
  gl.uniform1f(gl.getUniformLocation(program, "uAlpha"), clamp(alpha, 0.02, 1));
  gl.uniform1f(gl.getUniformLocation(program, "uUseSolid"), slot.solid ? 1 : 0);
  gl.uniform3fv(gl.getUniformLocation(program, "uSolidColor"), new Float32Array(slot.solidColor));
}

function bindArray(buffer, data) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
}

function setAttrib(activeProgram, name, buffer) {
  const location = gl.getAttribLocation(activeProgram, name);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
}

function createGeometryBuffers() {
  return {
    vertices: gl.createBuffer(),
    colors: gl.createBuffer(),
    indices: gl.createBuffer(),
    points: gl.createBuffer(),
    pointColors: gl.createBuffer()
  };
}

function populateProfileSelects() {
  presetSelects.forEach((select, index) => {
    select.innerHTML = "";
    presetOrder.forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = presets[key].name;
      select.appendChild(option);
    });
    select.value = index === 0 ? "crpc6" : "none";
  });
}

function setUploadedOption(index, name) {
  const select = presetSelects[index];
  const value = `uploaded-${index}`;
  let option = select.querySelector(`option[value="${value}"]`);
  if (!option) {
    option = document.createElement("option");
    option.value = value;
    select.appendChild(option);
  }
  option.textContent = `Loaded: ${name}`;
  select.value = value;
}

function createCrpcReferenceProfile(number) {
  const data = CRPC_REFERENCE_DATA[number];
  const fallbackProfile = {
    name: `CGATS21 CRPC-${number}`,
    meta: "CMYK reference profile from published CRPC Lab anchors",
    space: "CMYK",
    channels: 4,
    referenceVolume: data.volume,
    transform: (device) => crpcReferenceToLab(data, device)
  };
  return {
    name: `CGATS21 CRPC-${number}`,
    meta: "Bundled CMYK ICC profile",
    space: "CMYK",
    channels: 4,
    iccPath: `./profiles/CGATS21_CRPC${number}.icc`,
    fallbackProfile,
    referenceVolume: data.volume,
    transform: fallbackProfile.transform
  };
}

function crpcReferenceToLab(data, device) {
  const c = clamp(device[0], 0, 1);
  const m = clamp(device[1], 0, 1);
  const y = clamp(device[2], 0, 1);
  const k = clamp(device[3], 0, 1);
  const paper = data.paper;
  const deltas = [data.c, data.m, data.y, data.k].map((anchor) => subtractLab(anchor, paper));
  const weights = [c, m, y, k].map((value) => 1 - (1 - value) ** 1.08);
  const lab = paper.slice();

  for (let channel = 0; channel < deltas.length; channel++) {
    lab[0] += deltas[channel][0] * weights[channel];
    lab[1] += deltas[channel][1] * weights[channel];
    lab[2] += deltas[channel][2] * weights[channel];
  }

  const chromaticMix = 1 - k * 0.72;
  const redMix = m * y * chromaticMix;
  const greenBlueMix = c * y * chromaticMix;
  const blueMix = c * m * chromaticMix;
  const threeColor = c * m * y * chromaticMix;
  lab[0] -= 4.2 * (redMix + greenBlueMix + blueMix) + 9.5 * threeColor;
  lab[1] += 15 * redMix - 10 * greenBlueMix - 3 * blueMix;
  lab[2] += 12 * redMix + 9 * greenBlueMix - 18 * blueMix;

  return [
    clamp(lab[0], 0, 100),
    clamp(lab[1], -128, 127),
    clamp(lab[2], -128, 127)
  ];
}

function subtractLab(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function forEachBinaryCombination(length, callback) {
  const count = 2 ** length;
  for (let mask = 0; mask < count; mask++) {
    const values = [];
    for (let bit = 0; bit < length; bit++) {
      values.push((mask >> bit) & 1);
    }
    callback(values);
  }
}

function forEachGridPoint(channels, steps, callback) {
  const coordinates = Array(channels).fill(0);
  const walk = (channel) => {
    if (channel === channels) {
      callback(coordinates.map((value) => value / (steps - 1)), coordinates);
      return;
    }
    for (let value = 0; value < steps; value++) {
      coordinates[channel] = value;
      walk(channel + 1);
    }
  };
  walk(0);
}

function updateProfileText(slot, index) {
  const profile = slot.renderProfile;
  profileNameEls[index].textContent = slot.profile.name;
  profileMetaEls[index].textContent = profile.meta;
  profileVolumeEls[index].textContent = profile.disabled ? "Volume: --" : `Volume: ${formatVolume(profileVolume(profile))} cubic Lab units`;
  if (index === 1) {
    profileReadout2.classList.toggle("disabled", profile.disabled);
  }
}

function updateProfileSummary() {
  const active = profileSlots.filter((slot) => !slot.renderProfile.disabled).map((slot) => slot.profile.name);
  if (!active.length) {
    profileSummaryEl.textContent = "Choose a profile to visualize in CIE Lab";
    return;
  }
  profileSummaryEl.textContent = active.length > 1
    ? `${active[0]} compared with ${active[1]} in CIE Lab`
    : `${active[0]} shown as a rotatable CIE Lab gamut`;
}

function updateCombinedRanges() {
  const ranges = {
    l: [Infinity, -Infinity],
    a: [Infinity, -Infinity],
    b: [Infinity, -Infinity]
  };
  profileSlots.forEach((slot) => {
    if (!slot.geometry) return;
    mergeRange(ranges.l, slot.geometry.ranges.l);
    mergeRange(ranges.a, slot.geometry.ranges.a);
    mergeRange(ranges.b, slot.geometry.ranges.b);
  });
  lRangeEl.textContent = isFinite(ranges.l[0]) ? formatRange(ranges.l) : "--";
  aRangeEl.textContent = isFinite(ranges.a[0]) ? formatRange(ranges.a) : "--";
  bRangeEl.textContent = isFinite(ranges.b[0]) ? formatRange(ranges.b) : "--";
}

function mergeRange(target, source) {
  target[0] = Math.min(target[0], source[0]);
  target[1] = Math.max(target[1], source[1]);
}

function profileVolume(profile) {
  if (profile.referenceVolume) {
    return { value: profile.referenceVolume, estimated: false };
  }
  if (!profile.cachedVolume) {
    profile.cachedVolume = estimateProfileVolume(profile);
  }
  return profile.cachedVolume;
}

async function resolveSlotProfile(slot) {
  slot.renderProfile = await resolveProfile(slot.profile);
}

async function resolveProfile(profile) {
  if (!profile.iccPath) return profile;
  if (profile.resolvedProfile) return profile.resolvedProfile;
  if (profile.loadFailed) return profile.fallbackProfile;
  try {
    const response = await fetch(profile.iccPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    const parsed = parseICCProfile(buffer, profile.name);
    parsed.name = profile.name;
    parsed.meta = `${parsed.meta} bundled ICC profile`;
    parsed.referenceVolume = profile.referenceVolume;
    profile.resolvedProfile = parsed;
    return parsed;
  } catch (error) {
    profile.loadFailed = true;
    profile.fallbackProfile.meta = "CMYK reference profile from published CRPC Lab anchors; bundled ICC unavailable in this browser context";
    showStatus(`${profile.name} is using reference fallback data because the bundled ICC could not be loaded.`, true);
    return profile.fallbackProfile;
  }
}

function estimateProfileVolume(profile) {
  const cellSize = profile.channels >= 4 ? 5 : 4;
  const steps = profile.channels > 4 ? 5 : profile.channels === 4 ? 9 : 17;
  const occupied = new Set();
  const sample = (device) => {
    const lab = profileToLab(profile, device);
    const key = [
      Math.floor(clamp(lab[0], 0, 100) / cellSize),
      Math.floor((clamp(lab[1], -128, 127) + 128) / cellSize),
      Math.floor((clamp(lab[2], -128, 127) + 128) / cellSize)
    ].join(",");
    occupied.add(key);
  };

  forEachGridPoint(profile.channels, steps, (device) => sample(device));

  return {
    value: occupied.size * cellSize ** 3,
    estimated: true
  };
}

function formatVolume(volume) {
  const prefix = volume.estimated ? "~" : "";
  return `${prefix}${Math.round(volume.value).toLocaleString()}`;
}

function updateAxisLabels(matrix) {
  positionAxisLabel(axisLabelEls.l, [0, L_AXIS_MAX + 0.1, 0], matrix);
  positionAxisLabel(axisLabelEls.posA, [-1.3, 0, 0], matrix);
  positionAxisLabel(axisLabelEls.negA, [1.3, 0, 0], matrix);
  positionAxisLabel(axisLabelEls.posB, [0, 0, 1.3], matrix);
  positionAxisLabel(axisLabelEls.negB, [0, 0, -1.3], matrix);
}

function positionAxisLabel(element, point, matrix) {
  const projected = projectPoint(point, matrix);
  const visible = projected.w > 0 && projected.z > -1.2 && projected.z < 1.2;
  element.style.left = `${projected.x * canvas.clientWidth}px`;
  element.style.top = `${projected.y * canvas.clientHeight}px`;
  element.style.opacity = visible ? "1" : "0.28";
}

function projectPoint(point, matrix) {
  const x = point[0];
  const y = point[1];
  const z = point[2];
  const clipX = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
  const clipY = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
  const clipZ = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
  const clipW = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  const inverseW = clipW ? 1 / clipW : 1;
  return {
    x: (clipX * inverseW * 0.5 + 0.5),
    y: (0.5 - clipY * inverseW * 0.5),
    z: clipZ * inverseW,
    w: clipW
  };
}

function parseICCProfile(buffer, filename) {
  const view = new DataView(buffer);
  if (view.byteLength < 132 || readAscii(view, 36, 4) !== "acsp") {
    throw new Error("This does not look like a valid ICC profile.");
  }

  const colorSpace = readAscii(view, 16, 4).trim();
  const pcs = readAscii(view, 20, 4).trim();
  const tags = readTags(view);
  const name = readProfileName(view, tags) || filename || "Loaded ICC profile";
  const version = formatICCVersion(view);
  const lutTag = tags.A2B1 || tags.A2B0 || tags.A2B2;
  const nColorChannels = colorSpaceToChannels(colorSpace);

  if (colorSpace !== "RGB") {
    if (!lutTag) {
      throw new Error(`This ${colorSpace || "device"} profile does not include an A2B device-to-Lab transform.`);
    }
    if (!nColorChannels) {
      throw new Error(`This profile uses ${colorSpace || "an unsupported"} data. This visualizer supports RGB matrix/LUT profiles plus CMYK and n-color LUT profiles.`);
    }
    return {
      name,
      meta: `${version} ${formatColorSpaceLabel(colorSpace)} (${colorSpace}) ${readAscii(view, lutTag.offset, 4).trim()} LUT profile`,
      space: colorSpace,
      channels: nColorChannels,
      pcs,
      transform: readA2BTransform(view, lutTag, pcs)
    };
  }

  const matrix = [
    readXYZTag(view, tags.rXYZ),
    readXYZTag(view, tags.gXYZ),
    readXYZTag(view, tags.bXYZ)
  ];
  if (matrix.some((row) => !row) && !lutTag) {
    throw new Error("This RGB profile does not expose RGB colorant tags or an A2B transform.");
  }
  if (matrix.some((row) => !row)) {
    return {
      name,
      meta: `${version} RGB ${readAscii(view, lutTag.offset, 4).trim()} LUT profile`,
      space: "RGB",
      channels: 3,
      pcs,
      transform: readA2BTransform(view, lutTag, pcs)
    };
  }

  return {
    name,
    meta: `${version} RGB matrix/TRC profile`,
    space: "RGB",
    channels: 3,
    matrix: transpose(matrix),
    trc: [
      readTRCTag(view, tags.rTRC),
      readTRCTag(view, tags.gTRC),
      readTRCTag(view, tags.bTRC)
    ]
  };
}

function colorSpaceToChannels(colorSpace) {
  if (colorSpace === "CMYK") return 4;
  const match = colorSpace.match(/^([2-9A-F])CLR$/);
  if (!match) return 0;
  const value = match[1];
  return /^[A-F]$/.test(value) ? value.charCodeAt(0) - 55 : Number(value);
}

function formatColorSpaceLabel(colorSpace) {
  const channels = colorSpaceToChannels(colorSpace);
  if (channels && colorSpace !== "CMYK") return `${channels}-color`;
  return colorSpace || "device";
}

function readTags(view) {
  const count = view.getUint32(128, false);
  const tags = {};
  for (let i = 0; i < count; i++) {
    const entry = 132 + i * 12;
    const signature = readAscii(view, entry, 4);
    tags[signature] = {
      offset: view.getUint32(entry + 4, false),
      size: view.getUint32(entry + 8, false)
    };
  }
  return tags;
}

function formatICCVersion(view) {
  const major = view.getUint8(8);
  const minor = view.getUint8(9) >> 4;
  const bugfix = view.getUint8(9) & 0x0f;
  return bugfix ? `ICC ${major}.${minor}.${bugfix}` : `ICC ${major}.${minor}`;
}

function readXYZTag(view, tag) {
  if (!tag || readAscii(view, tag.offset, 4) !== "XYZ ") return null;
  return [
    readS15Fixed16(view, tag.offset + 8),
    readS15Fixed16(view, tag.offset + 12),
    readS15Fixed16(view, tag.offset + 16)
  ];
}

function readTRCTag(view, tag) {
  if (!tag) return gammaEotf(2.2);
  const type = readAscii(view, tag.offset, 4);
  if (type === "curv") {
    const count = view.getUint32(tag.offset + 8, false);
    if (count === 0) return (x) => x;
    if (count === 1) return gammaEotf(view.getUint16(tag.offset + 12, false) / 256);
    const table = [];
    for (let i = 0; i < count; i++) {
      table.push(view.getUint16(tag.offset + 12 + i * 2, false) / 65535);
    }
    return (x) => interpolateTable(table, x);
  }
  if (type === "para") {
    const fnType = view.getUint16(tag.offset + 8, false);
    const p = [];
    for (let i = 0; i < 7 && tag.offset + 12 + i * 4 < tag.offset + tag.size; i++) {
      p.push(readS15Fixed16(view, tag.offset + 12 + i * 4));
    }
    return parametricCurve(fnType, p);
  }
  return gammaEotf(2.2);
}

function readA2BTransform(view, tag, pcs) {
  const type = readAscii(view, tag.offset, 4);
  if (type === "mft1") return readLut8Transform(view, tag, pcs);
  if (type === "mft2") return readLut16Transform(view, tag, pcs);
  if (type === "mAB ") return readMabTransform(view, tag, pcs);
  throw new Error(`This profile uses an unsupported A2B tag type: ${type.trim() || "unknown"}.`);
}

function readLut8Transform(view, tag, pcs) {
  const offset = tag.offset;
  const inputChannels = view.getUint8(offset + 8);
  const outputChannels = view.getUint8(offset + 9);
  const gridPoints = view.getUint8(offset + 10);
  let cursor = offset + 48;
  const inputTables = [];
  for (let channel = 0; channel < inputChannels; channel++) {
    inputTables.push(readUIntTable(view, cursor, 256, 1));
    cursor += 256;
  }
  const clutEntries = gridPoints ** inputChannels * outputChannels;
  const clut = readUIntTable(view, cursor, clutEntries, 1);
  cursor += clutEntries;
  const outputTables = [];
  for (let channel = 0; channel < outputChannels; channel++) {
    outputTables.push(readUIntTable(view, cursor, 256, 1));
    cursor += 256;
  }

  return (device) => decodePcs(
    applyOutputTables(
      interpolateClut(inputTables.map((table, i) => interpolateTable(table, device[i])), {
        inputChannels,
        outputChannels,
        grid: Array(inputChannels).fill(gridPoints),
        values: clut
      }),
      outputTables
    ),
    pcs
  );
}

function readLut16Transform(view, tag, pcs) {
  const offset = tag.offset;
  const inputChannels = view.getUint8(offset + 8);
  const outputChannels = view.getUint8(offset + 9);
  const gridPoints = view.getUint8(offset + 10);
  const inputEntries = view.getUint16(offset + 48, false);
  const outputEntries = view.getUint16(offset + 50, false);
  let cursor = offset + 52;
  const inputTables = [];
  for (let channel = 0; channel < inputChannels; channel++) {
    inputTables.push(readUIntTable(view, cursor, inputEntries, 2));
    cursor += inputEntries * 2;
  }
  const clutEntries = gridPoints ** inputChannels * outputChannels;
  const clut = readUIntTable(view, cursor, clutEntries, 2);
  cursor += clutEntries * 2;
  const outputTables = [];
  for (let channel = 0; channel < outputChannels; channel++) {
    outputTables.push(readUIntTable(view, cursor, outputEntries, 2));
    cursor += outputEntries * 2;
  }

  return (device) => decodePcs(
    applyOutputTables(
      interpolateClut(inputTables.map((table, i) => interpolateTable(table, device[i])), {
        inputChannels,
        outputChannels,
        grid: Array(inputChannels).fill(gridPoints),
        values: clut
      }),
      outputTables
    ),
    pcs
  );
}

function readMabTransform(view, tag, pcs) {
  const offset = tag.offset;
  const inputChannels = view.getUint8(offset + 8);
  const outputChannels = view.getUint8(offset + 9);
  const bOffset = view.getUint32(offset + 12, false);
  const matrixOffset = view.getUint32(offset + 16, false);
  const mOffset = view.getUint32(offset + 20, false);
  const clutOffset = view.getUint32(offset + 24, false);
  const aOffset = view.getUint32(offset + 28, false);

  if (!clutOffset) {
    throw new Error("This mAB profile does not include a CLUT stage.");
  }
  if (matrixOffset || mOffset) {
    throw new Error("This mAB profile includes matrix/M stages that are not supported yet.");
  }

  const aCurves = aOffset ? readCurveSequence(view, offset + aOffset, inputChannels) : identityCurves(inputChannels);
  const bCurves = bOffset ? readCurveSequence(view, offset + bOffset, outputChannels) : identityCurves(outputChannels);
  const clut = readMabClut(view, offset + clutOffset, inputChannels, outputChannels);

  return (device) => decodePcs(
    applyCurves(interpolateClut(applyCurves(device, aCurves), clut), bCurves),
    pcs
  );
}

function readMabClut(view, offset, inputChannels, outputChannels) {
  const grid = [];
  for (let i = 0; i < inputChannels; i++) {
    grid.push(view.getUint8(offset + i));
  }
  const precision = view.getUint8(offset + 16);
  if (precision !== 1 && precision !== 2) {
    throw new Error("This mAB profile uses an unsupported CLUT precision.");
  }
  const entries = grid.reduce((total, value) => total * value, 1) * outputChannels;
  return {
    inputChannels,
    outputChannels,
    grid,
    values: readUIntTable(view, offset + 20, entries, precision)
  };
}

function readCurveSequence(view, offset, count) {
  const curves = [];
  let cursor = offset;
  for (let i = 0; i < count; i++) {
    const curve = readCurveAt(view, cursor);
    curves.push(curve.fn);
    cursor += align4(curve.size);
  }
  return curves;
}

function readCurveAt(view, offset) {
  const type = readAscii(view, offset, 4);
  if (type === "curv") {
    const count = view.getUint32(offset + 8, false);
    if (count === 0) return { fn: (x) => x, size: 12 };
    if (count === 1) {
      return { fn: gammaEotf(view.getUint16(offset + 12, false) / 256), size: 14 };
    }
    const table = [];
    for (let i = 0; i < count; i++) {
      table.push(view.getUint16(offset + 12 + i * 2, false) / 65535);
    }
    return { fn: (x) => interpolateTable(table, x), size: 12 + count * 2 };
  }
  if (type === "para") {
    const fnType = view.getUint16(offset + 8, false);
    const paramCounts = [1, 3, 4, 5, 7];
    const count = paramCounts[fnType] || 1;
    const p = [];
    for (let i = 0; i < count; i++) {
      p.push(readS15Fixed16(view, offset + 12 + i * 4));
    }
    return { fn: parametricCurve(fnType, p), size: 12 + count * 4 };
  }
  throw new Error(`Unsupported curve type in A2B transform: ${type.trim() || "unknown"}.`);
}

function readUIntTable(view, offset, count, bytes) {
  const table = new Float32Array(count);
  const divisor = bytes === 1 ? 255 : 65535;
  for (let i = 0; i < count; i++) {
    table[i] = bytes === 1 ? view.getUint8(offset + i) / divisor : view.getUint16(offset + i * 2, false) / divisor;
  }
  return table;
}

function applyCurves(values, curves) {
  return values.map((value, index) => clamp(curves[index](clamp(value, 0, 1)), 0, 1));
}

function applyOutputTables(values, tables) {
  return values.map((value, index) => interpolateTable(tables[index], value));
}

function interpolateClut(inputs, clut) {
  const base = [];
  const mix = [];
  for (let i = 0; i < clut.inputChannels; i++) {
    const scaled = clamp(inputs[i], 0, 1) * (clut.grid[i] - 1);
    base.push(Math.floor(scaled));
    mix.push(scaled - base[i]);
  }

  const output = Array(clut.outputChannels).fill(0);
  const corners = 1 << clut.inputChannels;
  for (let corner = 0; corner < corners; corner++) {
    let weight = 1;
    let index = 0;
    let stride = clut.outputChannels;
    for (let channel = clut.inputChannels - 1; channel >= 0; channel--) {
      const high = (corner >> channel) & 1;
      const coordinate = Math.min(clut.grid[channel] - 1, base[channel] + high);
      weight *= high ? mix[channel] : 1 - mix[channel];
      index += coordinate * stride;
      stride *= clut.grid[channel];
    }
    for (let channel = 0; channel < clut.outputChannels; channel++) {
      output[channel] += clut.values[index + channel] * weight;
    }
  }
  return output;
}

function decodePcs(values, pcs) {
  if (pcs === "Lab") {
    return [
      clamp(values[0], 0, 1) * 100,
      clamp(values[1], 0, 1) * 255 - 128,
      clamp(values[2], 0, 1) * 255 - 128
    ];
  }
  if (pcs === "XYZ") {
    return xyzToLab([
      clamp(values[0], 0, 1.999),
      clamp(values[1], 0, 1.999),
      clamp(values[2], 0, 1.999)
    ]);
  }
  throw new Error(`Unsupported ICC PCS: ${pcs || "unknown"}.`);
}

function readProfileName(view, tags) {
  const tag = tags.desc || tags.dmnd || tags.dmdd;
  if (!tag) return "";
  const type = readAscii(view, tag.offset, 4);
  if (type === "desc") {
    const count = view.getUint32(tag.offset + 8, false);
    return cleanText(readAscii(view, tag.offset + 12, Math.max(0, count - 1)));
  }
  if (type === "mluc") {
    const records = view.getUint32(tag.offset + 8, false);
    const recordSize = view.getUint32(tag.offset + 12, false);
    for (let i = 0; i < records; i++) {
      const entry = tag.offset + 16 + i * recordSize;
      const length = view.getUint32(entry + 4, false);
      const offset = view.getUint32(entry + 8, false);
      const start = tag.offset + offset;
      let result = "";
      for (let j = 0; j < length; j += 2) {
        const code = view.getUint16(start + j, false);
        if (code) result += String.fromCharCode(code);
      }
      if (result) return cleanText(result);
    }
  }
  return "";
}

function profileToLab(profile, device) {
  if (profile.transform) return profile.transform(device);
  return rgbToLab(profile, device[0], device[1], device[2]);
}

function profileToDisplayColor(profile, device, lab) {
  if (profile.space === "CMYK") {
    const c = device[0];
    const m = device[1];
    const y = device[2];
    const k = device[3];
    return [
      (1 - c) * (1 - k),
      (1 - m) * (1 - k),
      (1 - y) * (1 - k)
    ].map((value) => clamp(value, 0, 1));
  }
  if (profile.channels !== 3 || profile.transform) {
    return labToDisplayRgb(lab);
  }
  return [device[0], device[1], device[2]];
}

function labToDisplayRgb(lab) {
  const xyz = labToXyz(lab);
  const d65 = [
    0.9555766 * xyz[0] - 0.0230393 * xyz[1] + 0.0631636 * xyz[2],
    -0.0282895 * xyz[0] + 1.0099416 * xyz[1] + 0.0210077 * xyz[2],
    0.0122982 * xyz[0] - 0.0204830 * xyz[1] + 1.3299098 * xyz[2]
  ];
  const linear = [
    3.2404542 * d65[0] - 1.5371385 * d65[1] - 0.4985314 * d65[2],
    -0.9692660 * d65[0] + 1.8760108 * d65[1] + 0.0415560 * d65[2],
    0.0556434 * d65[0] - 0.2040259 * d65[1] + 1.0572252 * d65[2]
  ];
  return linear.map((value) => linearToSrgb(clamp(value, 0, 1)));
}

function labToXyz(lab) {
  const fy = (lab[0] + 16) / 116;
  const fx = fy + lab[1] / 500;
  const fz = fy - lab[2] / 200;
  return [
    D50[0] * labFInverse(fx),
    D50[1] * labFInverse(fy),
    D50[2] * labFInverse(fz)
  ];
}

function labFInverse(t) {
  const delta = 6 / 29;
  return t > delta ? t ** 3 : 3 * delta * delta * (t - 4 / 29);
}

function linearToSrgb(value) {
  return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
}

function labToScene(lab) {
  return [
    -lab[1] / LAB_AXIS_SCALE,
    (lab[0] - 50) / LAB_AXIS_SCALE,
    lab[2] / LAB_AXIS_SCALE
  ];
}

function rgbToLab(profile, r, g, b) {
  const linear = [
    clamp(profile.trc[0](r), 0, 1.5),
    clamp(profile.trc[1](g), 0, 1.5),
    clamp(profile.trc[2](b), 0, 1.5)
  ];
  const xyz = [
    profile.matrix[0][0] * linear[0] + profile.matrix[0][1] * linear[1] + profile.matrix[0][2] * linear[2],
    profile.matrix[1][0] * linear[0] + profile.matrix[1][1] * linear[1] + profile.matrix[1][2] * linear[2],
    profile.matrix[2][0] * linear[0] + profile.matrix[2][1] * linear[1] + profile.matrix[2][2] * linear[2]
  ];
  return xyzToLab(xyz);
}

function xyzToLab(xyz) {
  const x = labF(xyz[0] / D50[0]);
  const y = labF(xyz[1] / D50[1]);
  const z = labF(xyz[2] / D50[2]);
  return [
    116 * y - 16,
    500 * (x - y),
    200 * (y - z)
  ];
}

function labF(t) {
  const delta = 6 / 29;
  return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

function srgbEotf(x) {
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function gammaEotf(gamma) {
  return (x) => x ** gamma;
}

function parametricCurve(type, p) {
  const g = p[0] || 1;
  const a = p[1] || 1;
  const b = p[2] || 0;
  const c = p[3] || 0;
  const d = p[4] || 0;
  const e = p[5] || 0;
  const f = p[6] || 0;
  if (type === 0) return (x) => x ** g;
  if (type === 1) return (x) => x >= -b / a ? (a * x + b) ** g : 0;
  if (type === 2) return (x) => x >= -b / a ? (a * x + b) ** g + c : c;
  if (type === 3) return (x) => x >= d ? (a * x + b) ** g : c * x;
  if (type === 4) return (x) => x >= d ? (a * x + b) ** g + e : c * x + f;
  return gammaEotf(2.2);
}

function interpolateTable(table, x) {
  const scaled = clamp(x, 0, 1) * (table.length - 1);
  const index = Math.floor(scaled);
  const next = Math.min(table.length - 1, index + 1);
  const mix = scaled - index;
  return table[index] * (1 - mix) + table[next] * mix;
}

function readAscii(view, offset, length) {
  let text = "";
  for (let i = 0; i < length && offset + i < view.byteLength; i++) {
    const code = view.getUint8(offset + i);
    if (code) text += String.fromCharCode(code);
  }
  return text;
}

function readS15Fixed16(view, offset) {
  return view.getInt32(offset, false) / 65536;
}

function cleanText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function identityCurves(count) {
  return Array.from({ length: count }, () => (x) => x);
}

function align4(value) {
  return Math.ceil(value / 4) * 4;
}

function transpose(rows) {
  return [
    [rows[0][0], rows[1][0], rows[2][0]],
    [rows[0][1], rows[1][1], rows[2][1]],
    [rows[0][2], rows[1][2], rows[2][2]]
  ];
}

function updateRanges(ranges, lab) {
  ranges.l[0] = Math.min(ranges.l[0], lab[0]);
  ranges.l[1] = Math.max(ranges.l[1], lab[0]);
  ranges.a[0] = Math.min(ranges.a[0], lab[1]);
  ranges.a[1] = Math.max(ranges.a[1], lab[1]);
  ranges.b[0] = Math.min(ranges.b[0], lab[2]);
  ranges.b[1] = Math.max(ranges.b[1], lab[2]);
}

function formatRange(range) {
  return `${Math.round(range[0])} to ${Math.round(range[1])}`;
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
  statusEl.classList.add("show");
  window.clearTimeout(showStatus.timeout);
  showStatus.timeout = window.setTimeout(() => statusEl.classList.remove("show"), 4200);
}

function createProgram(context, vertexSource, fragmentSource) {
  const vertex = compileShader(context, context.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(context, context.FRAGMENT_SHADER, fragmentSource);
  const activeProgram = context.createProgram();
  context.attachShader(activeProgram, vertex);
  context.attachShader(activeProgram, fragment);
  context.linkProgram(activeProgram);
  if (!context.getProgramParameter(activeProgram, context.LINK_STATUS)) {
    throw new Error(context.getProgramInfoLog(activeProgram));
  }
  return activeProgram;
}

function compileShader(context, type, source) {
  const shader = context.createShader(type);
  context.shaderSource(shader, source);
  context.compileShader(shader);
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    throw new Error(context.getShaderInfoLog(shader));
  }
  return shader;
}

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0
  ]);
}

function translate(x, y, z) {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1
  ]);
}

function rotateX(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1
  ]);
}

function rotateY(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1
  ]);
}

function multiply(a, b) {
  const out = new Float32Array(16);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255
  ];
}

function rgbToHex(rgb) {
  return `#${rgb.map((value) => Math.round(clamp(value, 0, 1) * 255).toString(16).padStart(2, "0")).join("")}`;
}
