import React, { useRef, useEffect, useState } from 'react'
import './App.css'

interface VideoParams {
  videoWidth: number
  currentTime: number
  duration: number
}

interface MarkListInterface {
  value: number
  label: string
}

const gapValues = {
  '<768': 2,
  '768-1024': 3,
  '>=1024': 4,
}

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [videoParams, setVideoParams] = useState({} as VideoParams)
  const [marksList, setMarksList] = useState<MarkListInterface[]>([])
  const [progressBarGapValue, setProgressBarGapValue] = useState(0)
  const [progressBarHeight, setProgressBarHeight] = useState(20)
  const isDragging = useRef(false)

  // ✅ 关键点：组件初始化
  useEffect(() => {
    const video = videoRef.current

    const handleMetadataLoaded = () => {
      if (video) {
        updateVideoParams()
      }
    }

    // ✅ 关键点：动态更新分段时间轴gap
    const responsiveProgressBarGapValue = () => {
      if (video) {
        const videoWidth = video.clientWidth
        const progressBarGapValue =
          videoWidth < 768
            ? gapValues['<768']
            : videoWidth < 1024
            ? gapValues['768-1024']
            : gapValues['>=1024']
        setProgressBarGapValue(progressBarGapValue)
      }
    }

    // ✅ 关键点：视频宽度自适应触发
    const handleResize = () => {
      if (video) {
        updateVideoParams()
        responsiveProgressBarGapValue()
      }
    }

    // ✅ 关键点：视频进度改变触发
    const handleTimeUpdate = () => {
      if (video) {
        setVideoParams((prev) => ({
          ...prev,
          currentTime: video.currentTime,
        }))
      }
    }

    const updateVideoParams = () => {
      if (video) {
        setVideoParams({
          videoWidth: video.clientWidth,
          currentTime: video.currentTime,
          duration: video.duration,
        })

        // ✅ 关键点：动态更新 canvas 宽度以匹配视频
        if (canvasRef.current) {
          canvasRef.current.width = video.clientWidth
          canvasRef.current.height = progressBarHeight
        }
      }
    }

    if (video) {
      video.addEventListener('loadedmetadata', handleMetadataLoaded)
      video.addEventListener('timeupdate', handleTimeUpdate)
      window.addEventListener('resize', handleResize)
    }

    const fetchData = async () => {
      try {
        const marks = Array.from({ length: 100 }, (_, i) => ({
          value: 1735142400600 + i * 2000,
          label: (i + 1).toString(),
        }))
        setMarksList(() => [
          ...marks.map((markItem: { value: number; label: string }) => {
            const date = new Date(markItem.value)
            return {
              value:
                date.getHours() * 3600 +
                date.getMinutes() * 60 +
                date.getSeconds(),
              label: markItem.label,
            }
          }),
        ])
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    responsiveProgressBarGapValue()
    fetchData()
    return () => {
      if (video) {
        video.removeEventListener('loadedmetadata', handleMetadataLoaded)
        video.removeEventListener('timeupdate', handleTimeUpdate)
      }
    }
  }, [])

  useEffect(() => {
    let animationFrameId: number | null = null
    const drawProgressBar = () => {
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      const { currentTime, duration, videoWidth } = videoParams
      // 清除并重绘背景
      ctx.clearRect(0, 0, videoWidth, progressBarHeight)
      ctx.fillStyle = '#e0e0e0'
      ctx.fillRect(0, progressBarHeight / 4, videoWidth, progressBarHeight / 2)

      // 红色进度条
      const progressX = (currentTime / duration) * videoWidth
      ctx.fillStyle = 'red'
      ctx.fillRect(0, progressBarHeight / 4, progressX, progressBarHeight / 2)

      marksList.forEach((mark) => {
        const markX = (mark.value / duration) * videoWidth
        ctx.clearRect(markX, 0, progressBarGapValue, progressBarHeight)
        // 清除markX到 markX + 2px 位置为透明背景
      })

      // 🎯 绘制圆圈 (拖拽点)
      ctx.beginPath()
      ctx.arc(
        progressX,
        progressBarHeight / 2,
        (progressBarHeight - 2) / 2,
        0,
        2 * Math.PI
      )
      ctx.fillStyle = 'red'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.stroke()

      if (!videoRef.current?.paused) {
        animationFrameId = requestAnimationFrame(drawProgressBar)
      }
    }
    drawProgressBar() // 启动绘制动画
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [videoParams])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true
    handleDrag(e)
    window.addEventListener('mousemove', handleDrag)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseUp = () => {
    isDragging.current = false
    window.removeEventListener('mousemove', handleDrag)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  const handleDrag = (e: MouseEvent | React.MouseEvent) => {
    if (!isDragging.current) return
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const rect = canvas.getBoundingClientRect()
    const offsetX = Math.min(Math.max(e.clientX - rect.left, 0), rect.width)

    const newTime = (offsetX / rect.width) * video.duration
    video.currentTime = newTime
    setVideoParams((prev) => ({
      ...prev,
      currentTime: newTime,
    }))
  }
  const videoPlayAndPause = () => {
    const video = videoRef.current
    if (video) {
      if (video.paused) {
        video.play()
      } else {
        video.pause()
      }
    }
  }

  const tagClick = (mark: MarkListInterface) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = mark.value
  }

  const ProgressTag = (mark: MarkListInterface) => {
    return (
      <div
        className="progress-tag"
        style={{
          left: `${
            (mark.value / videoParams.duration) * videoParams.videoWidth + 2
          }px`,
          top: `-${progressBarHeight + 5}px`,
          fontSize: `${progressBarGapValue === 2 ? '8px' : '10px'}`,
        }}
        onClick={() => tagClick(mark)}
      >
        {mark.label}
      </div>
    )
  }

  return (
    <div className="container">
      <div className="video-container">
        <div className="video-container-main">
          <video
            ref={videoRef}
            onClick={videoPlayAndPause}
            muted
            onTimeUpdate={(e) =>
              setVideoParams((prev) => ({
                ...prev,
                currentTime: (e.target as HTMLVideoElement).currentTime,
              }))
            }
          >
            <source src="/test1.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="video-container-controls">
          <canvas
            ref={canvasRef}
            id="progress-bar"
            onMouseDown={handleMouseDown}
          ></canvas>
          {marksList.map((mark, index) => (
            <ProgressTag key={index} {...mark}></ProgressTag>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
