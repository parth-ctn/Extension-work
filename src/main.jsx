import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
// Styles for math rendering (KaTeX) and code highlighting (highlight.js)
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.min.css';

createRoot(document.getElementById('root')).render(<App />);
