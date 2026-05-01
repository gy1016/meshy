import { Bounds, Center, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useEditor, useValue } from "tldraw";
import { Box3, Vector3 } from "three";

interface MeshyModelShapeBodyProps {
  assetUrl: string;
  yRotation: number;
}

interface MeshModelProps extends MeshyModelShapeBodyProps {
  onModelReady: () => void;
}

function getAdaptiveDpr(zoomLevel: number) {
  const deviceDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;
  const scaled = deviceDpr * Math.max(zoomLevel, 0.5);
  return Math.min(Math.max(scaled, 1), 3);
}

function MeshModel(props: MeshModelProps) {
  const { scene } = useGLTF(props.assetUrl);
  const model = useMemo(() => scene.clone(true), [scene]);
  const transform = useMemo(() => {
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxEdge = Math.max(size.x, size.y, size.z, 0.0001);
    const scale = 1.6 / maxEdge;
    return {
      scale,
      position: new Vector3(-center.x * scale, -center.y * scale, -center.z * scale),
    };
  }, [model]);

  useEffect(() => {
    props.onModelReady();
  }, [model, props.onModelReady]);

  return (
    <group rotation={[0, props.yRotation, 0]} scale={transform.scale} position={transform.position}>
      <primitive object={model} />
    </group>
  );
}

function MeshScene(props: MeshModelProps) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <directionalLight position={[-3, 2, -4]} intensity={0.5} />
      <directionalLight position={[0, -3, 2]} intensity={0.25} />
      <Bounds fit clip margin={1.02}>
        <Center>
          <MeshModel assetUrl={props.assetUrl} yRotation={props.yRotation} onModelReady={props.onModelReady} />
        </Center>
      </Bounds>
    </>
  );
}

export function MeshyModelShapeBody(props: MeshyModelShapeBodyProps) {
  const editor = useEditor();
  const zoomLevel = useValue("zoom-level", () => editor.getZoomLevel(), [editor]);
  const dpr = useMemo(() => getAdaptiveDpr(zoomLevel), [zoomLevel]);
  const [canvasReady, setCanvasReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    setCanvasReady(false);
    setModelReady(false);
  }, [props.assetUrl]);

  const handleCanvasCreated = useCallback(() => {
    requestAnimationFrame(() => {
      setCanvasReady(true);
    });
  }, []);

  const handleModelReady = useCallback(() => {
    setModelReady(true);
  }, []);

  if (!props.assetUrl) {
    return <div className="meshy-model-shape__fallback">缺少 GLB 地址</div>;
  }

  const isLoading = !canvasReady || !modelReady;

  return (
    <div className="meshy-model-shape__canvas-wrap">
      {isLoading ? (
        <div className="meshy-model-shape__loading">
          <span className="meshy-model-shape__spinner" aria-hidden />
          <span>模型加载中...</span>
        </div>
      ) : null}
      <Canvas
        className="meshy-model-shape__canvas"
        style={{ width: "100%", height: "100%" }}
        dpr={dpr}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 }, offsetSize: true }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 3.8], fov: 34, near: 0.01, far: 1000 }}
        onCreated={handleCanvasCreated}
      >
        <Suspense fallback={null}>
          <MeshScene
            assetUrl={props.assetUrl}
            yRotation={props.yRotation}
            onModelReady={handleModelReady}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
