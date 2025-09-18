import React from 'react'
import Home from './pages/Home'
import { Route, Routes } from 'react-router-dom'
import Layout from './pages/Layout'
import WriteArticle from './pages/WriteArticle'
import WriteEmail from './pages/WriteEmail'
import GenerateImage from './pages/GenerateImage'
import RemoveBackground from './pages/RemoveBackground'
import RemoveObject from './pages/RemoveObject'
import Coder from './pages/Coder'

const App = () => {
  return (
    <div>
      <Routes>
        <Route path='/' element={<Home />}/>
          <Route path='/ai' element={<Layout/>}>
            <Route path='write-article' element={<WriteArticle />}/>
            <Route path='write-email' element={<WriteEmail />}/>
            <Route path='gen-img' element={<GenerateImage />}/>
            <Route path='rm-bg' element={<RemoveBackground />}/>
            <Route path='rm-obj' element={<RemoveObject />}/>
            <Route path='coder' element={<Coder />}/>
          </Route>
      </Routes>
    </div>
  )
}

export default App