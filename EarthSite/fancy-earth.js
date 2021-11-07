import {
  clock,
  tle,
  satelliteVector,
  satrecToXYZ,
  graticule10,
  wireframe,
} from "./js/helper.js";
import { MAX_REACHABLE_DIST, calcLogLatDist } from "./js/ReponseParser.js";
// Scene, Camera, Renderer

const TLE_DATA_DATE = new Date(2021, 11, 7).getTime();
var width = window.innerWidth,
  height = window.innerHeight,
  radius = 228,
  doAnimate = true,
  graticule = wireframe(
    graticule10(),
    new THREE.LineBasicMaterial({ color: 0xaaaaaa })
  ),
  activeClock = clock().rate(1000).date(TLE_DATA_DATE);
let renderer = new THREE.WebGLRenderer();
let scene = new THREE.Scene();
let aspect = window.innerWidth / window.innerHeight;
let camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 3000000);
let cameraRotation = 0;
let cameraRotationSpeed = 0.001;
let cameraAutoRotation = false;
let orbitControls = new THREE.OrbitControls(camera);
// Lights
let spotLight = new THREE.SpotLight(0xffffff, 1, 0, 10, 0, 0);

// Texture Loader
let textureLoader = new THREE.TextureLoader();

// Planet Proto
let planetProto = {
  sphere: function (size) {
    let sphere = new THREE.SphereGeometry(size, 128, 128);

    return sphere;
  },
  material: function (options) {
    let material = new THREE.MeshPhongMaterial();
    if (options) {
      for (var property in options) {
        material[property] = options[property];
      }
    }

    return material;
  },
  glowMaterial: function (intensity, fade, color) {
    // Custom glow shader from https://github.com/stemkoski/stemkoski.github.com/tree/master/Three.js
    let glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: {
          type: "f",
          value: intensity,
        },
        p: {
          type: "f",
          value: fade,
        },
        glowColor: {
          type: "c",
          value: new THREE.Color(color),
        },
        viewVector: {
          type: "v3",
          value: camera.position,
        },
      },
      vertexShader: `
        uniform vec3 viewVector;
        uniform float c;
        uniform float p;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize( normalMatrix * normal );
          vec3 vNormel = normalize( normalMatrix * viewVector );
          intensity = pow( c - dot(vNormal, vNormel), p );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() 
        {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4( glow, 1.0 );
        }`,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });

    return glowMaterial;
  },
  texture: function (material, property, uri) {
    let textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = true;
    textureLoader.load(uri, function (texture) {
      material[property] = texture;
      material.needsUpdate = true;
    });
  },
};

let createPlanet = function (options) {
  // Create the planet's Surface
  let surfaceGeometry = planetProto.sphere(options.surface.size);
  let surfaceMaterial = planetProto.material(options.surface.material);
  let surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);

  // Create the planet's Atmosphere
  let atmosphereGeometry = planetProto.sphere(
    options.surface.size + options.atmosphere.size
  );
  let atmosphereMaterialDefaults = {
    side: THREE.DoubleSide,
    transparent: true,
  };
  let atmosphereMaterialOptions = Object.assign(
    atmosphereMaterialDefaults,
    options.atmosphere.material
  );
  let atmosphereMaterial = planetProto.material(atmosphereMaterialOptions);
  let atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);

  // Create the planet's Atmospheric glow
  let atmosphericGlowGeometry = planetProto.sphere(
    options.surface.size +
      options.atmosphere.size +
      options.atmosphere.glow.size
  );
  let atmosphericGlowMaterial = planetProto.glowMaterial(
    options.atmosphere.glow.intensity,
    options.atmosphere.glow.fade,
    options.atmosphere.glow.color
  );
  let atmosphericGlow = new THREE.Mesh(
    atmosphericGlowGeometry,
    atmosphericGlowMaterial
  );

  // Nest the planet's Surface and Atmosphere into a planet object
  let planet = new THREE.Object3D();
  surface.name = "surface";
  atmosphere.name = "atmosphere";
  atmosphericGlow.name = "atmosphericGlow";
  planet.add(surface);
  planet.add(atmosphere);
  planet.add(atmosphericGlow);

  // Load the Surface's textures
  for (let textureProperty in options.surface.textures) {
    planetProto.texture(
      surfaceMaterial,
      textureProperty,
      options.surface.textures[textureProperty]
    );
  }

  // Load the Atmosphere's texture
  for (let textureProperty in options.atmosphere.textures) {
    planetProto.texture(
      atmosphereMaterial,
      textureProperty,
      options.atmosphere.textures[textureProperty]
    );
  }

  return planet;
};

let earth = createPlanet({
  surface: {
    size: radius - 0.5,
    material: {
      bumpScale: 0.05,
      specular: new THREE.Color("grey"),
      shininess: 10,
    },
    textures: {
      map: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthmap1k.jpg",
      bumpMap:
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthbump1k.jpg",
      specularMap:
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthspec1k.jpg",
    },
  },
  atmosphere: {
    size: 1,
    material: {
      opacity: 0.8,
    },
    textures: {
      map: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthcloudmap.jpg",
      alphaMap:
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthcloudmaptrans.jpg",
    },
    glow: {
      size: 1,
      intensity: 0.7,
      fade: 7,
      color: 0x93cfef,
    },
  },
});

// Galaxy
let galaxyGeometry = new THREE.SphereGeometry(1000, 32, 32);
let galaxyMaterial = new THREE.MeshBasicMaterial({
  side: THREE.BackSide,
});
let galaxy = new THREE.Mesh(galaxyGeometry, galaxyMaterial);

// Load Galaxy Textures
textureLoader.crossOrigin = true;
textureLoader.load(
  "https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/starfield.png",
  function (texture) {
    galaxyMaterial.map = texture;
    scene.add(galaxy);
  }
);
var satrecs;

var satellites;
//Parameter is a double array with tle1,tle2,id and name
export function parseTLEFromAPI(parsedData) {
  var activeClock = clock().rate(1000).date(TLE_DATA_DATE);
  var satGeometry = new THREE.Geometry();
  var date = new Date(activeClock.date());
  satrecs = tle(window.satellite).date(TLE_DATA_DATE).satrecs(parsedData);
  //Skip satellites with no position or veloctiy
  satrecs = satrecs.filter(
    (satrecs) => satellite.propagate(satrecs, date)[0] != false
  );
  //-------
  satGeometry.vertices = satrecs.map(function (satrec) {
    return satelliteVector(satrec, date);
  });
  satellites = new THREE.Points(
    satGeometry,
    new THREE.PointsMaterial({ color: 0xff0096, size: 20 })
  );
  scene.add(satellites);
}

d3.timer(animate);

function animate(t) {
  if (doAnimate) {
    var date = new Date(activeClock.elapsed(t).date());
    for (let i = 0; i < satrecs.length; i++) {
      satellites.geometry.vertices[i] = satelliteVector(satrecs[i], date);
    }
    satellites.geometry.verticesNeedUpdate = true;
    controls.update();
    renderer.render(scene, camera);
  }
}
// scene.add(assetLoader(renderer, "./assets", "Aqua_13.glb"));
// Scene, Camera, Renderer Configuration
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

camera.position.set(100, 100, 1000);
orbitControls.enabled = !cameraAutoRotation;

orbitControls.addEventListener("change", () => {
  spotLight.position.copy(
    new THREE.Vector3(
      camera.position.x + 200,
      camera.position.y,
      camera.position.z
    )
  );
});
scene.add(camera);
scene.add(spotLight);

scene.add(earth);
// Light Configurations
spotLight.position.set(600, 400, 1000);

// Mesh Configurations
earth.receiveShadow = true;
earth.castShadow = true;
earth.getObjectByName("surface").geometry.center();

// On window resize, adjust camera aspect ratio and renderer size
window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
//GUI
var setting = {
  Coverage: function () {
    // window.location = "geolocation.html";
    var message = document.getElementById("demo");
    // console.log(this.range);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPosition);
    } else {
      message.innerHTML = "Geolocation is not supported by this browser.";
    }

    function showPosition(position) {
      var sats = satrecs.map((s) => {
        //  console.log("s :>> ", s);
        return satrecToXYZ(s, new Date(TLE_DATA_DATE));
      });
      //console.log("sats :>> ", sats);
      const {
        smallestDistance,
        satellitePosition: [log, lat],
      } = calcLogLatDist(
        [position.coords.longitude, position.coords.latitude],
        sats
      );
      // console.log(
      //   "MAX_REACHABLE_DIST >= smallestDistance :>> ",
      //   MAX_REACHABLE_DIST >= smallestDistance
      // );
      $("#coverageMessage").text(
        MAX_REACHABLE_DIST >= smallestDistance
          ? "You have Coverage!"
          : "Sorry! you don't have coverage. :("
      );
      $("#closestSatellite").text("Closest satellite: " + log + ", " + lat);
      // message.innerHTML =
      //   "hasCoverage: " + (MAX_REACHABLE_DIST >= satDat.smallestDistance);
    }
  },
};
// var gui = new dat.GUI();
// gui.add(setting, "Coverage");
// gui.open();
$("#checkCoverage").on("click", function () {
  setting.Coverage();
});
$("#check3").on("click", function () {
  doAnimate = !doAnimate;
});
// Main render function
let render = function () {
  earth.getObjectByName("surface").rotation.y += (1 / 32) * 0.01;
  earth.getObjectByName("atmosphere").rotation.y += (1 / 16) * 0.01;
  if (cameraAutoRotation) {
    cameraRotation += cameraRotationSpeed;
    camera.position.y = 0;
    camera.position.x = 2 * Math.sin(cameraRotation);
    camera.position.z = 2 * Math.cos(cameraRotation);
    camera.lookAt(earth.position);
  }
  requestAnimationFrame(render);
  renderer.render(scene, camera);
};

render();
