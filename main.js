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
// CHARACTER ANIMATION SYSTEM
// ================================================================
// Store references to character parts for animation
// Store original positions/rotations for reset
const charParts = {
    head: head,
    body: body,
    leftArm: leftArm,
    rightArm: rightArm,
    leftLeg: leftLeg,
    rightLeg: rightLeg
};

// Store original positions (for resetting animations)
const originalPositions = {
    leftArm: leftArm.position.clone(),
    rightArm: rightArm.position.clone(),
    leftLeg: leftLeg.position.clone(),
    rightLeg: rightLeg.position.clone()
};

// Animation state
let animationTime = 0;        // Time counter for animations (increases each frame)
const walkSpeed = 8;         // How fast walking animation cycles
const idleBobSpeed = 2;      // How fast idle bobbing animation cycles
const idleBobAmount = 0.02;   // How much character bobs up/down when idle

// Animation angles (in radians)
const walkArmSwing = 0.5;    // How far arms swing (radians)
const walkLegSwing = 0.6;    // How far legs swing (radians)
const jumpArmLift = 1.2;     // How much arms lift when jumping (radians)
const jumpLegTuck = 0.8;     // How much legs tuck when jumping (radians)

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
// GAME STATE (for UI/HUD)
// ================================================================
let playerHealth = 100;      // Player health (0-100)
let playerMaxHealth = 100;   // Maximum health
let ammoCurrent = 30;        // Current ammo in magazine
let ammoTotal = 90;          // Total ammo (reserve)
let score = 0;               // Player score
let uiVisible = true;        // UI visibility toggle

// ================================================================
// CAMERA MODE & ORBIT VARIABLES
// ================================================================
// Camera can be in two modes:
//   - Third-person: orbits around character (Roblox-style)
//   - First-person: camera inside character's head (FPS-style)

let cameraMode = 'first-person';  // 'first-person' or 'third-person' (default: first-person)

// We use two angles to control camera rotation:
//   theta = horizontal rotation (yaw). Controls left/right looking.
//   phi   = vertical rotation (pitch). Controls up/down looking.
//
// In third-person: phi is orbit angle (how high camera is above character)
// In first-person: phi is pitch angle (how much camera looks up/down)
//
// REFERENCE: This follows the same spherical coordinate approach as
// Three.js OrbitControls (see: three.js/examples/jsm/controls/OrbitControls.js)
//
// KEY CONVENTION:
//   - theta = 0: character faces -Z direction
//   - Mouse right (positive deltaX) → theta DECREASES → turn right
//   - Mouse down (positive deltaY) → phi changes based on mode

let theta = 0;              // horizontal rotation (yaw) in radians
let phi = 0;                // vertical rotation (pitch/orbit) in radians (0 = straight ahead for first-person)
const camDist = 5;          // distance from character to camera (third-person only)
const sensitivity = 0.003;  // mouse sensitivity

// Phi limits for third-person orbit (prevent camera going underground or overhead)
const PHI_MIN_ORBIT = 0.05;  // just above ground level
const PHI_MAX_ORBIT = 1.4;   // ~80° above (nearly overhead)

// Phi limits for first-person pitch (prevent looking too far up/down)
const PHI_MIN_PITCH = -1.4;  // ~80° down (can't look straight down)
const PHI_MAX_PITCH = 1.4;  // ~80° up (can't look straight up)

// ================================================================
// INPUT TRACKING
// ================================================================

const keys = { w: false, a: false, s: false, d: false, space: false, v: false, h: false };

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyS') keys.s = true;
    if (e.code === 'KeyD') keys.d = true;
    if (e.code === 'Space') keys.space = true;
    if (e.code === 'KeyV') {
        // Toggle camera mode (only on keydown, not keyup, to prevent rapid toggling)
        if (!keys.v) {  // Only toggle once per key press
            keys.v = true;
            const wasFirstPerson = (cameraMode === 'first-person');
            cameraMode = wasFirstPerson ? 'third-person' : 'first-person';
            
            // Reset phi when switching modes for smooth transition
            if (cameraMode === 'first-person') {
                phi = 0;  // Start looking straight ahead in first-person
            } else {
                phi = 0.4;  // Start at default orbit angle in third-person
            }
            
            console.log(`Camera mode: ${cameraMode}`);
        }
    }
    if (e.code === 'KeyH') {
        // Toggle UI visibility (only on keydown, not keyup, to prevent rapid toggling)
        if (!keys.h) {  // Only toggle once per key press
            keys.h = true;
            uiVisible = !uiVisible;
            const hudElement = document.getElementById('hud');
            if (hudElement) {
                if (uiVisible) {
                    hudElement.classList.remove('hidden');
                } else {
                    hudElement.classList.add('hidden');
                }
            }
            console.log(`UI ${uiVisible ? 'visible' : 'hidden'}`);
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
    if (e.code === 'Space') keys.space = false;
    if (e.code === 'KeyV') keys.v = false;
    if (e.code === 'KeyH') keys.h = false;
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

    // Update rotation angles
    theta -= dx * sensitivity;   // mouse right → theta decreases → turn right
    phi   += dy * sensitivity;   // mouse down  → phi increases (inverted vertical)

    // Clamp phi based on camera mode
    if (cameraMode === 'third-person') {
        // Third-person: phi is orbit angle (how high camera is above character)
        phi = Math.max(PHI_MIN_ORBIT, Math.min(PHI_MAX_ORBIT, phi));
    } else {
        // First-person: phi is pitch angle (how much camera looks up/down)
        phi = Math.max(PHI_MIN_PITCH, Math.min(PHI_MAX_PITCH, phi));
    }
});

// ================================================================
// ANIMATION LOOP
// ================================================================
let frame = 0;
let lastFpsUpdate = 0;
let fps = 60;
let fpsFrameCount = 0;
let fpsLastTime = performance.now();

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
    // 3) UPDATE CHARACTER MODEL & ANIMATIONS
    // ============================================================
    // Position the character group at charPos
    character.position.copy(charPos);

    // Character faces away from camera.
    // When theta = 0, camera is at +Z, character faces -Z.
    // character.rotation.y = 0 → faces -Z in Three.js. ✓
    // So: character.rotation.y = theta (directly!)
    character.rotation.y = theta;

    // ============================================================
    // 3.1) DETECT CHARACTER STATE (for animations)
    // ============================================================
    // Check if character is moving (any WASD key pressed)
    const isMoving = keys.w || keys.a || keys.s || keys.d;
    const isJumping = !onGround && vertVelocity > 0;  // Moving upward
    const isFalling = !onGround && vertVelocity <= 0; // Moving downward

    // Increment animation time (used for cycling animations)
    animationTime += 0.016; // ~60fps, so ~0.016 seconds per frame

    // ============================================================
    // 3.2) RESET TO DEFAULT POSITIONS (before applying animations)
    // ============================================================
    // Reset all parts to original positions/rotations
    leftArm.position.copy(originalPositions.leftArm);
    rightArm.position.copy(originalPositions.rightArm);
    leftLeg.position.copy(originalPositions.leftLeg);
    rightLeg.position.copy(originalPositions.rightLeg);
    
    leftArm.rotation.set(0, 0, 0);
    rightArm.rotation.set(0, 0, 0);
    leftLeg.rotation.set(0, 0, 0);
    rightLeg.rotation.set(0, 0, 0);
    body.rotation.set(0, 0, 0);
    head.rotation.set(0, 0, 0);

    // ============================================================
    // 3.3) APPLY ANIMATIONS BASED ON STATE
    // ============================================================
    
    if (isJumping || isFalling) {
        // ========================================================
        // JUMPING ANIMATION: Arms up, legs tuck
        // ========================================================
        // Lift arms up (rotate around X axis at shoulder)
        leftArm.rotation.x = -jumpArmLift;   // Rotate forward/up
        rightArm.rotation.x = -jumpArmLift;
        
        // Tuck legs (rotate around X axis at hip)
        leftLeg.rotation.x = jumpLegTuck;    // Rotate backward/up
        rightLeg.rotation.x = jumpLegTuck;
        
        // Slight body lean forward when jumping
        body.rotation.x = 0.2;
        
    } else if (isMoving) {
        // ========================================================
        // WALKING ANIMATION: Arms and legs swing opposite
        // ========================================================
        // Use sin/cos to create smooth swinging motion
        // Left arm and right leg swing together (opposite of right arm/left leg)
        const walkCycle = Math.sin(animationTime * walkSpeed);
        
        // Arms swing forward/back (rotate around X axis at shoulder)
        // Left arm swings forward when right arm swings back
        leftArm.rotation.x = -walkCycle * walkArmSwing;   // Forward/back swing
        rightArm.rotation.x = walkCycle * walkArmSwing;  // Opposite direction
        
        // Legs swing forward/back (rotate around X axis at hip)
        // Left leg swings forward when right leg swings back
        leftLeg.rotation.x = walkCycle * walkLegSwing;    // Forward/back swing
        rightLeg.rotation.x = -walkCycle * walkLegSwing;  // Opposite direction
        
        // Slight body bob when walking (moves up/down slightly)
        body.position.y = 0.2 + Math.abs(walkCycle) * 0.03;
        
    } else {
        // ========================================================
        // IDLE ANIMATION: Gentle breathing/bobbing
        // ========================================================
        // Character gently bobs up and down (breathing effect)
        const idleBob = Math.sin(animationTime * idleBobSpeed) * idleBobAmount;
        
        // Slight body movement (breathing)
        body.position.y = 0.2 + idleBob;
        head.position.y = 0.7 + idleBob * 0.5;  // Head moves less
        
        // Very slight arm movement (subtle idle animation)
        leftArm.rotation.x = Math.sin(animationTime * idleBobSpeed * 0.5) * 0.1;
        rightArm.rotation.x = -Math.sin(animationTime * idleBobSpeed * 0.5) * 0.1;
    }

    // ============================================================
    // 4) CAMERA POSITIONING (first-person or third-person)
    // ============================================================
    
    if (cameraMode === 'first-person') {
        // ========================================================
        // FIRST-PERSON MODE: Camera inside character's head
        // ========================================================
        // Position camera at character's eye level (head position)
        // Character head is at y + 0.7 relative to character center
        const eyeHeight = 0.7;  // height of eyes above character center
        camera.position.x = charPos.x;
        camera.position.y = charPos.y + eyeHeight;
        camera.position.z = charPos.z;

        // Rotate camera directly (yaw + pitch)
        // theta controls horizontal rotation (yaw)
        // phi controls vertical rotation (pitch)
        // In Three.js, positive X rotation = looking down, negative = looking up
        camera.rotation.order = 'YXZ';  // Y first (yaw), then X (pitch), then Z (roll)
        camera.rotation.y = theta;      // Horizontal rotation (yaw)
        camera.rotation.x = -phi;       // Vertical rotation (pitch, negated for correct direction)
        camera.rotation.z = 0;          // No roll

        // Hide character body in first-person (only show if needed for debugging)
        // We'll make the character invisible by setting its scale to 0
        // Or we could hide specific parts - for now, hide entire character
        character.visible = false;
    } else {
        // ========================================================
        // THIRD-PERSON MODE: Camera orbits around character
        // ========================================================
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

        // Show character in third-person
        character.visible = true;
    }

    // ============================================================
    // 5) UPDATE UI/HUD ELEMENTS
    // ============================================================
    // Update UI elements every frame (smooth updates)
    
    // Health bar
    const healthBarFill = document.getElementById('health-bar-fill');
    if (healthBarFill) {
        const healthPercent = (playerHealth / playerMaxHealth) * 100;
        healthBarFill.style.width = `${Math.max(0, Math.min(100, healthPercent))}%`;
        
        // Change color based on health level
        if (healthPercent > 60) {
            healthBarFill.style.background = 'linear-gradient(90deg, #00ff00, #44ff44)'; // Green
        } else if (healthPercent > 30) {
            healthBarFill.style.background = 'linear-gradient(90deg, #ffff00, #ffff44)'; // Yellow
        } else {
            healthBarFill.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)'; // Red
        }
    }
    
    // Ammo counter
    const ammoCurrentEl = document.getElementById('ammo-current');
    const ammoTotalEl = document.getElementById('ammo-total');
    if (ammoCurrentEl) ammoCurrentEl.textContent = ammoCurrent;
    if (ammoTotalEl) ammoTotalEl.textContent = `/ ${ammoTotal}`;
    
    // Score
    const scoreValueEl = document.getElementById('score-value');
    if (scoreValueEl) scoreValueEl.textContent = score.toLocaleString();
    
    // FPS counter (calculate accurate FPS)
    fpsFrameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - fpsLastTime;
    
    // Update FPS every second
    if (deltaTime >= 1000) {
        fps = Math.round((fpsFrameCount * 1000) / deltaTime);
        fpsFrameCount = 0;
        fpsLastTime = currentTime;
        
        const fpsValueEl = document.getElementById('fps-value');
        if (fpsValueEl) {
            fpsValueEl.textContent = fps;
            
            // Change color based on FPS
            if (fps >= 55) {
                fpsValueEl.style.color = '#0f0'; // Green (good)
            } else if (fps >= 30) {
                fpsValueEl.style.color = '#ff0'; // Yellow (okay)
            } else {
                fpsValueEl.style.color = '#f00'; // Red (poor)
            }
        }
    }

    // ============================================================
    // 6) DEBUG LOG (once per second)
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
    // 7) RENDER
    // ============================================================
    renderer.render(scene, camera);
}

// Start!
animate();
