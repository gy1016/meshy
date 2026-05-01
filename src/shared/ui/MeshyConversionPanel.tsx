interface MeshyConversionPanelProps {
  isConverting: boolean;
  buttonText: string;
  statusText: string;
  latestGlbUrl: string;
  onConvert: () => void;
}

export function MeshyConversionPanel(props: MeshyConversionPanelProps) {
  return (
    <div className="meshy-panel">
      <button
        className="meshy-button"
        type="button"
        onClick={props.onConvert}
        disabled={props.isConverting}
      >
        {props.buttonText}
      </button>
      <p className="meshy-status">{props.statusText}</p>
      {props.latestGlbUrl ? (
        <a className="meshy-link" href={props.latestGlbUrl} target="_blank" rel="noreferrer">
          打开 GLB 结果
        </a>
      ) : null}
    </div>
  );
}
