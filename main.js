// ================================================================
// 3D GAME - main.js
// ================================================================
// Third-person character game with Roblox-style camera orbit
// Built with Three.js
// ================================================================

import * as THREE from 'three';

// ================================================================
// SCENE SETUP
// ================================================================

// Create the scene (our 3D world container)
const scene = new THREE.Scene();

// Create the camera (our viewpoint into the 3D world)
// PerspectiveCamera(fieldOfView, aspectRatio, near, far)
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// Create the renderer (draws 3D scene onto the screen using WebGL)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ================================================================
// ENVIRONMENT (grid + lighting)
// ================================================================

// Grid on the ground to help visualize movement
const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
scene.add(gridHelper);

// Ambient light (overall illumination so nothing is pitch black)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// Directional light (simulates sunlight from one direction)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Reference cube (so we have something to walk around)
const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
const cubeMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(cubeGeo, cubeMat);
cube.position.set(0, 0.5, 0);
scene.add(cube);

// ================================================================
// BLOCK CHARACTER MODEL (Minecraft-style)
// ================================================================

const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });

// Character body parts
const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skinMaterial);
const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.2), skinMaterial);
const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), skinMaterial);
const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), skinMaterial);
const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), skinMaterial);
const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), skinMaterial);

// Position parts relative to body center
head.position.set(0, 0.7, 0);
body.position.set(0, 0.2, 0);
leftArm.position.set(-0.3, 0.3, 0);
rightArm.position.set(0.3, 0.3, 0);
leftLeg.position.set(-0.1, -0.4, 0);
rightLeg.position.set(0.1, -0.4, 0);

// Group all parts into one object
const character = new THREE.Group();
character.add(head, body, leftArm, rightArm, leftLeg, rightLeg);

// Debug arrow: shows which direction character is facing (red)
// Points along local -Z (Three.js default "forward" direction)
const charArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 1, 0),   // above head
    1, 0xff0000, 0.2, 0.1
);
character.add(charArrow);

scene.add(character);

// ================================================================
// GAME STATE VARIABLES
// ================================================================

// Character position in the world
const charPos = new THREE.Vector3(0, 1.5, 0);

// Movement
const moveSpeed = 0.1;

// Jump & gravity
const jumpSpeed = 0.15;
const gravity = 0.01;
const groundY = 1.5;        // character Y when standing on ground
let vertVelocity = 0;
let onGround = true;

// ================================================================
// CAMERA ORBIT VARIABLES
// ================================================================
// We use two angles to position the camera around the character:
//   theta = horizontal orbit angle (yaw). 0 = camera behind character on +Z side.
//   phi   = vertical orbit angle (pitch). Higher = camera is higher above character.
//
// REFERENCE: This follows the same spherical coordinate approach as
// Three.js OrbitControls (see: three.js/examples/jsm/controls/OrbitControls.js)
//
// KEY CONVENTION:
//   - theta = 0: camera at +Z relative to character, character faces -Z
//   - character.rotation.y = theta makes character face AWAY from camera
//   - Mouse right (positive deltaX) → theta DECREASES → character turns right
//     (because Three.js positive rotation = counterclockwise, and right = clockwise)

let theta = 0;              // horizontal orbit angle (radians)
let phi = 0.4;              // vertical orbit angle (radians), ~23° above horizontal
const camDist = 5;          // distance from character to camera
const sensitivity = 0.003;  // mouse sensitivity

// Phi limits (prevent camera going underground or directly overhead)
const PHI_MIN = 0.05;       // just above ground level
const PHI_MAX = 1.4;        // ~80° above (nearly overhead)

// ================================================================
// INPUT TRACKING
// ================================================================

const keys = { w: false, a: false, s: false, d: false, space: false };

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyS') keys.s = true;
    if (e.code === 'KeyD') keys.d = true;
    if (e.code === 'Space') keys.space = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
    if (e.code === 'Space') keys.space = false;
});

// ================================================================
// POINTER LOCK (captures mouse for FPS-style control)
// ================================================================

let pointerLocked = false;
let skipNextMove = false;    // skip first mouse event after lock (prevents flicker)

renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
    skipNextMove = true;
});

document.addEventListener('pointerlockchange', () => {
    pointerLocked = (document.pointerLockElement === renderer.domElement);
    if (!pointerLocked) skipNextMove = false;
});

document.addEventListener('pointerlockerror', () => {
    pointerLocked = false;
    skipNextMove = false;
});

// ================================================================
// MOUSE HANDLER — updates theta (horizontal) and phi (vertical)
// ================================================================
// This is where the camera orbit angles are updated based on mouse movement.
//
// MATH EXPLANATION:
//   event.movementX > 0 means mouse moved RIGHT
//   We want: mouse right → character turns right → clockwise from above → theta DECREASES
//   So: theta -= deltaX * sensitivity
//
//   event.movementY > 0 means mouse moved DOWN
//   We want: mouse down → camera lowers (phi decreases)
//   So: phi -= deltaY * sensitivity

document.addEventListener('mousemove', (event) => {
    // Only process when pointer is locked
    if (!pointerLocked) return;

    // Skip first event after pointer lock (prevents flicker)
    if (skipNextMove) {
        skipNextMove = false;
        return;
    }

    const dx = event.movementX || 0;
    const dy = event.movementY || 0;

    // Filter out abnormally large movements (browser bug protection)
    if (Math.abs(dx) > 100 || Math.abs(dy) > 100) return;

    // Update orbit angles
    theta -= dx * sensitivity;   // mouse right → theta decreases → turn right
    phi   += dy * sensitivity;   // mouse down  → phi decreases  → camera lowers

    // Clamp phi to prevent going underground or flipping overhead
    phi = Math.max(PHI_MIN, Math.min(PHI_MAX, phi));
});

// ================================================================
// ANIMATION LOOP
// ================================================================
let frame = 0;

function animate() {
    requestAnimationFrame(animate);
    frame++;

    // Spin the reference cube slowly
    cube.rotation.y += 0.01;

    // ============================================================
    // 1) CHARACTER MOVEMENT (WASD, relative to character facing)
    // ============================================================
    // Character faces direction: (-sin(theta), 0, -cos(theta))
    // This is the local -Z axis rotated by theta around Y.
    //
    // Right direction (perpendicular): (cos(theta), 0, -sin(theta))
    // This is cross(forward, up).

    const fwdX = -Math.sin(theta) * moveSpeed;
    const fwdZ = -Math.cos(theta) * moveSpeed;
    const rgtX =  Math.cos(theta) * moveSpeed;
    const rgtZ = -Math.sin(theta) * moveSpeed;

    if (keys.w) { charPos.x += fwdX; charPos.z += fwdZ; }  // forward
    if (keys.s) { charPos.x -= fwdX; charPos.z -= fwdZ; }  // backward
    if (keys.a) { charPos.x -= rgtX; charPos.z -= rgtZ; }  // strafe left
    if (keys.d) { charPos.x += rgtX; charPos.z += rgtZ; }  // strafe right

    // ============================================================
    // 2) JUMPING & GRAVITY
    // ============================================================
    if (keys.space && onGround) {
        vertVelocity = jumpSpeed;
        onGround = false;
    }

    vertVelocity -= gravity;
    charPos.y += vertVelocity;

    if (charPos.y <= groundY) {
        charPos.y = groundY;
        vertVelocity = 0;
        onGround = true;
    }

    // ============================================================
    // 3) UPDATE CHARACTER MODEL
    // ============================================================
    // Position the character group at charPos
    character.position.copy(charPos);

    // Character faces away from camera.
    // When theta = 0, camera is at +Z, character faces -Z.
    // character.rotation.y = 0 → faces -Z in Three.js. ✓
    // So: character.rotation.y = theta (directly!)
    character.rotation.y = theta;

    // ============================================================
    // 4) CAMERA POSITIONING (spherical orbit around character)
    // ============================================================
    // Camera orbits the character using spherical coordinates:
    //   x = dist * cos(phi) * sin(theta)    ← horizontal offset
    //   y = dist * sin(phi)                 ← vertical offset (height)
    //   z = dist * cos(phi) * cos(theta)    ← horizontal offset
    //
    // Camera is placed at charPos + offset, then looks at character.

    camera.position.x = charPos.x + camDist * Math.cos(phi) * Math.sin(theta);
    camera.position.y = charPos.y + camDist * Math.sin(phi);
    camera.position.z = charPos.z + camDist * Math.cos(phi) * Math.cos(theta);

    // Camera always looks at the character (slightly above center for better view)
    camera.lookAt(charPos.x, charPos.y + 0.5, charPos.z);

    // ============================================================
    // 5) DEBUG LOG (once per second)
    // ============================================================
    if (frame % 60 === 0) {
        const deg = (r) => (r * 180 / Math.PI).toFixed(1);
        console.log(
            `theta=${deg(theta)}° phi=${deg(phi)}°`,
            `| char facing=${deg(character.rotation.y)}°`,
            `| charPos=(${charPos.x.toFixed(1)}, ${charPos.y.toFixed(1)}, ${charPos.z.toFixed(1)})`,
            `| camPos=(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`
        );
    }

    // ============================================================
    // 6) RENDER
    // ============================================================
    renderer.render(scene, camera);
}

// Start!
animate();
