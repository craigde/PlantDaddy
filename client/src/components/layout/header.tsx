import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export function Header() {
  const [location, navigate] = useLocation();
  
  // Don't show the header on these pages as they have their own headers
  const hideHeaderOn = ['/plants/'];
  
  const shouldShowHeader = !hideHeaderOn.some(path => location.startsWith(path));
  
  if (!shouldShowHeader) {
    return null;
  }
  
  const handleAddPlant = () => {
    navigate('/plants/new');
  };
  
  return (
    <header className="bg-primary text-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-xl font-bold font-heading flex items-center">
            <span className="mr-2 emoji-xl" role="img" aria-label="plant">🪴</span>
            PlantDaddy
          </span>
        </div>
        
        {location === '/' && (
          <Button 
            onClick={handleAddPlant}
            variant="secondary" 
            className="bg-white/20 hover:bg-white/30 text-white font-medium rounded-full h-8 px-4 flex items-center"
          >
            <span className="material-icons text-sm mr-1">add</span>
            Add Plant
          </Button>
        )}
      </div>
    </header>
  );
}