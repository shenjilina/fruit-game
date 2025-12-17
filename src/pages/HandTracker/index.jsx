import React, { useEffect, useRef } from 'react';
import * as mpHands from '@mediapipe/hands';
import * as mpCamera from '@mediapipe/camera_utils';

export default function HandTracker() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);

  // 简单绘图函数（MediaPipe 不直接提供，需自己实现或引入）
  function drawConnectors(ctx, landmarks, connections, style = {}) {
    const { color = 'red', lineWidth = 2 } = style;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    for (const [i, j] of connections) {
      const pointA = landmarks[i];
      const pointB = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(pointA.x * ctx.canvas.width, pointA.y * ctx.canvas.height);
      ctx.lineTo(pointB.x * ctx.canvas.width, pointB.y * ctx.canvas.height);
      ctx.stroke();
    }
  }

  function drawLandmarks(ctx, landmarks, style = {}) {
    const { color = 'red', radius = 2 } = style;
    ctx.fillStyle = color;
    for (const landmark of landmarks) {
      ctx.beginPath();
      ctx.arc(
        landmark.x * ctx.canvas.width,
        landmark.y * ctx.canvas.height,
        radius,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  }
  // 处理检测结果
  function onResults(results) {
    const canvasCtx = canvasRef.current?.getContext('2d');
    if (!canvasCtx || !videoRef.current) return;

    // 清空画布
    canvasCtx.save();
    canvasCtx.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // 镜像绘制（因为前置摄像头）
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasRef.current.width, 0);

    // 绘制视频帧
    canvasCtx.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // 如果检测到手，绘制关键点和连接线
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(canvasCtx, landmarks, mpHands.HAND_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 5,
        });
        drawLandmarks(canvasCtx, landmarks, {
          color: '#FF0000',
          radius: 3,
        });
      }
    }

    canvasCtx.restore();
  }
  useEffect(() => {
    // 初始化 MediaPipe Hands
    const hands = new mpHands.Hands({
      locateFile: file => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // 结果回调
    hands.onResults(onResults);

    // 启动摄像头
    if (videoRef.current) {
      const camera = new mpCamera.Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: '100%',
        height: '100%',
      });
      camera.start();
    }

    handsRef.current = hands;

    // 清理
    return () => {
      if (handsRef.current) handsRef.current.close();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        autoPlay
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        style={{ border: '1px solid #ccc', transform: 'scaleX(-1)', width: '100%', height: '100%' }}
      />
    </div>
  );
}
