import React from 'react'
import { LANGUAGES } from '../utils/presets'
export default function Translation(props) {
  const {textElement, toLanguage, 
    translating, setTranslation, setTranslating, 
    setToLanguage, generationTranslation} = props
  return (
    <div className='flex flex-col gap-2 max-w-[400px] w-full mx-auto'>
    {!translating && (<div className='flex flex-col gap-2'>
      <p className='text-xs sm:text-sm font-medium text-slate-500'>To language</p>
      <div className='flex items-stretch gap-2'>
      {/* items-stretch: When applied, it makes all flex items stretch to fill the container along the cross axis, ensuring they have equal height (or width, depending on the flex direction). */}
        <select className='flex-1 outline-none bg-white
        focus:outline-none border border-solid border-transparent
        hover:border-blue-300 duration-200
        rounded' 
        value={toLanguage} onChange={(e) => setToLanguage(e.target.value)}>
          <option value={'Select language'}>
          Select language
          </option>

         { Object.entries(LANGUAGES).map(([key,value]) => {
            return( 
              <option key={key} value={value}>{key}</option>
            )
         })}
        </select>
        <button 
        onClick = {generationTranslation}
        className='specialBtn px-3 py-3 rounded-lg text-blue-400 hover:text-blue-600 duration-200'>Translate</button>    
      </div>
    </div>)}
    {(textElement && !translating) && (
      <p>{textElement}</p>
    )}
    {translating && (
      <div className='grid place-items-center'>
        <i className='fa-solid fa-spinner animate-spin'></i>
      </div>
    )}
    </div>
  )
}
