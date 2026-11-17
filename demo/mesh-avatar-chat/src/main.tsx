import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

/**
 * Chrome's page translation and some extensions rewrite the DOM React owns
 * (wrapping text nodes, moving nodes between parents), which makes React's own
 * removeChild/insertBefore throw `NotFoundError` and unmount the whole app
 * (facebook/react#11538). The page localizes itself, but if something mutates
 * the DOM anyway, ignore the foreign rewrite instead of crashing.
 */
function guardForeignDomMutations(): void {
  const { removeChild, insertBefore } = Node.prototype;
  Node.prototype.removeChild = function <T extends Node>(
    this: Node,
    child: T,
  ): T {
    try {
      return removeChild.call(this, child) as T;
    } catch (error) {
      console.warn('Ignored a foreign DOM removal:', error);
      return child;
    }
  };
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    try {
      return insertBefore.call(this, newNode, referenceNode) as T;
    } catch (error) {
      console.warn('Ignored a foreign DOM insert:', error);
      return newNode;
    }
  };
}
guardForeignDomMutations();

// Caches the voice files after their first download (see public/sw.js).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .catch((error) =>
      console.warn('Service worker registration failed:', error),
    );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
