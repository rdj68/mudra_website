const coordinatesData = {
	1: { x: -1336, y: 39, z: -1228, zoom: 5, name: "poster_big" },
}

const navigationData = {
	'poster_big': './pages/arts/arts_page.html',
}

const globalState = {
	canvas: document.querySelector('#c'),
	renderer: null,
	camera: null,
	scene: null,
	controls: null,
	raycaster: null,
	mouse: null,
	mixerInfos: [],
}

function init() {
	canvas = globalState.canvas;
	globalState.renderer = new THREE.WebGLRenderer({ canvas });
	globalState.camera = getCamera();
	globalState.controls = getControls(globalState.camera, globalState.canvas);
	globalState.scene = getScene();
	globalState.raycaster = new THREE.Raycaster();
	globalState.mouse = new THREE.Vector2();
}

function main() {

	init();
	const { canvas, renderer, camera, scene, controls, mixerInfos } = globalState;
	loadGLTF('models/scene.gltf', scene, camera, controls, mixerInfos);

	// Raycasting setup
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();

	// Handle click events on the canvas
	window.addEventListener('click', (event) => onClick(event, raycaster, mouse, camera, scene));

	function resizeRendererToDisplaySize(renderer) {
		const canvas = renderer.domElement;
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		const needResize = canvas.width !== width || canvas.height !== height;
		if (needResize) {
			renderer.setSize(width, height, false);
		}
		return needResize;
	}

	let then = 0;
	function render(now) {
		now *= 0.001; // convert to seconds
		const deltaTime = now - then;
		then = now;

		if (resizeRendererToDisplaySize(renderer)) {
			const canvas = renderer.domElement;
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();
		}

		for (const { mixer } of mixerInfos) {
			mixer.update(deltaTime);
		}

		renderer.render(scene, camera);
		// console.log(camera.position);
		requestAnimationFrame(render);
	}

	requestAnimationFrame(render);
}

function getCamera() {
	const fov = 45;
	const aspect = 2; // the canvas default
	const near = 0.1;
	const far = 50;
	const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	camera.position.set(0, 10, 20);
	camera.zoom = 2.2;
	return camera;
}

function getControls(camera, canvas) {
	// Set up controls
	var controls = new THREE.OrbitControls(camera, canvas);
	controls.target.set(0, 5, 0);
	controls.maxPolarAngle = Math.PI / 2; // Limit vertical rotation to 90 degrees (horizontal only)
	controls.minDistance = 600;
	controls.update();

	return controls;
}

function getScene() {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color('black');

	{
		const skyColor = 0xB1E1FF; // light blue
		const groundColor = 0xB97A20; // brownish orange
		const intensity = 1;
		const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
		scene.add(light);
	}

	{
		const color = 0xFFFFFF;
		const intensity = 1.5;
		const light = new THREE.DirectionalLight(color, intensity);
		light.position.set(5, 10, 2);
		scene.add(light);
		scene.add(light.target);
	}

	return scene;
}

function frameArea(sizeToFitOnScreen, boxSize, boxCenter, camera) {
	const halfSizeToFitOnScreen = sizeToFitOnScreen * 1;
	const halfFovY = THREE.Math.degToRad(camera.fov * 0.5);
	const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);

	const direction = new THREE.Vector3()
		.subVectors(camera.position, boxCenter)
		.multiply(new THREE.Vector3(1, 0, 1))
		.normalize();

	camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

	camera.near = boxSize / 100;
	camera.far = boxSize * 100;

	camera.updateProjectionMatrix();

	camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
}

function playNextAction(mixerInfo) {
	const { actions, actionNdx } = mixerInfo;
	const nextActionNdx = (actionNdx + 1) % actions.length;
	mixerInfo.actionNdx = nextActionNdx;
	actions.forEach((action, ndx) => {
		const enabled = ndx === nextActionNdx;
		action.enabled = enabled;
		if (enabled) {
			action.play();
		}
	});
}

function loadGLTF(url, scene, camera, controls, mixerInfos) {
	const gltfLoader = new THREE.GLTFLoader();
	gltfLoader.load(url, (gltf) => {
		const root = gltf.scene;
		scene.add(root);

		const box = new THREE.Box3().setFromObject(root);
		const boxSize = box.getSize(new THREE.Vector3()).length();
		const boxCenter = box.getCenter(new THREE.Vector3());

		frameArea(boxSize * 0.5, boxSize, boxCenter, camera);

		controls.maxDistance = boxSize * 10;
		controls.target.copy(boxCenter);
		controls.update();

		const mixer = new THREE.AnimationMixer(root);
		const actions = Object.values(gltf.animations).map((clip) => {
			return mixer.clipAction(clip);
		});
		const mixerInfo = {
			mixer,
			actions,
			actionNdx: -1,
		};
		mixerInfos.push(mixerInfo);
		playNextAction(mixerInfo);
	});
}

function onClick(event, raycaster, mouse, camera, scene) {
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(mouse, camera);

	const intersects = raycaster.intersectObjects(scene.children, true);

	if (intersects.length > 0) {
		handleIntersection(intersects[1].object);
	}
}

function handleIntersection(clickedObject) {
	console.log(clickedObject);
	if (navigationData[clickedObject.name]) {
		window.location.href = navigationData[clickedObject.name];
	}
}

function rotateCameraToPosition(camera, targetPosition, targetZoom, duration) {
	const controls = globalState.controls;
	const renderer = globalState.renderer;
	const scene = globalState.scene;

	const startPosition = camera.position.clone();
	const startZoom = camera.zoom;

	const tweenValues = { x: startPosition.x, z: startPosition.z, zoom: startZoom };

	const tween = new TWEEN.Tween(tweenValues)
		.to({ x: targetPosition.x, z: targetPosition.z, zoom: targetZoom }, duration)
		.easing(TWEEN.Easing.Circular.InOut)
		.onUpdate(() => {
			camera.position.set(tweenValues.x, startPosition.y, tweenValues.z);
			camera.zoom = targetZoom;
			camera.lookAt(targetPosition);
			controls.update();
			renderer.render(scene, camera);
		})
		.start();
}

function goNext() {
	const targetPosition = new THREE.Vector3(coordinatesData[1].x, coordinatesData[1].y, coordinatesData[1].z);
	const targetZoom = coordinatesData[1].zoom;
	rotateCameraToPosition(globalState.camera, targetPosition, targetZoom, 2000);
}

function animate() {
	requestAnimationFrame(animate);
	TWEEN.update(); // Update the tween animations
}

animate(); 
main();