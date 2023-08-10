/**
 * ? Dev
 * ! npx vite
 * ? Build
 * ! npx vite build
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "lil-gui";

import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import simVertex from "./shaders/simVertex.glsl";
import simFragment from "./shaders/simFragment.glsl";

import texture from "../test.jpg";
import logo from "../logo.png";
import superman from "../super.png";

function lerp(a, b, n) {
  return (1 - n) * a + n * b;
}
const loadImage = (path) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = path;
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (e) => {
      reject(e);
    };
  });
};
export default class Canvas {
  constructor(options) {
    //options is an object that contains the dom element
    this.container = options.dom;
    this.scene = new THREE.Scene();

    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.renderer.setClearColor(0x222222, 1);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector3();
    this.setRenderer();
    this.setCamera();
    this.setOrbitControls();

    this.elapsedTimetime = 0;
    this.clock = new THREE.Clock();
    this.size = 512;
    this.number = this.size * this.size;

    Promise.all([
      this.getPixelDataFromImage(logo),
      this.getPixelDataFromImage(superman),
    ]).then((textures) => {
      this.data1 = textures[0];
      this.data2 = textures[1];
      this.setupSettings();
      this.getPixelDataFromImage(logo);
      this.mouseEvent();
      this.setupFBO();
      this.addObjects();
      this.setupResize();
      this.render();
    });
  }
  setupSettings() {
    this.settings = {
      progress: 0,
    };
    this.gui = new GUI();
    this.gui
      .add(this.settings, "progress")
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((val) => {
        this.simMaterial.uniforms.uProgress.value = val;
      });
  }
  async getPixelDataFromImage(url) {
    //convert image to data texture
    const img = await loadImage(url);
    const width = 200;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = width;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, width);
    let data = ctx.getImageData(0, 0, width, width).data;
    let pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      let x = (i / 4) % width;
      let y = Math.floor(i / 4 / width);
      if (data[i] < 5) {
        pixels.push({ x: x / width - 0.5, y: 0.5 - y / width });
      }
    }
    console.log("pixel count:  " + pixels.length);
    //Creating the data texture
    const canvasData = new Float32Array(4 * this.number);
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const index = i * this.size + j;
        let randomPixel = pixels[Math.floor(Math.random() * pixels.length)];
        if (Math.random() > 0.9) {
          randomPixel = {
            x: 3 * (Math.random() - 0.5),
            y: 3 * (Math.random() - 0.5),
          };
        }
        canvasData[4 * index] = randomPixel.x + (Math.random() - 0.5) * 0.01;
        canvasData[4 * index + 1] =
          randomPixel.y + (Math.random() - 0.5) * 0.01;
        canvasData[4 * index + 2] = (Math.random() - 0.5) * 0.01;
        canvasData[4 * index + 3] = (Math.random() - 0.5) * 0.01;
      }
    }
    const dataTexture = new THREE.DataTexture(
      canvasData,
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    dataTexture.needsUpdate = true;
    return dataTexture;
  }

  setRenderer() {
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    //Append a canvas element as a child of the container. Can also declare the canvas in the WebGLRenderer constructor.
    this.container.appendChild(this.renderer.domElement);
  }
  setCamera() {
    this.camera = new THREE.PerspectiveCamera(
      70,
      this.width / this.height,
      0.01,
      100
    );
    this.camera.position.z = 1;
    this.scene.add(this.camera);
  }
  setOrbitControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
  }
  mouseEvent() {
    this.planeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial()
    );
    this.dummy = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 32, 32),
      new THREE.MeshNormalMaterial()
    );
    this.scene.add(this.dummy);
    window.addEventListener("mousemove", (event) => {
      this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);

      const intersects = this.raycaster.intersectObjects([this.planeMesh]);
      if (intersects.length > 0) {
        //console.log(intersects[0].point);
        this.dummy.position.copy(intersects[0].point);
        this.simMaterial.uniforms.uMousePos.value = intersects[0].point;
      }
    });
  }
  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }
  setupFBO() {
    //Creating the data texture
    const data = new Float32Array(4 * this.number);
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const index = i * this.size + j;
        data[4 * index] = lerp(-0.5, 0.5, j / (this.size - 1));
        data[4 * index + 1] = lerp(-0.5, 0.5, i / (this.size - 1));
        data[4 * index + 2] = 0;
        data[4 * index + 3] = 1;
      }
    }
    this.positions = new THREE.DataTexture(
      data,
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.positions.needsUpdate = true;

    //create fbo scene
    this.sceneFBO = new THREE.Scene();
    this.cameraFBO = new THREE.OrthographicCamera(-1, 1, 1, -1, -2, 2);
    this.cameraFBO.position.z = 1;
    this.cameraFBO.lookAt(new THREE.Vector3(0, 0, 0));
    let geo = new THREE.PlaneGeometry(2, 2, 2, 2);
    this.simMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
    });
    this.simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uCurrentPosition: { value: this.data1 },
        uOriginalPosition: { value: this.data1 },
        uOriginalPosition1: { value: this.data2 },
        uMousePos: { value: new THREE.Vector3(0, 0, 0) },
      },
      vertexShader: simVertex,
      fragmentShader: simFragment,
    });
    this.simMesh = new THREE.Mesh(geo, this.simMaterial);
    this.sceneFBO.add(this.simMesh);

    this.renderTarget = new THREE.WebGLRenderTarget(this.size, this.size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
    this.renderTarget1 = new THREE.WebGLRenderTarget(this.size, this.size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
  }
  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera.aspect = this.width / this.height;

    this.camera.updateProjectionMatrix();
  }

  addObjects() {
    // this.geometry = new THREE.PlaneGeometry(1, 1, 50, 50);
    //this.material = new THREE.MeshNormalMaterial();

    //Creating the geometry
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(3 * this.number);
    const uvs = new Float32Array(2 * this.number);

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const index = i * this.size + j;
        positions[3 * index] = j / this.size - 0.5;
        positions[3 * index + 1] = i / this.size - 0.5;
        positions[3 * index + 2] = 0;

        uvs[2 * index] = j / (this.size - 1);
        uvs[2 * index + 1] = i / (this.size - 1);
      }
    }
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

    // Sending the data texture to the shaders using uniforms
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: this.positions },
        //uTexture: { value: new THREE.TextureLoader().load(texture) },
      },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);

    this.scene.add(this.mesh);
  }

  render() {
    this.elapsedTime = this.clock.getElapsedTime();

    //this.mesh.rotation.x = this.elapsedTime / 2000;
    //this.mesh.rotation.y = this.elapsedTime / 1000;

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.sceneFBO, this.cameraFBO);
    this.renderer.setRenderTarget(null);
    //swap render target
    const tmp = this.renderTarget;
    this.renderTarget = this.renderTarget1;
    this.renderTarget1 = tmp;
    this.renderer.render(this.scene, this.camera);
    //this.renderer.render(this.sceneFBO, this.cameraFBO);
    this.simMaterial.uniforms.uTime.value = this.elapsedTime;
    this.material.uniforms.uTexture.value = this.renderTarget.texture;
    this.simMaterial.uniforms.uCurrentPosition.value =
      this.renderTarget1.texture;

    window.requestAnimationFrame(this.render.bind(this));
  }
}

new Canvas({
  dom: document.getElementById("container"),
});
