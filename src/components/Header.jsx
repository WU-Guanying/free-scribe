import React from 'react'

export default function 
() {
  return (
    <header className='flex items-center p-4 justify-between gap-4'>
      <div className='flex-1'>
        <a href='/'><h1 className='font-medium'>Free<span className='text-blue-400 bold'>Scribe</span></h1></a>
        <a href='/'><h2 className='font-light text-slate-500 text-xs opacity-50'>GUANYING</h2></a>
      </div>  
        <a href='/'><button className='flex items-center gap-2 specialBtn px-4 py-2
        rounded-lg text-blue-400 text-sm'>
            <p>New</p>
            <i class="fa-solid fa-plus"></i>
        </button></a>
    </header>
  )
}
