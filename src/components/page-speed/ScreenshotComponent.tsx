/* eslint-disable @next/next/no-img-element */
export function ScreenshotComponent({
    screenshot,
  }: {
    screenshot?: {
      data: string;
      width: number;
      height: number;
    };
  }) {
    if (!screenshot) {
      return null;
    }
    return (
      <div className="border">
        <img
          alt={'fullscreen image'}
          width={80}
          src={screenshot.data}
          className={`w-20 aspect-[${screenshot.width}/${screenshot.height}]`}
        />
      </div>
    );
  }