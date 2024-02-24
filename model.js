function main() {
	const canvas = document.querySelector('#c');
	const renderer = new THREE.WebGLRenderer({ canvas });

	// Set up camera, controls, and scene
	const camera = getCamera();
	const controls = getControls(camera, canvas);
	scene = getScene();

	// Load the model
	const mixerInfos = [];
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
		requestAnimationFrame(render);
	}

	requestAnimationFrame(render);
}

function getCamera() {
	const fov = 45;
	const aspect = 2; // the canvas default
	const near = 0.1;
	const far = 100;
	const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	camera.position.set(0, 10, 20);
	return camera;
}

function getControls(camera, canvas) {
	// Set up controls
	const controls = new THREE.OrbitControls(camera, canvas);
	controls.target.set(0, 5, 0);
	controls.maxPolarAngle = Math.PI / 2; // Limit vertical rotation to 90 degrees (horizontal only)
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
}
main();
