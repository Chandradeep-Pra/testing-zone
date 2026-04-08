"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";



function Model() {
  const group = useRef<any>();

  const { scene } = useGLTF("/model/aiperson2.glb");
  const { animations } = useFBX("/model/person-sit.fbx");
//   const { animations } = useFBX("/model/person-talking.fbx");

  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (actions) {
      const firstAction = actions[Object.keys(actions)[0]];
      firstAction?.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  useEffect(() => {
  scene.traverse((child: any) => {
    if (child.isMesh && child.morphTargetDictionary) {
      console.log("Morph Targets:", child.morphTargetDictionary);
    }
  });
}, [scene]);

  // ✅ FIX: make head look straight (camera)
  useFrame((state) => {
  const head = group.current?.getObjectByName("Head");

  if (head) {
    const target = new THREE.Vector3(
      state.camera.position.x + 0, // 👈 offset
      state.camera.position.y - 0.65,
      state.camera.position.z
    );

    head.lookAt(target);
  }
});

  return (
    <group ref={group} >
      <primitive
        object={scene}
        scale={4.4}
        position={[0, -5.4, -0.1]}
      />
    </group>
  );
}

// function Background() {
//   const { scene } = useThree();

//   useEffect(() => {
//     const loader = new THREE.TextureLoader();
//     loader.load("/bg.jpg", (texture) => {
//       texture.colorSpace = THREE.SRGBColorSpace;
//       scene.background = texture;
//     });
//   }, [scene]);

//   return null;
// }

function CameraSetup() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, 3.2);
    camera.lookAt(0, -6, 1); // 👈 THIS is how you do it
  }, [camera]);

  return null;
}

export default function VivaAvatar() {
  return (
    <Canvas
      camera={{ position: [0, 1.4, 3.1], fov: 50}}
      style={{ width: "100%", height: "100%" }}
    >
        <CameraSetup />
      {/* <Background /> */}

      <ambientLight intensity={1} />
      <directionalLight position={[2, 5, 2]} intensity={1.5} />

      <Suspense fallback={null}>
        <Model />
      </Suspense>

      <OrbitControls enableZoom={false} />
    </Canvas>
  );
}