import { useState, useEffect, useRef } from 'react'
import HomePage from './components/HomePage'
import Header from './components/Header'
import FileDisplay from './components/FileDisplay'
import Transcribing from './components/Transcribing'
import Information from './components/Information'
import { MessageTypes } from './utils/presets'
function handleResetAudio(){
  setfile(null)
  setAudioStream(null)
}


function App() {
  const [file, setFile] = useState(null)
  const [audioStream, setAudioStream] = useState(null)
  const [output, setOutput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [finish, setFinish] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const isAudioAvailable = file || audioStream
  const worker = useRef(null)
// useEffect 钩子只在组件初次挂载时执行，之后不会再运行（除非组件被卸载）。
// useRef 是一个 Hook，用于在函数组件中创建一个可变的引用对象。worker 的初始值设为 null。
// 这个引用可以存储一个 Web Worker 实例，并在组件的生命周期内保持不变。


  useEffect(()=>{
    if (!worker.current){
      worker.current = new Worker(new URL('./utils/whisper.worker.js',import.meta.url),{
        type:'module'
      })
    }
    const onMessageReceived = async (e) => {
      switch (e.data.type) {
        case 'DOWNLOADING':
          setDownloading(true)
          console.log('DOWNLOADING')
          break;
        case 'LOADING':
          setLoading(true)
          console.log('LOADING')
          break;
        case 'RESULT':
          setOutput(e.data.results)
          console.log(e.data.results)
          break;
        case 'INFERENCE_DONE':
          setFinish(true)
          console.log('DONE')
          break;
      }
    }
    worker.current.addEventListener('message',onMessageReceived)
    // worker.onmessage = function(event) {
    //   console.log('主线程接收到的消息：', event.data);
    // };

    // worker.current.addEventListener('message', ...)（主线程中）：
    // 发送方：Worker 线程。
    // 接收方：主线程。它监听 Worker 线程通过 postMessage() 发送的消息。

    return () => worker.current.removeEventListener('message',onMessageReceived)
  })

  async function readAudioFrom(file){
    const sampling_rate = 16000
    const audioCTX = new AudioContext({sampleRate:sampling_rate})
    const response = await file.arrayBuffer()
    // console.log(response,file,'###')
    // file 是一个 File 对象，通常通过用户上传音频文件获得。
    // file.arrayBuffer() 是一个异步方法，将文件数据转换为 ArrayBuffer，即原始二进制数据格式。这是读取文件内容的方式。
    const decoded = await audioCTX.decodeAudioData(response)
    const audio = decoded.getChannelData(0)
    // getChannelData(0) 获取音频数据的第一个通道（对于单声道音频，只会有一个通道；对于立体声，有两个通道，0 为左声道，1 为右声道）。这个方法返回一个包含音频样本的 Float32Array
    return audio
  }

  async function handleFormSubmission(){
    if (!file && !audioStream) {return}
    let audio = await readAudioFrom(file ? file : audioStream)
    const model_name = `openai/whisper-tiny.en`
    // 向worker发送数据
    worker.current.postMessage({
      type: MessageTypes.INFERENCE_REQUEST,
      audio,
      model_name
    })
  }

  // useEffect(() => {
  //   console.log(audioStream)
  // },[audioStream])
  return (
    <div className='flex flex-col max-width-[100px]
    mx-auto w-full'>
      <section className='min-h-screen flex flex-col'>
        <Header/>
        {output ? (<Information output={output}/>) : loading ?
        (<Transcribing></Transcribing>) : isAudioAvailable ?
        (
          <FileDisplay  handleFormSubmission={handleFormSubmission} handleResetAudio={handleResetAudio}
          file={file} audioStream={audioStream}>
          </FileDisplay>
        ) : (<HomePage setFile={setFile} setAudioStream={setAudioStream}>
          </HomePage>) 
        }
        
      </section>
    </div>
    
  )
}

export default App

// flex-0: The item does not grow or shrink; it stays at its natural size.
//     flex-grow: 0: The item will not grow to fill available space.
//     flex-shrink: 0: The item will not shrink when there is not enough space.
//     flex-basis: auto: The base size is determined by its content or width/height properties.
// flex-auto: The item can grow and shrink based on the content size and available space.
//     flex-grow: 1: The item can grow to fill available space.
//     flex-shrink: 1: The item can shrink if there is not enough space.
//     flex-basis: auto: The base size is determined by its content or width/height properties.
// flex-1: The item will grow and shrink equally with other flex-1 items, sharing the available space proportionally.
//     flex-grow: 1: The item will grow to fill available space, sharing space equally with other flex-1 items.
//     flex-shrink: 1: The item will shrink proportionally if there is not enough space.
//     flex-basis: 0%: The base size starts at 0, so the item will grow to fill any available space.

// Understanding the Default Flex Setting
// With flex: 0 1 auto, a flex item:

// Will not grow beyond its content size or defined width/height (flex-grow: 0).
// Can shrink if necessary to prevent overflow when the flex container is smaller than the combined size of all its children (flex-shrink: 1).
// Starts with an initial size determined by the content size or any explicit width/height (flex-basis: auto).

// 组件重新渲染：每次点击按钮时，onClick 事件处理函数会调用 setCount，这会触发 React 重新渲染 Counter 组件。

// useRef 的行为：在每次重新渲染时，useRef 返回相同的 ref 对象，该对象在整个组件生命周期内保持不变。因此，renderCount.current 在每次重新渲染时都可以保持之前的状态。

// 增加 renderCount.current：由于 renderCount.current += 1 这一行代码在组件函数体内，它将在每次重新渲染时执行。因此，renderCount.current 的值在每次重新渲染时都会递增 1。

// import React, { useRef } from 'react';

// const MyComponent = () => {
//   const countRef = useRef(0); // 创建一个可变的引用，初始值为 0

//   const incrementCount = () => {
//     countRef.current += 1; // 每次点击时增加 1
//     console.log(countRef.current); // 输出当前计数值
//   };

//   return (
//     <div>
//       <button onClick={incrementCount}>Increment</button>
//     </div>
//   );
// };

// export default MyComponent;




// import React, { useState, useEffect } from 'react';

// const UserList = () => {
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchUsers = async () => {
//       try {
//         const response = await fetch('https://jsonplaceholder.typicode.com/users');
//         const data = await response.json();
//         setUsers(data);
//       } catch (error) {
//         console.error('Error fetching users:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUsers();

//     // 可选的清理函数
//     return () => {
//       console.log('Cleaning up...');
//     };
//   }, []); // 空数组确保仅在组件挂载时运行

//   if (loading) {
//     return <div>Loading...</div>;
//   }

//   return (
//     <ul>
//       {users.map(user => (
//         <li key={user.id}>{user.name}</li>
//       ))}
//     </ul>
//   );
// };

// export default UserList;

