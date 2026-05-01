import { BaseBoxShapeUtil, HTMLContainer, T, type TLBaseShape } from "tldraw";
import { MeshyModelShapeBody } from "@/domains/canvas-editor/shapes/MeshyModelShapeBody";

export type MeshyModelShape = TLBaseShape<
  "meshy-model",
  {
    w: number;
    h: number;
    assetUrl: string;
    yRotation: number;
  }
>;

// oxlint-disable-next-line typescript-eslint/no-explicit-any
export class MeshyModelShapeUtil extends BaseBoxShapeUtil<any> {
  static override type = "meshy-model" as const;
  static override props = {
    w: T.number,
    h: T.number,
    assetUrl: T.string,
    yRotation: T.number,
  };

  override getDefaultProps(): MeshyModelShape["props"] {
    return {
      w: 320,
      h: 320,
      assetUrl: "",
      yRotation: 0,
    };
  }

  override canResize() {
    return true;
  }

  override component(shape: MeshyModelShape) {
    return (
      <HTMLContainer className="meshy-model-shape" style={{ width: shape.props.w, height: shape.props.h }}>
        <MeshyModelShapeBody assetUrl={shape.props.assetUrl} yRotation={shape.props.yRotation} />
      </HTMLContainer>
    );
  }

  override indicator(shape: MeshyModelShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
