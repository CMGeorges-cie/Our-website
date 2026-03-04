import { useEffect } from 'react';

const BASE_TITLE = 'CMGeorges';

export function usePageTitle(title) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} | Rénovation, Mobilier & Tech - Montréal`;
    
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

export default usePageTitle;
