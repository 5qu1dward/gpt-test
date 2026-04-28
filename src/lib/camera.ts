export async function initCamera(video: HTMLVideoElement): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("当前浏览器不支持 getUserMedia 摄像头 API。");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user",
    },
    audio: false,
  });

  video.srcObject = stream;

  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });

  return stream;
}
