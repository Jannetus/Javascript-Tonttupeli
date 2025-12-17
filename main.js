import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ====================================================================
// --- KÄYTTÖLIITTYMÄT (UI) ---
// ====================================================================

const uiRepu = document.createElement('div');
uiRepu.style.position = 'absolute';
uiRepu.style.bottom = '20px';
uiRepu.style.left = '20px';
uiRepu.style.padding = '10px';
uiRepu.style.background = 'rgba(0, 0, 0, 0.5)';
uiRepu.style.color = 'white';
uiRepu.style.fontFamily = 'Arial, sans-serif';
uiRepu.style.borderRadius = '5px';
uiRepu.innerText = 'Kantaa: -';
document.body.appendChild(uiRepu);

const uiSienet = document.createElement('div');
uiSienet.style.position = 'absolute';
uiSienet.style.top = '20px';
uiSienet.style.right = '20px';
uiSienet.style.padding = '10px';
uiSienet.style.background = 'rgba(0, 0, 0, 0.5)';
uiSienet.style.color = 'white';
uiSienet.style.fontFamily = 'Arial, sans-serif';
uiSienet.style.borderRadius = '5px';
uiSienet.innerText = 'Sieniä kerätty: 0 / 8';
document.body.appendChild(uiSienet);

const uiVoitto = document.createElement('div');
uiVoitto.style.position = 'absolute';
uiVoitto.style.top = '50%';
uiVoitto.style.left = '50%';
uiVoitto.style.transform = 'translate(-50%, -50%)';
uiVoitto.style.padding = '40px';
uiVoitto.style.background = 'rgba(0, 0, 0, 0.8)';
uiVoitto.style.color = '#ffeb3b';
uiVoitto.style.fontFamily = 'Arial, sans-serif';
uiVoitto.style.fontSize = '24px';
uiVoitto.style.fontWeight = 'bold';
uiVoitto.style.borderRadius = '20px';
uiVoitto.style.textAlign = 'center';
uiVoitto.style.display = 'none'; 
uiVoitto.style.border = '4px solid #ffeb3b';
uiVoitto.innerText = 'Onnittelut, löysit kaikki 8 sientä!';
document.body.appendChild(uiVoitto);

const uiGameOver = document.createElement('div');
uiGameOver.style.position = 'absolute';
uiGameOver.style.top = '50%';
uiGameOver.style.left = '50%';
uiGameOver.style.transform = 'translate(-50%, -50%)';
uiGameOver.style.padding = '40px';
uiGameOver.style.background = 'rgba(100, 0, 0, 0.9)';
uiGameOver.style.color = 'white';
uiGameOver.style.fontFamily = 'Arial, sans-serif';
uiGameOver.style.borderRadius = '20px';
uiGameOver.style.textAlign = 'center';
uiGameOver.style.display = 'none';
uiGameOver.style.zIndex = '100';

const gameOverText = document.createElement('p');
gameOverText.innerText = 'Voi ei! Sieni sai sinut kiinni! Aloitetaanko alusta?';
gameOverText.style.fontSize = '22px';
uiGameOver.appendChild(gameOverText);

const restartBtn = document.createElement('button');
restartBtn.innerText = 'Aloita alusta';
restartBtn.style.padding = '10px 20px';
restartBtn.style.fontSize = '18px';
restartBtn.style.cursor = 'pointer';
restartBtn.onclick = resetGame;
uiGameOver.appendChild(restartBtn);
document.body.appendChild(uiGameOver);

// ====================================================================
// --- PERUSKOMPONENTIT JA MUUTTUJAT ---
// ====================================================================

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87ceeb); 
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const moveState = { forward: false, backward: false, left: false, right: false, shift: false };
const baseSpeed = 0.15;
const runSpeed = 0.25;
const gravity = -0.02;
let velocityY = 0;
let isOnGround = true;
let isGameOver = false;

const normalGroundY = 0.5;
const waterGroundY = -0.3; 
let currentGroundY = normalGroundY;

let character, controls, duck, enemy, snowParticles;
const loader = new GLTFLoader();
const collidableObjects = []; 
const rocks = [];            
const mushrooms = [];
const ripples = []; 
let mushroomsCollected = 0;

const enemySpeed = 0.05;
let heldRock = null;         
let flyingRock = null;       
let rockVelocity = new THREE.Vector3();

const pondCenter = new THREE.Vector3(15, 0.05, -15);
const pondRadius = 5.2;
let duckTarget = new THREE.Vector3();
const duckSpeed = 0.02;
const modelRotationOffset = -Math.PI / 2; 

// ====================================================================
// --- MAAILMAN RAKENTAMINEN ---
// ====================================================================

const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x4caf50 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(10, 20, 10);
sun.castShadow = true;
scene.add(sun);

function createTree(x, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
    trunk.position.y = 2;
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2, 4), new THREE.MeshStandardMaterial({ color: 0x228b22 }));
    leaves.position.y = 6;
    group.add(trunk, leaves);
    group.position.set(x, 0, z);
    scene.add(group);
}

for(let i = 0; i < 10; i++) createTree((Math.random()-0.5)*80, (Math.random()-0.5)*80);

const pond = new THREE.Mesh(new THREE.CylinderGeometry(pondRadius, pondRadius, 0.1, 64), new THREE.MeshStandardMaterial({ color: 0x0044ff, transparent: true, opacity: 0.7, metalness: 0.9, roughness: 0.1 }));
pond.position.copy(pondCenter);
scene.add(pond);

function createMushroom(x, z) {
    const group = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4), new THREE.MeshStandardMaterial({color: 0xffffff}));
    stem.position.y = 0.2;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({color: 0xff0000}));
    cap.position.y = 0.4;
    group.add(stem, cap);
    group.position.set(x, 0, z);
    scene.add(group);
    mushrooms.push(group);
}

function spawnMushrooms() {
    mushrooms.forEach(m => scene.remove(m));
    mushrooms.length = 0;
    for(let i = 0; i < 8; i++) createMushroom((Math.random()-0.5)*60, (Math.random()-0.5)*60);
}
spawnMushrooms();

// Lumisade
const snowCount = 500;
const snowGeo = new THREE.BufferGeometry();
const snowPos = new Float32Array(snowCount * 3);
for(let i=0; i<snowCount*3; i+=3) {
    snowPos[i] = (Math.random()-0.5)*100;
    snowPos[i+1] = Math.random()*50;
    snowPos[i+2] = (Math.random()-0.5)*100;
}
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
snowParticles = new THREE.Points(snowGeo, new THREE.PointsMaterial({color: 0xffffff, size: 0.1}));
scene.add(snowParticles);

function createRipple(x, z) {
    const rippleGeo = new THREE.RingGeometry(0.1, 0.2, 32);
    const rippleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const ripple = new THREE.Mesh(rippleGeo, rippleMat);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set(x, 0.12, z);
    scene.add(ripple);
    ripples.push({ mesh: ripple, age: 0 });
}

// ====================================================================
// --- MALLIEN LATAUS ---
// ====================================================================

loader.load('hahmo.glb', (gltf) => {
    character = gltf.scene;
    character.scale.set(0.5, 0.5, 0.5);
    character.position.set(0, normalGroundY, 0);
    scene.add(character);
    controls = new OrbitControls(camera, renderer.domElement);
});

loader.load('vihollinen.glb', (gltf) => {
    enemy = gltf.scene;
    enemy.scale.set(0.5, 0.5, 0.5);
    enemy.position.set(-25, normalGroundY, -25); 
    scene.add(enemy);
});

// KORJATTU: Ankka aloittaa lammesta
loader.load('ankka.glb', (gltf) => {
    duck = gltf.scene;
    duck.scale.set(0.12, 0.12, 0.12);
    duck.position.copy(pondCenter); 
    scene.add(duck);
    setNewDuckTarget();
});

// PALAUTETTU: Mökki maailmaan
loader.load('mokki.glb', (gltf) => {
    const house = gltf.scene;
    house.scale.set(0.01, 0.01, 0.01);
    house.position.set(0, 0, -20);
    scene.add(house);
    house.traverse(c => { if(c.isMesh) collidableObjects.push(c); });
});

function setNewDuckTarget() {
    const angle = Math.random()*Math.PI*2;
    const dist = Math.random()*(pondRadius-1);
    duckTarget.set(pondCenter.x + Math.cos(angle)*dist, 0.15, pondCenter.z + Math.sin(angle)*dist);
}

// ====================================================================
// --- RESET JA KONTROLLIT ---
// ====================================================================

function resetGame() {
    mushroomsCollected = 0;
    uiSienet.innerText = 'Sieniä kerätty: 0 / 8';
    uiGameOver.style.display = 'none';
    uiVoitto.style.display = 'none';
    isGameOver = false;
    if (character) character.position.set(0, normalGroundY, 0);
    if (enemy) enemy.position.set(-25, normalGroundY, -25);
    spawnMushrooms();
}

window.addEventListener('mousedown', (event) => {
    if (isGameOver || event.button !== 0 || !character) return; 
    if (!heldRock) {
        let closestRock = null; let minDist = 3.0;
        rocks.forEach(rock => {
            const d = character.position.distanceTo(rock.position);
            if (d < minDist) { minDist = d; closestRock = rock; }
        });
        if (closestRock) { heldRock = closestRock; scene.remove(heldRock); uiRepu.innerText = 'Kantaa: Kivi'; }
    } else {
        const throwRock = heldRock; heldRock = null; uiRepu.innerText = 'Kantaa: -';
        throwRock.position.copy(character.position).y += 1.5;
        scene.add(throwRock);
        const throwDir = new THREE.Vector3(0, 0, 1).applyQuaternion(character.quaternion);
        const finalDir = throwDir.applyMatrix4(new THREE.Matrix4().makeRotationY(-modelRotationOffset)).normalize();
        rockVelocity.copy(finalDir).multiplyScalar(0.5);
        rockVelocity.y = 0.25; 
        flyingRock = throwRock;
    }
});

window.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    const k = e.key.toLowerCase();
    if (k === 'w') moveState.forward = true; 
    if (k === 's') moveState.backward = true;
    if (k === 'a') moveState.right = true; 
    if (k === 'd') moveState.left = true;
    if (e.shiftKey) moveState.shift = true;
    if (k === ' ' && isOnGround) { velocityY = 0.3; isOnGround = false; }
});

window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w') moveState.forward = false; 
    if (k === 's') moveState.backward = false;
    if (k === 'a') moveState.right = false; 
    if (k === 'd') moveState.left = false;
    if (!e.shiftKey) moveState.shift = false;
});

// ====================================================================
// --- ANIMAATIOSILMUKKA ---
// ====================================================================

function animate() {
    requestAnimationFrame(animate);
    const t = Date.now() * 0.001;

    if (character && enemy && !isGameOver) {
        const distToEnemy = character.position.distanceTo(enemy.position);
        if (distToEnemy < 1.0) {
            isGameOver = true;
            uiGameOver.style.display = 'block';
        }

        const dPond = new THREE.Vector2(character.position.x, character.position.z).distanceTo(new THREE.Vector2(pondCenter.x, pondCenter.z));
        currentGroundY = (dPond < pondRadius) ? waterGroundY : normalGroundY;

        character.position.y += velocityY;
        velocityY += gravity;
        if (character.position.y <= currentGroundY) {
            character.position.y = currentGroundY;
            velocityY = 0; isOnGround = true;
        }

        const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize();
        const camSide = new THREE.Vector3().crossVectors(camera.up, camDir).negate(); camSide.y = 0; camSide.normalize();

        let mDir = new THREE.Vector3(0, 0, 0);
        if (moveState.forward) mDir.add(camDir); if (moveState.backward) mDir.sub(camDir);
        if (moveState.left) mDir.add(camSide); if (moveState.right) mDir.sub(camSide);

        if (mDir.length() > 0) {
            const activeSpeed = moveState.shift ? runSpeed : baseSpeed;
            character.position.addScaledVector(mDir.normalize(), (dPond < pondRadius ? activeSpeed * 0.5 : activeSpeed));
            character.rotation.y = Math.atan2(mDir.x, mDir.z) + modelRotationOffset;
            if (dPond < pondRadius && Math.random() < 0.1) createRipple(character.position.x, character.position.z);
        }

        for (let i = mushrooms.length - 1; i >= 0; i--) {
            if (character.position.distanceTo(mushrooms[i].position) < 1.0) {
                scene.remove(mushrooms[i]); mushrooms.splice(i, 1);
                mushroomsCollected++;
                uiSienet.innerText = `Sieniä kerätty: ${mushroomsCollected} / 8`;
                if (mushroomsCollected === 8) uiVoitto.style.display = 'block';
            }
        }

        controls.target.copy(character.position).add(new THREE.Vector3(0, 1.5, 0));
        controls.update();

        const enemyToChar = new THREE.Vector3().subVectors(character.position, enemy.position);
        enemyToChar.y = 0;
        if (enemyToChar.length() > 0.1) {
            enemyToChar.normalize();
            enemy.position.addScaledVector(enemyToChar, enemySpeed);
            enemy.rotation.y = Math.atan2(enemyToChar.x, enemyToChar.z);
            enemy.position.y = normalGroundY + Math.abs(Math.sin(t * 10)) * 0.5;
        }
    }

    // Lumisade ja vesirenkaat
    const snowArr = snowParticles.geometry.attributes.position.array;
    for(let i=1; i<snowArr.length; i+=3) { snowArr[i] -= 0.05; if (snowArr[i] < 0) snowArr[i] = 50; }
    snowParticles.geometry.attributes.position.needsUpdate = true;

    ripples.forEach((r, i) => {
        r.age += 0.02; r.mesh.scale.set(1 + r.age*5, 1 + r.age*5, 1);
        r.mesh.material.opacity = 0.5 - r.age;
        if (r.age > 0.5) { scene.remove(r.mesh); ripples.splice(i, 1); }
    });

    if (duck) {
        const dt = duck.position.distanceTo(duckTarget);
        if (dt < 0.2) setNewDuckTarget();
        else {
            const dir = new THREE.Vector3().subVectors(duckTarget, duck.position).normalize();
            duck.position.addScaledVector(dir, duckSpeed);
            duck.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI;
        }
        duck.position.y = 0.15 + Math.sin(t * 3) * 0.02;
    }

    renderer.render(scene, camera);
}
animate();
