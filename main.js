// Step 1: Import Three.js
import * as THREE from 'three';

// Step 2: Create the scene (our 3D world container)
const scene = new THREE.Scene();

// Step 3: Create the camera (our viewpoint)
const camera = new THREE.PerspectiveCamera(
    75, // Field of view (how wide we can see)
    window.innerWidth / window.innerHeight, // Aspect ratio (width/height)
    0.1, // Near clipping plane (objects closer than this are invisible)
    1000 // Far clipping plane (objects farther than this are invisible)
);

// Step 4: Create the renderer (draws our 3D scene onto the screen)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Step 5: Add a grid to visualize the ground (helps understand movement)
// GridHelper creates a 2D grid: (size, divisions, color1, color2)
const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
scene.add(gridHelper);

// Step 6: Add some lighting so we can see things (not pitch black)
// AmbientLight provides overall illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // White light, 60% intensity
scene.add(ambientLight);

// DirectionalLight simulates sunlight (coming from one direction)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5); // Position the light
scene.add(directionalLight);

// Step 7: Create a simple cube
const geometry = new THREE.BoxGeometry(1, 1, 1); // Width, height, depth
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Changed to StandardMaterial for lighting
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0.5, 0); // Position cube on the grid (0.5 = half cube height)
scene.add(cube);

// Step 8: Position the camera so we can see the cube and grid
camera.position.set(0, 2, 5); // X=0, Y=2 (slightly above ground), Z=5 (back)
camera.position.y = 2; // Start slightly above ground to see the grid

// Movement speed (how fast we move per frame)
const moveSpeed = 0.1;

// Mouse look sensitivity (how fast camera rotates when you move mouse)
const mouseSensitivity = 0.002;

// Camera rotation angles (in radians)
let cameraRotationX = 0; // Vertical rotation (pitch - looking up/down)
let cameraRotationY = 0; // Horizontal rotation (yaw - looking left/right)

// Track pointer lock state to prevent flicker
let isPointerLocked = false;
let ignoreNextMouseMove = false; // Ignore first movement after lock (prevents jump)

// Step 9: Keyboard input tracking
// This object will remember which keys are currently pressed
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false
};

// When a key is pressed down, mark it as true
window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyW') keys.w = true;
    if (event.code === 'KeyA') keys.a = true;
    if (event.code === 'KeyS') keys.s = true;
    if (event.code === 'KeyD') keys.d = true;
    if (event.code === 'Space') keys.space = true;
});

// When a key is released, mark it as false
window.addEventListener('keyup', (event) => {
    if (event.code === 'KeyW') keys.w = false;
    if (event.code === 'KeyA') keys.a = false;
    if (event.code === 'KeyS') keys.s = false;
    if (event.code === 'KeyD') keys.d = false;
    if (event.code === 'Space') keys.space = false;
});

// Step 10: Mouse look (camera rotation) - FIXED for flicker prevention
// Lock the pointer when user clicks on the canvas
renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
    ignoreNextMouseMove = true; // Ignore the first movement after lock
});

// Handle pointer lock state changes
document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
    if (!isPointerLocked) {
        ignoreNextMouseMove = false; // Reset when lock is lost
    }
});

// Handle pointer lock errors (some browsers)
document.addEventListener('pointerlockerror', () => {
    isPointerLocked = false;
    ignoreNextMouseMove = false;
});

// Track mouse movement when pointer is locked
document.addEventListener('mousemove', (event) => {
    // Only process if pointer is actually locked
    if (!isPointerLocked || document.pointerLockElement !== renderer.domElement) {
        return;
    }
    
    // Ignore the first movement after lock (prevents initial jump)
    if (ignoreNextMouseMove) {
        ignoreNextMouseMove = false;
        return;
    }
    
    // Get movement values
    const deltaX = event.movementX || 0;
    const deltaY = event.movementY || 0;
    
    // Filter out suspiciously large movements (prevents flicker from browser bugs)
    // Normal mouse movement is rarely more than 100 pixels per frame
    const maxMovement = 100;
    if (Math.abs(deltaX) > maxMovement || Math.abs(deltaY) > maxMovement) {
        return; // Ignore this movement (likely a bug)
    }
    
    // Update rotation angles based on mouse movement
    cameraRotationY -= deltaX * mouseSensitivity; // Horizontal (left/right)
    cameraRotationX -= deltaY * mouseSensitivity; // Vertical (up/down)
    
    // Limit vertical rotation so you can't flip upside down
    cameraRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotationX));
});

// Step 11: Animation loop (runs 60 times per second)
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate the cube slightly each frame (optional - helps see it's 3D)
    cube.rotation.y += 0.01;
    
    // Apply camera rotation first (mouse look)
    // We use Euler angles to set the camera's rotation
    camera.rotation.order = 'YXZ'; // Important: rotate Y first, then X
    camera.rotation.y = cameraRotationY; // Horizontal rotation
    camera.rotation.x = cameraRotationX; // Vertical rotation
    
    // Handle camera movement based on keyboard input
    // IMPORTANT: Use camera's actual forward direction (not manual calculation)
    // This ensures movement always matches where you're looking
    
    // Get camera's forward direction vector (where it's actually looking)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    
    // We only want horizontal movement (XZ plane), so remove vertical component
    forward.y = 0;
    forward.normalize(); // Make it length 1, then multiply by speed
    
    // Get right direction (perpendicular to forward, on the ground)
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)); // Cross product with up vector
    right.normalize();
    
    // Apply movement based on keys pressed
    if (keys.w) {
        // Move forward (in the direction camera is facing)
        camera.position.add(forward.clone().multiplyScalar(moveSpeed));
    }
    if (keys.s) {
        // Move backward (opposite of forward)
        camera.position.add(forward.clone().multiplyScalar(-moveSpeed));
    }
    if (keys.a) {
        // Strafe left (opposite of right)
        camera.position.add(right.clone().multiplyScalar(-moveSpeed));
    }
    if (keys.d) {
        // Strafe right
        camera.position.add(right.clone().multiplyScalar(moveSpeed));
    }
    
    // Draw the scene from the camera's perspective
    renderer.render(scene, camera);
}

// Start the animation loop
animate();
