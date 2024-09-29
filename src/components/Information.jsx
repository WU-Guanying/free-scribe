import React, { useState, useEffect, useRef } from 'react'
import Transcription from './Transcription'
import Translation from './Translation'

export default function Information(props) {
  const {output} = props
  const [tab,setTab] = useState('transcription')
  const [translation, setTranslation] = useState(null)
  const [toLanguage, setToLanguage] = useState('Select language')
  const [translating, setTranslating] = useState(null)
  const worker = useRef()
  useEffect(()=>{
    if (!worker.current){
      worker.current = new Worker(new URL('../utils/translate.worker.js',import.meta.url),{
        type:'module'
      })
    }

    const onMessageReceived = async (e) => {
      switch (e.data.status) {
        case 'initiate':
            console.log('DOWNLOADING')
            break;
        case 'progress':
            console.log('LOADING')
            break;
        case 'update':
            setTranslation(e.data.output)
            console.log(e.data.output)
            break;
        case 'complete':
            setTranslating(false)
            console.log("DONE")
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

  
  const textElement = tab ==='transcription' ? output.map(val=>val.text) : translation || 'No translation'


  function generationTranslation(){
    if(translating || toLanguage === 'Select language'){return}
    setTranslating(true)
    worker.current.postMessage({
      text:output.map(val => val.text),
      src_lang:'eng_Latn',
      tgt_lang: toLanguage
    })
  }

  function handleCopy(){
    navigator.clipboard.writeText(textElement)
  }

  function handleDownload(){
    const element = document.createElement('a')
    // 创建一个新的 <a> 元素，用于生成下载链接。
    const file = new Blob([textElement], {type:'text/plain'})
    // 创建一个新的 Blob 对象，Blob 是表示不可变的类文件对象。在这个例子中，它是一个空的文本文件（因为 [] 是空数组），类型为 text/plain。
    element.href = URL.createObjectURL(file)
    // 使用 URL.createObjectURL(file) 为 Blob 创建一个临时 URL，并将其赋值给 <a> 元素的 href 属性。这使得用户可以通过点击链接下载该文件。
    element.download=`Freescribe_${(new Date()).toString()}.txt`
    document.body.appendChild(element)
    element.click()
  }

  return (
  <main className='flex-1 p-4 flex flex-col justify-center text-center pb-20 max-w-prose w-full mx-auto gap-4'>
  <h1 className='font-semibold text-4xl sm:text-5xl md:text-6xl whitespace-nowrap'>Your<span className="text-blue-400 bold"> Transcription</span></h1>
  <div className='grid grid-cols-2 mx-auto items-center bg-white  shadow rounded-full overflow-hidden'>
    <button 
    onClick={()=>setTab('transcription')}
    className={'px-4 py-1 duration-200 font-medium ' + (tab === 'transcription' ? 'bg-blue-300 text-white' : ' text-blue-400 hover:text-blue-600')}>Transcription</button>
    <button 
    onClick={()=>setTab('translation')}
    className={'px-4 py-1 duration-200 font-medium ' + (tab === 'translation' ? 'bg-blue-300 text-white' : ' text-blue-400 hover:text-blue-600')}>Translation</button>
  </div>

  <div className='my-8 flex flex-col'>
  {tab === 'transcription' ? (
    <Transcription {...props} textElement={textElement}></Transcription>
  ) : (
    <Translation {...props} toLanguage={toLanguage}
    textElement={textElement} translating={translating}
    setTranslation={setTranslation} setTranslating={setTranslating}
    setToLanguage={setToLanguage} generationTranslation={generationTranslation}></Translation>
  )}
  </div>    
  <div className='flex items-center gap-4 mx-auto text-base'>
    <button title='copy' onClick={handleCopy} className='bg-white text-blue-300 px-2 aspect-square grid place-items-center hover:text-blue-500 duration-200'>
      <i className='fa-solid fa-copy'/>
    </button>
    <button title='download' onClick={handleDownload} className='bg-white text-blue-300 px-2 aspect-square grid place-items-center hover:text-blue-500 duration-200'>
      <i className='fa-solid fa-download'/>
    </button>
  
  </div>
  </main>  
  )
}
