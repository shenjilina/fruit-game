import { createBrowserRouter } from 'react-router-dom';
import Home from '@/pages/Home/index.jsx';
import About from '@/pages/About/index.jsx';
import FruitGame from '@/pages/FruitGame/index.jsx';
import HandTracker from '@/pages/HandTracker/index.jsx';
import NotFound from '@/pages/NotFound/index.jsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/about',
    element: <About />,
  },
  {
    path: '/fruit-game',
    element: <FruitGame />,
  },
  {
    path: '/hand-tracker',
    element: <HandTracker />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
