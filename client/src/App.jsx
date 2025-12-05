import Home from './pages/Home'
import { Route, Routes } from 'react-router-dom'
import Layout from './pages/Layout'
import WriteArticle from './pages/WriteArticle'
import WriteEmail from './pages/WriteEmail'
import GenerateImage from './pages/GenerateImage'
import RemoveBackground from './pages/RemoveBackground'
import RemoveObject from './pages/RemoveObject'
import { Toaster } from 'react-hot-toast'
import Dashboard from './pages/Dashboard'
import Community from './pages/Community'

const App = () => {
  return (
    <div>
      <Toaster />
      <Routes>
        <Route path='/' element={<Home />}/>
        <Route path='/ai' element={<Layout/>}>
          <Route index element={<Dashboard />}/>
          <Route path='write-article' element={<WriteArticle />}/>
          <Route path='write-email' element={<WriteEmail />}/>
          <Route path='generate-images' element={<GenerateImage />}/>
          <Route path='remove-background' element={<RemoveBackground />}/>
          <Route path='remove-object' element={<RemoveObject />}/>
          <Route path='community' element={<Community />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App