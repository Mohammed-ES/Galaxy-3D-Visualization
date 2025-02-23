let scene, camera, renderer;
let galaxy, stars;
let universeGroup;
let cameraControls = {
    distance: 15,
    rotation: { x: 0, y: 0 },
    target: new THREE.Vector3(0, 0, 0)
};

const params = {
    particules: 45000,
    branches: 6,
    rayon: 8,
    vitesseRotation: 0.001,
    taillePlanetes: 0.04,
    couleurCentre: '#ffccdd',
    couleurMillieu: '#ff55aa',
    couleurExterieur: '#3344ff',
    dispersion: 0.2,
    nombreEtoiles: 10000,
    courbure: 1.8,
    epaisseurBras: 0.4,
    autoRotate: true
};

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 15);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    universeGroup = new THREE.Group();
    scene.add(universeGroup);

    createGalaxy();
    createStars();
    setupGUI();
    setupEnhancedControls();
}

function setupGUI() {
    const gui = new dat.GUI();
    gui.add(params, 'particules', 1000, 100000, 1000).name('Number of particles').onChange(regenerateGalaxy);
    gui.add(params, 'branches', 2, 10, 1).name('Number of arms').onChange(regenerateGalaxy);
    gui.add(params, 'rayon', 1, 20, 0.1).name('Galaxy radius').onChange(regenerateGalaxy);
    gui.add(params, 'vitesseRotation', -0.02, 0.02, 0.001).name('Rotation speed');
    gui.add(params, 'taillePlanetes', 0.01, 0.2, 0.01).name('Point size').onChange(regenerateGalaxy);
    gui.add(params, 'dispersion', 0, 2, 0.1).name('Dispersion').onChange(regenerateGalaxy);
    gui.add(params, 'courbure', 0.5, 5, 0.1).name('Arm curvature').onChange(regenerateGalaxy);
    gui.add(params, 'epaisseurBras', 0.1, 3, 0.1).name('Arm thickness').onChange(regenerateGalaxy);
    gui.addColor(params, 'couleurCentre').name('Center color').onChange(regenerateGalaxy);
    gui.addColor(params, 'couleurMillieu').name('Middle color').onChange(regenerateGalaxy);
    gui.addColor(params, 'couleurExterieur').name('Outer color').onChange(regenerateGalaxy);
    gui.add(params, 'nombreEtoiles', 1000, 20000, 1000).name('Number of stars').onChange(regenerateStars);
    gui.add(params, 'autoRotate').name('Auto rotation');
}

function setupEnhancedControls() {
    let isDragging = false;
    let isRightDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    document.addEventListener('dblclick', resetView);
    
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0) isDragging = true;
        if (e.button === 2) isRightDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    document.addEventListener('mousemove', (e) => {
        const deltaMove = {
            x: e.clientX - previousMousePosition.x,
            y: e.clientY - previousMousePosition.y
        };

        if (isDragging) {
            universeGroup.rotation.y += deltaMove.x * 0.005;
            universeGroup.rotation.x += deltaMove.y * 0.005;
        }

        if (isRightDragging) {
            cameraControls.rotation.y += deltaMove.x * 0.005;
            cameraControls.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, 
                cameraControls.rotation.x + deltaMove.y * 0.005));
            updateCameraPosition();
        }

        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) isDragging = false;
        if (e.button === 2) isRightDragging = false;
    });

    document.addEventListener('wheel', (e) => {
        cameraControls.distance += e.deltaY * 0.01;
        cameraControls.distance = Math.max(5, Math.min(cameraControls.distance, 50));
        updateCameraPosition();
    });
}

function createGalaxy() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(params.particules * 3);
    const colors = new Float32Array(params.particules * 3);

    const colorInside = new THREE.Color(params.couleurCentre);
    const colorMiddle = new THREE.Color(params.couleurMillieu);
    const colorOutside = new THREE.Color(params.couleurExterieur);

    for (let i = 0; i < params.particules; i++) {
        const i3 = i * 3;
        
        const radius = Math.pow(Math.random(), 2) * params.rayon;
        const spinAngle = radius * params.courbure;
        const branchAngle = (i % params.branches) * Math.PI * 2 / params.branches;
        const branchDispersion = (Math.random() - 0.5) * params.dispersion * radius / params.rayon;
        const thickness = Math.max(0.2, params.epaisseurBras * (1 - radius / params.rayon));
        const verticalDispersion = (Math.random() - 0.5) * thickness * radius / params.rayon;

        positions[i3] = Math.cos(branchAngle + spinAngle + branchDispersion) * radius;
        positions[i3 + 1] = verticalDispersion;
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle + branchDispersion) * radius;

        let mixColor;
        const normalizedRadius = radius / params.rayon;

        if (normalizedRadius < 0.3) {
            const t = normalizedRadius / 0.3;
            mixColor = colorInside.clone().lerp(colorMiddle, t);
        } else {
            const t = (normalizedRadius - 0.3) / 0.7;
            mixColor = colorMiddle.clone().lerp(colorOutside, t);
        }

        colors[i3] = mixColor.r;
        colors[i3 + 1] = mixColor.g;
        colors[i3 + 2] = mixColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: params.taillePlanetes,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
    });

    if (galaxy) {
        universeGroup.remove(galaxy);
    }

    galaxy = new THREE.Points(geometry, material);
    universeGroup.add(galaxy);
}

function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsPositions = new Float32Array(params.nombreEtoiles * 3);

    for (let i = 0; i < params.nombreEtoiles; i++) {
        const i3 = i * 3;
        const radius = 100;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);

        starsPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        starsPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        starsPositions[i3 + 2] = radius * Math.cos(phi);
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({ 
        size: 0.015, 
        color: 0xFFFFFF, 
        transparent: true, 
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    if (stars) {
        universeGroup.remove(stars);
    }
    
    stars = new THREE.Points(starsGeometry, starsMaterial);
    universeGroup.add(stars);
}

function updateCameraPosition() {
    const phi = cameraControls.rotation.x;
    const theta = cameraControls.rotation.y;
    
    camera.position.x = cameraControls.distance * Math.cos(phi) * Math.sin(theta);
    camera.position.y = cameraControls.distance * Math.sin(phi);
    camera.position.z = cameraControls.distance * Math.cos(phi) * Math.cos(theta);
    
    camera.lookAt(cameraControls.target);
}

function resetView() {
    cameraControls.distance = 15;
    cameraControls.rotation.x = 0;
    cameraControls.rotation.y = 0;
    universeGroup.rotation.x = 0;
    universeGroup.rotation.y = 0;
    updateCameraPosition();
}

function regenerateGalaxy() {
    createGalaxy();
}

function regenerateStars() {
    createStars();
}

function animate() {
    requestAnimationFrame(animate);
    
    if (params.autoRotate) {
        galaxy.rotation.y += params.vitesseRotation;
    }
    
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
animate();