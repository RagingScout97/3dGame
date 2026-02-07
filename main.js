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

// ================================================================
// ENVIRONMENT CREATION SYSTEM
// ================================================================
// Modular system for creating interactive environment elements
// Designed to be extensible for future game engine

// Materials for environment elements
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x4a9eff });
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

// Environment object storage
const environment = {
    walls: [],
    platforms: [],
    obstacles: [],
    allObjects: [] // Combined for collision detection
};

// Collision objects storage (for efficient collision checking)
const collisionObjects = [];

/**
 * Create a wall at specified position and size
 * @param {THREE.Vector3} position - Center position of wall
 * @param {THREE.Vector3} size - Size of wall (width, height, depth)
 * @param {number} rotationY - Rotation around Y axis (in radians)
 * @returns {THREE.Mesh} The created wall mesh
 */
function createWall(position, size, rotationY = 0) {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const wall = new THREE.Mesh(geometry, wallMaterial);
    wall.position.copy(position);
    wall.rotation.y = rotationY;
    scene.add(wall);
    
    // Store for collision detection
    const collisionData = {
        type: 'wall',
        mesh: wall,
        min: new THREE.Vector3(
            position.x - size.x / 2,
            position.y - size.y / 2,
            position.z - size.z / 2
        ),
        max: new THREE.Vector3(
            position.x + size.x / 2,
            position.y + size.y / 2,
            position.z + size.z / 2
        )
    };
    
    environment.walls.push(wall);
    environment.allObjects.push(wall);
    collisionObjects.push(collisionData);
    
    return wall;
}

/**
 * Create a platform at specified position and size
 * @param {THREE.Vector3} position - Center position of platform
 * @param {THREE.Vector3} size - Size of platform (width, height, depth)
 * @returns {THREE.Mesh} The created platform mesh
 */
function createPlatform(position, size) {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const platform = new THREE.Mesh(geometry, platformMaterial);
    platform.position.copy(position);
    scene.add(platform);
    
    // Store for collision detection
    const collisionData = {
        type: 'platform',
        mesh: platform,
        min: new THREE.Vector3(
            position.x - size.x / 2,
            position.y - size.y / 2,
            position.z - size.z / 2
        ),
        max: new THREE.Vector3(
            position.x + size.x / 2,
            position.y + size.y / 2,
            position.z + size.z / 2
        )
    };
    
    environment.platforms.push(platform);
    environment.allObjects.push(platform);
    collisionObjects.push(collisionData);
    
    return platform;
}

/**
 * Create ground plane
 * @param {number} size - Size of ground plane
 * @returns {THREE.Mesh} The created ground mesh
 */
function createGround(size = 50) {
    const geometry = new THREE.PlaneGeometry(size, size);
    const ground = new THREE.Mesh(geometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Ground collision (infinite plane at y=0)
    const collisionData = {
        type: 'ground',
        mesh: ground,
        min: new THREE.Vector3(-Infinity, -0.1, -Infinity),
        max: new THREE.Vector3(Infinity, 0.1, Infinity)
    };
    
    collisionObjects.push(collisionData);
    
    return ground;
}

/**
 * Create default playable environment
 */
function createDefaultEnvironment() {
    // Create ground
    createGround(50);
    
    // Arena boundary walls (20x20 area)
    const arenaSize = 20;
    const wallHeight = 5;
    const wallThickness = 0.5;
    
    // North wall (positive Z)
    createWall(
        new THREE.Vector3(0, wallHeight / 2, arenaSize / 2),
        new THREE.Vector3(arenaSize, wallHeight, wallThickness),
        0
    );
    
    // South wall (negative Z)
    createWall(
        new THREE.Vector3(0, wallHeight / 2, -arenaSize / 2),
        new THREE.Vector3(arenaSize, wallHeight, wallThickness),
        0
    );
    
    // East wall (positive X)
    createWall(
        new THREE.Vector3(arenaSize / 2, wallHeight / 2, 0),
        new THREE.Vector3(wallThickness, wallHeight, arenaSize),
        0
    );
    
    // West wall (negative X)
    createWall(
        new THREE.Vector3(-arenaSize / 2, wallHeight / 2, 0),
        new THREE.Vector3(wallThickness, wallHeight, arenaSize),
        0
    );
    
    // Platforms at different heights
    // Lower platform (easy to jump on - at y=1.8, only 0.3 units above ground)
    createPlatform(
        new THREE.Vector3(0, 1.8, 0),
        new THREE.Vector3(4, 0.2, 4)
    );
    
    // Medium height platforms
    createPlatform(
        new THREE.Vector3(5, 2.5, 5),
        new THREE.Vector3(3, 0.2, 3)
    );
    
    createPlatform(
        new THREE.Vector3(-5, 3, 5),
        new THREE.Vector3(3, 0.2, 3)
    );
    
    createPlatform(
        new THREE.Vector3(5, 3.5, -5),
        new THREE.Vector3(3, 0.2, 3)
    );
    
    createPlatform(
        new THREE.Vector3(-5, 4, -5),
        new THREE.Vector3(4, 0.2, 4)
    );
    
    // Higher platform
    createPlatform(
        new THREE.Vector3(0, 5, 0),
        new THREE.Vector3(2, 0.2, 2)
    );
}

// Create the default environment
createDefaultEnvironment();

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
const charPos = new THREE.Vector3(-3, 1.5, -3); // Spawn away from center platform
const spawnPosition = new THREE.Vector3(-3, 1.5, -3); // Respawn position (away from platforms)

// Movement
const moveSpeed = 0.1;

// Jump & gravity
const jumpSpeed = 0.2;      // Increased jump height for better platform access
const gravity = 0.01;
const groundY = 1.5;        // character Y when standing on ground
let vertVelocity = 0;
let onGround = true;

// ================================================================
// COLLISION DETECTION SYSTEM
// ================================================================
// AABB (Axis-Aligned Bounding Box) collision detection

// Character collision bounds
const charSize = {
    width: 0.4,   // X axis
    height: 1.5,  // Y axis
    depth: 0.4    // Z axis
};

/**
 * Check if character would collide at new position
 * @param {THREE.Vector3} newPos - Proposed new position
 * @returns {Object} {collided: boolean, axis: 'x'|'z'|'y'|null, object: Object|null}
 */
function checkCollision(newPos) {
    // Character bounding box at new position
    const charMin = new THREE.Vector3(
        newPos.x - charSize.width / 2,
        newPos.y - charSize.height / 2,
        newPos.z - charSize.depth / 2
    );
    const charMax = new THREE.Vector3(
        newPos.x + charSize.width / 2,
        newPos.y + charSize.height / 2,
        newPos.z + charSize.depth / 2
    );
    
    for (const obj of collisionObjects) {
        // Skip ground (handled separately)
        if (obj.type === 'ground') continue;
        
        // For platforms, check if player is at platform level (can collide horizontally)
        if (obj.type === 'platform') {
            const charBottom = newPos.y - charSize.height / 2;
            const charTop = newPos.y + charSize.height / 2;
            const platformTop = obj.max.y;
            const platformBottom = obj.min.y;
            
            // Platform collision logic:
            // - If standing ON platform (bottom at platform top), allow movement (skip collision)
            // - If above platform, check horizontal collision (might hit edge)
            // - If below platform, can walk under (skip collision)
            // - If intersecting platform vertically (inside it), block horizontal movement
            
            // Standing on top of platform - allow free movement
            if (charBottom >= platformTop - 0.05 && charBottom <= platformTop + 0.05) {
                continue; // Skip collision - can move freely on top
            }
            
            // Below platform - can walk under
            if (charTop <= platformBottom) {
                continue; // Skip collision - can walk under
            }
            
            // Above platform - might hit edge, check horizontal collision
            if (charBottom > platformTop) {
                // Continue to collision check - might hit platform edge from above
            } else {
                // Intersecting platform vertically (inside it) - block horizontal movement
                // Continue to collision check below
            }
        }
        
        // AABB collision check
        if (charMin.x < obj.max.x && charMax.x > obj.min.x &&
            charMin.y < obj.max.y && charMax.y > obj.min.y &&
            charMin.z < obj.max.z && charMax.z > obj.min.z) {
            
            // Determine primary collision axis (which axis has smallest overlap)
            const overlapX = Math.min(charMax.x - obj.min.x, obj.max.x - charMin.x);
            const overlapZ = Math.min(charMax.z - obj.min.z, obj.max.z - charMin.z);
            
            // Return the axis with smaller overlap (primary collision direction)
            if (overlapX < overlapZ) {
                return { collided: true, axis: 'x', object: obj };
            } else {
                return { collided: true, axis: 'z', object: obj };
            }
        }
    }
    
    return { collided: false, axis: null, object: null };
}

/**
 * Check platform collision (blocks downward movement when falling, upward movement when rising)
 * Optimized platform collision detection with smooth landing - prevents "thump" feeling
 * @param {THREE.Vector3} newPos - Proposed new position
 * @param {number} currentY - Current Y position (before movement)
 * @param {number} velocityY - Current vertical velocity (negative = falling, positive = rising)
 * @returns {Object} {onPlatform: boolean, platformY: number|null, hitCeiling: boolean, ceilingY: number|null}
 */
function checkPlatformCollision(newPos, currentY, velocityY) {
    // Early exit optimization: skip if moving up too fast (won't land) or down too slow (already past)
    if (velocityY > 0.1 || velocityY < -0.3) {
        // Only check ceiling if moving up fast, only check landing if falling fast enough
        if (velocityY > 0.1) {
            // Check ceiling only
            const charTop = newPos.y + charSize.height / 2;
            const charMinX = newPos.x - charSize.width / 2;
            const charMaxX = newPos.x + charSize.width / 2;
            const charMinZ = newPos.z - charSize.depth / 2;
            const charMaxZ = newPos.z + charSize.depth / 2;
            
            let lowestCeiling = null;
            let lowestCeilingY = Infinity;
            
            for (const obj of collisionObjects) {
                if (obj.type === 'platform') {
                    if (charMinX < obj.max.x && charMaxX > obj.min.x &&
                        charMinZ < obj.max.z && charMaxZ > obj.min.z) {
                        const platformBottom = obj.min.y;
                        const previousCharTop = currentY + charSize.height / 2;
                        const wasBelowPlatform = previousCharTop <= platformBottom + 0.1;
                        const isHittingCeiling = charTop >= platformBottom - 0.05 && 
                                                charTop < platformBottom + 0.1 && 
                                                wasBelowPlatform;
                        
                        if (isHittingCeiling && platformBottom < lowestCeilingY) {
                            lowestCeiling = obj;
                            lowestCeilingY = platformBottom;
                        }
                    }
                }
            }
            
            if (lowestCeiling) {
                return { onPlatform: false, platformY: null, hitCeiling: true, ceilingY: lowestCeilingY };
            }
            return { onPlatform: false, platformY: null, hitCeiling: false, ceilingY: null };
        }
        return { onPlatform: false, platformY: null, hitCeiling: false, ceilingY: null };
    }
    
    const charBottom = newPos.y - charSize.height / 2;
    const charTop = newPos.y + charSize.height / 2;
    const charMinX = newPos.x - charSize.width / 2;
    const charMaxX = newPos.x + charSize.width / 2;
    const charMinZ = newPos.z - charSize.depth / 2;
    const charMaxZ = newPos.z + charSize.depth / 2;
    
    let highestPlatform = null;
    let highestPlatformY = -Infinity;
    let lowestCeiling = null;
    let lowestCeilingY = Infinity;
    
    // Optimized: only check platforms that are potentially in range
    for (const obj of collisionObjects) {
        if (obj.type === 'platform') {
            // Quick AABB rejection test (optimization)
            if (charMaxX < obj.min.x || charMinX > obj.max.x ||
                charMaxZ < obj.min.z || charMinZ > obj.max.z) {
                continue; // No horizontal overlap, skip
            }
            
            const platformTop = obj.max.y;
            const platformBottom = obj.min.y;
            const previousCharBottom = currentY - charSize.height / 2;
            const previousCharTop = currentY + charSize.height / 2;
            
            // Check landing collision (falling downward) - precise tolerance for smooth landing
            if (velocityY <= 0) {
                // Check if character bottom would pass through or is passing through platform top
                // We need to check a wider range to catch fast falls from higher platforms
                if (charBottom <= platformTop + 0.15 && charBottom >= platformTop - 0.3) {
                    // Verify we were above platform before this frame (important for jumping between platforms)
                    // More lenient check for jumping from higher to lower platforms
                    const wasAbovePlatform = previousCharBottom >= platformTop - 0.1;
                    
                    // Landing detection: character bottom is at or passing through platform top
                    // CRITICAL: We want to catch when charBottom is at platformTop or just went through
                    // For fast falls, charBottom might already be slightly below platformTop, so we need to catch it
                    const isPassingThrough = charBottom <= platformTop + 0.1 && charBottom >= platformTop - 0.15;
                    const isLandingOnPlatform = isPassingThrough && 
                                               charBottom > platformBottom && 
                                               wasAbovePlatform;
                    
                    if (isLandingOnPlatform && platformTop > highestPlatformY) {
                        highestPlatform = obj;
                        highestPlatformY = platformTop;
                    }
                }
            }
            
            // Check ceiling collision (moving upward) - tighter tolerance
            if (velocityY > 0) {
                if (charTop >= platformBottom - 0.15 && charTop <= platformBottom + 0.3) {
                    const wasBelowPlatform = previousCharTop <= platformBottom + 0.05;
                    const isHittingCeiling = charTop >= platformBottom - 0.05 && 
                                            charTop < platformBottom + 0.05 && 
                                            wasBelowPlatform;
                    
                    if (isHittingCeiling && platformBottom < lowestCeilingY) {
                        lowestCeiling = obj;
                        lowestCeilingY = platformBottom;
                    }
                }
            }
        }
    }
    
    const result = { 
        onPlatform: false, 
        platformY: null,
        hitCeiling: false,
        ceilingY: null
    };
    
    if (highestPlatform) {
        result.onPlatform = true;
        result.platformY = highestPlatformY;
    }
    
    if (lowestCeiling) {
        result.hitCeiling = true;
        result.ceilingY = lowestCeilingY;
    }
    
    return result;
}

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
// DEATH AND RESPAWN SYSTEM
// ================================================================
let isDead = false;
let deathTimer = 0;
const respawnDelay = 2;      // seconds
const deathThreshold = -10; // Y level below which player dies

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

    // ============================================================
    // 1) CHARACTER MOVEMENT (WASD, relative to character facing)
    // ============================================================
    // Character faces direction: (-sin(theta), 0, -cos(theta))
    // This is the local -Z axis rotated by theta around Y.
    //
    // Right direction (perpendicular): (cos(theta), 0, -sin(theta))
    // This is cross(forward, up).

    // Only allow movement if not dead
    if (!isDead) {
        const fwdX = -Math.sin(theta) * moveSpeed;
        const fwdZ = -Math.cos(theta) * moveSpeed;
        const rgtX =  Math.cos(theta) * moveSpeed;
        const rgtZ = -Math.sin(theta) * moveSpeed;

        // Try to move forward
        if (keys.w) {
            const newPos = new THREE.Vector3(charPos.x + fwdX, charPos.y, charPos.z + fwdZ);
            const collision = checkCollision(newPos);
            if (!collision.collided || collision.axis !== 'x') {
                charPos.x += fwdX;
            }
            if (!collision.collided || collision.axis !== 'z') {
                charPos.z += fwdZ;
            }
        }
        
        // Try to move backward
        if (keys.s) {
            const newPos = new THREE.Vector3(charPos.x - fwdX, charPos.y, charPos.z - fwdZ);
            const collision = checkCollision(newPos);
            if (!collision.collided || collision.axis !== 'x') {
                charPos.x -= fwdX;
            }
            if (!collision.collided || collision.axis !== 'z') {
                charPos.z -= fwdZ;
            }
        }
        
        // Try to strafe left
        if (keys.a) {
            const newPos = new THREE.Vector3(charPos.x - rgtX, charPos.y, charPos.z - rgtZ);
            const collision = checkCollision(newPos);
            if (!collision.collided || collision.axis !== 'x') {
                charPos.x -= rgtX;
            }
            if (!collision.collided || collision.axis !== 'z') {
                charPos.z -= rgtZ;
            }
        }
        
        // Try to strafe right
        if (keys.d) {
            const newPos = new THREE.Vector3(charPos.x + rgtX, charPos.y, charPos.z + rgtZ);
            const collision = checkCollision(newPos);
            if (!collision.collided || collision.axis !== 'x') {
                charPos.x += rgtX;
            }
            if (!collision.collided || collision.axis !== 'z') {
                charPos.z += rgtZ;
            }
        }
    }

    // ============================================================
    // 2) JUMPING & GRAVITY
    // ============================================================
    if (!isDead) {
        if (keys.space && onGround) {
            vertVelocity = jumpSpeed;
            onGround = false;
        }

        vertVelocity -= gravity;
        const newY = charPos.y + vertVelocity;
        
        // Check platform collision (landing when falling, ceiling when rising)
        const platformCollision = checkPlatformCollision(
            new THREE.Vector3(charPos.x, newY, charPos.z),
            charPos.y,
            vertVelocity
        );
        
        if (platformCollision.onPlatform && vertVelocity <= 0) {
            // Land on platform (falling downward) - smooth landing
            // Position character so bottom is exactly at platform top (not inside)
            // platformY is the platform top (obj.max.y)
            // Character bottom = charPos.y - charSize.height / 2
            // We want: charPos.y - charSize.height / 2 = platformTop
            // So: charPos.y = platformTop + charSize.height / 2
            const platformTop = platformCollision.platformY;
            const targetY = platformTop + charSize.height / 2;
            
            // CRITICAL: Always ensure character bottom is exactly at platform top (never inside)
            // Calculate what the character bottom would be at targetY
            const resultingCharBottom = targetY - charSize.height / 2;
            
            // If we're already past the platform (inside it), we need to snap to correct position
            // Check if current position would put us inside
            const currentCharBottom = newY - charSize.height / 2;
            
            // If we're inside or about to land, snap to correct position
            if (currentCharBottom <= platformTop + 0.2) {
                // Ensure final position puts character bottom exactly at platform top
                // Add small offset to ensure we're on top, not inside
                const finalY = platformTop + charSize.height / 2 + 0.001; // Tiny offset to ensure on top
                charPos.y = finalY;
                vertVelocity = 0;
                onGround = true;
            } else {
                // Still falling, continue movement
                charPos.y = newY;
                onGround = false;
            }
        } else if (platformCollision.hitCeiling && vertVelocity > 0) {
            // Hit platform ceiling (moving upward) - smooth collision
            const targetY = platformCollision.ceilingY - charSize.height / 2;
            const distanceToCeiling = Math.abs(newY - targetY);
            
            if (distanceToCeiling < 0.1) {
                // Smooth ceiling hit - snap to just below platform
                charPos.y = targetY;
                vertVelocity = 0;
                onGround = false;
            } else {
                // Still rising, continue movement
                charPos.y = newY;
                onGround = false;
            }
        } else if (newY <= groundY) {
            // Ground collision
            charPos.y = groundY;
            vertVelocity = 0;
            onGround = true;
        } else {
            // In air, no collision
            charPos.y = newY;
            onGround = false;
        }
    }

    // ============================================================
    // 2.5) DEATH DETECTION & RESPAWN
    // ============================================================
    if (!isDead && charPos.y < deathThreshold) {
        // Player fell below death threshold
        isDead = true;
        deathTimer = 0;
        console.log('YOU DIED!');
        
        // Show death overlay
        const deathOverlay = document.getElementById('death-overlay');
        if (deathOverlay) {
            deathOverlay.classList.add('visible');
        }
    }
    
    if (isDead) {
        deathTimer += 0.016; // ~60fps, so ~0.016 seconds per frame
        
        // Death animation: character falls and rotates
        character.rotation.x += 0.05;
        character.rotation.z += 0.03;
        vertVelocity = -0.2; // Continue falling
        
        // Update respawn countdown UI
        const respawnCountdown = document.getElementById('respawn-countdown');
        if (respawnCountdown) {
            const remaining = Math.ceil(respawnDelay - deathTimer);
            respawnCountdown.textContent = Math.max(0, remaining);
        }
        
        // Respawn after delay
        if (deathTimer >= respawnDelay) {
            // Respawn
            charPos.copy(spawnPosition);
            character.position.copy(spawnPosition);
            character.rotation.set(0, theta, 0); // Reset rotation
            vertVelocity = 0;
            onGround = true;
            isDead = false;
            deathTimer = 0;
            console.log('RESPAWNED!');
            
            // Hide death overlay
            const deathOverlay = document.getElementById('death-overlay');
            if (deathOverlay) {
                deathOverlay.classList.remove('visible');
            }
        }
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
