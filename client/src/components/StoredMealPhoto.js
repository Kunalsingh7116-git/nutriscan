import { useEffect, useRef, useState } from 'react';
import { Utensils } from 'lucide-react';
import api from '../utils/api';
import './StoredMealPhoto.css';

export default function StoredMealPhoto({ id, className = '', alt = '' }) {
  const container = useRef(null);
  const [source, setSource] = useState(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let objectUrl;
    let observer;
    async function load() {
      try {
        const { data } = await api.get('/meal-photos/' + id, { responseType: 'blob', signal: controller.signal });
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(data);
        setSource({ id, url: objectUrl });
      } catch {
        // Keep the placeholder if the image is unavailable.
      }
    }
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        load();
      }, { rootMargin: '180px' });
      observer.observe(container.current);
    } else {
      load();
    }
    return () => {
      controller.abort();
      observer?.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  return <span ref={container} className={`stored-meal-photo ${className}`}>
    {source && source.id === id
      ? <img src={source.url} alt={alt} onError={() => setSource(null)} />
      : <Utensils size={18} aria-hidden="true" />}
  </span>;
}
