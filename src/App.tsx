import { Route, Routes } from 'react-router-dom';

// Pages
import { MainPage } from './pages/MainPage';
import { RenderGamePage } from './pages/RenderGamePage';

function App() {
  return (
    <div className="fixed w-[100%] h-[100%]">
      <main className='relative w-full h-[100%]'>
        <Routes>
          <Route path="/" Component={MainPage} />
          <Route path="/Run" Component={RenderGamePage} />
        </Routes>
      </main>
    </div>
  );
}

export default App;