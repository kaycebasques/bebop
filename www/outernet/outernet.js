// https://github.com/mrdoob/three.js/blob/master/examples/webgl_interactive_cubes_gpu.html

import * as THREE from 'three';
// import Stats from 'three/addons/libs/stats.module.js';
// import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
// import { FlyControls } from 'three/addons/controls/FlyControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

(async () => {

// TODO: Fix the indentation of all this code.

let container; // , stats;
let camera, controls, scene, renderer;
let pickingTexture, pickingScene;
let highlightBox;

const pickingData = [];

const pointer = new THREE.Vector2();
const offset = new THREE.Vector3( 10, 10, 10 );
const clearColor = new THREE.Color();

const response = await fetch('/screenshots/usernames.json');
const usernames = await response.json();

init();

function init() {

  container = document.getElementById( 'container' );

  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 20000 );
  camera.position.z = 5000;

  scene = new THREE.Scene();
  // Used a color picker on the original video to source this background color value
  scene.background = new THREE.Color( 0x060378 );

  scene.add( new THREE.AmbientLight( 0xcccccc ) );

  const light = new THREE.DirectionalLight( 0xffffff, 3 );
  light.position.set( 0, 500, 2000 );
  scene.add( light );

  // const defaultMaterial = new THREE.MeshPhongMaterial( {
  //   color: 0xffffff,
  //   flatShading: true,
  //   vertexColors: true,
  //   shininess: 0
  // } );

  // set up the picking texture to use a 32 bit integer so we can write and read integer ids from it
  pickingScene = new THREE.Scene();
  pickingTexture = new THREE.WebGLRenderTarget( 1, 1, {

    type: THREE.IntType,
    format: THREE.RGBAIntegerFormat,
    internalFormat: 'RGBA32I',

  } );
  const pickingMaterial = new THREE.ShaderMaterial( {

    glslVersion: THREE.GLSL3,

    vertexShader: /* glsl */`
      attribute int id;
      flat varying int vid;
      void main() {

        vid = id;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

      }
    `,

    fragmentShader: /* glsl */`
      layout(location = 0) out int out_id;
      flat varying int vid;

      void main() {

        out_id = vid;

      }
    `,

  } );

  function applyId( geometry, id ) {

    const position = geometry.attributes.position;
    const array = new Int16Array( position.count );
    array.fill( id );

    const bufferAttribute = new THREE.Int16BufferAttribute( array, 1, false );
    bufferAttribute.gpuType = THREE.IntType;
    geometry.setAttribute( 'id', bufferAttribute );

  }

  function applyVertexColors( geometry, color ) {

    const position = geometry.attributes.position;
    const colors = [];

    for ( let i = 0; i < position.count; i ++ ) {

      colors.push( color.r, color.g, color.b );

    }

    geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );

  }

  const geometries = [];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const color = new THREE.Color();

  // nekoweb screenshots are 700 (width) x 378 (height)
  const nekowebScreenshotRatio = 700 / 378;
  const scaleMultiplier = 3;
  const width = nekowebScreenshotRatio * scaleMultiplier;
  const height = 1 * scaleMultiplier;
  const depth = 0.1;

  for ( let i = 0; i < usernames.length; i++ ) {

    const geometry = new THREE.BoxGeometry(width, height, depth);

    const position = new THREE.Vector3();
    position.x = Math.random() * 10000 - 5000;
    position.y = Math.random() * 6000 - 3000;
    position.z = Math.random() * 8000 - 4000;

    const rotation = new THREE.Euler();
    rotation.x = 0; // Math.random() * 2 * Math.PI;
    rotation.y = 0; // Math.random() * 2 * Math.PI;
    rotation.z = 0; // Math.random() * 2 * Math.PI;

    const scale = new THREE.Vector3();
    scale.x = /* Math.random() */ 1 * 200 + 100;
    scale.y = /* Math.random() */ 1 * 200 + 100;
    scale.z = /* Math.random() */ 1 * 200 + 100;

    quaternion.setFromEuler( rotation );
    matrix.compose( position, quaternion, scale );

    geometry.applyMatrix4( matrix );

    // give the geometry's vertices a random color to be displayed and an integer
    // identifier as a vertex attribute so boxes can be identified after being merged.
    applyVertexColors( geometry, color.setHex( Math.random() * 0xffffff ) );
    applyId( geometry, i );

    geometries.push( geometry );

    pickingData[ i ] = {

      position: position,
      rotation: rotation,
      scale: scale,
      username: usernames[i]

    };

    const textureLoader = new THREE.TextureLoader();
    const url = `../screenshots/${usernames[i]}.jpg`;
    const texture = textureLoader.load(url);
    const defaultMaterial = new THREE.MeshBasicMaterial({ map: texture });
    defaultMaterial.transparent = true;
    defaultMaterial.opacity = 0.9;

    scene.add(new THREE.Mesh(geometry, defaultMaterial));
    pickingScene.add( new THREE.Mesh( geometry, pickingMaterial ) );

  }

  const mergedGeometry = BufferGeometryUtils.mergeGeometries( geometries );
  // console.log(mergedGeometry);

  // scene.add( new THREE.Mesh( mergedGeometry, defaultMaterial ) );
  pickingScene.add( new THREE.Mesh( mergedGeometry, pickingMaterial ) );

  let highlightBoxMaterial = new THREE.MeshLambertMaterial({color: 0xffff00});
  highlightBoxMaterial.transparent = true;
  highlightBoxMaterial.opacity = 0.2;
  highlightBox = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    highlightBoxMaterial
  );
  scene.add( highlightBox );

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  container.appendChild( renderer.domElement );

  // controls = new FlyControls(camera, renderer.domElement);
  // controls.movementSpeed = 10;

  // controls = new FirstPersonControls(camera, renderer.domElement);
  // controls.target.set(0, 0, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(window);
  controls.enableZoom = true;

  // controls = new TrackballControls( camera, renderer.domElement );
  // controls.rotateSpeed = 1.0;
  // controls.zoomSpeed = 1.2;
  // controls.panSpeed = 0.8;
  // controls.noZoom = false;
  // controls.noPan = false;
  // controls.staticMoving = true;
  // controls.dynamicDampingFactor = 0.3;

  // stats = new Stats();
  // container.appendChild( stats.dom );

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('click', onClick);

  // document.addEventListener('keydown', event => {
  //   const speed = 10;
  //   switch (event.keyCode) {
  //     case 37:
  //       camera.position.y -= speed;
  //       break;
  //     case 38:
  //       camera.position.z -= speed;
  //       break;
  //     case 39:
  //       camera.position.y += speed;
  //       break;
  //     case 40:
  //       camera.position.z += speed;
  //       break;
  //   }
  // });

}

async function onClick(e) {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  const username = await pick();
  const url = `https://${username}.nekoweb.org`;
  if (username) window.open(url, '_blank');
}



//

function onPointerMove( e ) {

  pointer.x = e.clientX;
  pointer.y = e.clientY;

}

function animate() {

  render();
  // stats.update();

}

async function pick() {

  // render the picking scene off-screen
  // set the view offset to represent just a single pixel under the mouse
  const dpr = window.devicePixelRatio;
  camera.setViewOffset(
    renderer.domElement.width, renderer.domElement.height,
    Math.floor( pointer.x * dpr ), Math.floor( pointer.y * dpr ),
    1, 1
  );

  // render the scene
  renderer.setRenderTarget( pickingTexture );

  // clear the background to - 1 meaning no item was hit
  clearColor.setRGB( - 1, - 1, - 1 );
  renderer.setClearColor( clearColor );
  renderer.render( pickingScene, camera );

  // clear the view offset so rendering returns to normal
  camera.clearViewOffset();

  // create buffer for reading single pixel
  const pixelBuffer = new Int32Array( 4 );

  // read the pixel
  const result = await renderer.readRenderTargetPixelsAsync( pickingTexture, 0, 0, 1, 1, pixelBuffer );

  const id = pixelBuffer[ 0 ];
  if ( id !== -1 ) {
    // move our highlightBox so that it surrounds the picked object
    const data = pickingData[ id ];
    highlightBox.position.copy( data.position );
    highlightBox.rotation.copy( data.rotation );
    highlightBox.scale.copy( data.scale ).add( offset );
    highlightBox.visible = false;
    // console.log(data.username);
    return data.username;
  } else {
    highlightBox.visible = false;
    return null;
  }
}

function render() {
  controls.update();
  pick();
  renderer.setRenderTarget( null );
  renderer.render( scene, camera );

}

})();
