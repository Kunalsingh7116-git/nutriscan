import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './motion.css';
import App from './App';
import { MotionProvider } from './hooks/useReducedMotion';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><MotionProvider><App /></MotionProvider></React.StrictMode>);
