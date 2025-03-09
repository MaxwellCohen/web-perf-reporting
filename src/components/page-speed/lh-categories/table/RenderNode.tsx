import { useContext } from 'react';
import { fullPageScreenshotContext } from '../../PageSpeedContext';
import { RenderJSONDetails } from '../../RenderJSONDetails';
import { NodeValue } from '@/lib/schema';



/**
 * React component that renders a node element similar to the renderNode function
 * in the Lighthouse details-renderer.js
 */
export function NodeComponent({
  item,
  device,
}: {
  item: NodeValue;
  device: 'Desktop' | 'Mobile';
}) {

  return (
    <div className="flex flex-col gap-2">
      <RenderNodeImage item={item} device={device} />

      {item.nodeLabel ? <div>{item.nodeLabel}</div> : null}

      {item.snippet && (
        <div className="whitespace-pre-wrap font-mono text-sm leading-5 text-blue-500">
          {item.snippet}
        </div>
      )}

      <RenderJSONDetails data={item} />
    </div>
  );
}

export function RenderNodeImage({
  item,
  device,
  imageSize = 150,
}: {
  item: NodeValue;
  device: 'Desktop' | 'Mobile';
  imageSize?: number;
}) {
  const screenshotData = useContext(fullPageScreenshotContext);
  const fullPageScreenshot =
    device === 'Desktop'
      ? screenshotData?.desktopFullPageScreenshot
      : screenshotData?.mobileFullPageScreenshot;

  if (!fullPageScreenshot || !item?.boundingRect || !item?.lhId) {
    return null;
  }

  const scale: number | undefined = item?.boundingRect?.width
    ? imageSize / item?.boundingRect?.width
    : undefined;
  return (
    <div
      className="relative overflow-hidden"
      style={{
        aspectRatio:
          item?.boundingRect?.width / item?.boundingRect?.height || undefined,
        width: `${imageSize}px`,
      }}
    >
      <div className="absolute" style={{ scale: scale }}>
        <div
          className="absolute"
          style={{
            width: `${fullPageScreenshot.screenshot.width}px`,
            height: `${fullPageScreenshot.screenshot.height}px`,
            backgroundImage: `var(--${device.toLowerCase()}FullPageScreenshot)`,
            backgroundSize: 'cover',
            left: `-${fullPageScreenshot?.nodes[item.lhId]?.left}px`,
            top: `-${fullPageScreenshot?.nodes[item.lhId]?.top}px`,
            backgroundRepeat: 'no-repeat',
          }}
        ></div>
      </div>
    </div>
  );
}
