
import React,{useEffect, useState, useRef} from 'react'

export default function  (props) {
    const {setFile,setAudioStream} = props
    const [recordingStatus, setRecordingStatus] = useState('inactive')
    const [audioChunks, setAudioChunks] = useState([])
    const [duration, setDuration] = useState(0)
    const mediaRecorder = useRef(null)
    const mimeType = 'audio/webm'

    async function startRecording(){
        let tempStream
        console.log('start recording')
        try { 
            const streamData = await navigator.mediaDevices.getUserMedia({
                audio:true,
                video:false
            })
            tempStream = streamData
        } catch (err) {
            console.log(err.message)
            return
        }
        setRecordingStatus('recording')

        const media = new MediaRecorder(tempStream,{type:mimeType})
        mediaRecorder.current = media

        mediaRecorder.current.start()
        let localAudioChunks = []
        mediaRecorder.current.ondataavailable = (event) => {
            if (typeof event.data === 'undefined'){return}
            if (event.data.size === 0){return}
            localAudioChunks.push(event.data)
        }
        setAudioChunks(localAudioChunks) 
    }

    useEffect(()=>{
        // 这里的 useEffect 没有指定依赖项数组（[]），这意味着它将在每次组件重新渲染时都会运行。
        if(recordingStatus === 'inactive'){return}
        // 设置一个定时器，每秒钟更新一次持续时间
        const interval = setInterval(()=>{
            // 清理函数，在组件卸载或状态变化时清除定时器
            setDuration(curr => curr + 1)//curr初始值为0
        },1000)
        return ()=>clearInterval(interval)
    })

    async function stopRecording(){
        setRecordingStatus('inactive')
        console.log('stop recording')
        mediaRecorder.current.stop()
        // new Blob(audioChunks, { type: mimeType })：Blob 构造函数将 audioChunks 数组中的所有音频数据块合并成一个完整的二进制大对象（Blob）。
        // { type: mimeType }：指定了音频的 MIME 类型（如 audio/webm 或 audio/wav），这个类型决定了音频文件的格式。
        mediaRecorder.current.onstop = () => {
            const audioBlob = new Blob(audioChunks, {type: mimeType})
            setAudioStream(audioBlob)
            setAudioChunks([])
            setDuration(0)

        }
    }

    
    return (
    <main className='flex-1 p-4 flex flex-col justify-center
    gap-3 sm:gap-4 text-center pb-20'>
        <h1 className='font-semibold text-5xl sm:text-6xl md:text-7xl'>Free<span className="text-blue-400 bold">Scribe</span></h1>
        <h3 className='font-medium md:font-large'>Record
            <span className='text-blue-400'>&rarr;</span> Transcribe
            <span className='text-blue-400'>&rarr;</span> Translate
        </h3>
        <button onClick={recordingStatus==='recording' ? stopRecording : startRecording} className='flex specialBtn items-center text-base justify-between
        gap-4 mx-auto w-72 max-w-full my-4 px-4 py-2 rounded-xl'>
        {/* mx-auto 水平居中元素：当你希望一个块级元素（如 div、section、article 等）在父容器中水平居中时，通常会使用 mx-auto。这个类通常配合固定宽度或百分比宽度一起使用。 */}
            <p className='text-blue-400'>{recordingStatus === 'inactive' ? 'Record' : `Stop recording`}</p>
            <div className='flex items-center gap-2'>{duration !== 0 && (
                <p className='text-sm'>{duration}s</p>
            )}
            <i className={'fa-solid duration-200 fa-microphone ' + 
            (recordingStatus === 'recording' ? 'text-rose-400' : '')}></i>
            </div>
        </button>
        
        <p className='text-base'>Or <label className='text-blue-400 cursor-pointer hover:text-blue-600 duration-200'>upload <input className='hidden' type='file' 
        accept='.mp3,.wave' onChange={(e) => {
            const tempFile=e.target.files[0]
            setFile(tempFile)
        }}></input></label>
        a mp3 file
        </p>
        <p className='italic tedxt-slate-500'>Free now free forever</p>
    </main>
  )
}
