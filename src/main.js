import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { gameCanvas, startGame, stopGame, isGameActive } from './game.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';



// ─── Loading Manager ───────────────────────────────────────────
const loadingScreen = document.getElementById('loading-screen');
const loadingManager = new THREE.LoadingManager();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

loadingManager.onLoad = () => {
    // 全てのロードが終わったらGSAPでフェードアウト
    gsap.to(loadingScreen, {
        opacity: 0,
        duration: 1,
        ease: 'power2.inOut',
        onComplete: () => {
            loadingScreen.style.display = 'none';
        }
    });
};

// ─── シーン ────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2E1652);

// ─── カメラ ────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(4.57, 8.69, -4.26);

const INIT_CAM_POS = { x: 4.57, y: 8.69, z: -4.26 };
const INIT_TARGET  = { x: -1.84, y: 5.78, z: 3.33 };

// ─── WebGLRenderer ────────────────────────────────────────────
const canvas = document.getElementById('myCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 2.0;
canvas.style.cssText = 'position:absolute;top:0;left:0;z-index:1;';

const HEADER_H = 64;

const controlsDom = document.createElement('div');
controlsDom.style.cssText = `
  position: absolute;
  top: ${HEADER_H}px;
  left: 0;
  width: 100%;
  height: calc(100% - ${HEADER_H}px);
  z-index: 2;
`;
document.body.appendChild(controlsDom);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── OrbitControls ────────────────────────────────────────────
const controls = new OrbitControls(camera, controlsDom);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(INIT_TARGET.x, INIT_TARGET.y, INIT_TARGET.z);
controls.panSpeed = 0.3;
controls.screenSpacePanning = true;
controls.zoomSpeed = 0.5;
controls.rotateSpeed = 0.5;
controls.minDistance = 2.0;
controls.maxDistance = 15.0;

const initialAzimuth = controls.getAzimuthalAngle();
controls.minAzimuthAngle = initialAzimuth - Math.PI / 4;
controls.maxAzimuthAngle = initialAzimuth + Math.PI / 3;
controls.maxPolarAngle = Math.PI / 2;
controls.update();

// ─── ライト ────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x223344, 0.3));

const roomLight = new THREE.SpotLight(0xDCC4FF, 50);
roomLight.position.set(-2, 14, 2);

const roomLightTarget = new THREE.Object3D();
roomLightTarget.position.set(-2, 0, 2);
scene.add(roomLightTarget);
roomLight.target = roomLightTarget;

roomLight.angle     = Math.PI / 3;
roomLight.penumbra  = 0.45;
roomLight.decay     = 1.8;
roomLight.distance  = 28;
roomLight.castShadow = true;

roomLight.shadow.mapSize.width  = 2048;
roomLight.shadow.mapSize.height = 2048;
roomLight.shadow.camera.near    = 0.5;
roomLight.shadow.camera.far     = 30;
roomLight.shadow.bias           = -0.001;

scene.add(roomLight);

const fillLight = new THREE.PointLight(0xaaccff, 3, 10, 2);
fillLight.position.set(-1, 7, -2);
fillLight.castShadow = false;
scene.add(fillLight);

const screenBackLight = new THREE.PointLight(0x9457EB, 30, 100, 2);
screenBackLight.position.set(-6, 4, 12);
screenBackLight.castShadow = false;
scene.add(screenBackLight);

let isLightOn = true;

// ─── ゲームテクスチャ ──────────────────────────────────────────
const gameTexture = new THREE.CanvasTexture(gameCanvas);
gameTexture.flipY = false;

// ─── 動画テクスチャ ────────────────────────────────────────────
const VIDEO_SRCS = ['/website.mp4', '/pepsi.mp4'];
const videos = VIDEO_SRCS.map(src => {
    const v = document.createElement('video');
    v.src = src;
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
    v.setAttribute('playsinline', '');
    v.crossOrigin = 'anonymous';
    v.preload = 'auto';
    v.style.display = 'none';
    document.body.appendChild(v);
    v.load();
    return v;
});

let currentVideoIndex = 0;
const videoTexture = new THREE.VideoTexture(videos[0]);
videoTexture.flipY = false;
videoTexture.rotation = -Math.PI / 2;
videoTexture.center.set(0.5, 0.5);

videos.forEach((v, i) => {
    v.addEventListener('ended', () => {
        currentVideoIndex = (i + 1) % videos.length;
        const next = videos[currentVideoIndex];
        next.currentTime = 0;
        next.play().then(() => {
            videoTexture.image = next;
            videoTexture.needsUpdate = true;
        });
    });
});

const startMedia = () => {
    videos[0].play().catch(() => {});
    window.removeEventListener('mousedown', startMedia);
};
window.addEventListener('mousedown', startMedia);

// ─── モデル変数 ────────────────────────────────────────────────
let roomModel;
let desktopModel;
let mixer;
let neonLight1, neonLight2;
const loader = new GLTFLoader(loadingManager); // LoadingManagerをセット
loader.setDRACOLoader(dracoLoader);

let zoomedOnScreen = false;

// ─── カメラズーム：Desktop ────────────────────────────────────
function zoomToDesktopScreen() {
    const targets = [roomModel, desktopModel].filter(Boolean);
    if (!targets.length) return;
    let screenObj = null;
    targets.forEach(m => m.traverse(obj => { if (obj.name === 'desktop_screen') screenObj = obj; }));
    if (!screenObj) return;

    zoomedOnScreen = false;
    const wp = new THREE.Vector3();
    screenObj.getWorldPosition(wp);
    gsap.to(camera.position, { duration: 1.8, x: wp.x, y: wp.y, z: wp.z - 1.8, ease: 'power2.inOut' });
    gsap.to(controls.target, { duration: 1.8, x: wp.x, y: wp.y, z: wp.z, ease: 'power2.inOut' });

    videos[currentVideoIndex].pause();
    currentVideoIndex = 0;
    const firstVideo = videos[0];
    firstVideo.currentTime = 0;
    firstVideo.play().then(() => {
        videoTexture.image = firstVideo;
        videoTexture.needsUpdate = true;
    });
}

// ─── カメラズーム：Arcade ─────────────────────────────────────
function zoomToArcadeScreen() {
    if (!roomModel) return;
    let arcadeObj = null;
    roomModel.traverse(obj => { if (obj.name.includes('立方体071_2')) arcadeObj = obj; });
    if (!arcadeObj) return;

    zoomedOnScreen = false;
    const wp = new THREE.Vector3();
    arcadeObj.getWorldPosition(wp);
    gsap.to(camera.position, { duration: 1.8, x: wp.x + 2.5, y: wp.y + 0.5, z: wp.z, ease: 'power2.inOut' });
    gsap.to(controls.target, { duration: 1.8, x: wp.x, y: wp.y - 0.5, z: wp.z, ease: 'power2.inOut' });
    setTimeout(() => { zoomedOnScreen = true; }, 1500);
}

// ─── ライトトグル ──────────────────────────────────────────────
function toggleRoomLight() {
    isLightOn = !isLightOn;
    gsap.to(roomLight, { intensity: isLightOn ? 60 : 0, duration: 0.5 });
    gsap.to(fillLight, { intensity: isLightOn ? 3 : 0, duration: 0.5 });
    gsap.to(screenBackLight, { intensity: isLightOn ? 30 : 0, duration: 0.5 });
    if (neonLight1) gsap.to(neonLight1, { intensity: isLightOn ? 5 : 0, duration: 0.5 });
    if (neonLight2) gsap.to(neonLight2, { intensity: isLightOn ? 5 : 0, duration: 0.5 });
    const btn = document.getElementById('btn-light');
    const label = document.getElementById('light-label');
    if (btn && label) {
        label.textContent = isLightOn ? 'Light: ON' : 'Light: OFF';
        document.getElementById('icon-light-on').style.display = isLightOn ? 'block' : 'none';
        document.getElementById('icon-light-off').style.display = isLightOn ? 'none' : 'block';
        btn.classList.toggle('light-off', !isLightOn);
    }
}

window.portfolioUI = {
    goToDesktop: zoomToDesktopScreen,
    goToArcade:  zoomToArcadeScreen,
    toggleLight: toggleRoomLight,
};

// ─── モデル読み込み ────────────────────────────────────────────
loader.load('/room.glb', (gltf) => {
    roomModel = gltf.scene;
    scene.add(roomModel);

    mixer = new THREE.AnimationMixer(roomModel);
    gltf.animations.forEach(clip => mixer.clipAction(clip).play());

    roomModel.traverse(obj => {
        if (!obj.isMesh) return;
        obj.castShadow = obj.receiveShadow = true;
        if (obj.name === 'desktop_screen') {
            obj.material = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide, toneMapped: false });
        }
        if (obj.name.includes('立方体071_2')) {
            obj.material = new THREE.MeshBasicMaterial({ map: gameTexture, toneMapped: false });
        }
    });

    const lightConfigs = [
        { anchorName: 'lightObj', targetName: 'テキスト004', color: 0x00FFFF },
        { anchorName: 'lightObj001', targetName: 'テキスト005', color: 0x00FFFF },
    ];
   lightConfigs.forEach(({ anchorName, targetName, color }, index) => { // ← index を追加
        const anchor = roomModel.getObjectByName(anchorName);
        const target = roomModel.getObjectByName(targetName);
        if (anchor && target) {
            const spot = new THREE.SpotLight(color, 5, 50, Math.PI, 0.5, 2);
            const wp = new THREE.Vector3();
            anchor.getWorldPosition(wp);
            spot.position.copy(wp);
            spot.target = target;
            spot.castShadow = true;
            scene.add(spot);

            // ここを追加！ 作ったライトを変数に覚えさせる
            if (index === 0) neonLight1 = spot;
            if (index === 1) neonLight2 = spot;
        }
    });
});

loader.load('/desktop.glb', (gltf) => {
    desktopModel = gltf.scene;
    scene.add(desktopModel);
    desktopModel.traverse(obj => {
        if (obj.isMesh) { obj.castShadow = obj.receiveShadow = true; }
    });
});

// ─── キー・クリックイベント ───────────────────────────────────
window.addEventListener('keydown', e => {
    if (e.key === ' ' && zoomedOnScreen && !isGameActive()) {
        e.preventDefault();
        startGame();
    }
    if (e.key === 'Escape') {
        if (isGameActive()) stopGame();
        else if (zoomedOnScreen) {
            zoomedOnScreen = false;
            gsap.to(camera.position, { duration: 1.2, x: INIT_CAM_POS.x, y: INIT_CAM_POS.y, z: INIT_CAM_POS.z });
            gsap.to(controls.target, { duration: 1.2, x: INIT_TARGET.x, y: INIT_TARGET.y, z: INIT_TARGET.z });
        }
    }
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

controlsDom.addEventListener('click', event => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const targets = [roomModel, desktopModel].filter(Boolean);
    const intersects = raycaster.intersectObjects(targets, true);
    if (intersects.length > 0) {
        const clickedObj = intersects[0].object;
        if (clickedObj.name.includes('desktop_screen')) zoomToDesktopScreen();
        else if (clickedObj.name.includes('立方体071_2')) zoomToArcadeScreen();
    }
});

const clock = new THREE.Timer();

// ─── ループ ──────────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    clock.update();
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    gameTexture.needsUpdate = true;
    const currentVideo = videos[currentVideoIndex];
    if (currentVideo.readyState >= 2) {
        videoTexture.needsUpdate = true;
    }
    renderer.render(scene, camera);
}
animate();