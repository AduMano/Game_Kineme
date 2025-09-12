import { Route, Routes } from 'react-router-dom';

function App() {
  return (
    <div className="">
      <main>
        <Routes>
          <Route path="/" element={
            <div className="bg-red-500">
              <h1 className="text-white text-center text-6xl">HELLO WORLD</h1>
            </div>
          }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;